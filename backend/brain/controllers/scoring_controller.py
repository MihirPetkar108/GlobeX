"""
GlobeXAI Trade OS — Composite Scoring & Document Verdict Router
Endpoints: POST /scoring/composite, POST /scoring/doc-verdict

Extracted from the n8n workflow's inline Code nodes ("Code — Synthesize All
Models" and "Code — Synthesize Doc Verdict") per docs/integration_architecture.md
§6: business logic (composite scoring weights, compliance threshold) belongs
in a real backend service, not hardcoded inside workflow JSON.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from brain.models.scoring.trade_composite_score import compute_composite_score, compute_doc_verdict

router = APIRouter(prefix="/scoring", tags=["Scoring"])


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class CompositeScoreRequest(BaseModel):
    hs6: Optional[int] = Field(default=None, description="6-digit HS product code", example=100630)
    market_score: Optional[float] = Field(default=None, description="Market opportunity score (0-100)", example=80.0)
    anomaly_score: Optional[float] = Field(default=None, description="Trade anomaly score (0-1)", example=0.1)
    risk_level: Optional[str] = Field(default=None, description="Anomaly risk level", example="LOW")
    cp_match_score: Optional[float] = Field(default=None, description="Counterparty match score (0-100)", example=90.0)
    cp_trust_score: Optional[float] = Field(default=None, description="Counterparty trust score (0-100)", example=85.0)
    compliance_score: Optional[float] = Field(default=None, description="Compliance score (0-100)", example=90.0)


class CompositeScoreResponse(BaseModel):
    composite_score: Optional[int]
    recommendation: str
    status: str
    missing_dimensions: List[str]


class DocVerdictRequest(BaseModel):
    ocr_status: Optional[str] = Field(default=None, description="OCR service status", example="OK")
    ocr_data_source: Optional[str] = Field(default=None, description="OCR data source ('stub' if not live)", example="live")
    compliance_score: Optional[float] = Field(default=None, description="Compliance score (0-100)", example=85.0)
    compliance_flags: Optional[List[str]] = Field(default=None, description="Compliance flags", example=[])


class DocVerdictResponse(BaseModel):
    status: str
    cleared_for_shipment: bool


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/composite",
    response_model=CompositeScoreResponse,
    summary="Composite Trade Score & Recommendation",
    description=(
        "Weighted composite score across market opportunity (0.35), compliance (0.25), "
        "trade anomaly (0.20, inverted), counterparty match (0.10), and counterparty "
        "trust (0.10). Only computed when every upstream dimension is present; otherwise "
        "reports which dimensions are missing rather than fabricating a fallback."
    ),
)
def composite_score(req: CompositeScoreRequest) -> Dict[str, Any]:
    result = compute_composite_score(
        hs6=req.hs6,
        market_score=req.market_score,
        anomaly_score=req.anomaly_score,
        risk_level=req.risk_level,
        cp_match_score=req.cp_match_score,
        cp_trust_score=req.cp_trust_score,
        compliance_score=req.compliance_score,
    )
    return {
        "composite_score": result.composite_score,
        "recommendation": result.recommendation,
        "status": result.status,
        "missing_dimensions": result.missing_dimensions,
    }


@router.post(
    "/doc-verdict",
    response_model=DocVerdictResponse,
    summary="Document Verification Verdict",
    description=(
        "Honest document-verification verdict: never claims VERIFIED/cleared unless "
        "OCR is live (not a stub) and the compliance score clears the threshold (70) "
        "with no blocking flags (MISSING_* / PROHIBITED)."
    ),
)
def doc_verdict(req: DocVerdictRequest) -> Dict[str, Any]:
    result = compute_doc_verdict(
        ocr_status=req.ocr_status,
        ocr_data_source=req.ocr_data_source,
        compliance_score=req.compliance_score,
        compliance_flags=req.compliance_flags,
    )
    return {
        "status": result.status,
        "cleared_for_shipment": result.cleared_for_shipment,
    }
