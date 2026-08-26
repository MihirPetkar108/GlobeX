"""Entity-level restricted-party screening (Phase 8).

Reads the normalized OFAC SDN + UN Consolidated List registry built by
``backend/brain/compliance_data/sanctions_entities/build_registry.py`` and
answers name/alias screening queries with full provenance.

Design rules, matching ``src/compliance/current_facts.py``:

* No synthetic data. Coverage gaps (BIS/EU/UK/DGFT — see the registry's
  ``source_registry.json``) are reported as UNSUPPORTED, never silently
  treated as "no match".
* Fuzzy matching is a candidate generator only, never a legal finding by
  itself (``04_SANCTIONS_AND_RESTRICTED_PARTY_SCREENING.md``). A high-score
  fuzzy hit is ``POTENTIAL_MATCH``, requiring human review — never
  auto-escalated to ``MATCH_REQUIRES_RESTRICTION``.
* Fail closed: if the registry can't be loaded, every query is
  ``UNSUPPORTED`` — never silently treated as ``NO_MATCH``.

Typical use::

    from brain.models.compliance.entity_screening import screen_transaction_parties

    result = screen_transaction_parties({
        "exporter": "Al Kabeer International Foods Group",
        "importer": "Gulf Trading LLC",
    })
    if result["overall_decision"] != "NO_MATCH":
        ...  # route to manual review; never silently proceed
"""

from __future__ import annotations

import json
import logging
import os
import threading
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from rapidfuzz import fuzz

logger = logging.getLogger(__name__)

__all__ = [
    "ScreeningDecision",
    "EntityRegistry",
    "RegistryError",
    "get_registry",
    "screen_entity",
    "screen_transaction_parties",
]


class ScreeningDecision:
    """Decision values a single-entity or transaction screening may carry."""

    NO_MATCH = "NO_MATCH"
    POTENTIAL_MATCH = "POTENTIAL_MATCH"
    MATCH_REQUIRES_RESTRICTION = "MATCH_REQUIRES_RESTRICTION"
    CLEARED_AFTER_REVIEW = "CLEARED_AFTER_REVIEW"
    UNSUPPORTED = "UNSUPPORTED"


# Fuzzy-match thresholds (0-100, rapidfuzz token_sort_ratio scale). A name at
# or above EXACT_THRESHOLD is treated as a confirmed match requiring
# restriction; between POTENTIAL_THRESHOLD and EXACT_THRESHOLD is a candidate
# for human review only.
EXACT_THRESHOLD = 97.0
POTENTIAL_THRESHOLD = 82.0

DISCLAIMER = (
    "Entity-level screening output. Covers OFAC SDN and UN Security Council "
    "Consolidated List only — BIS, EU, UK, and DGFT restricted-party lists "
    "are NOT covered (see source_registry.json for the exact reason). "
    "A POTENTIAL_MATCH is a fuzzy candidate requiring human review, never a "
    "legal finding by itself. UNSUPPORTED means coverage does not extend to "
    "this query — it does NOT mean 'cleared'."
)


def _default_registry_dir() -> str:
    here = os.path.dirname(os.path.abspath(__file__))
    brain_dir = os.path.dirname(os.path.dirname(here))
    candidates = [
        os.path.join(brain_dir, "compliance_data", "sanctions_entities"),
        os.path.join(os.path.dirname(brain_dir), "brain", "compliance_data", "sanctions_entities"),
        os.path.join(os.path.dirname(brain_dir), "backend", "brain", "compliance_data", "sanctions_entities"),
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return candidates[0]


class RegistryError(RuntimeError):
    """Raised when the entity registry cannot be loaded at all."""


@dataclass
class EntityRegistry:
    """In-memory view of the normalized OFAC SDN + UN entity registry."""

    registry_dir: str = field(default_factory=_default_registry_dir)
    entities: List[Dict[str, Any]] = field(default_factory=list)
    source_registry: Dict[str, Any] = field(default_factory=dict)
    load_errors: List[str] = field(default_factory=list)
    loaded_at: Optional[str] = None

    def load(self) -> "EntityRegistry":
        self.load_errors = []
        path = os.path.join(self.registry_dir, "normalized_entities.json")
        try:
            with open(path, "r", encoding="utf-8") as handle:
                document = json.load(handle)
            self.entities = document.get("entities", [])
        except (OSError, ValueError) as exc:
            self.entities = []
            self.load_errors.append(f"normalized_entities.json: {exc}")
            logger.error("entity_screening: could not load %s (%s)", path, exc)

        self.source_registry = self._load_optional("source_registry.json")
        self.loaded_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat()

        if not self.entities:
            raise RegistryError(
                f"No entity records loaded from {self.registry_dir}. Errors: {self.load_errors}"
            )
        return self

    def _load_optional(self, filename: str) -> Dict[str, Any]:
        path = os.path.join(self.registry_dir, filename)
        try:
            with open(path, "r", encoding="utf-8") as handle:
                return json.load(handle)
        except (OSError, ValueError) as exc:
            self.load_errors.append(f"{filename}: {exc}")
            return {}

    def unsupported_sources(self) -> List[Dict[str, Any]]:
        return self.source_registry.get("sources_unsupported", [])


_REGISTRY: Optional[EntityRegistry] = None
_LOCK = threading.Lock()


def get_registry(registry_dir: Optional[str] = None, reload: bool = False) -> EntityRegistry:
    global _REGISTRY
    with _LOCK:
        if _REGISTRY is None or reload or (registry_dir and registry_dir != _REGISTRY.registry_dir):
            registry = EntityRegistry(registry_dir=registry_dir or _default_registry_dir())
            _REGISTRY = registry.load()
        return _REGISTRY


def _normalize_name(name: str) -> str:
    return " ".join(name.strip().upper().split())


def _best_match(query_name: str, entities: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Returns the single best-scoring match across each entity's name + aliases."""
    query_norm = _normalize_name(query_name)
    best: Optional[Dict[str, Any]] = None
    best_score = 0.0

    for entity in entities:
        candidates = [entity.get("name", "")] + entity.get("aliases", [])
        for candidate in candidates:
            if not candidate:
                continue
            score = fuzz.token_sort_ratio(query_norm, _normalize_name(candidate))
            if score > best_score:
                best_score = score
                best = {
                    "entity_id": entity.get("entity_id"),
                    "matched_name": entity.get("name"),
                    "matched_alias": candidate if candidate != entity.get("name") else None,
                    "source": entity.get("source"),
                    "source_ref": entity.get("source_ref"),
                    "program": entity.get("program"),
                    "entity_type": entity.get("entity_type"),
                    "score": round(score, 2),
                }

    return best


def screen_entity(
    name: str,
    *,
    aliases: Optional[List[str]] = None,
    address: Optional[str] = None,
    registration_number: Optional[str] = None,
    dob: Optional[str] = None,
    lei: Optional[str] = None,
    country: Optional[str] = None,
    beneficial_owners: Optional[List[Dict[str, Any]]] = None,
    registry_dir: Optional[str] = None,
) -> Dict[str, Any]:
    """Screens one entity name (plus optional aliases) against the registry.

    ``beneficial_owners``, if supplied, is a list of
    ``{"name": str, "pct_ownership": float}`` — applies OFAC's 50% Rule: an
    entity 50%+ owned by a blocked person is itself treated as blocked.
    Ownership is explicitly flagged as NOT_EVALUATED when no owner data is
    supplied, rather than silently treated as clear.
    """
    query_time = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    base: Dict[str, Any] = {
        "query": {
            "name": name,
            "aliases": aliases or [],
            "address": address,
            "registration_number": registration_number,
            "dob": dob,
            "lei": lei,
            "country": country,
            "queried_at": query_time,
        },
        "decision": ScreeningDecision.UNSUPPORTED,
        "match": None,
        "ownership_screening": (
            "NOT_EVALUATED — no beneficial ownership data supplied"
            if not beneficial_owners
            else None
        ),
        "coverage_gaps": [],
        "requires_human_review": True,
        "disclaimer": DISCLAIMER,
    }

    if not name or not name.strip():
        base["unsupported_reason"] = "Malformed query: name is required."
        return base

    try:
        registry = get_registry(registry_dir=registry_dir)
    except RegistryError as exc:
        base["unsupported_reason"] = (
            f"Entity registry could not be loaded ({exc}). Fail closed: no "
            "screening conclusion may be drawn."
        )
        base["registry_available"] = False
        return base

    base["registry_available"] = True
    base["registry_loaded_at"] = registry.loaded_at
    base["coverage_gaps"] = [g["source"] for g in registry.unsupported_sources()]
    if registry.load_errors:
        base["registry_load_errors"] = registry.load_errors

    names_to_check = [name] + (aliases or [])
    best_overall: Optional[Dict[str, Any]] = None
    for candidate_name in names_to_check:
        match = _best_match(candidate_name, registry.entities)
        if match and (best_overall is None or match["score"] > best_overall["score"]):
            best_overall = match

    if best_overall is None or best_overall["score"] < POTENTIAL_THRESHOLD:
        base["decision"] = ScreeningDecision.NO_MATCH
        base["requires_human_review"] = False
        base["match"] = best_overall  # low-score info, for transparency only
    else:
        base["match"] = best_overall
        if best_overall["score"] >= EXACT_THRESHOLD:
            base["decision"] = ScreeningDecision.MATCH_REQUIRES_RESTRICTION
        else:
            base["decision"] = ScreeningDecision.POTENTIAL_MATCH
        base["requires_human_review"] = True

    # 50% Rule: checked regardless of the primary entity's own match result —
    # a clean-named shell company owned by a blocked person must still be
    # caught. (Real bug fixed here: this used to sit behind an early `return`
    # in the NO_MATCH branch above, making it unreachable exactly when it
    # mattered most.)
    if beneficial_owners and base["decision"] != ScreeningDecision.MATCH_REQUIRES_RESTRICTION:
        for owner in beneficial_owners:
            owner_match = _best_match(owner.get("name", ""), registry.entities)
            pct = owner.get("pct_ownership", 0) or 0
            if owner_match and owner_match["score"] >= EXACT_THRESHOLD and pct >= 50:
                base["decision"] = ScreeningDecision.MATCH_REQUIRES_RESTRICTION
                base["ownership_screening"] = (
                    f"BLOCKED via 50% Rule — owner '{owner.get('name')}' "
                    f"({pct}% ownership) matches {owner_match['entity_id']}"
                )
                base["requires_human_review"] = True
                break
        else:
            base["ownership_screening"] = "EVALUATED — no owner matched at >=50% ownership"
    elif beneficial_owners:
        base["ownership_screening"] = "EVALUATED — primary entity already matched"

    return base


def screen_transaction_parties(
    parties: Dict[str, str], registry_dir: Optional[str] = None
) -> Dict[str, Any]:
    """Screens each named role in ``parties`` (e.g. exporter, importer,
    freight_forwarder, carrier, consignee, end_user — whichever are
    supplied) and returns a per-role breakdown plus an overall verdict.

    Fail-closed aggregation: if any role screening is UNSUPPORTED, the
    overall decision is UNSUPPORTED (never silently downgraded to NO_MATCH).
    If any role is MATCH_REQUIRES_RESTRICTION, overall is
    MATCH_REQUIRES_RESTRICTION. Otherwise POTENTIAL_MATCH beats NO_MATCH.
    """
    per_role: Dict[str, Dict[str, Any]] = {}
    for role, entity_name in parties.items():
        if not entity_name:
            continue
        per_role[role] = screen_entity(entity_name, registry_dir=registry_dir)

    decisions = [r["decision"] for r in per_role.values()]
    if not decisions:
        overall = ScreeningDecision.UNSUPPORTED
    elif ScreeningDecision.UNSUPPORTED in decisions:
        overall = ScreeningDecision.UNSUPPORTED
    elif ScreeningDecision.MATCH_REQUIRES_RESTRICTION in decisions:
        overall = ScreeningDecision.MATCH_REQUIRES_RESTRICTION
    elif ScreeningDecision.POTENTIAL_MATCH in decisions:
        overall = ScreeningDecision.POTENTIAL_MATCH
    else:
        overall = ScreeningDecision.NO_MATCH

    return {
        "overall_decision": overall,
        "requires_human_review": overall != ScreeningDecision.NO_MATCH,
        "per_role": per_role,
        "screened_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "disclaimer": DISCLAIMER,
    }
