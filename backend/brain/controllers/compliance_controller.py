"""
GlobeXAI Trade OS — Regulatory Compliance & Tariff Router
Endpoint: POST /compliance/rag-analyze

Deterministic rule-based compliance engine grounded in official bilateral trade
treaties (India-UAE CEPA, India-Singapore CECA, India-Australia ECTA, etc.) and
Harmonized System non-tariff measures (NTMs).
"""

from __future__ import annotations

import logging
import uuid
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter
from pydantic import BaseModel, Field

from brain.models.compliance.entity_screening import screen_transaction_parties
from brain.models.compliance.transaction_gate import GateInput, evaluate_transaction
from brain.models.compliance.wits_tariff import fetch_mfn_tariff
from brain.models.compliance.hs6_document_matrix import (
    get_documents as _get_hs6_documents,
    DISCLAIMER as _HS6_DISCLAIMER,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Compliance & Tariffs"])

# ---------------------------------------------------------------------------
# Bilateral Trade Agreements & Tariff Rules
# ---------------------------------------------------------------------------

_TREATY_MAP: Dict[Tuple[str, str], Dict[str, Any]] = {
    ("IND", "ARE"): {
        "agreement": "India-UAE Comprehensive Economic Partnership Agreement (CEPA)",
        "preferential_rate_pct": 0.0,
        "standard_mfn_rate_pct": 5.0,
        "ntm_barriers": [
            "Ministry of Climate Change and Environment (MOCCAE) Food Import Permit",
            "Halal Certification for processed products",
            "NPPO Phytosanitary Inspection at origin port",
            "Maximum Residue Limit (MRL) laboratory test certificate",
        ],
    },
    ("IND", "SGP"): {
        "agreement": "India-Singapore Comprehensive Economic Cooperation Agreement (CECA)",
        "preferential_rate_pct": 0.0,
        "standard_mfn_rate_pct": 0.0,
        "ntm_barriers": [
            "Singapore Food Agency (SFA) TradeNet Import Declaration",
            "Certificate of Origin (CECA form)",
        ],
    },
    ("IND", "AUS"): {
        "agreement": "India-Australia Economic Cooperation and Trade Agreement (ECTA)",
        "preferential_rate_pct": 0.0,
        "standard_mfn_rate_pct": 5.0,
        "ntm_barriers": [
            "Department of Agriculture, Fisheries and Forestry (DAFF) Biosecurity Import Conditions (BICON)",
            "Certificate of Analysis for contaminants & pesticide residues",
        ],
    },
    ("IND", "JPN"): {
        "agreement": "India-Japan Comprehensive Economic Partnership Agreement (IJCEPA)",
        "preferential_rate_pct": 0.0,
        "standard_mfn_rate_pct": 3.5,
        "ntm_barriers": [
            "Ministry of Health, Labour and Welfare (MHLW) Food Sanitation Law Notification",
            "Plant Protection Station Quarantine Inspection",
        ],
    },
    ("IND", "KOR"): {
        "agreement": "India-Korea Comprehensive Economic Partnership Agreement (IKCEPA)",
        "preferential_rate_pct": 2.0,
        "standard_mfn_rate_pct": 8.0,
        "ntm_barriers": [
            "Ministry of Food and Drug Safety (MFDS) Import Food Safety Control Declaration",
            "Quarantine Inspection Certificate",
        ],
    },
    ("IND", "MYS"): {
        "agreement": "ASEAN-India Trade in Goods Agreement (AITIGA) / India-Malaysia CECA",
        "preferential_rate_pct": 3.0,
        "standard_mfn_rate_pct": 8.0,
        "ntm_barriers": [
            "Malaysian Quarantine and Inspection Services (MAQIS) Import Permit",
            "JAKIM-recognized Halal Certification",
        ],
    },
    ("IND", "USA"): {
        "agreement": "Standard Most-Favoured-Nation (MFN) Tariff Regime",
        "preferential_rate_pct": 5.5,
        "standard_mfn_rate_pct": 5.5,
        "ntm_barriers": [
            "US FDA Prior Notice of Imported Foods (FSMA Rule)",
            "USDA APHIS Phytosanitary Certificate",
            "Customs and Border Protection (CBP) Entry Summary Form 7501",
        ],
    },
    ("IND", "GBR"): {
        "agreement": "UK Developing Countries Trading Scheme (DCTS) / Standard MFN",
        "preferential_rate_pct": 6.0,
        "standard_mfn_rate_pct": 12.0,
        "ntm_barriers": [
            "UK Department for Environment, Food & Rural Affairs (DEFRA) IPAFFS Notification",
            "Phytosanitary Certificate conforming to GB Plant Health Regulations",
        ],
    },
    ("IND", "DEU"): {
        "agreement": "European Union Common Customs Tariff / Standard Third-Country Duty",
        "preferential_rate_pct": 7.5,
        "standard_mfn_rate_pct": 12.0,
        "ntm_barriers": [
            "TRACES NT (Trade Control and Expert System) Common Health Entry Document (CHED-PP)",
            "EU Maximum Residue Limits (MRL) Lab Test Report (Regulation EC 396/2005)",
        ],
    },
}

_DEFAULT_DOCUMENTS: List[Dict[str, Any]] = [
    {"name": "Commercial Invoice", "issuing_authority": "Exporter / Shipper", "mandatory": True},
    {"name": "Bill of Lading / Air Waybill", "issuing_authority": "Freight Carrier", "mandatory": True},
    {"name": "Packing List", "issuing_authority": "Exporter", "mandatory": True},
    {"name": "Certificate of Origin", "issuing_authority": "Chamber of Commerce / DGFT", "mandatory": True},
    {"name": "Export Declaration", "issuing_authority": "Customs Authority (ICEGATE)", "mandatory": True},
    {"name": "Inspection Certificate", "issuing_authority": "Third-Party Inspector", "mandatory": False},
]


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class ComplianceRequest(BaseModel):
    hs6: int = Field(..., description="6-digit HS product code", example=100630)
    hs_code_str: Optional[str] = Field(default=None, description="Formatted HS code string", example="1006.30")
    origin_country: str = Field(default="IND", description="ISO3 origin country code", example="IND")
    destination_country: str = Field(..., description="ISO3 destination country code", example="ARE")
    certifications: Optional[List[str]] = Field(default=None, description="Certifications held by exporter", example=["FSSAI", "APEDA"])
    trade_value_usd: Optional[float] = Field(default=None, description="Total trade contract value in USD", example=250000.0)


class TariffDetail(BaseModel):
    preferential_rate_pct: float
    standard_mfn_rate_pct: float
    agreement: str
    duty_savings_usd: Optional[float] = None


class ComplianceDocument(BaseModel):
    name: str
    issuing_authority: str
    mandatory: bool


class ComplianceResponse(BaseModel):
    status: str
    compliance_engine: str = "rag-hybrid-v2.0"
    analysis_id: str
    origin_country: str
    destination_country: str
    hs6: int
    tariff: TariffDetail
    ntm_barriers: List[str]
    required_documents: List[ComplianceDocument]
    compliance_score: float = Field(..., description="0-100 score, higher is better/more compliant")
    flags: List[str]
    retrieved_evidence: Optional[List[Dict[str, Any]]] = Field(default=None, description="RAG retrieved passages with source citations")
    sources_cited: Optional[List[str]] = Field(default=None, description="List of source datasets cited")
    disclaimer: str


class RAGQueryRequest(BaseModel):
    query: str = Field(..., description="Natural language query on tariffs, sanctions, forecasting or trade rules", example="What are the tariff rates and phytosanitary rules for exporting Basmati rice to UAE under CEPA?")
    origin_country: Optional[str] = Field(default="IND", description="ISO3 origin country code", example="IND")
    destination_country: Optional[str] = Field(default="ARE", description="ISO3 destination country code", example="ARE")
    hs6: Optional[int] = Field(default=100630, description="6-digit HS commodity code", example=100630)
    top_k: int = Field(default=6, ge=1, le=20)


@router.post(
    "/api/v1/rag/query",
    summary="Multi-Dataset Trade RAG Intelligence Query",
    description=(
        "Retrieves and synthesizes grounded evidence across official UNCTAD tariffs, "
        "sanctions registries, DGFT SCOMET export controls, rules of origin, SPS/TBT "
        "regulations, and market demand forecasts."
    ),
)
def rag_query(req: RAGQueryRequest) -> Dict[str, Any]:
    analysis_id = str(uuid.uuid4())
    from brain.services.rag_retriever import get_retriever  # noqa: PLC0415
    retriever = get_retriever()

    structured = retriever.retrieve_structured_evidence(
        origin_iso3=req.origin_country or "IND",
        destination_iso3=req.destination_country or "ARE",
        hs6=req.hs6 or 100630,
        query=req.query,
    )
    
    # Direct semantic passages
    passages = retriever.retrieve(
        query=req.query,
        top_k=req.top_k,
        origin_iso3=req.origin_country,
        destination_iso3=req.destination_country,
        hs6=req.hs6,
    )

    return {
        "status": "OK",
        "analysis_id": analysis_id,
        "query": req.query,
        "origin_country": req.origin_country,
        "destination_country": req.destination_country,
        "hs6": req.hs6,
        "passages": passages,
        "structured_evidence": structured["structured_evidence"],
        "sources_cited": list(dict.fromkeys(p["source"] for p in passages + structured["passages"])),
    }


# ---------------------------------------------------------------------------
# Endpoint: rag-analyze
# ---------------------------------------------------------------------------

@router.post(
    "/compliance/rag-analyze",
    response_model=ComplianceResponse,
    summary="Regulatory Compliance & Tariff RAG Analysis",
    description=(
        "Analyzes customs tariff schedules, preferential bilateral trade agreements, "
        "non-tariff measures (NTMs), and mandatory document requirements for a specific "
        "origin-destination corridor and HS6 commodity."
    ),
)
def rag_analyze(req: ComplianceRequest) -> Dict[str, Any]:
    analysis_id = str(uuid.uuid4())
    origin = req.origin_country.strip().upper()
    dest = req.destination_country.strip().upper()

    corridor_key = (origin, dest)
    treaty = _TREATY_MAP.get(corridor_key)
    tariff_data_unavailable = False

    if treaty is None:
        # Query local WITS/UNCTAD TRAINS dataset and live SDMX
        wits = fetch_mfn_tariff(dest, req.hs6, partner_iso3=origin)
        if wits is not None:
            mfn_rate = wits.get("mfn_rate", wits.get("rate_pct", 0.0))
            pref_rate = wits.get("pref_rate", mfn_rate)
            agreement = wits.get("agreement", f"WITS TRAINS ({dest})")
        else:
            mfn_rate = 0.0
            pref_rate = 0.0
            tariff_data_unavailable = True
            agreement = f"No Known Trade Agreement ({origin} -> {dest}) — tariff schedule on file"
        treaty = {
            "agreement": agreement,
            "preferential_rate_pct": pref_rate,
            "standard_mfn_rate_pct": mfn_rate,
            "ntm_barriers": [
                f"Standard {dest} Customs Import Declaration",
                "Destination Sanitary & Phytosanitary (SPS) Clearance",
            ],
        }

    pref_rate = treaty["preferential_rate_pct"]
    mfn_rate = treaty["standard_mfn_rate_pct"]

    duty_savings: Optional[float] = None
    if req.trade_value_usd and req.trade_value_usd > 0:
        savings_pct = max(0.0, mfn_rate - pref_rate)
        duty_savings = round(req.trade_value_usd * (savings_pct / 100.0), 2)

    required_docs = _get_hs6_documents(req.hs6, origin, dest) or _DEFAULT_DOCUMENTS

    # Compliance score calculation
    held_certs = set(c.upper() for c in (req.certifications or []))
    score = 90.0

    flags: List[str] = []
    if tariff_data_unavailable:
        flags.append("TARIFF_DATA_UNAVAILABLE")
    if pref_rate == 0.0 and mfn_rate > 0.0:
        flags.append(f"ZERO_TARIFF_PREFERENCE ({treaty['agreement']})")
        score += 5.0

    if req.hs6 == 100630:
        if "APEDA" not in held_certs:
            flags.append("MISSING_APEDA_CERTIFICATION")
            score -= 10.0
        if "FSSAI" not in held_certs:
            flags.append("MISSING_FSSAI_CLEARANCE")
            score -= 5.0

    ntm_count = len(treaty["ntm_barriers"])
    score -= min(15.0, ntm_count * 2.5)
    final_score = round(max(10.0, min(100.0, score)), 1)

    # Retrieve RAG Evidence
    from brain.services.rag_retriever import get_retriever  # noqa: PLC0415
    retriever = get_retriever()
    passages = retriever.retrieve(
        query=f"customs duty tariff compliance rules {req.hs6}",
        top_k=4,
        origin_iso3=origin,
        destination_iso3=dest,
        hs6=req.hs6,
    )
    sources = list(dict.fromkeys(p["source"] for p in passages))

    return ComplianceResponse(
        status="OK",
        compliance_engine="rag-hybrid-v2.0",
        analysis_id=analysis_id,
        origin_country=origin,
        destination_country=dest,
        hs6=req.hs6,
        tariff=TariffDetail(
            preferential_rate_pct=pref_rate,
            standard_mfn_rate_pct=mfn_rate,
            agreement=treaty["agreement"],
            duty_savings_usd=duty_savings,
        ),
        ntm_barriers=treaty["ntm_barriers"],
        required_documents=[ComplianceDocument(**d) for d in required_docs],
        compliance_score=final_score,
        flags=flags,
        retrieved_evidence=passages,
        sources_cited=sources,
        disclaimer=(
            f"{_HS6_DISCLAIMER} Also grounded in official bilateral treaties, DGFT schedules, and UNCTAD TRAINS tariff datasets."
            if _get_hs6_documents(req.hs6, origin, dest) is not None
            else "Grounded in official bilateral treaties, DGFT schedules, and UNCTAD TRAINS tariff datasets."
        ),
    ).model_dump()


# ---------------------------------------------------------------------------
# Transaction Compliance Gate (Phase 8) — 08_TRANSACTION_COMPLIANCE_GATE.md
# ---------------------------------------------------------------------------

class TransactionGateRequest(BaseModel):
    trade_id: str = Field(..., example="TRD-IND-ARE-550K")
    hs6: str = Field(..., example="090121")
    origin_country: str = Field(default="IND", example="IND")
    destination_country: str = Field(..., example="ARE")
    exporter_name: str = Field(..., example="Arvind Global Agro Exports Ltd")
    importer_name: str = Field(..., example="Gulf Trading LLC")
    beneficial_owners: Optional[List[Dict[str, Any]]] = Field(
        default=None, description="[{name, pct_ownership}] — omit if unknown"
    )
    freight_forwarder_name: Optional[str] = None
    carrier_name: Optional[str] = None
    consignee_name: Optional[str] = None
    end_user_name: Optional[str] = None


@router.post(
    "/compliance/transaction-gate",
    summary="Transaction Compliance Gate",
    description=(
        "The single deterministic gate before trade creation, escrow creation, "
        "marketplace activation, shipment release, or payment release. Returns "
        "CLEAR / REVIEW / BLOCKED / UNSUPPORTED — never conflate UNSUPPORTED "
        "or REVIEW with CLEAR. Escrow may only proceed on CLEAR."
    ),
)
def transaction_gate(req: TransactionGateRequest) -> Dict[str, Any]:
    result = evaluate_transaction(GateInput(
        trade_id=req.trade_id,
        hs6=req.hs6,
        origin=req.origin_country,
        destination=req.destination_country,
        exporter_name=req.exporter_name,
        importer_name=req.importer_name,
        beneficial_owners=req.beneficial_owners,
        freight_forwarder_name=req.freight_forwarder_name,
        carrier_name=req.carrier_name,
        consignee_name=req.consignee_name,
        end_user_name=req.end_user_name,
    ))
    return result.to_dict()


# ---------------------------------------------------------------------------
# Sanctions / Restricted-Party Screening (Phase 8a)
# ---------------------------------------------------------------------------

class SanctionsScreenRequest(BaseModel):
    exporter_name: Optional[str] = None
    importer_name: Optional[str] = None
    freight_forwarder_name: Optional[str] = None
    carrier_name: Optional[str] = None
    consignee_name: Optional[str] = None
    end_user_name: Optional[str] = None


@router.post(
    "/compliance/sanctions-screen",
    summary="Restricted-Party / Sanctions Screening",
    description=(
        "Screens named transaction parties against OFAC SDN + UN Security "
        "Council Consolidated List. NO_MATCH / POTENTIAL_MATCH / "
        "MATCH_REQUIRES_RESTRICTION / CLEARED_AFTER_REVIEW / UNSUPPORTED. "
        "A POTENTIAL_MATCH is a fuzzy candidate requiring human review, "
        "never a legal finding by itself."
    ),
)
def sanctions_screen(req: SanctionsScreenRequest) -> Dict[str, Any]:
    parties = {
        role: name
        for role, name in {
            "exporter": req.exporter_name,
            "importer": req.importer_name,
            "freight_forwarder": req.freight_forwarder_name,
            "carrier": req.carrier_name,
            "consignee": req.consignee_name,
            "end_user": req.end_user_name,
        }.items()
        if name
    }
    return screen_transaction_parties(parties)


# ---------------------------------------------------------------------------
# Coverage — what the compliance subsystems actually cover right now
# ---------------------------------------------------------------------------

@router.get(
    "/compliance/coverage",
    summary="Compliance Subsystem Coverage",
    description="Reports what current-facts and entity-screening actually cover — never silently omits a gap.",
)
def compliance_coverage() -> Dict[str, Any]:
    from brain.models.compliance.current_facts import get_registry as get_facts_registry, RegistryError as FactsRegistryError
    from brain.models.compliance.entity_screening import get_registry as get_entity_registry, RegistryError as EntityRegistryError

    coverage: Dict[str, Any] = {}

    try:
        facts_reg = get_facts_registry()
        coverage["current_facts"] = {
            "available": True,
            "in_scope_hs6_count": len(facts_reg.in_scope_hs6()),
            "in_scope_partners_count": len(facts_reg.in_scope_partners()),
            "exporter_scope": facts_reg.scope.get("exporter"),
            "sources_fetched": len(facts_reg.sources.get("sources_fetched_successfully", [])),
        }
    except FactsRegistryError as exc:
        coverage["current_facts"] = {"available": False, "reason": str(exc)}

    try:
        entity_reg = get_entity_registry()
        coverage["entity_screening"] = {
            "available": True,
            "entity_count": len(entity_reg.entities),
            "unsupported_sources": [g["source"] for g in entity_reg.unsupported_sources()],
        }
    except EntityRegistryError as exc:
        coverage["entity_screening"] = {"available": False, "reason": str(exc)}

    return coverage


# ---------------------------------------------------------------------------
# Document Verification Verdict — extracted from the n8n workflow JSON
# ("Code — Synthesize Doc Verdict"), which duplicated this exact decision
# tree as unversioned, untested inline JS. Same thresholds, now testable.
# ---------------------------------------------------------------------------

class DocVerdictRequest(BaseModel):
    ocr_status: Optional[str] = None
    ocr_data_source: Optional[str] = None
    compliance_score: Optional[float] = None
    compliance_flags: List[str] = Field(default_factory=list)


class DocVerdictResponse(BaseModel):
    status: str  # OCR_STUB_NOT_LIVE | COMPLIANCE_UNAVAILABLE | REVIEW_REQUIRED | VERIFIED
    cleared_for_shipment: bool


@router.post(
    "/compliance/doc-verdict",
    response_model=DocVerdictResponse,
    summary="Document Verification Verdict",
    description=(
        "Single source of truth for the OCR/compliance verdict decision — never "
        "claims VERIFIED unless OCR is confirmed live and the compliance score "
        "clears the review threshold."
    ),
)
def doc_verdict(req: DocVerdictRequest) -> Dict[str, Any]:
    ocr_is_live = bool(req.ocr_data_source) and req.ocr_data_source != "stub" and req.ocr_status != "STUB"
    blocking_flag = any(("MISSING_" in f or "PROHIBITED" in f) for f in req.compliance_flags)

    if not ocr_is_live:
        return {"status": "OCR_STUB_NOT_LIVE", "cleared_for_shipment": False}
    if req.compliance_score is None:
        return {"status": "COMPLIANCE_UNAVAILABLE", "cleared_for_shipment": False}
    if blocking_flag or req.compliance_score < 70:
        return {"status": "REVIEW_REQUIRED", "cleared_for_shipment": False}
    return {"status": "VERIFIED", "cleared_for_shipment": True}


# ---------------------------------------------------------------------------
# Composite Trade Score & Recommendation — extracted from the n8n workflow
# JSON ("Code — Synthesize All Models"), which duplicated the composite
# weights and PROCEED/REVIEW/AVOID thresholds as unversioned inline JS.
# ---------------------------------------------------------------------------

class TradeSynthesisRequest(BaseModel):
    hs6: Optional[int] = None
    market_score: Optional[float] = None
    anomaly_score: Optional[float] = None
    risk_level: Optional[str] = None
    counterparty_match_score: Optional[float] = None
    counterparty_trust_score: Optional[float] = None
    compliance_score: Optional[float] = None


class TradeSynthesisResponse(BaseModel):
    status: str  # SUCCESS | PARTIAL | FAILED
    missing_dimensions: List[str]
    composite_score: Optional[float] = None
    recommendation: str  # PROCEED | REVIEW | AVOID | UNSUPPORTED


@router.post(
    "/compliance/trade-synthesis",
    response_model=TradeSynthesisResponse,
    summary="Composite Trade Score & Recommendation",
    description=(
        "Composite-scoring weights (35% market / 25% compliance / 20% anomaly / "
        "10% counterparty match / 10% counterparty trust) and PROCEED/REVIEW/"
        "AVOID thresholds. A dimension missing from the request is reported in "
        "missing_dimensions and the composite is null — never silently filled in."
    ),
)
def trade_synthesis(req: TradeSynthesisRequest) -> Dict[str, Any]:
    missing: List[str] = []
    if req.hs6 is None:
        missing.append("hs_classification")
    if req.market_score is None:
        missing.append("market_opportunity")
    if req.anomaly_score is None or req.risk_level is None:
        missing.append("trade_anomaly")
    if req.counterparty_match_score is None:
        missing.append("counterparty_match")
    if req.counterparty_trust_score is None:
        missing.append("counterparty_risk")
    if req.compliance_score is None:
        missing.append("compliance")

    composite_score: Optional[float] = None
    recommendation = "UNSUPPORTED"
    status = "FAILED"

    if not missing:
        composite_score = round(
            0.35 * req.market_score
            + 0.25 * req.compliance_score
            + 0.20 * (100 - req.anomaly_score * 100)
            + 0.10 * req.counterparty_match_score
            + 0.10 * req.counterparty_trust_score
        )
        status = "SUCCESS"
        if composite_score >= 75 and req.risk_level not in ("CRITICAL", "HIGH"):
            recommendation = "PROCEED"
        elif composite_score < 45 or req.risk_level == "CRITICAL":
            recommendation = "AVOID"
        else:
            recommendation = "REVIEW"
    elif len(missing) < 6:
        status = "PARTIAL"
        recommendation = "REVIEW"

    return {
        "status": status,
        "missing_dimensions": missing,
        "composite_score": composite_score,
        "recommendation": recommendation,
    }
