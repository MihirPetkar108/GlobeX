"""
GlobeXAI Trade OS — Document Intelligence & OCR Router
Endpoint: POST /documents/ocr-extract

Provides OCR text extraction and field identification for cross-border trade documents
(Commercial Invoice, Bill of Lading, Certificate of Origin, Packing List).
"""

from __future__ import annotations

import logging
import uuid
from typing import Any, Dict, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Document Intelligence"])


class DocumentExtractRequest(BaseModel):
    document_url: str = Field(..., description="URI or path to the document file", example="https://storage.globex.ai/docs/inv-101.pdf")
    document_type: str = Field(default="COMMERCIAL_INVOICE", description="Type of trade document", example="COMMERCIAL_INVOICE")
    trade_id: Optional[str] = Field(default=None, description="Associated trade UUID", example="trd-98765")


class DocumentExtractResponse(BaseModel):
    status: str
    message: str
    document_url: str
    document_type: str
    trade_id: Optional[str] = None
    extracted: Optional[Dict[str, Any]] = None
    analysis_id: str
    data_source: str = "stub"


@router.post(
    "/documents/ocr-extract",
    response_model=DocumentExtractResponse,
    summary="Extract Structured Fields via OCR",
    description=(
        "Extracts tabular data and entity fields from trade documentation. "
        "When an external OCR service is not configured, returns a clearly labelled stub response."
    ),
)
def extract_document(req: DocumentExtractRequest) -> Dict[str, Any]:
    analysis_id = str(uuid.uuid4())

    return DocumentExtractResponse(
        status="STUB",
        message="OCR extraction service is operating in stub mode. Configure VITE_OCR_SERVICE_URL or external OCR provider for live document parsing.",
        document_url=req.document_url,
        document_type=req.document_type,
        trade_id=req.trade_id,
        extracted=None,
        analysis_id=analysis_id,
        data_source="stub",
    ).model_dump()
