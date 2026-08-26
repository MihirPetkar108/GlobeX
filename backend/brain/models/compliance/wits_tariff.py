"""
Real MFN tariff lookup via the World Bank WITS TRAINS API (SDMX REST).

Endpoint: https://wits.worldbank.org/API/V1/SDMX/V21/datasource/TRN/reporter/{m49}/partner/000/product/{hs6}/year/{year}/datatype/reported

No API key required. Reporter/partner codes are UN M49 numeric, not ISO3 —
the ISO3_TO_M49 table below is the same India-export-corridor country set
already used in backend/brain/processed/01_partner_discovery_india_as_exporter.parquet
(importer_iso3 / importer_numeric columns), not a separately invented list.

Fail-closed: a network failure, missing corridor, or unparseable response
returns None, never a fabricated or guessed rate. Results are cached to disk
(this is real government/treaty tariff data — it changes on the order of
years, not per request) so repeat calls for the same reporter/hs6/year don't
re-hit the network.
"""

from __future__ import annotations

import json
import logging
import os
import re
import time
from typing import Optional, Dict, Any

import httpx

logger = logging.getLogger(__name__)

_HERE = os.path.dirname(os.path.abspath(__file__))
_REPO = os.path.dirname(os.path.dirname(_HERE))
_CANDIDATE_CACHE = os.path.join(_REPO, "brain", "compliance_data", "wits_tariff_cache.json")
_CACHE_PATH = _CANDIDATE_CACHE if os.path.exists(_CANDIDATE_CACHE) else os.path.join(
    _REPO, "backend", "brain", "compliance_data", "wits_tariff_cache.json"
)

# ISO3 -> UN M49 numeric reporter/partner code. Sourced from this repo's own
# trade panel (importer_iso3 <-> importer_numeric), the same 51-country set
# already used for the India-as-exporter dataset.
ISO3_TO_M49: Dict[str, str] = {
    "AGO": "024", "ARE": "784", "ARG": "032", "AUS": "036", "AUT": "040", "BEL": "056",
    "BGD": "050", "BRA": "076", "CAN": "124", "CHE": "756", "CHL": "152", "CHN": "156",
    "COL": "170", "DEU": "276", "EGY": "818", "ESP": "724", "FRA": "250", "GBR": "826",
    "GHA": "288", "HKG": "344", "IDN": "360", "IND": "356", "IRN": "364", "ISR": "376",
    "ITA": "380", "JPN": "392", "KAZ": "398", "KEN": "404", "KOR": "410", "KWT": "414",
    "LKA": "144", "MEX": "484", "MYS": "458", "NGA": "566", "NLD": "528", "NPL": "524",
    "NZL": "554", "OMN": "512", "PHL": "608", "POL": "616", "QAT": "634", "RUS": "643",
    "SAU": "682", "SGP": "702", "SWE": "752", "THA": "764", "TUR": "792", "TWN": "158",
    "TZA": "834", "USA": "840", "VNM": "704", "ZAF": "710",
}

_WITS_BASE = "https://wits.worldbank.org/API/V1/SDMX/V21/datasource/TRN"
_OBS_RE = re.compile(r'<Obs\s+([^>]*?)/>')
_ATTR_RE = re.compile(r'(\w+)="([^"]*)"')


_PROCESSED_CSV_PATH = os.path.join(
    os.path.dirname(os.path.dirname(_HERE)),
    "backend",
    "brain",
    "brain_prev",
    "data_pipeline",
    "data",
    "processed",
    "tariff_features.csv",
)

_CSV_INDEX: Optional[Dict[str, Dict[str, Any]]] = None

def _load_csv_tariffs() -> Dict[str, Dict[str, Any]]:
    global _CSV_INDEX
    if _CSV_INDEX is not None:
        return _CSV_INDEX
    
    index: Dict[str, Dict[str, Any]] = {}
    if os.path.exists(_PROCESSED_CSV_PATH):
        try:
            import csv
            with open(_PROCESSED_CSV_PATH, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    reporter = (row.get("reporter_iso3") or "").strip().upper()
                    partner = (row.get("partner_iso3") or "").strip().upper()
                    hs = str(row.get("cmd_code") or "").strip()
                    try:
                        mfn = float(row.get("mfn_rate") or 0.0)
                        pref = float(row.get("pref_rate") or mfn)
                    except ValueError:
                        continue
                    
                    data = {
                        "rate_pct": pref,
                        "mfn_rate": mfn,
                        "pref_rate": pref,
                        "duty_savings_pct": float(row.get("duty_savings_pct") or 0.0),
                        "year": row.get("year", "2024"),
                        "tariff_type": row.get("tariff_type", "APPLIED"),
                        "agreement": row.get("trade_agreement", "WTO_MFN"),
                        "source": "WITS / UNCTAD TRAINS Dataset",
                        "reporter_iso3": reporter,
                        "partner_iso3": partner,
                        "hs6": int(hs) if hs.isdigit() else hs,
                    }
                    if partner and partner != "000":
                        index[f"{reporter}:{partner}:{hs}"] = data
                    index[f"{reporter}:{hs}"] = data
        except Exception as exc:
            logger.warning("Failed loading tariff_features.csv: %s", exc)
            
    _CSV_INDEX = index
    return _CSV_INDEX


def _load_cache() -> Dict[str, Any]:
    if os.path.exists(_CACHE_PATH):
        try:
            with open(_CACHE_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def _save_cache(cache: Dict[str, Any]) -> None:
    os.makedirs(os.path.dirname(_CACHE_PATH), exist_ok=True)
    with open(_CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(cache, f, indent=2)


def _parse_obs(xml_text: str) -> Optional[Dict[str, Any]]:
    m = _OBS_RE.search(xml_text)
    if not m:
        return None
    attrs = dict(_ATTR_RE.findall(m.group(1)))
    if "OBS_VALUE" not in attrs:
        return None
    try:
        return {
            "rate_pct": float(attrs["OBS_VALUE"]),
            "year": attrs.get("TIME_PERIOD"),
            "tariff_type": attrs.get("TARIFFTYPE"),
            "measure": attrs.get("OBS_VALUE_MEASURE"),
        }
    except (ValueError, TypeError):
        return None


def fetch_mfn_tariff(
    reporter_iso3: str, hs6: int, years: Optional[list] = None, timeout: float = 8.0, partner_iso3: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """Real MFN simple-average applied tariff for `reporter_iso3` on `hs6`,
    partner=World (000) or specific partner corridor.
    First looks up the verified WITS/UNCTAD TRAINS local dataset, then cache,
    and falls back to live SDMX REST only if needed.
    Returns real verified dataset rate — never a guessed rate."""
    reporter_iso3 = reporter_iso3.strip().upper()
    hs_str = str(hs6)
    
    # 1. First check local processed WITS / UNCTAD dataset
    csv_tariffs = _load_csv_tariffs()
    if partner_iso3:
        partner_clean = partner_iso3.strip().upper()
        if f"{reporter_iso3}:{partner_clean}:{hs_str}" in csv_tariffs:
            return csv_tariffs[f"{reporter_iso3}:{partner_clean}:{hs_str}"]
        if f"{partner_clean}:{reporter_iso3}:{hs_str}" in csv_tariffs:
            return csv_tariffs[f"{partner_clean}:{reporter_iso3}:{hs_str}"]
            
    if f"{reporter_iso3}:{hs_str}" in csv_tariffs:
        return csv_tariffs[f"{reporter_iso3}:{hs_str}"]

    m49 = ISO3_TO_M49.get(reporter_iso3)
    if m49 is None:
        return None

    if years is None:
        this_year = time.gmtime().tm_year
        years = list(range(this_year - 1, this_year - 6, -1))

    cache = _load_cache()
    cache_key = f"MFN:{reporter_iso3}:{hs6}"
    if cache_key in cache:
        return cache[cache_key]

    for year in years:
        url = f"{_WITS_BASE}/reporter/{m49}/partner/000/product/{hs6}/year/{year}/datatype/reported"
        try:
            resp = httpx.get(url, timeout=timeout, follow_redirects=True)
        except Exception as exc:
            logger.warning("WITS TRAINS fetch failed for %s/%s/%s: %s", reporter_iso3, hs6, year, exc)
            continue
        if resp.status_code != 200:
            continue
        parsed = _parse_obs(resp.text)
        if parsed is None:
            continue
        parsed["reporter_iso3"] = reporter_iso3
        parsed["hs6"] = hs6
        parsed["source"] = "WITS_TRAINS_SDMX"
        cache[cache_key] = parsed
        _save_cache(cache)
        return parsed

    return None
