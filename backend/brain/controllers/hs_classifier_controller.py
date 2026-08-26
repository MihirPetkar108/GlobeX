"""
GlobeXAI Trade OS — HS Code Classification Router
Endpoint: POST /predict/hs-code

Resolves product names or HS6 integers to canonical HS6 codes using the
trade catalogue embedded in the partner-discovery Parquet dataset.
No external model inference required — purely catalogue-lookup driven.
"""

from __future__ import annotations

import logging
import os
from functools import lru_cache
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(tags=["HS Classification"])

# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class HSClassificationRequest(BaseModel):
    product: str = Field(
        ...,
        description="Product name (e.g. 'basmati rice') or numeric HS6 string (e.g. '100630')",
        example="basmati rice",
    )
    origin: Optional[str] = Field(
        default=None, description="ISO3 origin country (informational only)", example="IND"
    )
    destination: Optional[str] = Field(
        default=None, description="ISO3 destination country (informational only)", example="ARE"
    )


class HSClassificationResponse(BaseModel):
    status: str
    hs6: Optional[int] = None
    hs_code_formatted: Optional[str] = Field(
        default=None,
        description="Formatted HS string, e.g. 100630 -> '1006.30'",
    )
    product_description: Optional[str] = None
    match_type: str = "not_found"
    confidence: float = 0.0
    candidates: List[Dict[str, Any]] = []
    model_version: str = "catalogue-v1.0"


# ---------------------------------------------------------------------------
# Catalogue singleton (loaded once at module import time)
# ---------------------------------------------------------------------------

def _format_hs6(code: int) -> str:
    """Format integer HS6 → 'XXXX.XX' string (first 4 digits dot last 2)."""
    s = str(code).zfill(6)
    return f"{s[:4]}.{s[4:]}"


def _discover_data_dir() -> Optional[str]:
    """
    Auto-discover the data directory that contains the processed parquet.
    Priority: brain_temporary (new pipeline) → brain (legacy).
    """
    candidates = [
        os.path.join("backend", "brain_temporary", "data"),
        os.path.join("backend", "brain", "data"),
        "data",
    ]
    for candidate in candidates:
        processed = os.path.join(candidate, "processed")
        if os.path.isdir(processed):
            logger.debug("HS Classifier — discovered data_dir: %s", candidate)
            return candidate
    return None


@lru_cache(maxsize=1)
def _load_catalogue() -> Optional[object]:
    """
    Module-level singleton: loads PartnerDataLoader once and caches it.
    Returns the loader instance, or None if catalogue cannot be found.
    """
    try:
        from brain.models.partner_discovery.data import PartnerDataLoader  # noqa: PLC0415

        data_dir = _discover_data_dir()
        loader = PartnerDataLoader(data_dir=data_dir)
        # Trigger a catalogue read to surface FileNotFoundError early
        _ = loader.get_product_catalogue()
        logger.info("HS Classifier — catalogue loaded (data_dir=%s)", data_dir)
        return loader
    except FileNotFoundError as exc:
        logger.warning("HS Classifier — catalogue unavailable: %s", exc)
        return None
    except Exception as exc:  # pragma: no cover
        logger.error("HS Classifier — unexpected error during catalogue load: %s", exc)
        return None


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post(
    "/predict/hs-code",
    response_model=HSClassificationResponse,
    summary="Classify Product to HS6 Code",
    description=(
        "Resolves a product name or numeric HS6 query to a canonical 6-digit "
        "Harmonized System code using the GlobeXAI trade catalogue."
    ),
)
def classify_hs_code(req: HSClassificationRequest) -> Dict[str, Any]:
    """
    Match a product query to a catalogued HS6 code.

    - **Exact numeric HS6**: confidence 1.0, match_type 'hs6_code'
    - **Exact description**: confidence 1.0, match_type 'exact_description'
    - **Keyword search**: confidence 0.8, match_type 'keyword_search'
    - **Not found**: confidence 0.0, match_type 'not_found'
    """
    loader = _load_catalogue()
    if loader is None:
        raise HTTPException(
            status_code=503,
            detail={
                "status": "ERROR",
                "error_code": "CATALOGUE_UNAVAILABLE",
                "message": (
                    "Product catalogue could not be loaded. "
                    "Ensure the parquet dataset exists at "
                    "backend/brain_temporary/data/processed/ or "
                    "backend/brain/processed/."
                ),
            },
        )

    res = loader.resolve_product(req.product)

    status = res.get("status", "not_found")
    match_type = res.get("match_type", "not_found")
    hs6_val: Optional[int] = res.get("hs6")
    description: Optional[str] = res.get("product_description")
    candidates: List[Dict[str, Any]] = res.get("candidates", [])

    # Confidence mapping
    if status == "not_found" or hs6_val is None:
        confidence = 0.0
        resolved_match_type = "not_found"
    elif match_type in ("hs6_code", "exact_description"):
        confidence = 1.0
        resolved_match_type = match_type
    else:
        # keyword_search / ambiguous_match
        confidence = 0.8
        resolved_match_type = match_type

    hs_code_formatted: Optional[str] = _format_hs6(hs6_val) if hs6_val is not None else None

    return HSClassificationResponse(
        status="OK" if hs6_val is not None else "NOT_FOUND",
        hs6=hs6_val,
        hs_code_formatted=hs_code_formatted,
        product_description=description,
        match_type=resolved_match_type,
        confidence=confidence,
        candidates=candidates,
        model_version="catalogue-v1.0",
    ).model_dump()


@router.get(
    "/predict/hs-code/search",
    summary="Prefix & Substring Autocomplete Search for HS Codes",
    description="Returns top matching HS6 commodities for a search query as user types (e.g. 'b' -> Basmati Rice, Black Pepper, etc.)"
)
def search_hs_codes(q: str = "") -> Dict[str, Any]:
    loader = _load_catalogue()
    if loader is None:
        return {"status": "OK", "query": q, "count": 0, "results": []}

    cat = loader.get_product_catalogue()
    query_str = q.strip().lower()
    clean_digits = "".join([c for c in query_str if c.isdigit()])

    scored = []
    for _, row in cat.iterrows():
        desc = str(row["product_description"])
        hs_int = int(row["hs6"])
        hs_str = str(hs_int)
        hs_formatted = _format_hs6(hs_int)
        
        score = 0
        if clean_digits and (hs_str.startswith(clean_digits) or clean_digits in hs_str):
            score += 100
        if query_str and hs_formatted.lower().startswith(query_str):
            score += 90
        if query_str and desc.lower().startswith(query_str):
            score += 80
        elif query_str and any(w.startswith(query_str) for w in desc.lower().split()):
            score += 65
        elif query_str and query_str in desc.lower():
            score += 40
        elif not query_str:
            score = 10

        if score > 0:
            scored.append({
                "hs6": hs_int,
                "hs_code_formatted": hs_formatted,
                "product_description": desc,
                "score": score
            })

    scored.sort(key=lambda x: x["score"], reverse=True)
    top_results = scored[:8]

    return {
        "status": "OK",
        "query": q,
        "count": len(top_results),
        "results": top_results
    }

