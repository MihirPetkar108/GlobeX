"""
GlobeXAI Trade OS — FastAPI Unified Application Entry Point (MVC Architecture)

Assembles all ML microservice controllers into a single coherent, production-quality API:
- Trade Anomaly:       POST /api/trade-anomaly/predict, GET /coverage, GET /health
- Partner Discovery:   POST /predict/market-opportunity
- HS Classification:   POST /predict/hs-code
- Counterparty Match:  POST /predict/counterparty-match
- Counterparty Risk:   POST /predict/counterparty-risk
- Compliance & Tariffs: POST /compliance/rag-analyze
- Document OCR:        POST /documents/ocr-extract
- Global Health:       GET /health, GET /
"""

import logging
import os
import sys
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Load environment configuration (with zero-dependency fallback)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    env_file = Path(__file__).resolve().parent / ".env"
    if not env_file.exists():
        env_file = Path(__file__).resolve().parent.parent / ".env"
    if env_file.exists():
        with open(env_file, encoding="utf-8") as _f:
            for _line in _f:
                _line = _line.strip()
                if _line and not _line.startswith("#") and "=" in _line:
                    _k, _v = _line.split("=", 1)
                    os.environ.setdefault(_k.strip(), _v.strip())

# Ensure repository root and brain directory are on sys.path
BRAIN_DIR = Path(__file__).resolve().parent
BACKEND_DIR = BRAIN_DIR.parent
for p in [str(BACKEND_DIR), str(BRAIN_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

# Setup structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("globex-api")

# Import all API controllers (MVC Architecture)
from brain.controllers.trade_anomaly_controller import router as trade_anomaly_router
from brain.controllers.hs_classifier_controller import router as hs_classifier_router
from brain.controllers.partner_discovery_controller import router as partner_discovery_router
from brain.controllers.counterparty_controller import router as counterparty_router
from brain.controllers.compliance_controller import router as compliance_router
from brain.controllers.documents_controller import router as documents_router
from brain.controllers.marketplace_controller import router as marketplace_router
from brain.controllers.trades_controller import router as trades_router
from brain.controllers.escrow_controller import router as escrow_router
from brain.controllers.scoring_controller import router as scoring_router
from brain.controllers.company_directory_controller import router as company_directory_router
from brain.controllers.logistics_controller import router as logistics_router

from brain.models.db.client import init_pool, close_pool, is_configured as db_is_configured
from brain.services import chain_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan manager for warming up models and verifying artifact availability."""
    logger.info("Initializing GlobeXAI Trade OS Unified API (MVC Engine)...")
    t0 = time.perf_counter()

    # Pre-warm trade anomaly inference service
    try:
        from brain.controllers.trade_anomaly_controller import get_inference_service
        svc = get_inference_service()
        logger.info(
            "Trade Anomaly Service ready (model_loaded=%s, version=%s)",
            svc.model is not None,
            svc.metadata.get("version", "1.0.0"),
        )
    except Exception as exc:
        logger.warning("Trade Anomaly warm-up warning: %s", exc)

    # Pre-warm HS classifier catalogue
    try:
        from brain.controllers.hs_classifier_controller import _load_catalogue
        cat = _load_catalogue()
        logger.info("HS Catalogue ready (loaded=%s)", cat is not None)
    except Exception as exc:
        logger.warning("HS Catalogue warm-up warning: %s", exc)

    # Initialize DB pool — never raises; the 7 ML routers work with zero DB.
    await init_pool()

    elapsed = (time.perf_counter() - t0) * 1000
    logger.info("GlobeXAI Trade OS ready in %.1f ms", elapsed)
    yield

    await close_pool()
    logger.info("GlobeXAI Trade OS shut down cleanly.")


app = FastAPI(
    title="GlobeXAI Trade OS — Unified API",
    description="Full-stack cross-border B2B trade intelligence and automation engine.",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all API routers
app.include_router(trade_anomaly_router)
app.include_router(hs_classifier_router)
app.include_router(partner_discovery_router)
app.include_router(counterparty_router)
app.include_router(compliance_router)
app.include_router(documents_router)
app.include_router(marketplace_router)
app.include_router(trades_router)
app.include_router(escrow_router)
app.include_router(scoring_router)
app.include_router(company_directory_router)
app.include_router(logistics_router)


@app.get("/health", tags=["System"])
async def global_health():
    """System health check across Database, Chain-Adapter, and ML Models."""
    db_health = {"configured": False, "connected": False, "error": None}
    if db_is_configured():
        db_health["configured"] = True
        try:
            from brain.models.db.client import get_pool
            pool = await get_pool()
            if pool is not None:
                async with pool.acquire() as conn:
                    val = await conn.fetchval("SELECT 1")
                    db_health["connected"] = (val == 1)
        except Exception as exc:
            db_health["error"] = str(exc)

    chain_health = {"reachable": False, "contract_address": None, "network": None, "error": None}
    try:
        raw_health = await chain_client.get_chain_health()
        chain_health["reachable"] = raw_health.get("reachable", False)
        chain_health["contract_address"] = raw_health.get("contractAddress")
        chain_health["network"] = raw_health.get("network")
        if not chain_health["reachable"]:
            chain_health["error"] = raw_health.get("error", "chain-adapter unreachable")
    except Exception as exc:
        chain_health["error"] = str(exc)

    models_status = {}
    try:
        from brain.controllers.trade_anomaly_controller import get_inference_service
        svc = get_inference_service()
        models_status["trade_anomaly"] = {
            "loaded": svc.model is not None,
            "version": svc.metadata.get("version", "1.0.0"),
        }
    except Exception:
        models_status["trade_anomaly"] = {"loaded": False}

    try:
        from brain.controllers.hs_classifier_controller import _load_catalogue
        cat = _load_catalogue()
        models_status["hs_classifier"] = {"loaded": cat is not None}
    except Exception:
        models_status["hs_classifier"] = {"loaded": False}

    overall_status = "healthy"
    if db_health["configured"] and not db_health["connected"]:
        overall_status = "degraded"

    return {
        "status": overall_status,
        "service": "globex-trade-os",
        "version": "2.0.0",
        "database": db_health,
        "chain_adapter": chain_health,
        "models": models_status,
    }


@app.get("/", tags=["System"])
async def root():
    return {
        "service": "GlobeXAI Trade OS Unified API",
        "version": "2.0.0",
        "status": "running",
        "architecture": "MVC (Model-View-Controller in brain/)",
        "docs": "/docs",
    }
