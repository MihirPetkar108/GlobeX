"""
GlobeXAI Trade OS — MVC View Layer (Presentation Schemas & DTOs)

Defines presentation-layer response schemas and data transfer objects for all controllers.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ApiResponseView(BaseModel):
    """Standardized API response wrapper view."""
    status: str = Field(..., example="success")
    message: Optional[str] = Field(None, example="Operation completed successfully")
    data: Optional[Any] = None
    meta: Optional[Dict[str, Any]] = None


class HealthCheckView(BaseModel):
    """Health check status view."""
    status: str = Field(..., example="healthy")
    service: str = Field("globex-trade-os", example="globex-trade-os")
    version: str = Field("2.0.0", example="2.0.0")
    database: Dict[str, Any] = Field(default_factory=dict)
    chain_adapter: Dict[str, Any] = Field(default_factory=dict)
    models: Dict[str, Any] = Field(default_factory=dict)


class MarketOpportunityView(BaseModel):
    """View model for partner discovery and market opportunities."""
    status: str
    product_query: str
    quantity_kg: float
    product_resolution: Dict[str, Any]
    ranked_destinations: List[Dict[str, Any]]
    forecasting_metadata: Dict[str, Any]


class AnomalyPredictionView(BaseModel):
    """View model for trade anomaly and price screening."""
    status: str
    anomaly_detected: bool
    anomaly_score: float
    risk_tier: str
    signals: List[Dict[str, Any]]
    explanation: Optional[str] = None


class ComplianceChecklistView(BaseModel):
    """View model for compliance, sanctions, and tariff results."""
    status: str
    decision: str
    composite_score: float
    sanctions_screen: Dict[str, Any]
    trade_controls: List[Dict[str, Any]]
    tariffs: Dict[str, Any]
    required_documents: List[Dict[str, Any]]
    notes: List[str]
