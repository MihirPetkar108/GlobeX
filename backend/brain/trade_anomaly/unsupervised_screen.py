"""
Trade Anomaly — Unsupervised Screen (v2) — GLOBEX Trade OS
==========================================================

WHY THIS MODULE EXISTS
----------------------
The shipped v1 supervised classifier (`backend/brain/models/trade_anomaly/`) is
disqualified by total target leakage. Its label, `anomaly_flag`, is a closed-form
Boolean function of three of its own 20 input features, verified to reproduce the
label on 12,288/12,288 rows with F1 = 1.0000:

    anomaly_flag == (val_rolling_zscore    >  3.00)
                 |  (unit_value_change_mom >  2.50)
                 |  (trade_growth_mom      < -0.90)

See `reports/production/phase3_data_model_audit.md` sections 1 and 5.1.4, and the
production decision in `reports/production/phase5_anomaly_verdict.md` section 5.

There is NO verified fraud ground truth anywhere in this repository (re-confirmed by
a schema sweep of every parquet under `backend/brain/processed/` and
`backend/brain/brain_prev/`; see `reports/production/phase5b_anomaly_replacement.md`
section 1). Therefore nothing here is, or can be, a supervised fraud detector.

WHAT THIS MODULE SHIPS — TWO EXPLICITLY SEPARATE SIGNALS
--------------------------------------------------------
1. `rule_based_flags`  -> `label_source = "STATISTICAL_RULE"`
   The exact three-threshold screen above, unchanged in logic, relabelled honestly
   as the deterministic statistical screen it always was (v1 called it
   "RULE_BASED_HEURISTIC" while presenting its output as a model score). It returns
   which condition fired and by how much. It is NOT machine learning, NOT trained.

2. `unsupervised_anomaly_score` -> `label_source = "UNSUPERVISED_MODEL"`
   A genuinely unsupervised IsolationForest fitted on the training split only, on a
   feature set that DELIBERATELY EXCLUDES all three columns the v1 label was built
   from, so it structurally cannot re-derive the v1 circularity.

The two are reported side by side and are NEVER combined into one number, and the
combination is NOT validated fraud detection. Both are statistical/heuristic. Neither
was trained against a verified outcome.

FEATURE-SET SEPARATION (the core design constraint)
---------------------------------------------------
Banned from the unsupervised model — these three DEFINE the v1 label:
    val_rolling_zscore, unit_value_change_mom, trade_growth_mom

Also deliberately excluded, though not part of the label rule:
  * `val_to_rolling_mean_ratio` — a near-sibling of `val_rolling_zscore`
    (same numerator, `trade_value_usd - rolling_mean_3m`, different denominator).
    Including it would re-import the "current value vs own recent baseline"
    dimension that the rule screen already owns. That dimension is left entirely to
    signal (1); the unsupervised model covers the price-level / structural dimension
    that the rule screen is blind to.
  * `quantity` — identical to `net_weight_kg` on 12,288/12,288 rows (audit 5.1.3).
  * `net_weight_kg` in raw form — with `log_trade_value` and `log_unit_value` both
    present, weight is (up to the log1p offset) determined by them.
  * `quantity_growth_mom`, `weight_growth_mom` — equal to each other on every row and
    both near-duplicates of `trade_growth_mom`, which is banned.
  * `yoy_growth` — falls back to `trade_growth_mom` when no 12-month lag exists
    (`feature_pipeline.py`), so it partially carries a banned column's values.

UNITS — READ THIS BEFORE USING `partner_share_pct`
--------------------------------------------------
In THIS dataset (`02_trade_anomaly_featured.parquet`) and in
`feature_pipeline.py:135-139`, `partner_share_pct` is a **0-1 FRACTION**
(value / total product-flow value), observed range 0.000267 .. 0.197083 —
despite the `_pct` suffix. The partner-discovery subsystem uses the same `_pct`
suffix for a genuine **0-100 PERCENTAGE** (`destination_market_share_pct`,
0.0 .. 98.23). They are NOT interchangeable; they differ by 100x.

This module therefore renames the column on ingestion to
`partner_share_fraction_0_1` so the scale is unambiguous in the feature list, in the
persisted artifact, and to any downstream consumer. A caller passing a 0-100 value is
caught by `assert_partner_share_scale()`.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import OneHotEncoder, RobustScaler

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

DEFAULT_MODELS_DIR = PROJECT_ROOT / "backend" / "brain" / "models" / "trade_anomaly_v2"
DEFAULT_DATASET = (
    PROJECT_ROOT
    / "backend" / "brain" / "processed" / "trade_anomaly"
    / "02_trade_anomaly_featured.parquet"
)

SCREEN_VERSION = "unsupervised-screen-v2.0.0"


# ---------------------------------------------------------------------------
# Signal 1 — the deterministic statistical rule screen (NOT machine learning)
# ---------------------------------------------------------------------------

#: The exact v1 label rule, restated as what it is: a deterministic screen.
RULE_THRESHOLDS: Dict[str, Tuple[str, float]] = {
    "value_vs_3m_baseline_spike": ("val_rolling_zscore", 3.0),
    "unit_price_spike": ("unit_value_change_mom", 2.5),
    "value_collapse": ("trade_growth_mom", -0.90),
}

#: Columns that define the v1 label. Hard-banned from the unsupervised feature set.
CIRCULAR_LABEL_COLUMNS: List[str] = [
    "val_rolling_zscore",
    "unit_value_change_mom",
    "trade_growth_mom",
]

#: Additionally excluded; see the module docstring for the reason on each.
ADDITIONALLY_EXCLUDED_COLUMNS: List[str] = [
    "val_to_rolling_mean_ratio",
    "quantity",
    "net_weight_kg",
    "quantity_growth_mom",
    "weight_growth_mom",
    "yoy_growth",
]

RULE_SCREEN_LABEL_SOURCE = "STATISTICAL_RULE"
UNSUPERVISED_LABEL_SOURCE = "UNSUPERVISED_MODEL"


def statistical_rule_screen(row: Dict[str, Any]) -> Dict[str, Any]:
    """
    Signal 1. The transparent three-threshold screen, unchanged in logic from
    `build_canonical_parquet_v2.py:363-378`, relabelled honestly.

    This is a deterministic comparison of three numbers against three constants.
    It is not a model, it is not trained, and it produces no score.

    Returns the flag plus every driver that fired, with the observed value, so the
    caller can show *why* rather than an opaque probability.
    """
    drivers: List[Dict[str, Any]] = []

    z = float(row.get("val_rolling_zscore", 0.0) or 0.0)
    uvc = float(row.get("unit_value_change_mom", 0.0) or 0.0)
    tg = float(row.get("trade_growth_mom", 0.0) or 0.0)

    if z > RULE_THRESHOLDS["value_vs_3m_baseline_spike"][1]:
        drivers.append({
            "rule": "val_rolling_zscore > 3.0",
            "driver": "value_vs_3m_baseline_spike",
            "observed": round(z, 4),
            "message": (
                f"Trade value is {z:.1f} standard deviations above this corridor's "
                "own lagged 3-month rolling mean."
            ),
        })
    if uvc > RULE_THRESHOLDS["unit_price_spike"][1]:
        drivers.append({
            "rule": "unit_value_change_mom > 2.5",
            "driver": "unit_price_spike",
            "observed": round(uvc, 4),
            "message": f"Unit price per kg rose {uvc * 100:.0f}% month over month.",
        })
    if tg < RULE_THRESHOLDS["value_collapse"][1]:
        drivers.append({
            "rule": "trade_growth_mom < -0.90",
            "driver": "value_collapse",
            "observed": round(tg, 4),
            "message": f"Trade value fell {abs(tg) * 100:.0f}% month over month.",
        })

    return {
        "flagged": bool(drivers),
        "drivers": drivers,
        "method": "deterministic_statistical_screen",
        "label_source": RULE_SCREEN_LABEL_SOURCE,
        "is_machine_learning": False,
        "is_fraud_determination": False,
        "known_blind_spots": [
            "under_invoicing",
            "over_invoicing",
            "mirror_trade_discrepancy",
            "gradual_drift",
        ],
        "blind_spot_note": (
            "This screen fires only on upward z-score spikes, upward unit-price "
            "spikes and value collapses. Downward unit-price deviation "
            "(under-invoicing) can never fire it. That gap is what signal 2 covers."
        ),
    }


# ---------------------------------------------------------------------------
# Signal 2 — unsupervised feature construction
# ---------------------------------------------------------------------------

UNSUPERVISED_NUMERICAL_FEATURES: List[str] = [
    "log_trade_value",              # absolute size of the flow
    "log_unit_value",               # absolute declared price level (log1p USD/kg)
    "unit_value_peer_robust_z",     # signed price deviation vs HS6 x flow peer group
    "log_value_per_transaction",    # average consignment size
    "transaction_count",            # consignment fragmentation
    "rolling_cv_3m",                # corridor volatility (std/mean of lagged 3m window)
    "partner_share_fraction_0_1",   # 0-1 FRACTION, see module docstring on units
    "partner_share_change_mom",     # corridor concentration shift
    "new_corridor_flag",            # corridor novelty
]

UNSUPERVISED_CATEGORICAL_FEATURES: List[str] = ["trade_flow", "hs6", "partner_iso3"]

PEER_GROUP_KEYS: List[str] = ["hs6", "trade_flow"]


def assert_partner_share_scale(series: pd.Series) -> None:
    """
    Guard against the 0-1 vs 0-100 `_pct` collision documented in audit 5.1.3.

    This dataset's `partner_share_pct` is a FRACTION. Anything above 1.5 means the
    caller handed us the partner-discovery 0-100 percentage instead.
    """
    s = pd.to_numeric(series, errors="coerce").dropna()
    if len(s) and float(s.max()) > 1.5:
        raise ValueError(
            "partner_share_pct looks like a 0-100 PERCENTAGE "
            f"(max={float(s.max()):.3f}) but this subsystem requires a 0-1 FRACTION. "
            "See src/trade_anomaly/unsupervised_screen.py module docstring, UNITS."
        )


@dataclass
class PeerPriceReference:
    """
    Robust per-(hs6, trade_flow) reference for log1p unit value, FIT ON TRAIN ROWS
    ONLY, then frozen and persisted alongside the model.

    Rationale: `unit_value_usd_per_kg` spans 0.78 .. 53,999 across the 8 HS6 codes in
    this dataset (gold jewellery vs crude vs rice), so no global outlier rule on the
    raw level is meaningful. Comparing a declared price against the *same product and
    flow* is what makes under-declaration visible.

    Deviation is measured as a robust z:  (log1p(uv) - median) / (1.4826 * MAD).
    It is SIGNED on purpose — a large negative value is exactly the under-invoicing
    pattern the v1 label could never express.

    Frozen train-only statistics mean there is no temporal leakage, and the same
    reference is used at serve time as at fit time.
    """

    medians: Dict[str, float] = field(default_factory=dict)
    scales: Dict[str, float] = field(default_factory=dict)
    global_median: float = 0.0
    global_scale: float = 1.0
    min_scale: float = 1e-3
    fitted_: bool = False

    @staticmethod
    def _key(hs6: Any, trade_flow: Any) -> str:
        return f"{str(hs6).strip()}|{str(trade_flow).strip()}"

    @staticmethod
    def _robust_scale(values: np.ndarray) -> float:
        med = float(np.median(values))
        return float(1.4826 * np.median(np.abs(values - med)))

    def fit(self, df: pd.DataFrame) -> "PeerPriceReference":
        luv = np.log1p(np.clip(
            pd.to_numeric(df["unit_value_usd_per_kg"], errors="coerce")
            .fillna(0.0).to_numpy(dtype=float), 0.0, None))
        self.global_median = float(np.median(luv))
        self.global_scale = max(self._robust_scale(luv), self.min_scale)

        work = df[PEER_GROUP_KEYS].copy()
        work["_luv"] = luv
        for (hs6, flow), grp in work.groupby(PEER_GROUP_KEYS, dropna=False):
            v = grp["_luv"].to_numpy(dtype=float)
            if len(v) < 5:
                continue
            k = self._key(hs6, flow)
            self.medians[k] = float(np.median(v))
            self.scales[k] = max(self._robust_scale(v), self.min_scale)
        self.fitted_ = True
        return self

    def robust_z(self, df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """
        Returns (signed robust z of log1p unit value, peer_reference_available flag).

        When the (hs6, trade_flow) pair was never seen in training, the global
        reference is used and the availability flag is 0. Callers should surface that
        flag: a peer comparison against a global reference spanning a 69,000x price
        range is far weaker evidence than one against the product's own peers.
        """
        if not self.fitted_:
            raise ValueError("PeerPriceReference must be fitted before use.")
        luv = np.log1p(np.clip(
            pd.to_numeric(df["unit_value_usd_per_kg"], errors="coerce")
            .fillna(0.0).to_numpy(dtype=float), 0.0, None))
        keys = [self._key(a, b)
                for a, b in zip(df[PEER_GROUP_KEYS[0]], df[PEER_GROUP_KEYS[1]])]
        med = np.array([self.medians.get(k, self.global_median) for k in keys], dtype=float)
        sc = np.array([self.scales.get(k, self.global_scale) for k in keys], dtype=float)
        avail = np.array([1 if k in self.medians else 0 for k in keys], dtype=int)
        return (luv - med) / np.clip(sc, self.min_scale, None), avail

    def to_dict(self) -> Dict[str, Any]:
        return {
            "medians": self.medians,
            "scales": self.scales,
            "global_median": self.global_median,
            "global_scale": self.global_scale,
            "min_scale": self.min_scale,
            "basis": "log1p(unit_value_usd_per_kg), median and 1.4826*MAD",
            "group_keys": PEER_GROUP_KEYS,
            "fitted_on": "training split only (period <= train_end_period)",
        }

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "PeerPriceReference":
        ref = cls(
            medians={str(k): float(v) for k, v in d.get("medians", {}).items()},
            scales={str(k): float(v) for k, v in d.get("scales", {}).items()},
            global_median=float(d.get("global_median", 0.0)),
            global_scale=float(d.get("global_scale", 1.0)),
            min_scale=float(d.get("min_scale", 1e-3)),
        )
        ref.fitted_ = True
        return ref


def build_unsupervised_features(
    df: pd.DataFrame, peer_reference: PeerPriceReference
) -> pd.DataFrame:
    """
    Derives the unsupervised feature matrix from raw/featured trade rows.

    Uses `unit_value_usd_per_kg` as supplied when present (so adversarial probes that
    set a declared price inconsistent with value/weight are honoured as given); falls
    back to trade_value_usd / net_weight_kg otherwise.

    Every derived column is a function of the current row plus frozen train-only peer
    statistics plus already-causal lagged columns (`rolling_mean_3m`,
    `rolling_std_3m`, `partner_share_change_mom`, `new_corridor_flag`). No future
    information is used; the v1 causal rolling construction is correct and is
    deliberately reused (phase5 verdict section 3 item 3: "Do not fix the feature
    pipeline — it is not broken").
    """
    out = pd.DataFrame(index=df.index)

    value = pd.to_numeric(df["trade_value_usd"], errors="coerce").fillna(0.0).clip(lower=0.0)
    weight = pd.to_numeric(df["net_weight_kg"], errors="coerce").fillna(0.0).clip(lower=0.0)

    if "unit_value_usd_per_kg" in df.columns:
        uv = pd.to_numeric(df["unit_value_usd_per_kg"], errors="coerce")
        derived = pd.Series(
            np.divide(value.to_numpy(dtype=float), weight.to_numpy(dtype=float),
                      out=np.zeros(len(df), dtype=float),
                      where=weight.to_numpy(dtype=float) > 0),
            index=df.index)
        uv = uv.where(uv.notna(), derived)
    else:
        uv = pd.Series(
            np.divide(value.to_numpy(dtype=float), weight.to_numpy(dtype=float),
                      out=np.zeros(len(df), dtype=float),
                      where=weight.to_numpy(dtype=float) > 0),
            index=df.index)
    uv = pd.to_numeric(uv, errors="coerce").fillna(0.0).clip(lower=0.0)

    tx = pd.to_numeric(df["transaction_count"], errors="coerce").fillna(1.0).clip(lower=0.0)
    rmean = pd.to_numeric(df["rolling_mean_3m"], errors="coerce").fillna(0.0).to_numpy(dtype=float)
    rstd = pd.to_numeric(df["rolling_std_3m"], errors="coerce").fillna(0.0).to_numpy(dtype=float)

    share_raw = pd.to_numeric(df["partner_share_pct"], errors="coerce").fillna(0.0)
    assert_partner_share_scale(share_raw)

    probe = df.copy()
    probe["unit_value_usd_per_kg"] = uv
    peer_z, peer_avail = peer_reference.robust_z(probe)

    out["log_trade_value"] = np.log1p(value.to_numpy(dtype=float))
    out["log_unit_value"] = np.log1p(uv.to_numpy(dtype=float))
    out["unit_value_peer_robust_z"] = peer_z
    out["log_value_per_transaction"] = np.log1p(
        value.to_numpy(dtype=float) / np.clip(tx.to_numpy(dtype=float), 1.0, None))
    out["transaction_count"] = tx.astype(float).to_numpy()
    out["rolling_cv_3m"] = np.clip(
        np.divide(rstd, rmean, out=np.zeros_like(rstd), where=rmean > 0), 0.0, 50.0)
    out["partner_share_fraction_0_1"] = share_raw.astype(float).to_numpy()
    out["partner_share_change_mom"] = pd.to_numeric(
        df["partner_share_change_mom"], errors="coerce").fillna(0.0).astype(float).to_numpy()
    out["new_corridor_flag"] = pd.to_numeric(
        df["new_corridor_flag"], errors="coerce").fillna(0).astype(float).to_numpy()

    for c in UNSUPERVISED_CATEGORICAL_FEATURES:
        out[c] = df[c].astype(str).str.strip().to_numpy()

    out["_peer_reference_available"] = peer_avail
    return out


# ---------------------------------------------------------------------------
# Preprocessor
# ---------------------------------------------------------------------------

class UnsupervisedScreenPreprocessor:
    """
    Imputer + RobustScaler + OneHotEncoder over the v2 feature set.

    Deliberately a NEW preprocessor rather than a reuse of the fitted
    `TradeAnomalyPreprocessor`: the v2 feature set is different by construction
    (9 engineered numerics vs v1's 17 raw ones), and v1's fitted instance carries the
    banned columns in `numerical_features`. The transformation *pattern* is
    intentionally the same as v1's, so the artifacts stay operationally familiar.

    Note: IsolationForest is axis-aligned and therefore scale-invariant; the scaler is
    kept for consistency with the trade-risk IsolationForest artifact and so the
    persisted matrix is directly comparable across models. It does not change the
    forest's decisions.
    """

    def __init__(self) -> None:
        self.numerical_features = list(UNSUPERVISED_NUMERICAL_FEATURES)
        self.categorical_features = list(UNSUPERVISED_CATEGORICAL_FEATURES)
        self.num_imputer = SimpleImputer(strategy="median")
        self.scaler = RobustScaler(unit_variance=True)
        self.encoder = OneHotEncoder(handle_unknown="ignore", sparse_output=False)
        self.feature_names_out_: List[str] = []
        self.fitted_ = False

    def fit(self, X: pd.DataFrame, y=None) -> "UnsupervisedScreenPreprocessor":
        num = X[self.numerical_features]
        self.scaler.fit(self.num_imputer.fit_transform(num))
        self.encoder.fit(X[self.categorical_features].astype(str))
        self.feature_names_out_ = self.numerical_features + list(
            self.encoder.get_feature_names_out(self.categorical_features))
        self.fitted_ = True
        return self

    def transform(self, X: pd.DataFrame) -> np.ndarray:
        if not self.fitted_:
            raise ValueError("UnsupervisedScreenPreprocessor must be fitted first.")
        num = self.scaler.transform(self.num_imputer.transform(X[self.numerical_features]))
        cat = self.encoder.transform(X[self.categorical_features].astype(str))
        return np.hstack([num, cat])

    def get_feature_names(self) -> List[str]:
        return list(self.feature_names_out_)

    def category_coverage(self, X: pd.DataFrame) -> np.ndarray:
        """Per-row count of categorical fields that are inside the fitted vocabulary."""
        enc = self.encoder.transform(X[self.categorical_features].astype(str))
        return enc.sum(axis=1).astype(int)


# ---------------------------------------------------------------------------
# The unsupervised screen
# ---------------------------------------------------------------------------

class UnsupervisedAnomalyScreen:
    """
    IsolationForest over the v2 feature set.

    Why IsolationForest and not Mahalanobis distance / a robust multivariate z:
      * The feature set is intentionally heterogeneous — log-scale magnitudes, a
        signed robust z, a bounded fraction, a coefficient of variation and two binary
        flags — and is nowhere near multivariate-Gaussian, which Mahalanobis distance
        assumes. A pooled covariance over the 26 one-hot columns is also near-singular.
      * IsolationForest is axis-aligned, so a single feature far outside its observed
        range — exactly the under-invoicing case, a declared price below every price
        ever seen for that product — isolates in very few splits. That is the
        acceptance test this model has to pass.
      * The repo already ships an IsolationForest for trade risk
        (`backend/brain/models/trade_risk/isolation_forest.joblib`), so this keeps one
        anomaly architecture family rather than introducing a third.
      * It gives a per-row continuous score with no label, which is the only kind of
        supervision honestly available here.

    `anomaly_score` is reported as the empirical percentile of the row's raw isolation
    score against the frozen TRAINING distribution, i.e. "more unusual than X% of the
    training panel". It is NOT a probability and NOT a calibrated likelihood of
    anything.
    """

    def __init__(
        self,
        contamination: float = 0.05,
        n_estimators: int = 300,
        max_samples: Union[str, int] = 256,
        random_state: int = 42,
    ) -> None:
        self.contamination = contamination
        self.model = IsolationForest(
            n_estimators=n_estimators,
            max_samples=max_samples,
            contamination=contamination,
            random_state=random_state,
            n_jobs=-1,
        )
        self.train_raw_quantiles_: Optional[np.ndarray] = None
        self.raw_decision_threshold_: float = 0.0
        self.fitted_ = False

    def _raw(self, Xt: np.ndarray) -> np.ndarray:
        """Higher = more anomalous."""
        return -self.model.decision_function(Xt)

    def fit(self, Xt: np.ndarray) -> "UnsupervisedAnomalyScreen":
        self.model.fit(Xt)
        raw = self._raw(Xt)
        self.train_raw_quantiles_ = np.quantile(raw, np.linspace(0.0, 1.0, 1001))
        # IsolationForest's own contamination cutoff, expressed on the raw scale.
        self.raw_decision_threshold_ = float(np.quantile(raw, 1.0 - self.contamination))
        self.fitted_ = True
        return self

    def raw_score(self, Xt: np.ndarray) -> np.ndarray:
        if not self.fitted_:
            raise ValueError("UnsupervisedAnomalyScreen must be fitted first.")
        return self._raw(Xt)

    def anomaly_score(self, Xt: np.ndarray) -> np.ndarray:
        """Percentile (0-1) of each row's raw score against the frozen train panel."""
        raw = self.raw_score(Xt)
        return np.searchsorted(self.train_raw_quantiles_, raw, side="right") / 1000.0

    def flag(self, Xt: np.ndarray) -> np.ndarray:
        return self.raw_score(Xt) >= self.raw_decision_threshold_


# ---------------------------------------------------------------------------
# Bundle: load / save / score
# ---------------------------------------------------------------------------

class UnsupervisedScreenBundle:
    """Peer reference + preprocessor + forest + metadata, loaded as one unit."""

    def __init__(
        self,
        peer_reference: PeerPriceReference,
        preprocessor: UnsupervisedScreenPreprocessor,
        screen: UnsupervisedAnomalyScreen,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        self.peer_reference = peer_reference
        self.preprocessor = preprocessor
        self.screen = screen
        self.metadata = metadata or {}

    # -- persistence -------------------------------------------------------
    def save(self, models_dir: Union[Path, str]) -> None:
        models_dir = Path(models_dir)
        models_dir.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.preprocessor, models_dir / "preprocessor_v2.joblib")
        joblib.dump(self.screen, models_dir / "isolation_forest_v2.joblib")
        (models_dir / "peer_price_reference.json").write_text(
            json.dumps(self.peer_reference.to_dict(), indent=2), encoding="utf-8")
        (models_dir / "feature_list_v2.json").write_text(
            json.dumps(
                {
                    "numerical_features": UNSUPERVISED_NUMERICAL_FEATURES,
                    "categorical_features": UNSUPERVISED_CATEGORICAL_FEATURES,
                    "excluded_because_they_define_the_v1_label": CIRCULAR_LABEL_COLUMNS,
                    "excluded_for_redundancy_or_proximity": ADDITIONALLY_EXCLUDED_COLUMNS,
                    "units_note": (
                        "partner_share_fraction_0_1 is a 0-1 FRACTION in this "
                        "subsystem, not a 0-100 percentage."
                    ),
                },
                indent=2,
            ),
            encoding="utf-8",
        )
        (models_dir / "screen_metadata.json").write_text(
            json.dumps(self.metadata, indent=2, default=str), encoding="utf-8")

    @classmethod
    def load(cls, models_dir: Optional[Union[Path, str]] = None) -> "UnsupervisedScreenBundle":
        d = Path(models_dir or DEFAULT_MODELS_DIR)
        pre = joblib.load(d / "preprocessor_v2.joblib")
        scr = joblib.load(d / "isolation_forest_v2.joblib")
        ref = PeerPriceReference.from_dict(
            json.loads((d / "peer_price_reference.json").read_text(encoding="utf-8")))
        meta_p = d / "screen_metadata.json"
        meta = json.loads(meta_p.read_text(encoding="utf-8")) if meta_p.exists() else {}
        return cls(ref, pre, scr, meta)

    # -- scoring -----------------------------------------------------------
    def score_frame(self, df: pd.DataFrame) -> pd.DataFrame:
        feats = build_unsupervised_features(df, self.peer_reference)
        Xt = self.preprocessor.transform(feats)
        res = pd.DataFrame(index=df.index)
        res["unsupervised_raw_score"] = self.screen.raw_score(Xt)
        res["unsupervised_anomaly_score"] = self.screen.anomaly_score(Xt)
        res["unsupervised_flagged"] = self.screen.flag(Xt)
        res["unit_value_peer_robust_z"] = feats["unit_value_peer_robust_z"].to_numpy()
        res["peer_reference_available"] = feats["_peer_reference_available"].to_numpy()
        res["categorical_fields_in_vocabulary"] = self.preprocessor.category_coverage(feats)
        return res

    def score_row(self, row: Dict[str, Any]) -> Dict[str, Any]:
        r = self.score_frame(pd.DataFrame([row])).iloc[0]
        peer_z = float(r["unit_value_peer_robust_z"])
        drivers: List[Dict[str, Any]] = []
        if peer_z <= -3.0:
            drivers.append({
                "driver": "unit_price_far_below_product_peers",
                "observed_robust_z": round(peer_z, 3),
                "message": (
                    f"Declared unit price is {abs(peer_z):.1f} robust standard "
                    "deviations BELOW the training-period median price for this HS6 "
                    "and trade flow. This is the under-declaration pattern the rule "
                    "screen cannot see."
                ),
            })
        elif peer_z >= 3.0:
            drivers.append({
                "driver": "unit_price_far_above_product_peers",
                "observed_robust_z": round(peer_z, 3),
                "message": (
                    f"Declared unit price is {peer_z:.1f} robust standard deviations "
                    "ABOVE the training-period median price for this HS6 and flow."
                ),
            })
        return {
            "anomaly_score": round(float(r["unsupervised_anomaly_score"]), 4),
            "raw_isolation_score": round(float(r["unsupervised_raw_score"]), 6),
            "flagged": bool(r["unsupervised_flagged"]),
            "score_meaning": (
                "Empirical percentile of this row's isolation score against the frozen "
                "training panel. NOT a probability, NOT a likelihood of fraud."
            ),
            "drivers": drivers,
            "coverage": {
                "peer_price_reference_available": bool(r["peer_reference_available"]),
                "categorical_fields_in_vocabulary": int(r["categorical_fields_in_vocabulary"]),
                "categorical_fields_total": len(UNSUPERVISED_CATEGORICAL_FEATURES),
            },
            "method": "isolation_forest_unsupervised",
            "label_source": UNSUPERVISED_LABEL_SOURCE,
            "is_machine_learning": True,
            "is_fraud_determination": False,
            "trained_against": "no labels of any kind (unsupervised)",
        }


# ---------------------------------------------------------------------------
# Combined output — both signals, never merged
# ---------------------------------------------------------------------------

def combined_screen(row: Dict[str, Any], bundle: UnsupervisedScreenBundle) -> Dict[str, Any]:
    """
    Reports BOTH signals side by side.

    There is deliberately no blended score. The two signals rest on different
    evidence, have different blind spots, and neither was validated against a verified
    outcome, so averaging them would manufacture a confidence that nothing in this
    repository supports.
    """
    rule = statistical_rule_screen(row)
    model = bundle.score_row(row)
    return {
        "screen_version": SCREEN_VERSION,
        "rule_based_flags": rule,
        "unsupervised_anomaly_score": model,
        "any_signal_flagged": bool(rule["flagged"] or model["flagged"]),
        "is_fraud_determination": False,
        "claim": (
            "Statistically unusual trade behaviour by these specific signals. This is "
            "not a fraud finding, not an enforcement determination, and not validated "
            "against any verified outcome — no such outcome data exists in this system."
        ),
    }


# ---------------------------------------------------------------------------
# Training entry point
# ---------------------------------------------------------------------------

def train_and_save(
    dataset_path: Union[Path, str] = DEFAULT_DATASET,
    models_dir: Union[Path, str] = DEFAULT_MODELS_DIR,
    contamination: float = 0.05,
    train_end_period: int = 202406,
    val_end_period: int = 202412,
    random_state: int = 42,
) -> Tuple[UnsupervisedScreenBundle, Dict[str, Any]]:
    """
    Fits the peer reference, preprocessor and forest on the TRAIN split only
    (period <= train_end_period), then persists the bundle.

    Reuses the v1 chronological split boundaries, which the audit verified to be
    correct and strictly non-overlapping (audit 5.1.5).
    """
    df = pd.read_parquet(dataset_path)
    train = df[df["period"] <= train_end_period].copy()
    val = df[(df["period"] > train_end_period) & (df["period"] <= val_end_period)].copy()
    test = df[df["period"] > val_end_period].copy()

    ref = PeerPriceReference().fit(train)
    f_train = build_unsupervised_features(train, ref)
    pre = UnsupervisedScreenPreprocessor().fit(f_train)
    Xt = pre.transform(f_train)

    screen = UnsupervisedAnomalyScreen(
        contamination=contamination, random_state=random_state).fit(Xt)

    meta: Dict[str, Any] = {
        "model_name": "trade_anomaly_unsupervised_screen",
        "version": SCREEN_VERSION,
        "architecture": "IsolationForest",
        "supervision": "none (unsupervised)",
        "label_source": UNSUPERVISED_LABEL_SOURCE,
        "trained_against_labels": False,
        "dataset": str(dataset_path),
        "rows_total": int(len(df)),
        "train_rows": int(len(train)),
        "val_rows": int(len(val)),
        "test_rows": int(len(test)),
        "train_period": f"<= {train_end_period}",
        "val_period": f"{train_end_period + 1} - {val_end_period}",
        "test_period": f"> {val_end_period}",
        "contamination": contamination,
        "n_estimators": int(screen.model.n_estimators),
        "max_samples": screen.model.max_samples,
        "random_state": random_state,
        "numerical_features": UNSUPERVISED_NUMERICAL_FEATURES,
        "categorical_features": UNSUPERVISED_CATEGORICAL_FEATURES,
        "transformed_matrix_shape": list(Xt.shape),
        "excluded_because_they_define_the_v1_label": CIRCULAR_LABEL_COLUMNS,
        "excluded_for_redundancy_or_proximity": ADDITIONALLY_EXCLUDED_COLUMNS,
        "partner_share_scale": "0-1 fraction (NOT 0-100 percentage)",
        "raw_decision_threshold": screen.raw_decision_threshold_,
        "disclaimer": (
            "Unsupervised statistical screen. Flags statistically unusual trade "
            "behaviour by these specific signals. Not fraud detection; no verified "
            "fraud outcomes exist in this dataset."
        ),
    }

    bundle = UnsupervisedScreenBundle(ref, pre, screen, meta)
    bundle.save(models_dir)
    return bundle, meta


if __name__ == "__main__":  # pragma: no cover
    _bundle, _meta = train_and_save()
    print(json.dumps(_meta, indent=2, default=str))
