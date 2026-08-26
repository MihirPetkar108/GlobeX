"""
Phase 4c - XGBoost RESIDUAL forecaster for partner-discovery demand & FOB price.

WHY THIS EXISTS
---------------
Phase 4b retrained the Dual-Head GRU on leakage-corrected data (dedup HS6 spellings,
WLD excluded, target year strictly outside the input window - verified 0.00%
target-in-window, 0 split overlap) and it still lost badly:

    Dual-Head GRU v2          demand WAPE 61.14%
    Production fallback MA3   demand WAPE 28.41%

That is a data-shape problem, not a training bug. There are only ~22k training
windows, ~26 annual observations per corridor, and demand spans ~5 orders of
magnitude. A 64x2 GRU predicting the ABSOLUTE level regresses toward a global
mean, and WAPE - which is dominated by the largest corridors - punishes that
severely. The dominant signal in an annual trade panel is corridor persistence,
which is exactly what the MA3 baseline already encodes.

THE FIX: CHANGE WHAT THE MODEL PREDICTS
---------------------------------------
Instead of predicting the level, predict the *residual* against the baseline:

    target      = log(y_true / MA3)
    prediction  = MA3 * exp(model_output)

The model now only has to learn the DEVIATION from persistence, on a
well-scaled, roughly-centred target. Two consequences:

  1. A model that learns nothing outputs ~0 and reproduces MA3 exactly, so this
     framing has a structural floor at baseline performance. Any real learned
     signal is net gain over the baseline rather than a gamble against it.
  2. Gradient-boosted trees on flattened lag features suit this data shape
     (tabular, small-n, heterogeneous scale) far better than a recurrent net.

Everything else is held fixed so the numbers are directly comparable to Phase 4b:
the data pipeline, the chronological splits, and the metric/baseline functions
are imported from the existing scripts rather than reimplemented.

PREDICTION INTERVALS
--------------------
Three quantile heads (alpha 0.1 / 0.5 / 0.9) via XGBoost's `reg:quantileerror`.
Phase 4's walk-forward script had to construct intervals post hoc from
validation residual quantiles because, in its own words, "NO model in this
repository emits a prediction interval". These are real model-emitted intervals;
their realised coverage is measured on the held-out split below.

PROMOTION RULE (fixed before results were seen)
-----------------------------------------------
Promote only if held-out demand WAPE on target years 2023-2024 beats the
`Production fallback (MA3 x 1.05)` figure of 28.41%. Otherwise the moving
average stays in production and this result is recorded next to the GRU verdict.
No promotion on a losing backtest.

Run:  PYTHONIOENCODING=utf-8 python backend/brain/notebooks/validation/phase4c_xgb_residual.py
"""
import sys
import json
import importlib.util
from pathlib import Path

import numpy as np
import pandas as pd
import xgboost as xgb

REPO = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(REPO))

OUT_DIR = REPO / "reports" / "production" / "phase4c_outputs"
MODEL_XGB = REPO / "backend" / "brain" / "models" / "partner_discovery_xgb"

# Reuse Phase 4b's data pipeline (dedup / WLD exclusion / leakage audit / splits)
# and, through it, Phase 4's metric + baseline implementations. Nothing here is
# a reimplementation of either.
_spec_4b = importlib.util.spec_from_file_location(
    "phase4b", str(Path(__file__).with_name("phase4b_gru_retrain.py"))
)
p4b = importlib.util.module_from_spec(_spec_4b)
_spec_4b.loader.exec_module(p4b)
p4 = p4b.p4

SEQ_LEN = p4b.SEQ_LEN
SEED = 20260824
BASELINE_WAPE_TO_BEAT = 28.41  # Production fallback (MA3 x 1.05), Phase 4b test split

# Indices into the raw (unscaled) feature sequence, matching p4.baselines().
IDX_LOG_WEIGHT = 1   # log_export_net_weight -> expm1 gives kg
IDX_PRICE = 2        # fob_unit_value, raw USD/kg

QUANTILES = [0.1, 0.5, 0.9]

XGB_PARAMS = dict(
    n_estimators=400,
    max_depth=5,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    min_child_weight=5,
    reg_lambda=1.0,
    random_state=SEED,
    n_jobs=4,
)


def hr(t):
    print("\n" + "=" * 78)
    print(t)
    print("=" * 78)


# ----------------------------------------------------------------------------------
# Baseline anchors + feature construction
# ----------------------------------------------------------------------------------

def ma3_anchors(X):
    """The MA3 anchor the residual is measured against. Uses the same slice as
    p4.baselines()['Moving Average (3-year)'] so the comparison is exact."""
    w = np.expm1(X[:, :, IDX_LOG_WEIGHT])          # (N, 5) kg
    pr = X[:, :, IDX_PRICE]                        # (N, 5) USD/kg
    anchor_d = w[:, -3:].mean(axis=1)
    anchor_p = np.median(pr[:, -3:], axis=1)
    return np.maximum(anchor_d, 1.0), np.maximum(anchor_p, 0.01)


def build_features(X):
    """Flatten the (N, SEQ_LEN, F) sequence into tabular lag features and add
    derived level / trend / volatility ratios. Every input column is one of the
    11 leakage-audited features from Phase 4b - nothing new is introduced."""
    n, t, f = X.shape
    flat = X.reshape(n, t * f)
    names = [f"f{j}_lag{t - 1 - i}" for i in range(t) for j in range(f)]

    logw = X[:, :, IDX_LOG_WEIGHT]
    pr = X[:, :, IDX_PRICE]

    eps = 1e-9
    extra = {
        # level / trend of demand in log space
        "d_last_minus_ma3": logw[:, -1] - logw[:, -3:].mean(axis=1),
        "d_slope5": np.polyfit(np.arange(t, dtype=float), logw.T, 1)[0],
        "d_std5": logw.std(axis=1),
        "d_std3": logw[:, -3:].std(axis=1),
        "d_yoy_last": logw[:, -1] - logw[:, -2],
        "d_yoy_prev": logw[:, -2] - logw[:, -3],
        "d_range5": logw.max(axis=1) - logw.min(axis=1),
        # price level / trend
        "p_last_over_ma3": pr[:, -1] / (np.median(pr[:, -3:], axis=1) + eps),
        "p_slope5": np.polyfit(np.arange(t, dtype=float), pr.T, 1)[0],
        "p_cv5": pr.std(axis=1) / (pr.mean(axis=1) + eps),
        "p_yoy_last": (pr[:, -1] - pr[:, -2]) / (pr[:, -2] + eps),
    }
    extra_names = list(extra.keys())
    extra_mat = np.column_stack([extra[k] for k in extra_names])

    return np.column_stack([flat, extra_mat]), names + extra_names


def residual_targets(y_true, anchor):
    """log(y / anchor), clipped to keep a handful of extreme corridor jumps from
    dominating the split criterion. Clip bounds are wide (~e^3 = 20x)."""
    ratio = np.maximum(y_true, 1e-6) / np.maximum(anchor, 1e-6)
    return np.clip(np.log(ratio), -3.0, 3.0)


def invert_residual(pred_resid, anchor):
    return anchor * np.exp(pred_resid)


# ----------------------------------------------------------------------------------
# Training
# ----------------------------------------------------------------------------------

def fit_quantiles(Xtr, ytr, Xva, yva, label):
    """One model per quantile. The 0.5 head is the point forecast; 0.1/0.9 give
    the interval. `reg:quantileerror` is XGBoost's native pinball loss."""
    models = {}
    for q in QUANTILES:
        m = xgb.XGBRegressor(
            objective="reg:quantileerror",
            quantile_alpha=q,
            early_stopping_rounds=40,
            **XGB_PARAMS,
        )
        m.fit(Xtr, ytr, eval_set=[(Xva, yva)], verbose=False)
        models[q] = m
        print(f"  {label} q={q:.1f}  best_iteration={m.best_iteration}")
    return models


def interval_coverage(y_true, lo, hi):
    inside = (y_true >= lo) & (y_true <= hi)
    return float(inside.mean() * 100.0)


def main():
    hr("PHASE 4c - XGBOOST RESIDUAL FORECASTER (vs MA3 baseline)")
    print(f"xgboost : {xgb.__version__}")
    print(f"seed    : {SEED}")
    print(f"target  : log(y_true / MA3)   ->   prediction = MA3 * exp(model_output)")
    print(f"promote only if demand WAPE < {BASELINE_WAPE_TO_BEAT}%  (Production fallback MA3 x 1.05)")

    # ---------------- data (Phase 4b pipeline, verbatim) ----------------
    hr("1. DATA - reusing phase4b_gru_retrain.build_fixed_panel (dedup + WLD excluded)")
    np.random.seed(SEED)
    df_raw = pd.read_parquet(p4b.PARQUET)
    df_fixed, _counts = p4b.build_fixed_panel(df_raw)

    # Same feature list as Phase 4b: the original 12 minus the back-filled
    # sanctions_present snapshot (lookahead leakage).
    from src.partner_discovery.features import PartnerFeatureEngineer  # noqa: PLC0415
    engineer = PartnerFeatureEngineer(sequence_length=SEQ_LEN)
    new_feats = [f for f in engineer.feature_columns if f != "sanctions_present"]
    engineer.feature_columns = new_feats
    print(f"panel: {df_fixed.shape}, features: {len(new_feats)}")

    seq = engineer.create_sequence_dataset(
        df_fixed, split_train_end=2020, split_val_end=2022, split_test_end=2024)
    p4b.split_hygiene(seq)
    tr, va, te = seq["train"], seq["val"], seq["test"]
    print("tensors: train X {} | val X {} | test X {}".format(
        tr["X"].shape, va["X"].shape, te["X"].shape))

    # ---------------- residual construction ----------------
    hr("2. RESIDUAL TARGET CONSTRUCTION")
    anchors = {}
    feats = {}
    for name, split in (("train", tr), ("val", va), ("test", te)):
        a_d, a_p = ma3_anchors(split["X"])
        anchors[name] = (a_d, a_p)
        F, fnames = build_features(split["X"])
        feats[name] = F
    feature_names = fnames
    print(f"feature matrix: {feats['train'].shape[1]} columns "
          f"({SEQ_LEN}x{tr['X'].shape[-1]} lags + {feats['train'].shape[1] - SEQ_LEN * tr['X'].shape[-1]} derived)")

    ytr_d = residual_targets(tr["y_demand"], anchors["train"][0])
    yva_d = residual_targets(va["y_demand"], anchors["val"][0])
    ytr_p = residual_targets(tr["y_price"], anchors["train"][1])
    yva_p = residual_targets(va["y_price"], anchors["val"][1])
    print(f"demand residual  train mean={ytr_d.mean():+.4f} std={ytr_d.std():.4f}")
    print(f"price  residual  train mean={ytr_p.mean():+.4f} std={ytr_p.std():.4f}")
    print("(residual ~0 means the baseline is already right for that row; the model "
          "only has to learn departures from it)")

    # ---------------- train ----------------
    hr("3. TRAIN - XGBRegressor reg:quantileerror, 3 heads per target")
    print("params:", json.dumps(XGB_PARAMS))
    print("demand heads:")
    dm = fit_quantiles(feats["train"], ytr_d, feats["val"], yva_d, "demand")
    print("price heads:")
    pm = fit_quantiles(feats["train"], ytr_p, feats["val"], yva_p, "price")

    # ---------------- predict ----------------
    hr("4. HELD-OUT TEST EVALUATION (target years 2023-2024)")
    a_d, a_p = anchors["test"]
    Fte = feats["test"]

    pred_d = {q: invert_residual(dm[q].predict(Fte), a_d) for q in QUANTILES}
    pred_p = {q: invert_residual(pm[q].predict(Fte), a_p) for q in QUANTILES}

    base = p4.baselines(te["X"])
    preds = dict(base)
    preds["XGB residual (median head)"] = (pred_d[0.5], pred_p[0.5])
    g_d, g_p, _po, _do = p4.apply_production_guardrails(pred_d[0.5], pred_p[0.5], te["X"])
    preds["XGB residual + prod guardrails"] = (g_d, g_p)

    tbl = p4b.evaluate(preds, te["y_demand"], te["y_price"], te["X"])
    dcols = ["Model", "D_MAE_kg", "D_RMSE_kg", "D_WAPE_pct", "D_sMAPE_pct",
             "D_MAPE_pct", "D_DirAcc_pct", "D_R2"]
    pcols = ["Model", "P_MAE_usd", "P_RMSE_usd", "P_WAPE_pct", "P_sMAPE_pct", "P_R2"]
    print("\nDEMAND (kg):")
    print(tbl[dcols].sort_values("D_WAPE_pct").to_string(
        index=False, float_format=lambda x: "{:,.3f}".format(x)))
    print("\nPRICE (USD/kg):")
    print(tbl[pcols].sort_values("P_WAPE_pct").to_string(
        index=False, float_format=lambda x: "{:,.3f}".format(x)))

    # ---------------- intervals ----------------
    hr("5. MODEL-EMITTED PREDICTION INTERVALS (q0.1 - q0.9, nominal 80%)")
    cov_d = interval_coverage(te["y_demand"], pred_d[0.1], pred_d[0.9])
    cov_p = interval_coverage(te["y_price"], pred_p[0.1], pred_p[0.9])
    print(f"demand realised coverage: {cov_d:.2f}%   (nominal 80%)")
    print(f"price  realised coverage: {cov_p:.2f}%   (nominal 80%)")
    print("The demand interval comes from the model's own quantile heads, not "
          "post-hoc residual quantiles as in Phase 4.")

    hr("5b. THE PRICE TARGET IS SYNTHETIC - PRICE HEAD IS NOT SHIPPED")
    price_diffs = np.diff(te["X"][:, :, IDX_PRICE], axis=1)
    per_row_std = price_diffs.std(axis=1)
    print("Per-corridor year-over-year FOB price increments are constant:")
    print(f"  median std of yearly price increments within a corridor: {np.median(per_row_std):.8f}")
    print(f"  fraction of corridors with increment std < 1e-6       : "
          f"{float((per_row_std < 1e-6).mean()) * 100:.1f}%")
    print("\nfob_unit_value_usd_per_kg is a perfectly linear synthetic series in this")
    print("dataset (e.g. USA/100630 rises by exactly +0.0294 every single year). That")
    print("is why 'Linear trend (OLS on 5 steps)' scores WAPE 0.000% / R2 1.000 above,")
    print("and why the price residual has std ~0.0025 which collapses the quantile")
    print("heads to a band narrower than their own residual error (coverage 0.00%).")
    print("\nCONSEQUENCE: no price model is promoted. Forecasting a synthetic straight")
    print("line proves nothing, and shipping a 'price prediction interval' built on it")
    print("would be a fabricated capability. Price continues to use the existing")
    print("median-of-last-3 anchor, labelled as such. Only the DEMAND head ships.")

    # ---------------- breakdowns ----------------
    hr("6. ERROR BREAKDOWNS (demand WAPE %)")
    print("\nby target year:")
    print(p4b.breakdown(preds, te["y_demand"], te["meta"], "target_year", top=None).to_string())
    print("\nby HS6 (top 8 by test-window count):")
    print(p4b.breakdown(preds, te["y_demand"], te["meta"], "hs6", top=8).to_string())
    print("\nby importer (top 10 by test-window count):")
    print(p4b.breakdown(preds, te["y_demand"], te["meta"], "partner_iso3", top=10).to_string())

    # ---------------- attribution ----------------
    hr("7. NATIVE TREESHAP ATTRIBUTION (demand median head)")
    contribs = dm[0.5].get_booster().predict(
        xgb.DMatrix(Fte, feature_names=feature_names), pred_contribs=True)
    mean_abs = np.abs(contribs[:, :-1]).mean(axis=0)
    order = np.argsort(mean_abs)[::-1][:15]
    print("top 15 features by mean |SHAP| on the test split:")
    for i in order:
        print("  {:<28} {:.5f}".format(feature_names[i], mean_abs[i]))
    print("\n(these are exact TreeSHAP values from xgboost's own pred_contribs, "
          "no `shap` package involved - this is what replaces the hardcoded "
          "if/elif thresholds in explainability.py)")

    # ---------------- verdict ----------------
    hr("8. VERDICT")
    xgb_wape = float(tbl.loc[tbl["Model"] == "XGB residual (median head)", "D_WAPE_pct"].iloc[0])
    xgb_g_wape = float(tbl.loc[tbl["Model"] == "XGB residual + prod guardrails", "D_WAPE_pct"].iloc[0])
    ma3_wape = float(tbl.loc[tbl["Model"] == "Production fallback (MA3 x 1.05)", "D_WAPE_pct"].iloc[0])
    best_xgb = min(xgb_wape, xgb_g_wape)
    print(f"XGB residual demand WAPE      : {xgb_wape:.2f}%")
    print(f"XGB residual + guardrails     : {xgb_g_wape:.2f}%")
    print(f"Production fallback MA3 x1.05 : {ma3_wape:.2f}%")
    print(f"GRU v2 (phase 4b, recorded)   : 61.14%")
    promote = best_xgb < ma3_wape
    print("\n" + ("PROMOTE" if promote else "DO NOT PROMOTE"))
    print("rule: promote only if XGB demand WAPE < MA3 demand WAPE on this held-out split.")
    if promote:
        print(f"improvement: {ma3_wape - best_xgb:.2f} WAPE points ({(ma3_wape - best_xgb) / ma3_wape * 100:.1f}% relative)")

    # ---------------- artifacts ----------------
    hr("9. ARTIFACTS")
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    tbl.to_csv(OUT_DIR / "phase4c_metrics.csv", index=False)

    if promote:
        MODEL_XGB.mkdir(parents=True, exist_ok=True)
        # DEMAND HEADS ONLY. The price heads are deliberately not saved - see
        # section 5b: the price target is a synthetic linear series, so a price
        # model would be fitting a straight line and its interval is
        # uncalibrated (0.00% coverage). Shipping it would be fake capability.
        for q in QUANTILES:
            dm[q].save_model(str(MODEL_XGB / f"demand_q{int(q * 100)}.json"))
        meta = {
            "model_name": "partner_discovery_xgb_residual",
            "version": "xgb-residual-v1.0.0",
            "architecture": "XGBRegressor (reg:quantileerror), residual-on-MA3",
            "xgboost_version": xgb.__version__,
            "target": "log(y_true / MA3_anchor)",
            "inversion": "prediction = MA3_anchor * exp(model_output)",
            "anchor_demand": "mean of last 3 input-window years (kg)",
            "quantiles": QUANTILES,
            "point_head": 0.5,
            "shipped_targets": ["demand"],
            "price_model_shipped": False,
            "price_not_shipped_reason": (
                "fob_unit_value_usd_per_kg is a perfectly linear synthetic series in "
                "this dataset (constant per-corridor yearly increment; 'Linear trend' "
                "scores WAPE 0.000% / R2 1.000). Fitting it demonstrates nothing and "
                "its quantile interval is uncalibrated (0.00% realised coverage vs 80% "
                "nominal). Price keeps the median-of-last-3 anchor, labelled as such."
            ),
            "feature_names": feature_names,
            "n_features": len(feature_names),
            "seq_len": SEQ_LEN,
            "base_features": new_feats,
            "params": XGB_PARAMS,
            "test_demand_wape_pct": xgb_wape,
            "test_demand_wape_pct_guardrails": xgb_g_wape,
            "baseline_ma3_demand_wape_pct": ma3_wape,
            "gru_v2_demand_wape_pct": 61.14,
            "interval_coverage_demand_pct": cov_d,
            "interval_coverage_price_pct_UNCALIBRATED": cov_p,
            "nominal_interval_pct": 80.0,
            "split": {"train": "<=2020", "val": "2021-2022", "test": "2023-2024"},
            "promoted": True,
            "disclaimer": (
                "DEMAND point forecast with a model-emitted 80% interval "
                "(realised coverage {:.1f}%). Trained on the real India-as-exporter "
                "trade panel with verified zero target-year leakage. No price model "
                "is shipped - see price_not_shipped_reason. Not a guarantee of "
                "future trade."
            ).format(cov_d),
        }
        (MODEL_XGB / "metadata.json").write_text(json.dumps(meta, indent=2, default=str))
        print(f"wrote {MODEL_XGB}")
    else:
        print("not promoted - no model artifacts written, MA3 stays in production")
    print(f"wrote {OUT_DIR}")


if __name__ == "__main__":
    main()
