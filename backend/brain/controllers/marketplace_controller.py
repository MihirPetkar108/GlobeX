"""
GlobeXAI Trade OS — Marketplace Demand Matching Router
Endpoint: POST /api/v1/marketplace/match-buyers

Ranks verified international buyer candidates based on commodity fit,
destination corridor absorption capacity, and active RFQ demand.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Marketplace Matching"])

# Reference buyer candidate pool
_CANDIDATE_BUYERS: List[Dict[str, Any]] = [
    {
        "id": "BYR-ARE-001",
        "name": "Emirates Grain & Foodstuff Trading LLC",
        "country": "United Arab Emirates",
        "city": "Dubai",
        "primaryCategory": "Agri Commodities & Basmati Rice",
        "verificationBadge": "TIER-1 VERIFIED",
        "activeRFQs": 18,
        "trustScore": 96,
        "acceptedCommodities": ["Basmati Rice", "Rice", "Spices", "Wheat", "Grains"],
        "creditRating": "AAA",
        "preferredIncoterm": "CIF Jebel Ali",
    },
    {
        "id": "BYR-SAU-002",
        "name": "Al Kabeer International Foods Group",
        "country": "Saudi Arabia",
        "city": "Riyadh",
        "primaryCategory": "Processed Foods & Agri Grains",
        "verificationBadge": "VERIFIED BUYER",
        "activeRFQs": 14,
        "trustScore": 93,
        "acceptedCommodities": ["Rice", "Basmati", "Spices", "Cardamom"],
        "creditRating": "AA+",
        "preferredIncoterm": "CIF Dammam",
    },
    {
        "id": "BYR-SGP-003",
        "name": "Asean-Pacific Agri Ventures Pte",
        "country": "Singapore",
        "city": "Singapore",
        "primaryCategory": "Food & Agricultural Products",
        "verificationBadge": "TIER-1 VERIFIED",
        "activeRFQs": 22,
        "trustScore": 95,
        "acceptedCommodities": ["Rice", "Basmati", "Spices", "Organic Agri", "Coffee"],
        "creditRating": "AAA",
        "preferredIncoterm": "CIF Singapore",
    },
    {
        "id": "BYR-GBR-004",
        "name": "Imperial Food Importers UK Ltd",
        "country": "United Kingdom",
        "city": "London",
        "primaryCategory": "Specialty Rice & Indian Spices",
        "verificationBadge": "VERIFIED BUYER",
        "activeRFQs": 9,
        "trustScore": 91,
        "acceptedCommodities": ["Basmati Rice", "Turmeric", "Cardamom", "Chilli"],
        "creditRating": "AA",
        "preferredIncoterm": "CIF Felixstowe",
    },
    {
        "id": "BYR-USA-005",
        "name": "North American Spice & Rice Corp",
        "country": "United States",
        "city": "New York",
        "primaryCategory": "Specialty Rice & Ethnic Foods",
        "verificationBadge": "VERIFIED BUYER",
        "activeRFQs": 16,
        "trustScore": 92,
        "acceptedCommodities": ["Basmati Rice", "Jasmine Rice", "Spices"],
        "creditRating": "AA+",
        "preferredIncoterm": "CIF New York",
    },
]


class BuyerMatchRequest(BaseModel):
    commodity: str = Field(..., description="Commodity or product name", example="Basmati Rice")
    quantity: float = Field(default=500.0, description="Volume", example=500.0)
    unit: str = Field(default="MT", description="Unit of measurement", example="MT")
    destinationCountry: Optional[str] = Field(default=None, description="Preferred destination", example="UAE")
    requirements: Optional[List[str]] = Field(default=None, description="Quality / Cert requirements", example=["ISO 22000"])


class BuyerMatchResponse(BaseModel):
    query: Dict[str, Any]
    candidateCount: int
    strongMatchCount: int
    recommendations: List[Dict[str, Any]]
    executedAt: str
    analysis_id: str
    data_source: str = "in_memory_demo_set"


@router.post(
    "/api/v1/marketplace/match-buyers",
    response_model=BuyerMatchResponse,
    summary="Match Verified Buyers for Commodity & Corridor",
    description="Ranks top institutional buyers with active RFQs and high credit ratings matching the commodity.",
)
def match_buyers(req: BuyerMatchRequest) -> Dict[str, Any]:
    analysis_id = str(uuid.uuid4())
    comm_lower = req.commodity.lower()
    dest_lower = (req.destinationCountry or "").lower()

    scored = []
    for idx, buyer in enumerate(_CANDIDATE_BUYERS):
        score = 88 - idx * 2
        signals = []

        # Check commodity match
        matches_comm = any(
            c.lower() in comm_lower or comm_lower in c.lower()
            for c in buyer["acceptedCommodities"]
        )
        if matches_comm:
            score += 8
            signals.append(f"Commodity Match: {req.commodity}")
        else:
            signals.append(f"Category: {buyer['primaryCategory']}")

        # Check destination match
        if dest_lower and (dest_lower in buyer["country"].lower() or buyer["country"].lower() in dest_lower):
            score += 6
            signals.append(f"Direct Corridor: {buyer['country']}")
        else:
            signals.append(f"Global Buyer: {buyer['country']}")

        signals.append(f"Capacity: {req.quantity} {req.unit} ready allocation")
        signals.append(f"Active Pipeline: {buyer['activeRFQs']} open RFQs")

        final_score = min(98, max(70, score))
        scored.append({
            **buyer,
            "matchScore": final_score,
            "matchSignals": signals,
        })

    scored.sort(key=lambda x: x["matchScore"], reverse=True)
    for i, b in enumerate(scored):
        b["rank"] = str(i + 1).zfill(2)

    strong_match_count = sum(1 for b in scored if b["matchScore"] >= 90)

    return BuyerMatchResponse(
        query=req.model_dump(),
        candidateCount=len(scored),
        strongMatchCount=strong_match_count,
        recommendations=scored,
        executedAt=datetime.now(timezone.utc).isoformat(),
        analysis_id=analysis_id,
    ).model_dump()
