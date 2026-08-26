"""Transaction Compliance Gate (Phase 8, per 08_TRANSACTION_COMPLIANCE_GATE.md).

The single deterministic gate before trade creation, escrow creation,
marketplace activation, shipment release, or payment release. Orchestrates:

  1. current_facts.py   — tariff/RTA/export-control/country-sanctions facts
  2. entity_screening.py — OFAC SDN + UN entity/restricted-party screening

into one CLEAR / REVIEW / BLOCKED / UNSUPPORTED decision.

Design rules (matches the rest of src/compliance/):
* UNSUPPORTED != CLEAR. REVIEW != CLEAR. Never conflate.
* A verified applicable prohibition (BLOCKED) can never be overridden by a
  high commercial/market-opportunity score — this module doesn't even
  accept one as input, by design, so it structurally cannot happen.
* Escrow may only proceed on CLEAR. BLOCKED/REVIEW/UNSUPPORTED all disable
  it (08_TRANSACTION_COMPLIANCE_GATE.md "Escrow" section).
* Fail closed throughout: if a dependency (current_facts registry, entity
  registry) is unavailable, the gate decision is UNSUPPORTED, never CLEAR.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import uuid

from brain.models.compliance.current_facts import FactStatus, get_current_facts
from brain.models.compliance.entity_screening import ScreeningDecision, screen_transaction_parties


class GateDecision:
    CLEAR = "CLEAR"
    REVIEW = "REVIEW"
    BLOCKED = "BLOCKED"
    UNSUPPORTED = "UNSUPPORTED"


class GateRecommendation:
    PROCEED = "PROCEED"
    REVIEW = "REVIEW"
    BLOCK = "BLOCK"
    UNSUPPORTED = "UNSUPPORTED"


_DECISION_TO_RECOMMENDATION = {
    GateDecision.CLEAR: GateRecommendation.PROCEED,
    GateDecision.REVIEW: GateRecommendation.REVIEW,
    GateDecision.BLOCKED: GateRecommendation.BLOCK,
    GateDecision.UNSUPPORTED: GateRecommendation.UNSUPPORTED,
}


@dataclass
class GateInput:
    trade_id: str
    hs6: str
    origin: str
    destination: str
    exporter_name: str
    importer_name: str
    beneficial_owners: Optional[List[Dict[str, Any]]] = None
    freight_forwarder_name: Optional[str] = None
    carrier_name: Optional[str] = None
    consignee_name: Optional[str] = None
    end_user_name: Optional[str] = None


@dataclass
class GateResult:
    decision: str
    recommendation: str
    reasons: List[str] = field(default_factory=list)
    evidence: Dict[str, Any] = field(default_factory=dict)
    escrow_allowed: bool = False
    analysis_id: str = ""
    evaluated_at: str = ""
    disclaimer: str = (
        "Deterministic rule-based gate. UNSUPPORTED means the system lacks "
        "sufficient authoritative coverage for this combination — it is "
        "NOT the same as CLEAR. A human override of a BLOCKED decision "
        "requires authorized review and documented legal basis; this gate "
        "provides no automated override path."
    )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "decision": self.decision,
            "recommendation": self.recommendation,
            "reasons": self.reasons,
            "evidence": self.evidence,
            "escrow_allowed": self.escrow_allowed,
            "analysis_id": self.analysis_id,
            "evaluated_at": self.evaluated_at,
            "disclaimer": self.disclaimer,
        }


def evaluate_transaction(gate_input: GateInput) -> GateResult:
    analysis_id = str(uuid.uuid4())
    evaluated_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    reasons: List[str] = []
    evidence: Dict[str, Any] = {}

    # --- Step 1-2: HS6 resolved, jurisdiction identified (inputs required) ---
    if not gate_input.hs6 or not gate_input.origin or not gate_input.destination:
        return GateResult(
            decision=GateDecision.UNSUPPORTED,
            recommendation=GateRecommendation.UNSUPPORTED,
            reasons=["Malformed input: hs6, origin, and destination are all required."],
            evidence=evidence,
            escrow_allowed=False,
            analysis_id=analysis_id,
            evaluated_at=evaluated_at,
        )

    # --- Step 3-9: tariff/RTA/export-control/country-sanctions facts ---
    facts = get_current_facts(gate_input.hs6, gate_input.origin, gate_input.destination)
    evidence["current_facts"] = facts

    facts_status = facts["overall_status"]
    if facts_status == FactStatus.UNSUPPORTED:
        reasons.append(f"Current-fact registry: {facts.get('unsupported_reason', 'no fact on file')}")
    elif facts_status == FactStatus.CONFLICT:
        reasons.append("Current-fact registry reports CONFLICT between official sources for this corridor/product.")
    elif facts.get("partial_coverage"):
        gaps = [g["category"] for g in facts.get("gaps", [])]
        reasons.append(f"Current-fact registry has partial coverage — missing categories: {gaps}")

    # --- Step 4: restricted-party / entity screening ---
    parties: Dict[str, str] = {
        "exporter": gate_input.exporter_name,
        "importer": gate_input.importer_name,
    }
    if gate_input.freight_forwarder_name:
        parties["freight_forwarder"] = gate_input.freight_forwarder_name
    if gate_input.carrier_name:
        parties["carrier"] = gate_input.carrier_name
    if gate_input.consignee_name:
        parties["consignee"] = gate_input.consignee_name
    if gate_input.end_user_name:
        parties["end_user"] = gate_input.end_user_name

    screening = screen_transaction_parties(parties)
    if gate_input.beneficial_owners:
        # Re-screen the exporter with ownership data explicitly supplied,
        # since screen_transaction_parties() doesn't carry per-role owner
        # data through its simple name-only interface.
        from brain.models.compliance.entity_screening import screen_entity

        owner_check = screen_entity(
            gate_input.exporter_name, beneficial_owners=gate_input.beneficial_owners
        )
        screening["per_role"]["exporter_with_ownership"] = owner_check
        if owner_check["decision"] == ScreeningDecision.MATCH_REQUIRES_RESTRICTION:
            screening["overall_decision"] = ScreeningDecision.MATCH_REQUIRES_RESTRICTION

    evidence["entity_screening"] = screening

    # --- Step 15: final decision ---
    # BLOCKED takes priority: a verified applicable prohibition can never be
    # overridden by anything else evaluated here.
    if screening["overall_decision"] == ScreeningDecision.MATCH_REQUIRES_RESTRICTION:
        matched_roles = [
            role for role, r in screening["per_role"].items()
            if r["decision"] == ScreeningDecision.MATCH_REQUIRES_RESTRICTION
        ]
        reasons.append(f"Restricted-party match confirmed for role(s): {matched_roles}")
        decision = GateDecision.BLOCKED

    elif facts_status == FactStatus.UNSUPPORTED:
        decision = GateDecision.UNSUPPORTED

    elif (
        screening["overall_decision"] == ScreeningDecision.UNSUPPORTED
        or screening.get("per_role") == {}
    ):
        reasons.append("Entity screening coverage does not extend to this transaction's parties.")
        decision = GateDecision.UNSUPPORTED

    elif (
        screening["overall_decision"] == ScreeningDecision.POTENTIAL_MATCH
        or facts_status == FactStatus.CONFLICT
        or facts.get("partial_coverage")
        or facts_status not in FactStatus.RELIABLE
    ):
        if screening["overall_decision"] == ScreeningDecision.POTENTIAL_MATCH:
            reasons.append("Potential restricted-party match requires human review before proceeding.")
        if facts_status != FactStatus.CURRENT:
            reasons.append(f"Current-fact status is '{facts_status}', not CURRENT — requires review.")
        decision = GateDecision.REVIEW

    else:
        reasons.append("All mandatory checks passed with current evidence.")
        decision = GateDecision.CLEAR

    escrow_allowed = decision == GateDecision.CLEAR

    return GateResult(
        decision=decision,
        recommendation=_DECISION_TO_RECOMMENDATION[decision],
        reasons=reasons,
        evidence=evidence,
        escrow_allowed=escrow_allowed,
        analysis_id=analysis_id,
        evaluated_at=evaluated_at,
    )
