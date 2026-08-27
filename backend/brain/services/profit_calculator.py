"""
GlobeXAI Trade OS — Export Profit Calculator

Estimates net profit for an Indian exporter on a given FOB listing shipped to
a destination country. Every non-zero cost component is sourced — see
docs/DATA_METHODOLOGY.md section 4 and
backend/brain/datasets/final/reference_data/profit_calculator_cost_assumptions.csv
for the full citation table. Nothing here is a silent guess: estimates are
labeled as such in the response, and RoDTEP (a real rebate, not a cost) is
surfaced as a bounded range rather than baked into the headline number,
because its real rate is per-HS6 and this module has no per-HS6 rate table.
"""

from __future__ import annotations

import csv
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, Optional

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
_CANDIDATE_FREIGHT = PROJECT_ROOT / "brain" / "datasets" / "final" / "reference_data" / "freight_rate_by_country_2021.csv"
FREIGHT_RATE_CSV = _CANDIDATE_FREIGHT if _CANDIDATE_FREIGHT.exists() else PROJECT_ROOT / "backend" / "brain" / "datasets" / "final" / "reference_data" / "freight_rate_by_country_2021.csv"

# GST on export invoices: verified 0% for LUT-filing exporters (zero-rated
# supply under IGST Act s.16) — not an estimate.
GST_RATE = 0.0

# Customs export duty: 0% default. True for most HS codes; a small set
# (iron ore, some hides/leather) carry a real export duty this module does
# not model per-HS6. Surfaced via `export_duty_note` in the response.
DEFAULT_EXPORT_DUTY_RATE = 0.0

# Estimate: midpoint of a market-sourced "40-60% on top of base ocean
# freight" range for CHA/CFS/inland-haulage/THC/documentation costs. No
# single official Indian government rate exists for this bundle.
ORIGIN_HANDLING_RATE_OF_FREIGHT = 0.5

# Estimate: midpoint of a market-sourced 0.1%-0.5% marine insurance range.
MARINE_INSURANCE_RATE_OF_FOB = 0.003

# RoDTEP is a real rebate (income), but its rate is set per-HS6 in DGFT
# Appendix 4R/4RE (0.3%-4.3% of FOB) — no single rate is accurate across
# products, so it is shown only as this bounded range, never defaulted into
# net profit.
RODTEP_RATE_RANGE = (0.003, 0.043)

FALLBACK_FREIGHT_RATE_USD_PER_KG = 0.105  # UNCTAD "World" average, 2021 — used only if a country has no row


@lru_cache(maxsize=1)
def _load_freight_rates() -> Dict[str, Dict[str, Any]]:
    candidates = [
        FREIGHT_RATE_CSV,
        PROJECT_ROOT / "brain" / "datasets" / "final" / "reference_data" / "freight_rate_by_country_2021.csv",
        PROJECT_ROOT / "backend" / "brain" / "datasets" / "final" / "reference_data" / "freight_rate_by_country_2021.csv",
        Path("backend/brain/datasets/final/reference_data/freight_rate_by_country_2021.csv"),
    ]
    target_csv = next((c for c in candidates if c.exists()), None)
    if not target_csv:
        return {}
    rates: Dict[str, Dict[str, Any]] = {}
    try:
        with open(target_csv, encoding="utf-8") as f:
            for row in csv.DictReader(f):
                rates[row["country_iso3"].strip().upper()] = {
                    "region": row["un_m49_subregion"],
                    "rate_usd_per_kg": float(row["freight_rate_usd_per_kg_2021"]),
                    "source": row["source"],
                }
    except Exception:
        return {}
    return rates


def estimate_profit(
    fob_unit_price_usd: float,
    quantity_kg: float,
    destination_country_iso3: str,
    export_duty_rate: Optional[float] = None,
) -> Dict[str, Any]:
    rates = _load_freight_rates()
    iso3 = (destination_country_iso3 or "").strip().upper()
    rate_entry = rates.get(iso3)

    if rate_entry is not None:
        freight_rate = rate_entry["rate_usd_per_kg"]
        freight_rate_is_fallback = False
        freight_region = rate_entry["region"]
    else:
        freight_rate = FALLBACK_FREIGHT_RATE_USD_PER_KG
        freight_rate_is_fallback = True
        freight_region = None

    duty_rate = DEFAULT_EXPORT_DUTY_RATE if export_duty_rate is None else export_duty_rate

    revenue = fob_unit_price_usd * quantity_kg
    ocean_freight = freight_rate * quantity_kg
    origin_handling = ocean_freight * ORIGIN_HANDLING_RATE_OF_FREIGHT
    marine_insurance = revenue * MARINE_INSURANCE_RATE_OF_FOB
    gst = revenue * GST_RATE
    export_duty = revenue * duty_rate

    total_costs = ocean_freight + origin_handling + marine_insurance + gst + export_duty
    net_profit = revenue - total_costs
    margin_pct = (net_profit / revenue * 100.0) if revenue > 0 else 0.0

    rodtep_low = revenue * RODTEP_RATE_RANGE[0]
    rodtep_high = revenue * RODTEP_RATE_RANGE[1]

    return {
        "revenue_usd": round(revenue, 2),
        "costs": {
            "ocean_freight_usd": round(ocean_freight, 2),
            "origin_handling_usd": round(origin_handling, 2),
            "marine_insurance_usd": round(marine_insurance, 2),
            "gst_usd": round(gst, 2),
            "export_duty_usd": round(export_duty, 2),
            "total_costs_usd": round(total_costs, 2),
        },
        "net_profit_usd": round(net_profit, 2),
        "net_margin_pct": round(margin_pct, 2),
        "rodtep_rebate_range_usd": [round(rodtep_low, 2), round(rodtep_high, 2)],
        "rodtep_included_in_profit": False,
        "freight": {
            "rate_usd_per_kg": freight_rate,
            "region": freight_region,
            "is_fallback_world_average": freight_rate_is_fallback,
        },
        "assumptions": {
            "gst_rate": {"value": GST_RATE, "status": "verified", "note": "Zero-rated export under LUT (IGST Act s.16)."},
            "export_duty_rate": {"value": duty_rate, "status": "default", "note": "0% default — true for most HS codes; a small set (iron ore, some hides/leather) carry real export duty not modelled per-HS6 here."},
            "origin_handling_rate_of_freight": {"value": ORIGIN_HANDLING_RATE_OF_FREIGHT, "status": "estimate", "note": "Midpoint of a market-sourced 40-60% CHA/CFS/inland-haulage/THC add-on range; no official Indian rate exists."},
            "marine_insurance_rate_of_fob": {"value": MARINE_INSURANCE_RATE_OF_FOB, "status": "estimate", "note": "Midpoint of a market-sourced 0.1-0.5% range."},
            "rodtep_rate_range": {"value": list(RODTEP_RATE_RANGE), "status": "range_only_not_applied", "note": "Real rate is per-HS6 (DGFT Appendix 4R/4RE); shown as a bounded range, not added to net profit."},
        },
        "sources_doc": "docs/DATA_METHODOLOGY.md#4-export-profit-calculator",
    }
