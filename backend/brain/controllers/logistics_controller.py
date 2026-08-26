"""
GlobeXAI Trade OS — Logistics & Shipping ETA Router
Endpoint: GET /api/v1/logistics/shipping-eta

Evidence-backed ocean-freight transit time estimate from an Indian export
port to a buyer's geolocated coordinates. See src/services/shipping_eta.py
for methodology and cited sources.
"""

from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Query

from brain.services.shipping_eta import estimate_shipping_eta
from brain.services.profit_calculator import estimate_profit

router = APIRouter(tags=["Logistics"], prefix="/api/v1/logistics")


@router.get(
    "/shipping-eta",
    summary="Evidence-backed ocean-freight ETA to buyer coordinates",
    description=(
        "Estimates ocean-freight transit time from an Indian export port to the "
        "buyer's geolocated coordinates, using the standard maritime "
        "distance/speed formula plus port dwell buffers. Every constant is "
        "cited in the response's `sources` field — see src/services/shipping_eta.py."
    ),
)
def shipping_eta(
    dest_lat: float = Query(..., description="Buyer's latitude (from browser geolocation)"),
    dest_lng: float = Query(..., description="Buyer's longitude (from browser geolocation)"),
    origin_port_hint: Optional[str] = Query(None, description="Listing's originPort text, used to pick the nearest Indian export hub"),
    dest_country_iso3: Optional[str] = Query(None, description="Buyer's ISO3 country, used to prefer a same-country port"),
) -> Dict[str, Any]:
    result = estimate_shipping_eta(
        dest_lat=dest_lat,
        dest_lng=dest_lng,
        origin_port_hint=origin_port_hint,
        dest_country_iso3=dest_country_iso3,
    )
    return {"status": "OK", **result}


@router.get(
    "/profit-estimate",
    summary="Evidence-backed export profit estimate",
    description=(
        "Estimates net profit for an Indian exporter on a given FOB listing "
        "shipped to a destination country, using a sourced cost model "
        "(freight, origin handling, marine insurance, GST, export duty). "
        "See docs/DATA_METHODOLOGY.md#4-export-profit-calculator for every "
        "constant's citation. RoDTEP is shown as a bounded range, never "
        "added to the headline profit figure, since real rates are per-HS6."
    ),
)
def profit_estimate(
    fob_unit_price_usd: float = Query(..., gt=0, description="FOB unit price in USD"),
    quantity_kg: float = Query(..., gt=0, description="Shipment quantity in kg"),
    destination_country_iso3: str = Query(..., description="Buyer's ISO3 country code"),
    export_duty_rate: Optional[float] = Query(None, ge=0, le=1, description="Override the 0% default export duty rate (0-1) if this HS6's real rate is known"),
) -> Dict[str, Any]:
    result = estimate_profit(
        fob_unit_price_usd=fob_unit_price_usd,
        quantity_kg=quantity_kg,
        destination_country_iso3=destination_country_iso3,
        export_duty_rate=export_duty_rate,
    )
    return {"status": "OK", **result}
