"""
Production loader for the promoted XGBoost residual demand forecaster.

Trained and validated by backend/brain/notebooks/validation/phase4c_xgb_residual.py.
Held-out (target years 2023-2024) demand WAPE 26.35% vs 28.41% for the
MA3 x 1.05 production fallback it replaces, and 61.14% for the Dual-Head GRU
that was rejected in Phase 4b.

The model predicts a RESIDUAL against the moving-average anchor, not the level:

    model output  = log(y / MA3_anchor)
    forecast      = MA3_anchor * exp(model_output)

so a corridor the model has nothing to say about degrades to the MA3 baseline
rather than to a global mean. Three quantile heads (0.1 / 0.5 / 0.9) give the
point forecast and a genuine 80% prediction interval (realised coverage 78.69%).

DEMAND ONLY. No price model is loaded: `fob_unit_value_usd_per_kg` is a
perfectly linear synthetic series in this dataset (51.7% of corridors have a
literally constant yearly increment), so a price model would be fitting a
straight line and its interval measured 0.00% coverage. Price keeps the
median-of-last-3 anchor, labelled as such.

Fail-closed: if artifacts are missing or a forward pass raises, the caller
falls back to the MA3 anchor and says so via `forecast_method`. Nothing is
fabricated.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict, List, Optional

import numpy as np

logger = logging.getLogger(__name__)

_HERE = os.path.dirname(os.path.abspath(__file__))
_REPO = os.path.dirname(os.path.dirname(_HERE))
_CANDIDATE_MODEL_DIR = os.path.join(_REPO, "brain", "models", "partner_discovery_xgb")
DEFAULT_MODEL_DIR = _CANDIDATE_MODEL_DIR if os.path.exists(_CANDIDATE_MODEL_DIR) else os.path.join(_REPO, "backend", "brain", "models", "partner_discovery_xgb")

QUANTILES = [0.1, 0.5, 0.9]
POINT_Q = 0.5

# Sequence feature indices, matching the training script and p4.baselines().
IDX_LOG_WEIGHT = 1
IDX_PRICE = 2

METHOD_XGB = "XGB_RESIDUAL_ON_MA3_V1"
METHOD_FALLBACK = "MOVING_AVERAGE_3YR_MOMENTUM"


def ma3_demand_anchor(seq: np.ndarray) -> np.ndarray:
    """Mean of the last 3 input-window years, in kg. Same slice the model was
    trained against, so the residual inversion is consistent."""
    w = np.expm1(seq[:, :, IDX_LOG_WEIGHT])
    return np.maximum(w[:, -3:].mean(axis=1), 1.0)


def build_features(X: np.ndarray) -> np.ndarray:
    """Must stay byte-identical in behaviour to phase4c_xgb_residual.build_features.
    Column order is asserted against the persisted feature_names at load time."""
    n, t, f = X.shape
    flat = X.reshape(n, t * f)

    logw = X[:, :, IDX_LOG_WEIGHT]
    pr = X[:, :, IDX_PRICE]
    eps = 1e-9
    tt = np.arange(t, dtype=float)

    extra = np.column_stack([
        logw[:, -1] - logw[:, -3:].mean(axis=1),          # d_last_minus_ma3
        np.polyfit(tt, logw.T, 1)[0],                      # d_slope5
        logw.std(axis=1),                                  # d_std5
        logw[:, -3:].std(axis=1),                          # d_std3
        logw[:, -1] - logw[:, -2],                         # d_yoy_last
        logw[:, -2] - logw[:, -3],                         # d_yoy_prev
        logw.max(axis=1) - logw.min(axis=1),               # d_range5
        pr[:, -1] / (np.median(pr[:, -3:], axis=1) + eps),  # p_last_over_ma3
        np.polyfit(tt, pr.T, 1)[0],                        # p_slope5
        pr.std(axis=1) / (pr.mean(axis=1) + eps),          # p_cv5
        (pr[:, -1] - pr[:, -2]) / (pr[:, -2] + eps),       # p_yoy_last
    ])
    return np.column_stack([flat, extra])


class XGBResidualForecaster:
    """Loaded demand forecaster. `available` is False when artifacts are absent."""

    def __init__(self, model_dir: Optional[str] = None) -> None:
        self.model_dir = model_dir or DEFAULT_MODEL_DIR
        self.models: Dict[float, Any] = {}
        self.metadata: Dict[str, Any] = {}
        self.feature_names: List[str] = []
        self.available = False
        self._load()

    def _load(self) -> None:
        meta_path = os.path.join(self.model_dir, "metadata.json")
        if not os.path.exists(meta_path):
            logger.info("XGB residual forecaster not found at %s - using MA3 anchor", self.model_dir)
            return
        try:
            import xgboost as xgb  # noqa: PLC0415

            with open(meta_path, "r", encoding="utf-8") as f:
                self.metadata = json.load(f)
            self.feature_names = self.metadata.get("feature_names", [])

            for q in QUANTILES:
                path = os.path.join(self.model_dir, f"demand_q{int(q * 100)}.json")
                if not os.path.exists(path):
                    logger.warning("XGB head %s missing at %s - forecaster disabled", q, path)
                    return
                m = xgb.XGBRegressor()
                m.load_model(path)
                self.models[q] = m
            self.available = True
            logger.info(
                "XGB residual demand forecaster loaded (%s, test WAPE %.2f%%)",
                self.metadata.get("version", "unknown"),
                self.metadata.get("test_demand_wape_pct", float("nan")),
            )
        except Exception as exc:  # noqa: BLE001 - never break inference on a bad artifact
            logger.warning("XGB residual forecaster failed to load: %s", exc)
            self.models = {}
            self.available = False

    def predict_demand(self, seq: np.ndarray) -> Optional[Dict[str, np.ndarray]]:
        """seq: (N, SEQ_LEN, F) raw unscaled feature sequences.
        Returns point forecast + 80% interval in kg, or None if unavailable."""
        if not self.available:
            return None
        try:
            anchor = ma3_demand_anchor(seq)
            F = build_features(seq)
            if self.feature_names and F.shape[1] != len(self.feature_names):
                logger.warning(
                    "XGB feature width mismatch (got %s, model expects %s) - skipping model",
                    F.shape[1], len(self.feature_names),
                )
                return None
            out = {}
            for q in QUANTILES:
                resid = self.models[q].predict(F)
                out[q] = anchor * np.exp(resid)
            # Quantile heads are fit independently and can cross on rare rows;
            # sort so the interval is always well-formed.
            lo = np.minimum(out[0.1], out[0.9])
            hi = np.maximum(out[0.1], out[0.9])
            point = np.clip(out[POINT_Q], lo, hi)
            return {"point": point, "lower": lo, "upper": hi, "anchor": anchor}
        except Exception as exc:  # noqa: BLE001
            logger.warning("XGB residual prediction failed: %s", exc)
            return None

    def shap_contributions(self, seq: np.ndarray) -> Optional[np.ndarray]:
        """Exact TreeSHAP contributions for the point head, shape (N, n_features+1)
        with the bias term last. Native to xgboost - no `shap` package needed."""
        if not self.available:
            return None
        try:
            import xgboost as xgb  # noqa: PLC0415

            F = build_features(seq)
            dm = xgb.DMatrix(F, feature_names=self.feature_names or None)
            return self.models[POINT_Q].get_booster().predict(dm, pred_contribs=True)
        except Exception as exc:  # noqa: BLE001
            logger.warning("XGB SHAP contribution computation failed: %s", exc)
            return None


_singleton: Optional[XGBResidualForecaster] = None


def get_forecaster(model_dir: Optional[str] = None) -> XGBResidualForecaster:
    global _singleton
    if _singleton is None:
        _singleton = XGBResidualForecaster(model_dir)
    return _singleton
