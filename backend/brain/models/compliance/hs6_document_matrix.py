"""
GlobeXAI Trade OS — HS6 Document/Certification Matrix

Curated from backend/brain/datasets/final/india_trade_compliance_hs6.md (India
trade-compliance research file, prepared 26 Aug 2026, 32 HS6 rows). That file
is explicitly a "compliance-research and triage file, not a legal opinion" —
this matrix inherits that caveat: it tells a user what to go verify/obtain,
not a guarantee of legal sufficiency. See DISCLAIMER below (surfaced verbatim
by compliance_api.py in every response that uses this matrix).

Two HS6 codes used elsewhere in the app's product catalogue
(backend/brain/models/destination_ranking/product_catalogue.csv) are NOT in
the source MD file and have no entry here, so they fall back to
_DEFAULT_DOCUMENTS in compliance_api.py:
  - 851712  Telephones for cellular networks / smartphones
            (source MD instead covers 851713 — a different 8-digit family;
             do not assume it transfers)
  - 901890  Medical, surgical or dental instruments and electro-medical
            apparatus (CDSCO Medical Devices Rules likely apply — unconfirmed)

Each entry has an "export" list (goods leaving India) and an "import" list
(goods entering India), selected by compliance_api.py based on which side of
the corridor is IND. Every list also carries the universal baseline documents
required for any commercial shipment (invoice, packing list, transport
document, IEC/customs filing, origin proof) plus the commodity-specific
regulatory documents named in the source MD's "principal checks" columns and
"Certifications and permissions by regime" section.
"""

from __future__ import annotations

from typing import Any, Dict, List

DISCLAIMER = (
    "Compliance-research triage list, not a legal opinion. India clears goods at the "
    "8-digit ITC(HS) level, not HS6 — confirm the exact 8-digit code and current DGFT "
    "Schedule 1/2 policy before relying on this list, and consult a customs broker for "
    "high-value, restricted, food, pharmaceutical, controlled, or safety-regulated goods."
)

_INVOICE = {"name": "Commercial Invoice", "issuing_authority": "Exporter / Shipper", "mandatory": True}
_PACKING = {"name": "Packing List", "issuing_authority": "Exporter / Warehouse", "mandatory": True}
_BOL = {"name": "Bill of Lading / Airway Bill", "issuing_authority": "Freight Carrier", "mandatory": True}
_IEC = {"name": "Importer-Exporter Code (IEC)", "issuing_authority": "DGFT", "mandatory": True}
_COO = {"name": "Certificate of Origin", "issuing_authority": "Export Inspection Council (EIC) / Chamber of Commerce / DGFT", "mandatory": True}
_SHIPPING_BILL = {"name": "Shipping Bill (Export Customs Filing)", "issuing_authority": "Customs / ICEGATE", "mandatory": True}
_BILL_OF_ENTRY = {"name": "Bill of Entry (Import Customs Filing)", "issuing_authority": "Customs / ICEGATE", "mandatory": True}
_DGFT_POLICY = {"name": "DGFT ITC(HS) Schedule Policy Check (8-digit)", "issuing_authority": "DGFT", "mandatory": True}
_FSSAI = {"name": "FSSAI Import/Export Food Clearance", "issuing_authority": "Food Safety and Standards Authority of India", "mandatory": True}
_PHYTO = {"name": "Phytosanitary Certificate", "issuing_authority": "NPPO / Directorate of Plant Protection, Quarantine & Storage", "mandatory": True}
_BIS = {"name": "BIS Certification (QCO / CRS as applicable)", "issuing_authority": "Bureau of Indian Standards", "mandatory": True}
_CDSCO = {"name": "CDSCO Drug/API Registration & Import-Export Licence", "issuing_authority": "Central Drugs Standard Control Organisation", "mandatory": True}
_ENV = {"name": "MoEFCC/CPCB Environmental Clearance (hazardous waste/EPR as applicable)", "issuing_authority": "MoEFCC / CPCB", "mandatory": False}
_SCOMET = {"name": "SCOMET Export-Control Screening", "issuing_authority": "DGFT", "mandatory": False}
_QUALITY = {"name": "Independent Quality & Weight Certificate", "issuing_authority": "SGS / Bureau Veritas / Intertek", "mandatory": False}


def _export(*extra: Dict[str, Any]) -> List[Dict[str, Any]]:
    return [_INVOICE, _PACKING, _BOL, _IEC, _DGFT_POLICY, _SHIPPING_BILL, _COO, *extra]


def _import(*extra: Dict[str, Any]) -> List[Dict[str, Any]]:
    return [_INVOICE, _PACKING, _BOL, _IEC, _DGFT_POLICY, _BILL_OF_ENTRY, *extra]


_PRODUCT_DOCUMENTS: Dict[int, Dict[str, List[Dict[str, Any]]]] = {
    100630: {  # Basmati rice
        "export": _export(
            _PHYTO,
            {"name": "APEDA Registration-cum-Allocation Certificate (RCAC)", "issuing_authority": "APEDA, Ministry of Commerce", "mandatory": True},
            _FSSAI,
            _QUALITY,
        ),
        "import": _import(_FSSAI, _PHYTO),
    },
    30617: {  # Shrimp / prawn
        "export": _export(
            {"name": "MPEDA Exporter & Processing-Establishment Registration", "issuing_authority": "Marine Products Export Development Authority", "mandatory": True},
            {"name": "Health Certificate (Approved Processing Establishment)", "issuing_authority": "MPEDA / Export Inspection Agency", "mandatory": True},
            {"name": "Residue Monitoring & Cold-Chain Traceability Certificate", "issuing_authority": "MPEDA / EIC", "mandatory": True},
        ),
        "import": _import(_FSSAI, {"name": "Health Certificate", "issuing_authority": "Exporting Country Competent Authority", "mandatory": True}),
    },
    90121: {  # Coffee
        "export": _export(
            {"name": "Coffee Board Exporter Registration & Quality Certificate", "issuing_authority": "Coffee Board of India", "mandatory": True},
            _FSSAI,
        ),
        "import": _import(_FSSAI),
    },
    90240: {  # Tea
        "export": _export(
            {"name": "Tea Board Registration & Export Quality Certificate", "issuing_authority": "Tea Board of India", "mandatory": True},
            _FSSAI,
        ),
        "import": _import(_FSSAI),
    },
    90411: {  # Pepper / spices
        "export": _export(
            {"name": "Spices Board Exporter Registration & Quality Certificate", "issuing_authority": "Spices Board of India", "mandatory": True},
            {"name": "Microbiological / Pesticide Residue Test Report", "issuing_authority": "Spices Board Testing Lab", "mandatory": True},
            _FSSAI,
        ),
        "import": _import(_FSSAI, {"name": "Contamination/Pesticide Residue Test Report", "issuing_authority": "Accredited Lab", "mandatory": True}),
    },
    120999: {  # Basil / other seeds
        "export": _export(_PHYTO),
        "import": _import(
            {"name": "Plant Quarantine Import Permit", "issuing_authority": "Directorate of Plant Protection, Quarantine & Storage", "mandatory": True},
            _PHYTO,
            _FSSAI,
        ),
    },
    151190: {  # Palm oil
        "export": _export(_FSSAI, _QUALITY),
        "import": _import(_FSSAI, {"name": "Edible Oil Standard & Labelling Compliance Certificate", "issuing_authority": "FSSAI", "mandatory": True}),
    },
    270112: {  # Coal
        "export": _export({"name": "Coal Grade/Specification Certificate", "issuing_authority": "Coal Controller's Organisation", "mandatory": True}, _ENV),
        "import": _import({"name": "Coal Grade/Specification Certificate", "issuing_authority": "Coal Controller's Organisation", "mandatory": True}, _ENV),
    },
    270900: {  # Crude petroleum
        "export": _export({"name": "Petroleum-Sector Export Permission", "issuing_authority": "PESO / Petroleum & Natural Gas Ministry", "mandatory": True}),
        "import": _import({"name": "Petroleum-Sector Import Permission", "issuing_authority": "PESO / Petroleum & Natural Gas Ministry", "mandatory": True}),
    },
    271019: {  # Diesel / gas oil
        "export": _export({"name": "PESO Safety Clearance", "issuing_authority": "Petroleum & Explosives Safety Organisation", "mandatory": True}),
        "import": _import(
            {"name": "PESO Safety Clearance", "issuing_authority": "Petroleum & Explosives Safety Organisation", "mandatory": True},
            {"name": "Legal Metrology / Labelling Compliance Certificate", "issuing_authority": "Legal Metrology Department", "mandatory": False},
        ),
    },
    280461: {  # Silicon
        "export": _export(_SCOMET, _QUALITY),
        "import": _import({"name": "Technical Grade/Purity Specification Sheet", "issuing_authority": "Manufacturer / Testing Lab", "mandatory": True}, _BIS),
    },
    293339: {  # API / heterocyclic compounds
        "export": _export(
            {"name": "GMP Certificate & Certificate of Analysis (CoA)", "issuing_authority": "CDSCO / Manufacturing Site", "mandatory": True},
            _CDSCO,
        ),
        "import": _import(_CDSCO, {"name": "Manufacturer/Site Registration", "issuing_authority": "CDSCO", "mandatory": True}),
    },
    300490: {  # Medicaments / formulations
        "export": _export(
            {"name": "GMP Certificate & Certificate of Analysis (CoA)", "issuing_authority": "CDSCO / Manufacturing Site", "mandatory": True},
            _CDSCO,
        ),
        "import": _import(
            {"name": "Import Registration (Form 41) & Import Licence (Form 10/10A)", "issuing_authority": "CDSCO (via SUGAM)", "mandatory": True},
        ),
    },
    310520: {  # Fertiliser
        "export": _export({"name": "Fertiliser Product Specification/Labelling Certificate", "issuing_authority": "Fertiliser Control Order Authority", "mandatory": True}),
        "import": _import({"name": "Fertiliser Import Permission & Specification Compliance", "issuing_authority": "Department of Fertilizers / DGFT", "mandatory": True}),
    },
    390110: {  # Plastic / polyethylene
        "export": _export({"name": "Plastic Waste/EPR Compliance Certificate (if applicable)", "issuing_authority": "CPCB", "mandatory": False}),
        "import": _import(_BIS, _ENV),
    },
    520512: {  # Cotton yarn / textiles
        "export": _export({"name": "Textile Quality/Origin Certificate", "issuing_authority": "Textile Committee / DGFT", "mandatory": False}),
        "import": _import({"name": "Textile Product Specification / QCO Check", "issuing_authority": "BIS / Textile Committee", "mandatory": True}),
    },
    610910: {  # T-shirts / apparel
        "export": _export({"name": "Fibre Composition / Care Label Compliance Certificate", "issuing_authority": "Textile Committee", "mandatory": False}),
        "import": _import({"name": "Textile Labelling & Fibre Composition Compliance (QCO Check)", "issuing_authority": "BIS / Legal Metrology", "mandatory": True}),
    },
    620342: {  # Trousers / jeans
        "export": _export({"name": "Fibre Composition / Care Label Compliance Certificate", "issuing_authority": "Textile Committee", "mandatory": False}),
        "import": _import({"name": "Textile Labelling & Fibre Composition Compliance (QCO Check)", "issuing_authority": "BIS / Legal Metrology", "mandatory": True}),
    },
    690721: {  # Ceramic tiles
        "export": _export(_QUALITY),
        "import": _import(_BIS, {"name": "Test Report / Product Marking Compliance", "issuing_authority": "BIS-Recognised Testing Lab", "mandatory": True}),
    },
    710239: {  # Diamonds
        "export": _export(
            {"name": "Kimberley Process Certificate (rough diamonds)", "issuing_authority": "Gem & Jewellery Export Promotion Council (GJEPC)", "mandatory": True},
        ),
        "import": _import(
            {"name": "Kimberley Process Certificate (rough diamonds)", "issuing_authority": "GJEPC", "mandatory": True},
        ),
    },
    711319: {  # Jewellery / gold
        "export": _export(
            {"name": "BIS Hallmarking/Assaying Certificate", "issuing_authority": "Bureau of Indian Standards", "mandatory": True},
            {"name": "Precious-Metal Documentation (RBI/Customs)", "issuing_authority": "RBI / Customs", "mandatory": True},
        ),
        "import": _import(
            {"name": "BIS Hallmarking/Assaying Certificate", "issuing_authority": "Bureau of Indian Standards", "mandatory": True},
            {"name": "Precious-Metal Import Documentation (RBI/Customs)", "issuing_authority": "RBI / Customs", "mandatory": True},
        ),
    },
    720839: {  # Hot rolled steel coils
        "export": _export({"name": "Mill Test Certificate (MTC)", "issuing_authority": "Steel Manufacturer", "mandatory": True}),
        "import": _import(
            _BIS,
            {"name": "Mill Test Certificate (MTC)", "issuing_authority": "Steel Manufacturer", "mandatory": True},
            {"name": "Safeguard/Anti-Dumping Duty & Origin Check", "issuing_authority": "DGTR / Customs", "mandatory": True},
        ),
    },
    730890: {  # Structures / towers
        "export": _export({"name": "Structural Engineering Specification Certificate", "issuing_authority": "Design Engineer / Manufacturer", "mandatory": False}),
        "import": _import(_BIS, {"name": "Structural Engineering Specification Certificate", "issuing_authority": "Design Engineer / Manufacturer", "mandatory": False}),
    },
    760110: {  # Aluminium
        "export": _export(_QUALITY),
        "import": _import(_BIS, {"name": "Purity/Specification Certificate & Origin Trade-Remedy Check", "issuing_authority": "DGTR / Customs", "mandatory": True}),
    },
    841199: {  # Turbines / aerospace
        "export": _export(_SCOMET, {"name": "Aerospace/Technical Specification & End-Use Certificate", "issuing_authority": "Manufacturer / DGFT", "mandatory": True}),
        "import": _import({"name": "Aerospace/Technical Specification & End-Use Certificate", "issuing_authority": "Manufacturer / DGFT", "mandatory": True}),
    },
    847130: {  # Laptops / tablets
        "export": _export(),
        "import": _import(
            {"name": "BIS Compulsory Registration Scheme (CRS) Certificate", "issuing_authority": "Bureau of Indian Standards", "mandatory": True},
            {"name": "E-Waste/EPR Registration", "issuing_authority": "CPCB", "mandatory": True},
            {"name": "Wireless Equipment Type Approval (if fitted)", "issuing_authority": "WPC, Ministry of Communications", "mandatory": False},
        ),
    },
    847989: {  # Automation / machinery
        "export": _export(_SCOMET),
        "import": _import(_BIS, {"name": "Machine Safety & Electrical Conformity Certificate", "issuing_authority": "BIS / Electrical Inspectorate", "mandatory": True}),
    },
    850440: {  # Inverters / static converters
        "export": _export(),
        "import": _import(
            {"name": "BIS Compulsory Registration Scheme (CRS) / QCO Certificate", "issuing_authority": "Bureau of Indian Standards", "mandatory": True},
            {"name": "Electrical Safety Certificate", "issuing_authority": "Electrical Inspectorate", "mandatory": True},
            {"name": "E-Waste/EPR Registration", "issuing_authority": "CPCB", "mandatory": False},
        ),
    },
    851713: {  # Phones / smartphones (source-MD code; app catalogue uses 851712 — see module docstring)
        "export": _export({"name": "Battery Transport (UN38.3) Compliance Certificate", "issuing_authority": "Manufacturer / Testing Lab", "mandatory": True}),
        "import": _import(
            {"name": "BIS Compulsory Registration Scheme (CRS) Certificate", "issuing_authority": "Bureau of Indian Standards", "mandatory": True},
            {"name": "WPC Equipment Type Approval (ETA)", "issuing_authority": "Wireless Planning & Coordination Wing", "mandatory": True},
            {"name": "E-Waste/EPR & Battery Rules Registration", "issuing_authority": "CPCB", "mandatory": True},
        ),
    },
    854143: {  # Solar panels / PV
        "export": _export({"name": "PV Certification/Testing Report", "issuing_authority": "Accredited Testing Lab", "mandatory": True}),
        "import": _import(
            {"name": "BIS Compulsory Registration Scheme (CRS) Certificate (notified PV products)", "issuing_authority": "Bureau of Indian Standards", "mandatory": True},
            {"name": "ALMM Listing (for project use)", "issuing_authority": "Ministry of New & Renewable Energy (MNRE)", "mandatory": False},
            {"name": "Electrical Safety Certificate", "issuing_authority": "Electrical Inspectorate", "mandatory": True},
        ),
    },
    870322: {  # Cars / vehicles
        "export": _export({"name": "Vehicle Homologation/Type Approval Certificate", "issuing_authority": "ARAI / Destination Type-Approval Authority", "mandatory": True}),
        "import": _import(
            {"name": "Vehicle Homologation / Type Approval (CMVR)", "issuing_authority": "Automotive Research Association of India (ARAI)", "mandatory": True},
            {"name": "Emissions & Safety Compliance Certificate", "issuing_authority": "ARAI / Ministry of Road Transport", "mandatory": True},
        ),
    },
    870829: {  # Auto parts
        "export": _export({"name": "Part-Specific Quality/Safety Certificate", "issuing_authority": "Manufacturer / AIS-Accredited Lab", "mandatory": False}),
        "import": _import(
            {"name": "Automotive Industry Standard (AIS) / BIS / QCO Certificate (where notified)", "issuing_authority": "BIS / ARAI", "mandatory": True},
        ),
    },
}


def get_documents(hs6: int, origin_iso3: str, destination_iso3: str) -> List[Dict[str, Any]]:
    """Direction-aware document list for an HS6 corridor. India-centric: goods
    leaving India ("export") use the export list, goods entering India
    ("import") use the import list. Falls back to None for callers to apply
    their own generic default when the HS6 isn't in this matrix or neither
    side of the corridor is India.
    """
    entry = _PRODUCT_DOCUMENTS.get(hs6)
    if entry is None:
        return None
    if (origin_iso3 or "").strip().upper() == "IND":
        return entry["export"]
    if (destination_iso3 or "").strip().upper() == "IND":
        return entry["import"]
    return None
