"""
FastAPI Microservice Endpoints — GLOBEX Trade Anomaly Detection
Implements:
- POST /api/trade-anomaly/predict
- GET /api/trade-anomaly/coverage
- GET /api/trade-anomaly/health
"""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from brain.models.trade_anomaly.inference import TradeAnomalyInferenceService

router = APIRouter(prefix="/api/trade-anomaly", tags=["Trade Anomaly Detection"])
_inference_service: Optional[TradeAnomalyInferenceService] = None


def get_inference_service() -> TradeAnomalyInferenceService:
    global _inference_service
    if _inference_service is None:
        _inference_service = TradeAnomalyInferenceService()
    return _inference_service


class TradeAnomalyRequest(BaseModel):
    trade_flow: str = Field(..., description="Trade flow direction ('Export' or 'Import')", example="Export")
    hs6: int = Field(..., description="6-digit Harmonized System product code", example=100630)
    partner_country: str = Field(..., description="3-letter ISO3 partner country code", example="ARE")
    trade_value_usd: float = Field(..., description="Total trade transaction value in USD", example=120000.0)
    quantity: float = Field(..., description="Trade quantity", example=50000.0)
    quantity_unit: str = Field(default="kg", description="Unit of measurement", example="kg")
    period: Optional[str] = Field(default=None, description="Trade month YYYY-MM or YYYYMM", example="2025-12")
    transaction_count: Optional[int] = Field(default=1, description="Number of bundled transactions", example=1)


@router.post("/predict", summary="Evaluate Trade Behaviour Anomaly")
def predict_trade_anomaly(req: TradeAnomalyRequest) -> Dict[str, Any]:
    """
    Evaluates whether an incoming trade observation deviates significantly
    from its historical corridor baseline.
    """
    service = get_inference_service()
    res = service.predict(
        trade_flow=req.trade_flow,
        hs6=req.hs6,
        partner_country=req.partner_country,
        trade_value_usd=req.trade_value_usd,
        quantity=req.quantity,
        quantity_unit=req.quantity_unit,
        period=req.period,
        transaction_count=req.transaction_count or 1
    )
    if res.get("status") == "ERROR":
        raise HTTPException(status_code=400, detail=res)
    return res


@router.get("/coverage", summary="Get Historical Corridor Coverage")
def get_coverage() -> Dict[str, Any]:
    """
    Returns supported trading partners, HS6 products, trade flows, and historical date ranges.
    """
    service = get_inference_service()
    return {
        "status": "OK",
        "coverage": service.coverage_info,
        "model_version": service.metadata.get("version", "1.0.0")
    }


@router.get("/health", summary="Trade Anomaly Service Health Check")
def get_health() -> Dict[str, Any]:
    """
    Returns service health status and artifact availability.
    """
    service = get_inference_service()
    return {
        "status": "HEALTHY",
        "model_loaded": service.model is not None,
        "preprocessor_loaded": service.preprocessor is not None,
        "historical_data_loaded": service.historical_data is not None,
        "model_name": service.metadata.get("model_name", "xgboost_anomaly_detector"),
        "version": service.metadata.get("version", "1.0.0")
    }
