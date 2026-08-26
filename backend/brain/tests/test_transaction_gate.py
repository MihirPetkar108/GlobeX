"""Real tests for src/compliance/transaction_gate.py.

Uses the actual current_facts and entity_screening registries — no mocks,
except one isolated test for the CLEAR branch (see its docstring for why).
"""

import os
from unittest.mock import patch

import pytest

from brain.models.compliance.transaction_gate import GateDecision, GateInput, evaluate_transaction
from brain.models.compliance.current_facts import FactStatus

_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_BRAIN_DIR = os.path.dirname(_THIS_DIR)
_CANDIDATES = [
    os.path.join(_BRAIN_DIR, "compliance_data", "sanctions_entities", "normalized_entities.json"),
    os.path.join(os.path.dirname(_BRAIN_DIR), "brain", "compliance_data", "sanctions_entities", "normalized_entities.json"),
    os.path.join(os.path.dirname(_BRAIN_DIR), "backend", "brain", "compliance_data", "sanctions_entities", "normalized_entities.json"),
]
_ENTITY_REGISTRY = next((c for c in _CANDIDATES if os.path.exists(c)), _CANDIDATES[0])

pytestmark = pytest.mark.skipif(
    not os.path.exists(_ENTITY_REGISTRY),
    reason="Entity registry not built — run build_registry.py first",
)


def test_blocked_on_restricted_party_match():
    """A confirmed OFAC SDN match must BLOCK regardless of everything else,
    and must disable escrow."""
    result = evaluate_transaction(GateInput(
        trade_id="t-1",
        hs6="090121",
        origin="IND",
        destination="ARE",
        exporter_name="AEROCARIBBEAN AIRLINES",  # real OFAC SDN entity
        importer_name="Some Random Legit Trading Co",
    ))
    assert result.decision == GateDecision.BLOCKED
    assert result.recommendation == "BLOCK"
    assert result.escrow_allowed is False
    assert any("restricted-party match" in r.lower() for r in result.reasons)


def test_unsupported_on_out_of_scope_corridor():
    """A corridor/product outside the current-facts registry's scope must be
    UNSUPPORTED, never silently treated as CLEAR."""
    result = evaluate_transaction(GateInput(
        trade_id="t-2",
        hs6="999999",  # not a real HS6 in scope
        origin="IND",
        destination="ZZZ",  # not a real country
        exporter_name="Some Random Legit Trading Co",
        importer_name="Another Random Legit Trading Co",
    ))
    assert result.decision == GateDecision.UNSUPPORTED
    assert result.recommendation == "UNSUPPORTED"
    assert result.escrow_allowed is False


def test_review_on_partial_coverage_real_corridor():
    """A real in-scope corridor with partial current-facts coverage (a
    documented, real gap — not a test artifact) must be REVIEW, not CLEAR."""
    result = evaluate_transaction(GateInput(
        trade_id="t-3",
        hs6="090121",
        origin="IND",
        destination="ARE",
        exporter_name="Some Random Legit Trading Co",
        importer_name="Another Random Legit Trading Co",
    ))
    assert result.decision == GateDecision.REVIEW
    assert result.escrow_allowed is False
    assert result.evidence["current_facts"]["partial_coverage"] is True


def test_malformed_input_is_unsupported_not_clear():
    result = evaluate_transaction(GateInput(
        trade_id="t-4",
        hs6="",
        origin="IND",
        destination="ARE",
        exporter_name="A",
        importer_name="B",
    ))
    assert result.decision == GateDecision.UNSUPPORTED
    assert result.escrow_allowed is False


def test_clear_only_when_facts_current_and_screening_clean():
    """Isolated test of the CLEAR branch's logic. The real current-facts
    dataset has thin coverage right now (verified: no in-scope HS6/partner
    combination in a 150-pair scan achieves CURRENT status with zero
    category gaps — a real, documented data-coverage limitation, not a test
    artifact). So this test patches get_current_facts to return a clean
    CURRENT/no-gap result, to prove the gate's own decision logic reaches
    CLEAR when its inputs actually are clean — it does not claim real data
    currently produces this outcome end-to-end."""
    clean_facts = {
        "overall_status": FactStatus.CURRENT,
        "partial_coverage": False,
        "gaps": [],
        "facts": {},
        "requires_reverification": False,
    }
    with patch("brain.models.compliance.transaction_gate.get_current_facts", return_value=clean_facts):
        result = evaluate_transaction(GateInput(
            trade_id="t-5",
            hs6="090121",
            origin="IND",
            destination="ARE",
            exporter_name="Some Random Legit Trading Co",
            importer_name="Another Random Legit Trading Co",
        ))
    assert result.decision == GateDecision.CLEAR
    assert result.recommendation == "PROCEED"
    assert result.escrow_allowed is True
