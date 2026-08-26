"""
GlobeXAI Trade OS — Trade Composite Score & Document Verdict logic.

Ported 1:1 from the n8n workflow's inline Code nodes
(backend/brain/n8n/globex_trade_automation.workflow.json):

  - "Code — Synthesize Doc Verdict"   -> compute_doc_verdict()
  - "Code — Synthesize All Models"    -> compute_composite_score()

Per docs/integration_architecture.md §6, business logic (the compliance
threshold and the composite scoring weights) must live in a real backend
service, not hardcoded inside workflow JSON. This module is that service
logic; the n8n Code nodes now call the /scoring/* HTTP endpoints
(src/api/scoring_api.py) instead of computing this inline.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional


# ---------------------------------------------------------------------------
# Document Verdict — ported from "Code — Synthesize Doc Verdict"
# ---------------------------------------------------------------------------

@dataclass
class DocVerdictResult:
    status: str
    cleared_for_shipment: bool


def compute_doc_verdict(
    ocr_status: Optional[str],
    ocr_data_source: Optional[str],
    compliance_score: Optional[float],
    compliance_flags: Optional[List[str]] = None,
) -> DocVerdictResult:
    """Exact port of the JS verdict logic:

    const ocrIsLive = ocr.data_source && ocr.data_source !== 'stub' && ocr.status !== 'STUB';
    const hasBlockingFlag = flags.some(f => f.includes('MISSING_') || f.includes('PROHIBITED'));
    if (!ocrIsLive) -> OCR_STUB_NOT_LIVE, cleared=false
    else if (complianceScore === null) -> COMPLIANCE_UNAVAILABLE, cleared=false
    else if (hasBlockingFlag || complianceScore < 70) -> REVIEW_REQUIRED, cleared=false
    else -> VERIFIED, cleared=true
    """
    flags = compliance_flags or []

    ocr_is_live = bool(ocr_data_source) and ocr_data_source != "stub" and ocr_status != "STUB"
    has_blocking_flag = any(
        ("MISSING_" in str(f)) or ("PROHIBITED" in str(f)) for f in flags
    )

    if not ocr_is_live:
        return DocVerdictResult(status="OCR_STUB_NOT_LIVE", cleared_for_shipment=False)
    if compliance_score is None:
        return DocVerdictResult(status="COMPLIANCE_UNAVAILABLE", cleared_for_shipment=False)
    if has_blocking_flag or compliance_score < 70:
        return DocVerdictResult(status="REVIEW_REQUIRED", cleared_for_shipment=False)
    return DocVerdictResult(status="VERIFIED", cleared_for_shipment=True)


# ---------------------------------------------------------------------------
# Composite Score — ported from "Code — Synthesize All Models"
# ---------------------------------------------------------------------------

_MARKET_WEIGHT = 0.35
_COMPLIANCE_WEIGHT = 0.25
_ANOMALY_WEIGHT = 0.20
_CP_MATCH_WEIGHT = 0.10
_CP_TRUST_WEIGHT = 0.10


@dataclass
class CompositeScoreResult:
    composite_score: Optional[int]
    recommendation: str
    status: str
    missing_dimensions: List[str] = field(default_factory=list)


def compute_composite_score(
    hs6: Optional[int],
    market_score: Optional[float],
    anomaly_score: Optional[float],
    risk_level: Optional[str],
    cp_match_score: Optional[float],
    cp_trust_score: Optional[float],
    compliance_score: Optional[float],
) -> CompositeScoreResult:
    """Exact port of the JS composite-scoring logic.

    Weights (unchanged from the original node):
      market=0.35, compliance=0.25, anomaly(inverted)=0.20,
      counterparty_match=0.10, counterparty_trust=0.10

    compositeScore = round(
        0.35 * marketScore +
        0.25 * complianceScore +
        0.20 * (100 - anomalyScore * 100) +
        0.10 * cpMatchScore +
        0.10 * cpTrustScore
    )   -- only when every dimension is present (missing.length === 0)

    recommendation:
      missing.length === 0            -> status SUCCESS
        composite >= 75 and risk_level not in (CRITICAL, HIGH) -> PROCEED
        composite < 45 or risk_level == CRITICAL                -> AVOID
        else                                                     -> REVIEW
      0 < missing.length < 6           -> status PARTIAL, recommendation REVIEW
      missing.length == 6 (all)        -> status FAILED, recommendation UNSUPPORTED
    """
    missing: List[str] = []
    if hs6 is None:
        missing.append("hs_classification")
    if market_score is None:
        missing.append("market_opportunity")
    if anomaly_score is None or risk_level is None:
        missing.append("trade_anomaly")
    if cp_match_score is None:
        missing.append("counterparty_match")
    if cp_trust_score is None:
        missing.append("counterparty_risk")
    if compliance_score is None:
        missing.append("compliance")

    can_composite = len(missing) == 0
    composite_score: Optional[int] = None
    if can_composite:
        composite_score = round(
            _MARKET_WEIGHT * market_score
            + _COMPLIANCE_WEIGHT * compliance_score
            + _ANOMALY_WEIGHT * (100 - anomaly_score * 100)
            + _CP_MATCH_WEIGHT * cp_match_score
            + _CP_TRUST_WEIGHT * cp_trust_score
        )

    recommendation = "UNSUPPORTED"
    status = "FAILED"
    if len(missing) == 0:
        status = "SUCCESS"
        if composite_score >= 75 and risk_level not in ("CRITICAL", "HIGH"):
            recommendation = "PROCEED"
        elif composite_score < 45 or risk_level == "CRITICAL":
            recommendation = "AVOID"
        else:
            recommendation = "REVIEW"
    elif len(missing) < 6:
        status = "PARTIAL"
        recommendation = "REVIEW"

    return CompositeScoreResult(
        composite_score=composite_score,
        recommendation=recommendation,
        status=status,
        missing_dimensions=missing,
    )


if __name__ == "__main__":
    # Quick parity assertions against the original JS node's known behavior.

    # Case 1: all dimensions present, strong scores -> PROCEED
    r1 = compute_composite_score(
        hs6=100630, market_score=80, anomaly_score=0.1, risk_level="LOW",
        cp_match_score=90, cp_trust_score=85, compliance_score=90,
    )
    # composite = round(0.35*80 + 0.25*90 + 0.20*90 + 0.10*90 + 0.10*85)
    #           = round(28 + 22.5 + 18 + 9 + 8.5) = round(86.0) = 86
    assert r1.composite_score == 86, r1
    assert r1.status == "SUCCESS" and r1.recommendation == "PROCEED", r1

    # Case 2: weak scores -> AVOID
    r2 = compute_composite_score(
        hs6=100630, market_score=20, anomaly_score=0.5, risk_level="LOW",
        cp_match_score=10, cp_trust_score=10, compliance_score=20,
    )
    # composite = round(7 + 5 + 10 + 1 + 1) = 24 -> < 45 -> AVOID
    assert r2.composite_score == 24, r2
    assert r2.status == "SUCCESS" and r2.recommendation == "AVOID", r2

    # Case 3: one missing dimension (hs6 None) -> PARTIAL/REVIEW, composite None
    r3 = compute_composite_score(
        hs6=None, market_score=80, anomaly_score=0.1, risk_level="LOW",
        cp_match_score=90, cp_trust_score=85, compliance_score=90,
    )
    assert r3.composite_score is None, r3
    assert r3.status == "PARTIAL" and r3.recommendation == "REVIEW", r3
    assert r3.missing_dimensions == ["hs_classification"], r3

    # Doc verdict cases
    d1 = compute_doc_verdict("OK", "live", 80, [])
    assert d1.status == "VERIFIED" and d1.cleared_for_shipment is True, d1

    d2 = compute_doc_verdict("OK", "stub", 80, [])
    assert d2.status == "OCR_STUB_NOT_LIVE" and d2.cleared_for_shipment is False, d2

    d3 = compute_doc_verdict("OK", "live", 60, [])
    assert d3.status == "REVIEW_REQUIRED" and d3.cleared_for_shipment is False, d3

    d4 = compute_doc_verdict("OK", "live", 90, ["MISSING_APEDA_CERTIFICATION"])
    assert d4.status == "REVIEW_REQUIRED" and d4.cleared_for_shipment is False, d4

    print("All trade_composite_score parity assertions passed.")
