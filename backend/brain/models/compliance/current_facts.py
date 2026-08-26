"""Current-fact registry loader (Phase 7).

Reads the machine-readable registry under
``backend/brain/compliance_data/current_facts/`` and answers corridor/product
queries with the matched facts **and their full provenance**.

Design rules, taken from the production pack
(``03_CURRENT_FACT_VERIFICATION.md`` and ``09_CURRENT_REGULATORY_SOURCE_REGISTRY.md``):

* Historical model data is not current law. Nothing here is derived from the
  model datasets under ``backend/brain/processed``.
* No synthetic legal data. A missing fact is ``UNSUPPORTED``; it is never
  silently rendered as a zero, a default rate, or an empty list.
* An RTA being in force does **not** imply a preferential rate for a given
  tariff line. Preferential tariffs are returned only where a source stated one.
* Facts are perishable. Every record carries ``retrieved_at`` and a
  ``freshness_policy``; the loader computes staleness at query time and reports
  it rather than hiding it.

Typical use::

    from brain.models.compliance import get_current_facts

    result = get_current_facts("610910", "IND", "GBR")
    if result["overall_status"] == "UNSUPPORTED":
        ...  # block or route to manual review; do NOT treat as "clear"
"""

from __future__ import annotations

import json
import logging
import os
import threading
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Iterable, List, Optional

logger = logging.getLogger(__name__)

__all__ = [
    "FactStatus",
    "CurrentFactRegistry",
    "RegistryError",
    "get_registry",
    "get_current_facts",
]


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

class FactStatus:
    """Status values a fact record or a query result may carry."""

    CURRENT = "CURRENT"
    STALE = "STALE"
    SUPERSEDED = "SUPERSEDED"
    UNVERIFIED = "UNVERIFIED"
    CONFLICT = "CONFLICT"
    UNSUPPORTED = "UNSUPPORTED"

    #: Statuses that represent an actual fact on file.
    HAS_FACT = frozenset({CURRENT, STALE, SUPERSEDED, UNVERIFIED, CONFLICT})
    #: Statuses safe to rely on without a re-verification step.
    RELIABLE = frozenset({CURRENT})


#: Registry files, keyed by the result bucket they populate.
CATEGORY_FILES: Dict[str, str] = {
    "tariffs": "tariffs.json",
    "rules_of_origin": "rules_of_origin.json",
    "export_controls": "export_controls.json",
    "country_sanctions_status": "country_sanctions_status.json",
    "sps_tbt": "sps_tbt.json",
}

#: How long a fact may be reused before it must be re-fetched from source_url.
FRESHNESS_MAX_AGE: Dict[str, Optional[timedelta]] = {
    "REVERIFY_BEFORE_EVERY_DECISION": timedelta(0),
    "REVERIFY_DAILY": timedelta(days=1),
    "REVERIFY_WEEKLY": timedelta(days=7),
    "REVERIFY_MONTHLY": timedelta(days=31),
    "REVERIFY_QUARTERLY": timedelta(days=92),
    "REVERIFY_SEMIANNUALLY": timedelta(days=183),
}

DISCLAIMER = (
    "Current-fact registry output. Facts are perishable: each record's retrieved_at and "
    "freshness_policy state when it must be re-verified against its source_url. "
    "UNSUPPORTED means no fact is on file for that combination — it does NOT mean "
    "'no restriction applies'. Entity-level restricted-party screening is out of scope "
    "for this registry."
)


def _default_registry_dir() -> str:
    """Locate ``backend/brain/compliance_data/current_facts`` from this file."""
    here = os.path.dirname(os.path.abspath(__file__))
    brain_dir = os.path.dirname(os.path.dirname(here))
    candidates = [
        os.path.join(brain_dir, "compliance_data", "current_facts"),
        os.path.join(os.path.dirname(brain_dir), "brain", "compliance_data", "current_facts"),
        os.path.join(os.path.dirname(brain_dir), "backend", "brain", "compliance_data", "current_facts"),
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return candidates[0]


class RegistryError(RuntimeError):
    """Raised when the registry cannot be loaded at all."""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_iso(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    text = value.strip().replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _policy_max_age(policy: Optional[str]) -> Optional[timedelta]:
    """Resolve a ``freshness_policy`` string to a maximum reuse age.

    Policies may carry a trailing caveat after a semicolon (e.g.
    ``"REVERIFY_QUARTERLY; NOT VALID AS A LEGAL CURRENT RATE"``); only the
    leading token selects the interval.
    """
    if not policy:
        return None
    head = policy.split(";", 1)[0].strip().upper()
    return FRESHNESS_MAX_AGE.get(head)


def normalise_hs6(hs6: Any) -> Optional[str]:
    """Coerce an HS6 input to a zero-padded 6-character string.

    Accepts ``"610910"``, ``610910``, ``"6109.10"``, ``"90411"`` (leading zero
    dropped by an int round-trip, as happens in the parquet datasets).
    """
    if hs6 is None:
        return None
    text = str(hs6).strip().replace(".", "").replace(" ", "")
    if not text.isdigit():
        return None
    if len(text) < 6:
        text = text.zfill(6)
    return text[:6]


def normalise_country(code: Any) -> Optional[str]:
    if code is None:
        return None
    text = str(code).strip().upper()
    return text or None


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------

@dataclass
class CurrentFactRegistry:
    """In-memory view of the current-fact registry files."""

    registry_dir: str = field(default_factory=_default_registry_dir)
    facts: Dict[str, List[Dict[str, Any]]] = field(default_factory=dict)
    sources: Dict[str, Any] = field(default_factory=dict)
    scope: Dict[str, Any] = field(default_factory=dict)
    load_errors: List[str] = field(default_factory=list)
    loaded_at: Optional[str] = None

    # -- loading ------------------------------------------------------------

    def load(self) -> "CurrentFactRegistry":
        self.facts = {}
        self.load_errors = []

        for bucket, filename in CATEGORY_FILES.items():
            path = os.path.join(self.registry_dir, filename)
            try:
                with open(path, "r", encoding="utf-8") as handle:
                    document = json.load(handle)
                rows = document.get("facts", [])
                if not isinstance(rows, list):
                    raise ValueError("'facts' is not a list")
                self.facts[bucket] = rows
            except (OSError, ValueError) as exc:
                self.facts[bucket] = []
                self.load_errors.append(f"{filename}: {exc}")
                logger.error("current_facts: could not load %s (%s)", path, exc)

        self.sources = self._load_optional("sources.json")
        self.scope = self._load_optional("scope.json")
        self.loaded_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat()

        if all(not rows for rows in self.facts.values()):
            raise RegistryError(
                f"No current-fact records loaded from {self.registry_dir}. "
                f"Errors: {self.load_errors}"
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

    # -- scope --------------------------------------------------------------

    def in_scope_hs6(self) -> List[str]:
        return list(self.scope.get("hs6", []))

    def in_scope_partners(self) -> List[str]:
        tier1 = self.scope.get("tier1_partners", [])
        tier2 = self.scope.get("tier2_partners", [])
        return sorted(set(tier1) | set(tier2))

    # -- querying -----------------------------------------------------------

    @staticmethod
    def _matches(
        record: Dict[str, Any],
        hs6: Optional[str],
        origin: Optional[str],
        destination: Optional[str],
    ) -> bool:
        """A record matches when each of its non-null keys agrees with the query.

        A record with ``hs6 = None`` is product-agnostic and applies to every
        product; a record with ``destination = None`` applies to every
        destination. That is deliberate: chapter-wide and country-wide rules
        must surface for a specific query.
        """
        rec_hs6 = record.get("hs6")
        if rec_hs6 is not None and hs6 is not None and rec_hs6 != hs6:
            return False
        rec_origin = record.get("origin")
        if rec_origin is not None and origin is not None and rec_origin != origin:
            return False
        rec_dest = record.get("destination")
        if rec_dest is not None and destination is not None and rec_dest != destination:
            return False
        return True

    def _annotate(self, record: Dict[str, Any], now: datetime) -> Dict[str, Any]:
        """Return a copy of ``record`` with query-time freshness annotations."""
        annotated = dict(record)
        retrieved = _parse_iso(record.get("retrieved_at"))
        max_age = _policy_max_age(record.get("freshness_policy"))

        if retrieved is None:
            annotated["age_days"] = None
            annotated["freshness_verdict"] = "UNKNOWN_RETRIEVAL_TIME"
        else:
            age = now - retrieved
            annotated["age_days"] = round(age.total_seconds() / 86400.0, 3)
            if max_age is None:
                annotated["freshness_verdict"] = "NO_POLICY_SET"
            elif max_age == timedelta(0):
                annotated["freshness_verdict"] = "REVERIFY_REQUIRED"
            elif age > max_age:
                annotated["freshness_verdict"] = "EXPIRED"
            else:
                annotated["freshness_verdict"] = "WITHIN_POLICY"

        annotated["provenance"] = {
            "authority": record.get("authority"),
            "source_url": record.get("source_url"),
            "source_document": record.get("source_document"),
            "retrieved_at": record.get("retrieved_at"),
            "effective_period": record.get("effective_period"),
            "jurisdiction": record.get("jurisdiction"),
            "version": record.get("version"),
            "status": record.get("status"),
        }
        return annotated

    def query(
        self,
        hs6: Optional[str] = None,
        origin: Optional[str] = None,
        destination: Optional[str] = None,
        categories: Optional[Iterable[str]] = None,
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Return matching records per bucket, annotated with freshness."""
        now = datetime.now(timezone.utc)
        wanted = set(categories) if categories else set(CATEGORY_FILES)
        out: Dict[str, List[Dict[str, Any]]] = {}
        for bucket, rows in self.facts.items():
            if bucket not in wanted:
                continue
            out[bucket] = [
                self._annotate(row, now)
                for row in rows
                if self._matches(row, hs6, origin, destination)
            ]
        return out


# ---------------------------------------------------------------------------
# Module-level singleton
# ---------------------------------------------------------------------------

_REGISTRY: Optional[CurrentFactRegistry] = None
_LOCK = threading.Lock()


def get_registry(
    registry_dir: Optional[str] = None, reload: bool = False
) -> CurrentFactRegistry:
    """Return the process-wide registry, loading it on first use."""
    global _REGISTRY
    with _LOCK:
        if _REGISTRY is None or reload or (
            registry_dir and registry_dir != _REGISTRY.registry_dir
        ):
            registry = CurrentFactRegistry(
                registry_dir=registry_dir or _default_registry_dir()
            )
            _REGISTRY = registry.load()
        return _REGISTRY


# ---------------------------------------------------------------------------
# Public query function
# ---------------------------------------------------------------------------

def get_current_facts(
    hs6: str,
    origin: str,
    destination: str,
    registry_dir: Optional[str] = None,
) -> Dict[str, Any]:
    """Return every current fact on file for one product/corridor combination.

    Parameters
    ----------
    hs6:
        6-digit HS code. Accepts ``int``/``str``, dotted or zero-stripped forms.
    origin:
        ISO3 country of origin of the goods (this registry covers ``IND`` only).
    destination:
        ISO3 destination country.

    Returns
    -------
    dict
        ``overall_status`` is the headline. It is ``UNSUPPORTED`` whenever no
        actual fact was found for the combination — callers must treat that as
        "unknown, do not proceed unreviewed", never as "clear". When facts do
        exist, ``overall_status`` is ``CURRENT`` only if at least one fact is
        ``CURRENT`` and none of the returned facts are ``CONFLICT``; otherwise
        it degrades to ``STALE``/``CONFLICT``/``UNVERIFIED``.

        ``facts`` holds the matched records per category, each carrying a
        ``provenance`` block and a query-time ``freshness_verdict``.

        ``gaps`` lists the categories with no fact on file, with the reasons
        recorded in the registry, so a caller can see exactly what is unknown.
    """
    query_time = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    norm_hs6 = normalise_hs6(hs6)
    norm_origin = normalise_country(origin)
    norm_destination = normalise_country(destination)

    base: Dict[str, Any] = {
        "query": {
            "hs6": norm_hs6,
            "hs6_raw": str(hs6),
            "origin": norm_origin,
            "destination": norm_destination,
            "queried_at": query_time,
        },
        "overall_status": FactStatus.UNSUPPORTED,
        "facts": {bucket: [] for bucket in CATEGORY_FILES},
        "gaps": [],
        "counts": {},
        "requires_reverification": True,
        "disclaimer": DISCLAIMER,
    }

    if norm_hs6 is None or norm_origin is None or norm_destination is None:
        base["unsupported_reason"] = (
            "Malformed query: hs6 must be numeric and origin/destination must be "
            "ISO3 country codes."
        )
        return base

    try:
        registry = get_registry(registry_dir=registry_dir)
    except RegistryError as exc:
        base["unsupported_reason"] = (
            f"Current-fact registry could not be loaded ({exc}). Fail closed: no "
            "regulatory conclusion may be drawn."
        )
        base["registry_available"] = False
        return base

    base["registry_available"] = True
    base["registry_loaded_at"] = registry.loaded_at
    if registry.load_errors:
        base["registry_load_errors"] = registry.load_errors

    # -- scope check --------------------------------------------------------
    scope_hs6 = registry.in_scope_hs6()
    scope_partners = registry.in_scope_partners()
    scope_problems: List[str] = []
    if scope_hs6 and norm_hs6 not in scope_hs6:
        scope_problems.append(
            f"HS6 {norm_hs6} is outside the registry's product scope "
            f"({len(scope_hs6)} codes drawn from the product datasets)."
        )
    if norm_origin != registry.scope.get("exporter", "IND"):
        scope_problems.append(
            f"Origin {norm_origin} is outside scope; this registry covers exports "
            f"from {registry.scope.get('exporter', 'IND')} only."
        )
    if scope_partners and norm_destination not in scope_partners:
        scope_problems.append(
            f"Destination {norm_destination} is outside the registry's partner scope "
            f"({len(scope_partners)} countries)."
        )
    if scope_problems:
        base["out_of_scope"] = True
        base["unsupported_reason"] = " ".join(scope_problems)
        return base
    base["out_of_scope"] = False

    # -- retrieve -----------------------------------------------------------
    matched = registry.query(
        hs6=norm_hs6, origin=norm_origin, destination=norm_destination
    )
    base["facts"] = matched

    statuses: List[str] = []
    gaps: List[Dict[str, Any]] = []
    counts: Dict[str, Dict[str, int]] = {}

    for bucket, rows in matched.items():
        bucket_counts: Dict[str, int] = {}
        for row in rows:
            bucket_counts[row["status"]] = bucket_counts.get(row["status"], 0) + 1
            statuses.append(row["status"])
        counts[bucket] = bucket_counts

        has_fact = any(row["status"] in FactStatus.HAS_FACT for row in rows)
        if not has_fact:
            reasons = sorted(
                {
                    row.get("unsupported_reason")
                    for row in rows
                    if row.get("unsupported_reason")
                }
            )
            gaps.append(
                {
                    "category": bucket,
                    "status": FactStatus.UNSUPPORTED,
                    "reasons": reasons
                    or [
                        "No record of any kind on file for this combination in this "
                        "category."
                    ],
                    "caller_guidance": (
                        "Treat as UNKNOWN. Do not render as 'no restriction'. Route to "
                        "manual verification against the authority named in "
                        "sources.json, or block if the fact is material to the decision."
                    ),
                }
            )

    base["counts"] = counts
    base["gaps"] = gaps

    # -- headline status ----------------------------------------------------
    real = [s for s in statuses if s in FactStatus.HAS_FACT]
    if not real:
        base["overall_status"] = FactStatus.UNSUPPORTED
        base["unsupported_reason"] = (
            "No current fact is on file for this HS6/origin/destination combination. "
            "This is an absence of data, not an absence of regulation."
        )
        base["requires_reverification"] = True
        return base

    if FactStatus.CONFLICT in real:
        base["overall_status"] = FactStatus.CONFLICT
    elif FactStatus.CURRENT in real:
        base["overall_status"] = FactStatus.CURRENT
    elif FactStatus.STALE in real:
        base["overall_status"] = FactStatus.STALE
    elif FactStatus.SUPERSEDED in real:
        base["overall_status"] = FactStatus.SUPERSEDED
    else:
        base["overall_status"] = FactStatus.UNVERIFIED

    needs_reverify = any(
        row.get("freshness_verdict") in {"REVERIFY_REQUIRED", "EXPIRED", "UNKNOWN_RETRIEVAL_TIME", "NO_POLICY_SET"}
        for rows in matched.values()
        for row in rows
        if row["status"] in FactStatus.HAS_FACT
    )
    base["requires_reverification"] = needs_reverify

    # Categories that are partially covered still deserve a visible warning.
    base["partial_coverage"] = bool(gaps)
    return base


# ---------------------------------------------------------------------------
# CLI: python -m src.compliance.current_facts 610910 IND GBR
# ---------------------------------------------------------------------------

def _main(argv: List[str]) -> int:
    if len(argv) == 1:
        registry = get_registry()
        summary = {
            "registry_dir": registry.registry_dir,
            "loaded_at": registry.loaded_at,
            "record_counts": {k: len(v) for k, v in registry.facts.items()},
            "in_scope_hs6": len(registry.in_scope_hs6()),
            "in_scope_partners": len(registry.in_scope_partners()),
            "sources_ok": len(registry.sources.get("sources_fetched_successfully", [])),
            "sources_failed": len(registry.sources.get("sources_attempted_and_failed", [])),
            "load_errors": registry.load_errors,
        }
        print(json.dumps(summary, indent=2))
        return 0
    if len(argv) != 4:
        print("usage: python -m src.compliance.current_facts <hs6> <origin> <destination>")
        return 2
    print(json.dumps(get_current_facts(argv[1], argv[2], argv[3]), indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":  # pragma: no cover
    import sys

    raise SystemExit(_main(sys.argv))
