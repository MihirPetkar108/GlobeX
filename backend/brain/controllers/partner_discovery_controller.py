"""
GlobeXAI Trade OS — Partner Discovery / Market Opportunity Router
Endpoint: POST /predict/market-opportunity

Wraps the synchronous recommend_destinations() engine from brain.models.partner_discovery.inference
in an async FastAPI endpoint using run_in_executor for non-blocking I/O.

NOTE: This is the MARKET OPPORTUNITY endpoint. It is distinct from:
  - Trade Anomaly (/api/trade-anomaly) — XGBoost + unsupervised IsolationForest screen
  - Counterparty Risk (/predict/counterparty-risk) — rule-based penalties; no
    trade-risk IsolationForest/GRU model route is mounted in main.py
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from functools import partial
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Partner Discovery"])

# ---------------------------------------------------------------------------
# Fixed path constants (relative to project root, resolved at request time)
# ---------------------------------------------------------------------------

_DATA_DIR = "backend/brain"
# GRU forecaster is disabled (src/partner_discovery/inference.py — walk-forward
# backtest showed it 2x worse than the 3-year moving-average formula it was
# meant to beat), so this path is no longer read for model weights. Left
# pointing at a real directory only so a future re-enable doesn't reintroduce
# the previous dangling "backend/brain_temporary" path.
_MODEL_DIR = "backend/brain/models/partner_forecasting"

# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

_VALID_REGIMES = {"balanced", "aggressive", "conservative", "risk_averse"}


class MarketOpportunityRequest(BaseModel):
    product: str = Field(
        ...,
        description="Product name (e.g. 'basmati rice') or HS6 code string (e.g. '100630')",
        example="basmati rice",
    )
    quantity_kg: Optional[float] = Field(
        default=None,
        description="Target export quantity in kilograms",
        example=50000.0,
        gt=0,
    )
    regime: str = Field(
        default="balanced",
        description="Scoring regime: balanced | aggressive | conservative | risk_averse",
        example="balanced",
    )
    top_n: int = Field(
        default=10,
        description="Number of destination recommendations to return (max 20)",
        example=10,
        ge=1,
        le=20,
    )

    @field_validator("regime")
    @classmethod
    def _validate_regime(cls, v: str) -> str:
        if v not in _VALID_REGIMES:
            raise ValueError(
                f"regime must be one of {sorted(_VALID_REGIMES)}, got '{v}'"
            )
        return v


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post(
    "/predict/market-opportunity",
    summary="Market Opportunity & Destination Recommendation",
    description=(
        "Runs the GlobeXAI Partner Discovery engine: resolves the product to an HS6 code, "
        "loads the 26-year India-as-exporter trade panel, forecasts demand via a 3-year "
        "moving-average momentum formula (the Dual-Head GRU forecaster is disabled — a "
        "walk-forward backtest showed it 2x worse than this formula, see "
        "reports/production/phase4b_outputs), ranks destination countries by multi-criteria "
        "opportunity score, integrates trade-risk penalties, and returns the top-N recommendations."
    ),
)
async def market_opportunity(req: MarketOpportunityRequest) -> Dict[str, Any]:
    """
    Asynchronous wrapper around the synchronous recommend_destinations() engine.

    The underlying pipeline is CPU-bound (pandas + PyTorch) so it is executed
    in the default ThreadPoolExecutor via run_in_executor to avoid blocking
    the FastAPI event loop.
    """
    from brain.models.partner_discovery.inference import recommend_destinations  # noqa: PLC0415

    analysis_id = str(uuid.uuid4())

    loop = asyncio.get_event_loop()
    fn = partial(
        recommend_destinations,
        req.product,        # product_query
        req.quantity_kg,    # requested_quantity_kg
        req.top_n,          # top_n
        req.regime,         # regime
        _DATA_DIR,          # data_dir
        _MODEL_DIR,         # model_dir
    )

    try:
        result: Dict[str, Any] = await loop.run_in_executor(None, fn)
    except Exception as exc:
        logger.exception("Market opportunity engine raised an unexpected error: %s", exc)
        raise HTTPException(
            status_code=500,
            detail={
                "status": "ERROR",
                "error_code": "ENGINE_FAILURE",
                "message": str(exc),
                "analysis_id": analysis_id,
            },
        ) from exc

    # Surface engine-level errors as HTTP 422 Unprocessable Entity
    if result.get("status") == "error":
        raise HTTPException(
            status_code=422,
            detail={
                "status": "ERROR",
                "error_code": "PRODUCT_NOT_FOUND",
                "message": result.get("message", "Unknown engine error"),
                "product_resolution": result.get("product_resolution"),
                "analysis_id": analysis_id,
            },
        )

    # Inject metadata into successful response
    result["model_version"] = "pd-gru-v1.0"
    result["analysis_id"] = analysis_id

    return result
