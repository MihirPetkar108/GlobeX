"""Real tests for the two decision functions extracted from the n8n workflow
JSON ("Code — Synthesize Doc Verdict", "Code — Synthesize All Models") into
src/api/compliance_api.py (GitHub issue #5). Same thresholds/weights as the
original inline JS — these tests pin that behavior so it can't silently drift
now that it's editable outside the workflow file.
"""

from brain.controllers.compliance_controller import (
    DocVerdictRequest,
    doc_verdict,
    TradeSynthesisRequest,
    trade_synthesis,
)


# ---------------------------------------------------------------------------
# doc_verdict
# ---------------------------------------------------------------------------

def test_doc_verdict_stub_ocr_never_verified():
    result = doc_verdict(DocVerdictRequest(
        ocr_status="STUB", ocr_data_source="stub", compliance_score=95,
    ))
    assert result["status"] == "OCR_STUB_NOT_LIVE"
    assert result["cleared_for_shipment"] is False


def test_doc_verdict_live_ocr_missing_compliance_score():
    result = doc_verdict(DocVerdictRequest(
        ocr_status="COMPLETED", ocr_data_source="live", compliance_score=None,
    ))
    assert result["status"] == "COMPLIANCE_UNAVAILABLE"
    assert result["cleared_for_shipment"] is False


def test_doc_verdict_below_threshold_requires_review():
    result = doc_verdict(DocVerdictRequest(
        ocr_status="COMPLETED", ocr_data_source="live", compliance_score=69.9,
    ))
    assert result["status"] == "REVIEW_REQUIRED"
    assert result["cleared_for_shipment"] is False


def test_doc_verdict_blocking_flag_overrides_high_score():
    result = doc_verdict(DocVerdictRequest(
        ocr_status="COMPLETED", ocr_data_source="live", compliance_score=99,
        compliance_flags=["MISSING_PHYTOSANITARY_CERT"],
    ))
    assert result["status"] == "REVIEW_REQUIRED"
    assert result["cleared_for_shipment"] is False


def test_doc_verdict_verified_when_live_and_clear():
    result = doc_verdict(DocVerdictRequest(
        ocr_status="COMPLETED", ocr_data_source="live", compliance_score=70,
    ))
    assert result["status"] == "VERIFIED"
    assert result["cleared_for_shipment"] is True


# ---------------------------------------------------------------------------
# trade_synthesis
# ---------------------------------------------------------------------------

def _full_request(**overrides):
    base = dict(
        hs6=100630,
        market_score=80,
        anomaly_score=0.1,   # -> (100 - 10) = 90 contribution basis
        risk_level="LOW",
        counterparty_match_score=85,
        counterparty_trust_score=90,
        compliance_score=88,
    )
    base.update(overrides)
    return TradeSynthesisRequest(**base)


def test_trade_synthesis_composite_score_matches_weighted_formula():
    result = trade_synthesis(_full_request())
    expected = round(0.35 * 80 + 0.25 * 88 + 0.20 * (100 - 0.1 * 100) + 0.10 * 85 + 0.10 * 90)
    assert result["status"] == "SUCCESS"
    assert result["missing_dimensions"] == []
    assert result["composite_score"] == expected


def test_trade_synthesis_proceed_requires_high_score_and_safe_risk():
    result = trade_synthesis(_full_request(market_score=95, compliance_score=95))
    assert result["composite_score"] >= 75
    assert result["recommendation"] == "PROCEED"


def test_trade_synthesis_critical_risk_forces_avoid_even_with_high_score():
    result = trade_synthesis(_full_request(market_score=95, compliance_score=95, risk_level="CRITICAL"))
    assert result["composite_score"] >= 75
    assert result["recommendation"] == "AVOID"


def test_trade_synthesis_low_score_is_avoid():
    result = trade_synthesis(_full_request(market_score=10, compliance_score=10, counterparty_match_score=10, counterparty_trust_score=10))
    assert result["composite_score"] < 45
    assert result["recommendation"] == "AVOID"


def test_trade_synthesis_missing_dimension_never_fabricates_a_composite():
    result = trade_synthesis(_full_request(compliance_score=None))
    assert result["status"] == "PARTIAL"
    assert "compliance" in result["missing_dimensions"]
    assert result["composite_score"] is None
    assert result["recommendation"] == "REVIEW"


def test_trade_synthesis_everything_missing_is_failed_not_partial():
    result = trade_synthesis(TradeSynthesisRequest())
    assert result["status"] == "FAILED"
    assert len(result["missing_dimensions"]) == 6
    assert result["composite_score"] is None
    assert result["recommendation"] == "UNSUPPORTED"
