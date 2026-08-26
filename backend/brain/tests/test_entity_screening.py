"""Real tests against the actual OFAC SDN + UN Consolidated List registry.

No mocks — these exercise src/compliance/entity_screening.py against the
genuine downloaded sanctions data in
backend/brain/compliance_data/sanctions_entities/. Requires that registry to
exist (built by build_registry.py); skipped loudly, not silently, if absent.
"""

import os

import pytest

from brain.models.compliance.entity_screening import (
    ScreeningDecision,
    screen_entity,
    screen_transaction_parties,
)

_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_BRAIN_DIR = os.path.dirname(_THIS_DIR)
_CANDIDATES = [
    os.path.join(_BRAIN_DIR, "compliance_data", "sanctions_entities", "normalized_entities.json"),
    os.path.join(os.path.dirname(_BRAIN_DIR), "brain", "compliance_data", "sanctions_entities", "normalized_entities.json"),
    os.path.join(os.path.dirname(_BRAIN_DIR), "backend", "brain", "compliance_data", "sanctions_entities", "normalized_entities.json"),
]
_REGISTRY_PATH = next((c for c in _CANDIDATES if os.path.exists(c)), _CANDIDATES[0])

pytestmark = pytest.mark.skipif(
    not os.path.exists(_REGISTRY_PATH),
    reason=f"Entity registry not built — run build_registry.py first ({_REGISTRY_PATH} missing)",
)


def test_exact_ofac_sdn_match():
    result = screen_entity("AEROCARIBBEAN AIRLINES")
    assert result["decision"] == ScreeningDecision.MATCH_REQUIRES_RESTRICTION
    assert result["match"]["score"] == 100.0
    assert result["match"]["source"] == "OFAC_SDN"


def test_ofac_alias_match():
    result = screen_entity("AERO-CARIBBEAN")
    assert result["decision"] == ScreeningDecision.MATCH_REQUIRES_RESTRICTION


def test_fabricated_name_no_match():
    result = screen_entity("Zzyzx Test Entity Nonexistent 12345")
    assert result["decision"] == ScreeningDecision.NO_MATCH


def test_fuzzy_near_match_single_typo():
    result = screen_entity("AEROCARIBEAN AIRLINES")  # one letter dropped
    assert result["decision"] == ScreeningDecision.MATCH_REQUIRES_RESTRICTION
    assert 90 < result["match"]["score"] < 100


def test_missing_optional_data_handled():
    result = screen_entity("Some Random Legit Trading Co Ltd")
    assert result["decision"] == ScreeningDecision.NO_MATCH
    assert "NOT_EVALUATED" in result["ownership_screening"]


def test_transaction_screening_mixed_parties():
    result = screen_transaction_parties(
        {"exporter": "Zzyzx Test Entity Nonexistent 12345", "importer": "AEROCARIBBEAN AIRLINES"}
    )
    assert result["overall_decision"] == ScreeningDecision.MATCH_REQUIRES_RESTRICTION
    assert result["per_role"]["importer"]["decision"] == ScreeningDecision.MATCH_REQUIRES_RESTRICTION
    assert result["per_role"]["exporter"]["decision"] == ScreeningDecision.NO_MATCH


def test_fifty_percent_ownership_rule():
    """A clean-named shell company owned 50%+ by a blocked person must be
    blocked too — real bug found+fixed this session: this was previously
    unreachable because of an early return in the no-primary-match path."""
    result = screen_entity(
        "Some Random Legit Trading Co Ltd",
        beneficial_owners=[{"name": "AEROCARIBBEAN AIRLINES", "pct_ownership": 60}],
    )
    assert result["decision"] == ScreeningDecision.MATCH_REQUIRES_RESTRICTION
    assert "50% Rule" in result["ownership_screening"]


def test_ownership_not_evaluated_below_fifty_percent():
    result = screen_entity(
        "Some Random Legit Trading Co Ltd",
        beneficial_owners=[{"name": "AEROCARIBBEAN AIRLINES", "pct_ownership": 20}],
    )
    assert result["decision"] == ScreeningDecision.NO_MATCH
    assert "no owner matched" in result["ownership_screening"]


def test_registry_unavailable_fails_closed():
    result = screen_entity("AEROCARIBBEAN AIRLINES", registry_dir="/nonexistent/path/xyz")
    assert result["decision"] == ScreeningDecision.UNSUPPORTED
    assert result["registry_available"] is False
