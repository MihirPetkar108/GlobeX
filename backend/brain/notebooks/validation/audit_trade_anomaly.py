"""
Phase 3 — Data + Model Audit: XGBoost trade-anomaly artifact verification.

Loads the LIVE artifacts that src/trade_anomaly/inference.py._discover_models_dir()
actually resolves to, introspects them, and runs an end-to-end inference smoke test.

Run:  python backend/brain/notebooks/validation/audit_trade_anomaly.py
"""
import json
import os
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

REPO = Path(__file__).resolve().parents[4]
MODEL_DIR = REPO / "backend" / "brain" / "models" / "trade_anomaly"

# NOTE (Phase 3 finding): preprocessor.joblib pickles a custom class from
# `src.trade_anomaly.feature_pipeline`, so the repo root MUST be on sys.path or
# joblib.load() raises ModuleNotFoundError: No module named 'src'.
sys.path.insert(0, str(REPO))


def hr(title):
    print("\n" + "=" * 78)
    print(title)
    print("=" * 78)


def main():
    hr("0. Artifact inventory")
    for f in sorted(MODEL_DIR.iterdir()):
        print(f"  {f.stat().st_size:>10,d}  {f}")

    hr("1. JSON metadata")
    feature_list = json.loads((MODEL_DIR / "feature_list.json").read_text())
    metadata = json.loads((MODEL_DIR / "model_metadata.json").read_text())
    threshold = json.loads((MODEL_DIR / "threshold_config.json").read_text())
    print("feature_list.json  (n=%d):" % len(feature_list))
    for i, f in enumerate(feature_list):
        print(f"   [{i:2d}] {f}")
    print("\nmodel_metadata.json keys:", list(metadata.keys()))
    for k, v in metadata.items():
        if k != "features":
            print(f"   {k}: {v}")
    print("\nthreshold_config.json:", threshold)
    print("features in metadata == feature_list.json ?",
          metadata.get("features") == feature_list)

    hr("2. Preprocessor introspection")
    pre = joblib.load(MODEL_DIR / "preprocessor.joblib")
    print("type:", type(pre))
    print(repr(pre)[:3000])
    for attr in ("feature_names_in_", "n_features_in_", "transformers_", "named_transformers_"):
        if hasattr(pre, attr):
            val = getattr(pre, attr)
            print(f"\n-- {attr} --")
            print(val)
    if hasattr(pre, "get_feature_names_out"):
        try:
            out = pre.get_feature_names_out()
            print(f"\nget_feature_names_out(): n={len(out)}")
            print(list(out))
        except Exception as e:
            print("get_feature_names_out() failed:", e)

    hr("3. Model introspection")
    model = joblib.load(MODEL_DIR / "xgboost_anomaly_model.joblib")
    print("type:", type(model))
    print(repr(model)[:3000])
    for attr in ("n_features_in_", "feature_names_in_", "classes_", "objective",
                 "n_estimators", "max_depth", "learning_rate", "scale_pos_weight"):
        if hasattr(model, attr):
            print(f"  {attr} = {getattr(model, attr)}")
    try:
        booster = model.get_booster()
        print("  booster.feature_names =", booster.feature_names)
        print("  booster.num_features() =", booster.num_features())
        print("  booster.num_boosted_rounds() =", booster.num_boosted_rounds())
    except Exception as e:
        print("  booster introspection failed:", e)

    hr("4. Schema match check: preprocessor input vs feature_list.json")
    exp = list(getattr(pre, "feature_names_in_", []))
    print("preprocessor.feature_names_in_ (n=%d): %s" % (len(exp), exp))
    print("EXACT ORDER MATCH vs feature_list.json:", exp == feature_list)
    if exp and exp != feature_list:
        print("  only in preprocessor:", [c for c in exp if c not in feature_list])
        print("  only in feature_list:", [c for c in feature_list if c not in exp])

    hr("5. Inference smoke test — synthetic single row")
    row = {
        "trade_value_usd": 1_250_000.0,
        "net_weight_kg": 480_000.0,
        "quantity": 480_000.0,
        "transaction_count": 14.0,
        "unit_value_usd_per_kg": 2.60,
        "trade_growth_mom": 0.12,
        "unit_value_change_mom": -0.04,
        "quantity_growth_mom": 0.10,
        "weight_growth_mom": 0.11,
        "yoy_growth": 0.25,
        "rolling_mean_3m": 1_100_000.0,
        "rolling_std_3m": 180_000.0,
        "val_to_rolling_mean_ratio": 1.136,
        "val_rolling_zscore": 0.83,
        # NOTE: despite the "_pct" suffix, feature_pipeline.py:135-139 computes this as a
        # FRACTION (value / total product-flow value), i.e. 0..1 — NOT a percentage.
        "partner_share_pct": 0.064,
        "partner_share_change_mom": 0.3,
        "new_corridor_flag": 0,
        "trade_flow": "EXPORT",
        "hs6": "090111",
        "partner_iso3": "ARE",
    }
    X = pd.DataFrame([row], columns=feature_list)
    print("input frame dtypes:\n", X.dtypes.to_string())
    Xt = pre.transform(X)
    print("\npreprocessor.transform() -> type=%s shape=%s" % (type(Xt), getattr(Xt, "shape", None)))
    if hasattr(Xt, "toarray"):
        Xt = Xt.toarray()
    print("transformed row (first 40 values):", np.asarray(Xt).ravel()[:40])

    # NOTE: XGBoostAnomalyModel.predict_proba (src/trade_anomaly/models.py:108-109) is a
    # CUSTOM wrapper that already slices [:, 1] -> returns a 1-D positive-class score array,
    # NOT the (n,2) sklearn convention.
    proba = model.predict_proba(Xt)
    thr = threshold["optimal_threshold"]
    pred_default = model.predict(Xt)              # uses the wrapper's DEFAULT threshold=0.5
    pred_calibrated = model.predict(Xt, threshold=thr)
    print("\npredict_proba -> shape=%s value=%s" % (np.shape(proba), proba))
    print("predict(X)                 [default thr=0.5] ->", pred_default)
    print("predict(X, threshold=%.2f) [calibrated]      -> %s" % (thr, pred_calibrated))
    print("anomaly score = %.6f" % float(np.ravel(proba)[0]))
    print("calibrated threshold = %s => flagged = %s" % (thr, bool(np.ravel(proba)[0] >= thr)))
    print("\nNOTE: models.py:111 defaults threshold=0.5; threshold_config.json says 0.45.")
    print("      Callers must pass the threshold explicitly or they silently use 0.5.")

    hr("6. Extreme/adversarial rows (sanity of score spread)")
    cases = {
        "benign_baseline": row,
        "extreme_undervalue": {**row, "unit_value_usd_per_kg": 0.02,
                               "unit_value_change_mom": -0.95, "val_rolling_zscore": -4.5,
                               "val_to_rolling_mean_ratio": 0.05},
        "extreme_spike": {**row, "trade_value_usd": 90_000_000.0, "trade_growth_mom": 45.0,
                          "val_rolling_zscore": 12.0, "val_to_rolling_mean_ratio": 60.0,
                          "yoy_growth": 30.0},
        "new_corridor": {**row, "new_corridor_flag": 1, "transaction_count": 1.0,
                         "rolling_mean_3m": 0.0, "rolling_std_3m": 0.0},
        "all_zero_numeric": {**{k: (0 if not isinstance(v, str) else v) for k, v in row.items()}},
    }
    Xc = pd.DataFrame([cases[k] for k in cases], columns=feature_list)
    Pc = np.ravel(model.predict_proba(pre.transform(Xc)))
    for name, p in zip(cases, Pc):
        print(f"  {name:22s} score={p:.6f}  flagged={p >= thr}")

    hr("6b. Unseen-category behaviour (OneHotEncoder handle_unknown='ignore')")
    for hs6_val, iso in [("090111", "ARE"), ("999999", "ZZZ"), ("847130", "USA")]:
        r = {**row, "hs6": hs6_val, "partner_iso3": iso}
        s = float(np.ravel(model.predict_proba(pre.transform(
            pd.DataFrame([r], columns=feature_list)))) [0])
        enc = pre.encoder.transform(pd.DataFrame([r])[pre.categorical_features].astype(str))
        print(f"  hs6={hs6_val} iso={iso}: score={s:.6f}  onehot_nonzero={int(enc.sum())}/3"
              f"  (0 nonzero for a field => unseen category silently encoded as all-zeros)")
    print("\n  Known hs6 categories (n=%d): %s" % (
        len(pre.encoder.categories_[1]), list(pre.encoder.categories_[1])))
    print("  Known partner_iso3 categories (n=%d): %s" % (
        len(pre.encoder.categories_[2]), list(pre.encoder.categories_[2])))
    print("  Known trade_flow categories: %s" % list(pre.encoder.categories_[0]))

    hr("7. Production inference contract (verified call signature)")
    print("""
    import sys, joblib, json, pandas as pd
    sys.path.insert(0, REPO_ROOT)   # REQUIRED: pickles reference `src.trade_anomaly.*`

    D     = 'backend/brain/models/trade_anomaly'
    feats = json.load(open(f'{D}/feature_list.json'))   # 20 cols, EXACT ORDER, see above
    thr   = json.load(open(f'{D}/threshold_config.json'))['optimal_threshold']  # 0.45
    pre   = joblib.load(f'{D}/preprocessor.joblib')     # TradeAnomalyPreprocessor
    model = joblib.load(f'{D}/xgboost_anomaly_model.joblib')  # XGBoostAnomalyModel wrapper

    X     = pd.DataFrame([row_dict], columns=feats)     # DataFrame w/ named cols REQUIRED
    Xt    = pre.transform(X)                            # -> ndarray (n, 43): 17 num + 26 OHE
    score = model.predict_proba(Xt)                     # 1-D positive-class array, NOT (n,2)
    flag  = score >= thr                                # or model.predict(Xt, threshold=thr)

    # Categorical value domains that are actually encoded (anything else -> all-zero OHE):
    #   trade_flow  in {'Export','Import'}          <- Title case, NOT 'EXPORT'
    #   hs6         in 8 codes only  (see section 6b)
    #   partner_iso3 in 16 codes only (see section 6b)
    """)

    hr("8. LIVE SERVICE THRESHOLD-KEY BUG (src/trade_anomaly/inference.py:217)")
    print("Code:  threshold = float(self.threshold_config.get('anomaly_threshold', 0.50))")
    print("threshold_config.json keys actually present:", list(threshold.keys()))
    print("'anomaly_threshold' in threshold_config.json ?",
          "anomaly_threshold" in threshold)
    effective = float(threshold.get("anomaly_threshold", 0.50))
    print(f"=> effective threshold used in production: {effective}")
    print(f"=> calibrated threshold on disk          : {threshold['optimal_threshold']}")
    print(f"=> MISMATCH: {effective != threshold['optimal_threshold']}")
    print("   The key lookup never matches, so the hardcoded 0.50 default always wins and")
    print("   the calibrated 0.45 threshold is silently discarded at inference time.")


if __name__ == "__main__":
    main()
