"""
GlobeXAI Trade OS — Company Directory Router

Serves the Yahoo-sourced company valuation dataset
(backend/brain/datasets/final/processed/company_valuation_data.csv) so the
frontend can show, per destination country + commodity, the highest-valuation
companies worth contacting there.

Endpoints:
  GET /api/v1/companies/top-by-country  — top N companies for a country, ranked
                                           by market cap, optionally filtered to
                                           the industry implied by a commodity;
                                           pass `query` to instead rank by a
                                           blend of TF-IDF/cosine similarity
                                           (vs. each company's real business
                                           summary) and log-scaled valuation
  GET /api/v1/companies/detail/{company_id} — single company record by slug id
"""

from __future__ import annotations

import logging
import re
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException, Query
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Company Directory"], prefix="/api/v1/companies")

# Relevance (text similarity to the query) is weighted slightly above sheer
# company size, but both genuinely move the final rank — see
# _rank_by_similarity_and_valuation().
SIMILARITY_WEIGHT = 0.6
VALUATION_WEIGHT = 0.4

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
_CANDIDATE_DATASET = PROJECT_ROOT / "brain" / "datasets" / "final" / "processed" / "company_valuation_data.csv"
DATASET_PATH = _CANDIDATE_DATASET if _CANDIDATE_DATASET.exists() else PROJECT_ROOT / "backend" / "brain" / "datasets" / "final" / "processed" / "company_valuation_data.csv"

# ISO3 -> full country name, as used in the Yahoo dataset's `Country` column.
# Covers every destination country currently surfaced by the ranking engine
# (see src/components/marketplace/CountryOpportunityCard.tsx ISO3_FLAG_MAP)
# plus the wider set of countries the dataset itself contains companies for.
ISO3_TO_COUNTRY_NAME: Dict[str, str] = {
    "ARE": "United Arab Emirates", "SAU": "Saudi Arabia", "USA": "United States",
    "GBR": "United Kingdom", "SGP": "Singapore", "DEU": "Germany", "JPN": "Japan",
    "ITA": "Italy", "NLD": "Netherlands", "BGD": "Bangladesh", "IRN": "Iran",
    "EGY": "Egypt", "MYS": "Malaysia", "IDN": "Indonesia", "VNM": "Vietnam",
    "FRA": "France", "ESP": "Spain", "CAN": "Canada", "AUS": "Australia",
    "IND": "India", "CHN": "China", "HKG": "Hong Kong", "TWN": "Taiwan",
    "THA": "Thailand", "KOR": "South Korea", "SWE": "Sweden", "BRA": "Brazil",
    "CHE": "Switzerland", "NOR": "Norway", "DNK": "Denmark", "FIN": "Finland",
    "POL": "Poland", "ZAF": "South Africa", "MEX": "Mexico", "TUR": "Turkey",
    "ISR": "Israel", "NZL": "New Zealand", "PHL": "Philippines", "CHL": "Chile",
}

# Commodity keyword -> Yahoo `Industry` substrings, used to narrow the company
# list to firms plausibly buying/handling that commodity. Kept in sync with
# MarketplacePage.tsx CATEGORIES; falls back to no filter (whole-country,
# highest market cap) when nothing matches, rather than dropping to zero rows.
COMMODITY_INDUSTRY_MAP: List[tuple[re.Pattern, List[str]]] = [
    (re.compile(r"rice|wheat|grain|cashew|coffee|tea|nut|sugar|maize|corn", re.I),
     ["Farm Products", "Packaged Foods", "Agricultural Inputs", "Farm & Heavy Construction Machinery"]),
    (re.compile(r"pepper|turmeric|chili|chilli|spice", re.I),
     ["Packaged Foods", "Farm Products", "Grocery Stores"]),
    (re.compile(r"cotton|yarn|fabric|textile|apparel|garment", re.I),
     ["Textile Manufacturing", "Apparel Manufacturing", "Apparel Retail", "Footwear & Accessories"]),
    (re.compile(r"paracetamol|pharma|drug|api\b|medicine|generic", re.I),
     ["Drug Manufacturers - Specialty & Generic", "Drug Manufacturers - General", "Biotechnology", "Medical Instruments & Supplies"]),
    (re.compile(r"lithium|steel|coal|jewel|gold|metal|ore", re.I),
     ["Steel", "Other Industrial Metals & Mining", "Gold", "Other Precious Metals & Mining", "Metal Fabrication"]),
    (re.compile(r"solar|inverter|module|electronic|semiconductor", re.I),
     ["Solar", "Semiconductors", "Electronic Components", "Electrical Equipment & Parts"]),
    (re.compile(r"chemical", re.I),
     ["Specialty Chemicals", "Chemicals", "Agricultural Inputs"]),
]


def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", (name or "").lower()).strip("-")
    return slug or "company"


@lru_cache(maxsize=1)
def _load_companies() -> pd.DataFrame:
    candidates = [
        DATASET_PATH,
        PROJECT_ROOT / "brain" / "datasets" / "final" / "processed" / "company_valuation_data.csv",
        PROJECT_ROOT / "backend" / "brain" / "datasets" / "final" / "processed" / "company_valuation_data.csv",
        Path("backend/brain/datasets/final/processed/company_valuation_data.csv"),
    ]
    target_csv = next((c for c in candidates if c.exists()), None)
    if not target_csv:
        return pd.DataFrame(columns=[
            "company_id", "CompanyName", "Country", "Website", "Industry",
            "Sector", "MarketCap", "TotalRevenue", "Currency", "FullTimeEmployees",
            "BusinessSummary"
        ])

    df = pd.read_csv(target_csv)
    df["MarketCap"] = pd.to_numeric(df["MarketCap"], errors="coerce")
    df["TotalRevenue"] = pd.to_numeric(df["TotalRevenue"], errors="coerce")
    df = df.dropna(subset=["CompanyName", "Country", "MarketCap"])
    df = df[df["Country"].str.strip() != ""]

    # The source export has ~40% literal duplicate (CompanyName, Country) rows
    # where every field matches except MarketCap, which varies wildly between
    # duplicates (e.g. Caterpillar Inc. ranges from $145B to a nonsensical
    # $199T across 6 rows) — a scrape/scaling artifact in the raw data, not a
    # real re-valuation. Taking the max would surface the corrupted outlier as
    # the "top" company; the median is robust to a single bad row.
    df.loc[df["MarketCap"] <= 0, "MarketCap"] = pd.NA
    df["MarketCap"] = df.groupby(["CompanyName", "Country"])["MarketCap"].transform("median")
    df = df.dropna(subset=["MarketCap"])
    df = df.drop_duplicates(subset=["CompanyName", "Country"], keep="first")

    # De-duplicate slug collisions deterministically (append a short suffix)
    df["company_id"] = df["CompanyName"].map(_slugify)
    dupe_mask = df["company_id"].duplicated(keep=False)
    if dupe_mask.any():
        counters: Dict[str, int] = {}
        new_ids = []
        for slug, is_dupe in zip(df["company_id"], dupe_mask):
            if not is_dupe:
                new_ids.append(slug)
                continue
            counters[slug] = counters.get(slug, 0) + 1
            new_ids.append(f"{slug}-{counters[slug]}")
        df["company_id"] = new_ids

    logger.info("Loaded %d companies from %s", len(df), DATASET_PATH)
    return df


def _industries_for_commodity(commodity: Optional[str]) -> List[str]:
    if not commodity:
        return []
    for pattern, industries in COMMODITY_INDUSTRY_MAP:
        if pattern.search(commodity):
            return industries
    return []


def _resolve_country_name(country: str) -> str:
    upper = country.strip().upper()
    if upper in ISO3_TO_COUNTRY_NAME:
        return ISO3_TO_COUNTRY_NAME[upper]
    return country.strip()


def _row_to_summary(row: pd.Series) -> Dict[str, Any]:
    summary = str(row.get("BusinessSummary") or "")
    if len(summary) > 400:
        summary = summary[:397].rsplit(" ", 1)[0] + "..."
    result = {
        "company_id": row["company_id"],
        "company_name": row["CompanyName"],
        "display_name": row.get("DisplayName") or row["CompanyName"],
        "country": row["Country"],
        "website": row.get("Website") or None,
        "industry": row.get("Industry") or None,
        "sector": row.get("Sector") or None,
        "market_cap": None if pd.isna(row["MarketCap"]) else float(row["MarketCap"]),
        "total_revenue": None if pd.isna(row.get("TotalRevenue")) else float(row["TotalRevenue"]),
        "currency": row.get("Currency") or "USD",
        "employees": None if pd.isna(row.get("FullTimeEmployees")) else int(row["FullTimeEmployees"]),
        "business_summary": summary,
        "similarity_score": None,
        "valuation_score": None,
        "combined_score": None,
    }
    for key in ("similarity_score", "valuation_score", "combined_score"):
        if key in row.index and pd.notna(row[key]):
            result[key] = round(float(row[key]), 4)
    return result


def _rank_by_similarity_and_valuation(candidates: pd.DataFrame, query: str) -> pd.DataFrame:
    """Ranks `candidates` by a blend of TF-IDF/cosine text similarity (query
    vs. each company's real BusinessSummary) and log-scaled valuation.
    Additive/optional — only invoked when a caller passes `query`; the
    default MarketCap-only ranking is untouched."""
    if candidates.empty:
        return candidates.assign(similarity_score=[], valuation_score=[], combined_score=[])

    ranked = candidates.copy()
    summaries = ranked["BusinessSummary"].fillna("").astype(str)

    if summaries.str.strip().eq("").all():
        # No text to vectorize against (e.g. dataset not populated yet) —
        # degrade to valuation-only rather than raising.
        similarity = np.zeros(len(ranked))
    else:
        vectorizer = TfidfVectorizer(stop_words="english")
        corpus = list(summaries) + [query]
        try:
            tfidf_matrix = vectorizer.fit_transform(corpus)
        except ValueError:
            # Empty vocabulary after stop-word removal (e.g. query is just
            # stop words/punctuation) — no similarity signal available.
            similarity = np.zeros(len(ranked))
        else:
            query_vec = tfidf_matrix[-1]
            company_vecs = tfidf_matrix[:-1]
            similarity = cosine_similarity(query_vec, company_vecs).ravel()

    ranked["similarity_score"] = similarity

    market_cap = ranked["MarketCap"].astype(float).clip(lower=1.0)
    log_cap = np.log(market_cap)
    cap_min, cap_max = log_cap.min(), log_cap.max()
    if cap_max > cap_min:
        valuation_score = (log_cap - cap_min) / (cap_max - cap_min)
    else:
        # Single candidate, or every candidate has identical MarketCap.
        valuation_score = pd.Series(1.0, index=log_cap.index)
    ranked["valuation_score"] = valuation_score

    ranked["combined_score"] = (
        SIMILARITY_WEIGHT * ranked["similarity_score"] + VALUATION_WEIGHT * ranked["valuation_score"]
    )
    return ranked


@router.get(
    "/top-by-country",
    summary="Top companies by valuation (optionally blended with text similarity) for a destination country",
    description=(
        "Ranks companies from the Yahoo Finance valuation dataset headquartered "
        "in the given country by market capitalisation, optionally narrowed to "
        "the industry implied by a commodity string. Always returns up to "
        "`limit` companies — falls back to whole-country ranking if the "
        "commodity/industry filter would return too few results. When `query` "
        "is provided, ranking instead blends TF-IDF/cosine text similarity "
        f"between `query` and each company's real business summary ({SIMILARITY_WEIGHT:.0%}) "
        f"with log-scaled valuation ({VALUATION_WEIGHT:.0%}) — same country/industry "
        "filtering applies. Omitting `query` leaves the original market-cap-only "
        "behaviour unchanged."
    ),
)
def top_companies_by_country(
    country: str = Query(..., description="ISO3 code (e.g. USA) or full country name"),
    commodity: Optional[str] = Query(None, description="Commodity/product being exported, used to narrow by industry"),
    query: Optional[str] = Query(
        None,
        description=(
            "Free-text product/company description. When present, ranks by a blend of "
            "TF-IDF/cosine similarity against each company's real business summary and "
            "log-scaled valuation, instead of valuation alone."
        ),
    ),
    limit: int = Query(10, ge=1, le=50),
) -> Dict[str, Any]:
    df = _load_companies()
    country_name = _resolve_country_name(country)

    country_df = df[df["Country"].str.lower() == country_name.lower()]
    if country_df.empty:
        return {
            "country": country,
            "country_name": country_name,
            "commodity_filter": commodity,
            "query": query,
            "industry_filter_applied": False,
            "total_matched": 0,
            "companies": [],
        }

    industries = _industries_for_commodity(commodity)
    filtered_df = country_df
    industry_filter_applied = False
    if industries:
        narrowed = country_df[country_df["Industry"].isin(industries)]
        if len(narrowed) >= min(3, limit):
            filtered_df = narrowed
            industry_filter_applied = True

    query_clean = (query or "").strip()
    if query_clean:
        scored_df = _rank_by_similarity_and_valuation(filtered_df, query_clean)
        ranked = scored_df.sort_values("combined_score", ascending=False).head(limit)
    else:
        ranked = filtered_df.sort_values("MarketCap", ascending=False).head(limit)

    return {
        "status": "OK",
        "country": country_name,
        "commodity": commodity,
        "query": query_clean or None,
        "ranking_mode": "similarity_and_valuation" if query_clean else "valuation_only",
        "industry_filter_applied": industry_filter_applied,
        "matched_industries": industries if industry_filter_applied else [],
        "total_candidates": int(len(filtered_df)),
        "companies": [_row_to_summary(row) for _, row in ranked.iterrows()],
    }


@router.get(
    "/detail/{company_id}",
    summary="Full company record by id",
)
def company_detail(company_id: str) -> Dict[str, Any]:
    df = _load_companies()
    match = df[df["company_id"] == company_id]
    if match.empty:
        raise HTTPException(status_code=404, detail=f"Company '{company_id}' not found")
    row = match.iloc[0]
    summary = _row_to_summary(row)
    summary["business_summary"] = str(row.get("BusinessSummary") or "")
    return {"status": "OK", "company": summary}
