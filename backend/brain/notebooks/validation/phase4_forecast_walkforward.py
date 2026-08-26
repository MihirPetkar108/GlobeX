"""
Phase 4 - Production forecasting validation for the partner-discovery Dual-Head GRU.

Fills the metric gap left by the shipped `benchmark_comparison.csv`, which reports only
MAE / MAPE / R^2 / composite error. The production pack additionally requires RMSE, WAPE,
sMAPE, prediction-interval coverage, error-by-year, error-by-country/product and
cold-start performance. This script computes all of them on the real held-out split.

Design decisions (all deliberate, all documented in the report):

  * Feature engineering and the chronological split are NOT reimplemented. They come from
    `src.partner_discovery.features.PartnerFeatureEngineer` (sequence_length=5) and its
    `create_sequence_dataset(split_train_end=2020, split_val_end=2022, split_test_end=2024)`,
    which is exactly what the training notebook called.
  * The GRU is loaded through the real `PartnerForecastingPipeline.load()`, so the shipped
    z-score scaler, the log1p demand target inversion and the $0.01 price floor all apply
    exactly as they do in production.
  * Baselines are reimplemented here (they are one-liners) so that this script does not
    depend on `train_and_evaluate_forecasting_models`, which retrains the GRU as a side
    effect and would overwrite the shipped artifact.
  * The training notebook loaded the panel with exclude_wld=False, so the primary run keeps
    the WLD ("World") aggregate in order to reproduce the split the shipped benchmark used.
    A second run with exclude_wld=True mirrors the live inference path
    (`inference.py:43`) and is reported alongside.
  * NO model in this repository emits a prediction interval. Rather than fabricate one,
    this script constructs an *empirical* interval post hoc from validation-split residual
    quantiles (target years 2021-2022) and then measures its coverage on the test split.
    That is a property of this script, not of the shipped model - see the report.

Run:  PYTHONIOENCODING=utf-8 python backend/brain/notebooks/validation/phase4_forecast_walkforward.py
"""
import sys
import json
from pathlib import Path

import numpy as np
import pandas as pd

REPO = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(REPO))

PD_DIR = REPO / "backend" / "brain" / "brain_prev" / "models" / "partner_discovery" / "forecasting"
PARQUET = REPO / "backend" / "brain" / "processed" / "01_partner_discovery_india_as_exporter.parquet"
OUT_DIR = REPO / "reports" / "production" / "phase4_forecast_outputs"

from src.partner_discovery.features import PartnerFeatureEngineer          # noqa: E402
from src.partner_discovery.forecasting import PartnerForecastingPipeline   # noqa: E402

SEQ_LEN = 5
COLD_START_THRESHOLD_YEARS = 8   # < 8 distinct prior years of history = "cold start"


def hr(t):
    print("\n" + "=" * 78)
    print(t)
    print("=" * 78)


# ----------------------------------------------------------------------------------
# Metrics
# ----------------------------------------------------------------------------------
def mae(y, p):
    return float(np.mean(np.abs(y - p)))


def rmse(y, p):
    return float(np.sqrt(np.mean((y - p) ** 2)))


def wape(y, p):
    """Weighted absolute percentage error = sum|e| / sum|y|. Scale-aware, no /0 blowup."""
    denom = float(np.sum(np.abs(y)))
    if denom == 0.0:
        return float("nan")
    return float(np.sum(np.abs(y - p)) / denom * 100.0)


def smape(y, p):
    """Symmetric MAPE, 0-200% convention. Rows where y and p are both 0 contribute 0."""
    denom = np.abs(y) + np.abs(p)
    num = 2.0 * np.abs(y - p)
    out = np.zeros_like(num, dtype=float)
    nz = denom > 0
    out[nz] = num[nz] / denom[nz]
    return float(np.mean(out) * 100.0)


def mape(y, p):
    """Kept only for comparability with the shipped benchmark CSV (masks y<=0)."""
    m = y > 0
    if not np.any(m):
        return float("nan")
    return float(np.mean(np.abs((y[m] - p[m]) / y[m])) * 100.0)


def dir_acc(y, p, prev):
    return float(np.mean(np.sign(y - prev) == np.sign(p - prev)) * 100.0)


def r2(y, p):
    ss_res = float(np.sum((y - p) ** 2))
    ss_tot = float(np.sum((y - np.mean(y)) ** 2))
    if ss_tot == 0.0:
        return float("nan")
    return 1.0 - ss_res / ss_tot


def metric_block(y, p, prev=None):
    d = {
        "n": int(len(y)),
        "MAE": mae(y, p),
        "RMSE": rmse(y, p),
        "WAPE_pct": wape(y, p),
        "sMAPE_pct": smape(y, p),
        "MAPE_pct": mape(y, p),
        "R2": r2(y, p),
    }
    if prev is not None:
        d["DirAcc_pct"] = dir_acc(y, p, prev)
    return d


# ----------------------------------------------------------------------------------
# Window metadata replication (years only - NOT feature engineering)
# ----------------------------------------------------------------------------------
def replicate_window_years(df_feat, partner_col):
    """
    Mirrors the corridor/window iteration of features.py:120-165 to recover, for each
    generated window, the calendar years of its 5 input steps. Only `year` is read; no
    feature is recomputed. Alignment with the real meta frame is asserted at runtime.
    """
    corridors = df_feat[[partner_col, "hs6"]].drop_duplicates().values
    groups = {k: g for k, g in df_feat.groupby([partner_col, "hs6"], sort=False)}
    rows = {"train": [], "val": [], "test": []}
    for partner, hs6 in corridors:
        sub = groups[(partner, hs6)].sort_values("year")
        if len(sub) < SEQ_LEN + 1:
            continue
        years = sub["year"].values
        for i in range(len(sub) - SEQ_LEN):
            ty = years[i + SEQ_LEN]
            in_years = years[i:i + SEQ_LEN]
            rec = {
                "partner_iso3": partner,
                "hs6": hs6,
                "target_year": ty,
                "input_year_min": int(in_years.min()),
                "input_year_max": int(in_years.max()),
                "input_distinct_years": int(len(np.unique(in_years))),
                "target_year_in_input_window": bool(ty in set(in_years.tolist())),
            }
            if ty <= 2020:
                rows["train"].append(rec)
            elif ty <= 2022:
                rows["val"].append(rec)
            elif ty <= 2024:
                rows["test"].append(rec)
    return {k: pd.DataFrame(v) for k, v in rows.items()}


def corridor_history_years(df_feat, partner_col):
    """Map (partner, hs6) -> sorted array of distinct calendar years present."""
    g = df_feat.groupby([partner_col, "hs6"])["year"].unique()
    return {k: np.sort(np.unique(v)) for k, v in g.items()}


# ----------------------------------------------------------------------------------
# Baselines (deliberately trivial reimplementations)
# ----------------------------------------------------------------------------------
def baselines(X):
    """
    X is (N, 5, 12) raw (unscaled) feature sequences.
      feature index 1 = log_export_net_weight  -> expm1 gives kg
      feature index 2 = fob_unit_value         -> raw USD/kg
    """
    w = np.expm1(X[:, :, 1])          # (N, 5) demand in kg
    pr = X[:, :, 2]                   # (N, 5) price in USD/kg

    out = {}
    out["Naive (last value)"] = (w[:, -1], pr[:, -1])
    out["Moving Average (3-year)"] = (w[:, -3:].mean(axis=1), pr[:, -3:].mean(axis=1))

    # Linear trend over the 5 input steps, extrapolated one step ahead.
    t = np.arange(SEQ_LEN, dtype=float)
    logw = X[:, :, 1]
    sd = np.polyfit(t, logw.T, 1)     # (2, N)
    trend_logw = sd[0] * SEQ_LEN + sd[1]
    sp = np.polyfit(t, pr.T, 1)
    trend_p = sp[0] * SEQ_LEN + sp[1]
    out["Linear trend (OLS on 5 steps)"] = (
        np.expm1(np.maximum(0.0, trend_logw)),
        np.maximum(0.01, trend_p),
    )

    # The heuristic that ACTUALLY runs in production today, because both model-dir paths
    # are broken (inference.py:74-77, 94-96): mean of last 3 weights * 1.05, median of
    # last 3 prices.
    out["Production fallback (MA3 x 1.05)"] = (
        w[:, -3:].mean(axis=1) * 1.05,
        np.median(pr[:, -3:], axis=1),
    )
    return out


def apply_production_guardrails(pred_d, pred_p, X):
    """Replicates src/partner_discovery/inference.py:86-92 exactly."""
    w = np.expm1(X[:, :, 1])
    pr = X[:, :, 2]
    hist_avg_d = w[:, -3:].mean(axis=1)
    hist_avg_p = np.median(pr[:, -3:], axis=1)

    p = pred_p.copy().astype(float)
    d = pred_d.copy().astype(float)
    p_over = (p < 0.10) | (p > 100000.0) | np.isnan(p)
    d_over = (d < 100.0) | (d > hist_avg_d * 50.0) | np.isnan(d)
    p[p_over] = hist_avg_p[p_over]
    d[d_over] = hist_avg_d[d_over] * 1.05
    return d, p, p_over, d_over


# ----------------------------------------------------------------------------------
# Empirical prediction intervals (constructed HERE, not by any shipped model)
# ----------------------------------------------------------------------------------
def interval_coverage(val_y, val_p, test_y, test_p, levels=(0.80, 0.95)):
    """
    Fit residual quantiles in log space on the validation split, apply to the test split,
    measure realised coverage. Log space is used because demand spans ~5 orders of
    magnitude, so an additive interval would be meaningless.
    """
    res = np.log1p(np.maximum(0.0, val_y)) - np.log1p(np.maximum(0.0, val_p))
    out = {}
    for lv in levels:
        lo_q = (1.0 - lv) / 2.0
        hi_q = 1.0 - lo_q
        lo_off, hi_off = np.quantile(res, [lo_q, hi_q])
        lp = np.log1p(np.maximum(0.0, test_p))
        lo = np.expm1(lp + lo_off)
        hi = np.expm1(lp + hi_off)
        inside = (test_y >= lo) & (test_y <= hi)
        out[f"coverage_{int(lv*100)}"] = float(inside.mean() * 100.0)
        out[f"median_width_ratio_{int(lv*100)}"] = float(
            np.median(np.divide(hi - lo, np.maximum(1.0, test_y)))
        )
    return out


# ----------------------------------------------------------------------------------
def run(exclude_wld: bool, tag: str, write_outputs: bool):
    hr(f"RUN [{tag}]  exclude_wld={exclude_wld}")

    df = pd.read_parquet(PARQUET)
    partner_col = "importer_iso3"
    if exclude_wld:
        df = df[df[partner_col].str.upper() != "WLD"].copy()
    print(f"panel rows={len(df):,}  years={df['year'].min()}-{df['year'].max()}  "
          f"countries={df[partner_col].nunique()}  hs6={df['hs6'].nunique()}")

    eng = PartnerFeatureEngineer(sequence_length=SEQ_LEN)
    seq = eng.create_sequence_dataset(df, split_train_end=2020, split_val_end=2022,
                                      split_test_end=2024)
    df_feat = eng.engineer_base_features(df)

    for sp in ("train", "val", "test"):
        m = seq[sp]["meta"]
        print(f"  {sp:5s} windows={len(seq[sp]['X']):6,d}  "
              f"target_years={sorted(m['target_year'].unique().tolist()) if len(m) else []}")

    # --- window metadata + runtime alignment proof --------------------------------
    wmeta = replicate_window_years(df_feat, partner_col)
    for sp in ("train", "val", "test"):
        a = seq[sp]["meta"][["partner_iso3", "hs6", "target_year"]].reset_index(drop=True)
        b = wmeta[sp][["partner_iso3", "hs6", "target_year"]].reset_index(drop=True)
        ok = a.equals(b)
        print(f"  window-metadata alignment [{sp}]: {ok}")
        assert ok, f"window metadata misaligned for split {sp}"

    hist = corridor_history_years(df_feat, partner_col)
    test_meta = seq["test"]["meta"].reset_index(drop=True).join(
        wmeta["test"][["input_year_min", "input_year_max", "input_distinct_years",
                       "target_year_in_input_window"]]
    )
    test_meta["hist_years_before_target"] = [
        int((hist[(r.partner_iso3, r.hs6)] < r.target_year).sum())
        for r in test_meta.itertuples()
    ]
    test_meta["cold_start"] = test_meta["hist_years_before_target"] < COLD_START_THRESHOLD_YEARS

    print(f"\n  test windows with target year already inside the input window: "
          f"{int(test_meta['target_year_in_input_window'].sum()):,}"
          f" / {len(test_meta):,} "
          f"({100*test_meta['target_year_in_input_window'].mean():.1f}%)")
    print(f"  test cold-start windows (<{COLD_START_THRESHOLD_YEARS} distinct prior years): "
          f"{int(test_meta['cold_start'].sum()):,} / {len(test_meta):,} "
          f"({100*test_meta['cold_start'].mean():.1f}%)")

    # --- models --------------------------------------------------------------------
    test_X = seq["test"]["X"]
    test_yd = seq["test"]["y_demand"].astype(float)
    test_yp = seq["test"]["y_price"].astype(float)
    val_X = seq["val"]["X"]
    val_yd = seq["val"]["y_demand"].astype(float)
    val_yp = seq["val"]["y_price"].astype(float)

    pipe = PartnerForecastingPipeline(input_dim=len(eng.feature_columns), hidden_dim=64,
                                      num_layers=2)
    pipe.load(str(PD_DIR))
    gru_d, gru_p = pipe.predict(test_X)
    gru_vd, gru_vp = pipe.predict(val_X)

    preds_test = baselines(test_X)
    preds_val = baselines(val_X)
    preds_test["Dual-Head GRU (raw)"] = (gru_d.astype(float), gru_p.astype(float))
    preds_val["Dual-Head GRU (raw)"] = (gru_vd.astype(float), gru_vp.astype(float))

    gd, gp, p_over, d_over = apply_production_guardrails(gru_d, gru_p, test_X)
    vgd, vgp, _, _ = apply_production_guardrails(gru_vd, gru_vp, val_X)
    preds_test["Dual-Head GRU + prod guardrails"] = (gd, gp)
    preds_val["Dual-Head GRU + prod guardrails"] = (vgd, vgp)

    print(f"\n  GRU price at $0.01 floor on test: {int((gru_p <= 0.0101).sum()):,}"
          f"/{len(gru_p):,} ({100*(gru_p <= 0.0101).mean():.1f}%)")
    print(f"  production guardrail overrides on test: price {int(p_over.sum()):,} "
          f"({100*p_over.mean():.1f}%), demand {int(d_over.sum()):,} "
          f"({100*d_over.mean():.1f}%)")

    prev_d = np.expm1(test_X[:, -1, 1])
    prev_p = test_X[:, -1, 2]

    # --- headline table ------------------------------------------------------------
    hr(f"[{tag}] TEST SPLIT (target years 2023-2024)  n={len(test_yd):,} windows")
    rows = []
    for name in preds_test:
        pd_, pp_ = preds_test[name]
        dblk = metric_block(test_yd, pd_, prev_d)
        pblk = metric_block(test_yp, pp_, prev_p)
        vd_, vp_ = preds_val[name]
        cov_d = interval_coverage(val_yd, vd_, test_yd, pd_)
        rows.append({
            "Model": name,
            "D_MAE_kg": dblk["MAE"], "D_RMSE_kg": dblk["RMSE"],
            "D_WAPE_pct": dblk["WAPE_pct"], "D_sMAPE_pct": dblk["sMAPE_pct"],
            "D_MAPE_pct": dblk["MAPE_pct"], "D_DirAcc_pct": dblk["DirAcc_pct"],
            "D_R2": dblk["R2"],
            "P_MAE_usd": pblk["MAE"], "P_RMSE_usd": pblk["RMSE"],
            "P_WAPE_pct": pblk["WAPE_pct"], "P_sMAPE_pct": pblk["sMAPE_pct"],
            "P_R2": pblk["R2"],
            "D_emp80_cov_pct": cov_d["coverage_80"],
            "D_emp95_cov_pct": cov_d["coverage_95"],
        })
    tbl = pd.DataFrame(rows)

    with pd.option_context("display.width", 250, "display.max_columns", 50,
                           "display.float_format", lambda v: f"{v:,.3f}"):
        print("\nDEMAND (kg):")
        print(tbl[["Model", "D_MAE_kg", "D_RMSE_kg", "D_WAPE_pct", "D_sMAPE_pct",
                   "D_MAPE_pct", "D_DirAcc_pct", "D_R2"]].to_string(index=False))
        print("\nPRICE (USD/kg):")
        print(tbl[["Model", "P_MAE_usd", "P_RMSE_usd", "P_WAPE_pct",
                   "P_sMAPE_pct", "P_R2"]].to_string(index=False))
        print("\nEMPIRICAL PREDICTION-INTERVAL COVERAGE (demand; intervals built by THIS")
        print("script from validation-split log residuals - no shipped model emits one):")
        print(tbl[["Model", "D_emp80_cov_pct", "D_emp95_cov_pct"]].to_string(index=False))

    # --- reproduction check against the shipped benchmark CSV ----------------------
    hr(f"[{tag}] REPRODUCTION CHECK vs shipped benchmark_comparison.csv")
    bc = PD_DIR / "benchmark_comparison.csv"
    if bc.exists():
        ship = pd.read_csv(bc).set_index("Model")
        pairs = [("Naive (Last Value)", "Naive (last value)"),
                 ("Moving Average (3-Year)", "Moving Average (3-year)"),
                 ("Dual-Head GRU (Deep Learning)", "Dual-Head GRU (raw)")]
        mine = tbl.set_index("Model")
        print(f"{'model':32s} {'shipped D_MAE':>16s} {'this run D_MAE':>16s} {'delta':>14s}")
        for s, m in pairs:
            if s in ship.index and m in mine.index:
                a = float(ship.loc[s, "Demand_MAE_kg"])
                b = float(mine.loc[m, "D_MAE_kg"])
                print(f"{s:32s} {a:16,.1f} {b:16,.1f} {b - a:14,.1f}")
        print("\nA near-exact match on the deterministic baselines proves the split and the")
        print("feature tensors reconstructed here are the same ones the shipped CSV used.")
        print("Any GRU gap is therefore a WEIGHTS difference, not a data difference.")

    # --- error by target year ------------------------------------------------------
    hr(f"[{tag}] ERROR BY TARGET YEAR (demand)")
    by_year = []
    for name, (pd_, _) in preds_test.items():
        for yr in sorted(test_meta["target_year"].unique()):
            m = (test_meta["target_year"] == yr).values
            b = metric_block(test_yd[m], pd_[m])
            by_year.append({"Model": name, "target_year": int(yr), **b})
    by_year = pd.DataFrame(by_year)
    print(by_year.pivot(index="Model", columns="target_year",
                        values=["MAE", "WAPE_pct", "sMAPE_pct"]).to_string(
        float_format=lambda v: f"{v:,.2f}"))

    # --- error by product (hs6) ----------------------------------------------------
    hr(f"[{tag}] ERROR BY PRODUCT (top 8 HS6 by test-window count, demand)")
    top_hs = test_meta["hs6"].value_counts().head(8).index.tolist()
    rows = []
    for name, (pd_, _) in preds_test.items():
        for h in top_hs:
            m = (test_meta["hs6"] == h).values
            rows.append({"Model": name, "hs6": int(h), **metric_block(test_yd[m], pd_[m])})
    by_hs = pd.DataFrame(rows)
    print(by_hs.pivot(index="Model", columns="hs6", values="WAPE_pct").to_string(
        float_format=lambda v: f"{v:,.1f}"))
    print("\n(values are WAPE %, demand)")

    # --- error by country ----------------------------------------------------------
    hr(f"[{tag}] ERROR BY COUNTRY (top 10 importer_iso3 by test-window count, demand)")
    top_c = test_meta["partner_iso3"].value_counts().head(10).index.tolist()
    rows = []
    for name, (pd_, _) in preds_test.items():
        for c in top_c:
            m = (test_meta["partner_iso3"] == c).values
            rows.append({"Model": name, "iso3": c, **metric_block(test_yd[m], pd_[m])})
    by_c = pd.DataFrame(rows)
    print(by_c.pivot(index="Model", columns="iso3", values="WAPE_pct").to_string(
        float_format=lambda v: f"{v:,.1f}"))
    print("\n(values are WAPE %, demand)")

    # --- cold start ----------------------------------------------------------------
    hr(f"[{tag}] COLD START")
    print("Distinct calendar years of history BEFORE the target year, test split:")
    print(test_meta["hist_years_before_target"].value_counts().sort_index().to_string())
    n_cold = int(test_meta["cold_start"].sum())
    print(f"\nWindows with <{COLD_START_THRESHOLD_YEARS} prior years: {n_cold} / "
          f"{len(test_meta):,}")
    if n_cold == 0:
        print("=> The held-out split contains NO cold-start corridors. Every corridor that")
        print("   survives features.py:130 (>=6 rows) has at least "
              f"{int(test_meta['hist_years_before_target'].min())} prior years by 2023.")
        print("   Cold-start behaviour is therefore NOT MEASURABLE on this split, even")
        print("   though inference.py:79 will serve any corridor with >=5 ROWS - which,")
        print("   for a duplicate-year corridor, can be as little as 3 calendar years.")

    print("\n--- Stratification A: depth of corridor history (observed buckets) ---")
    depth = pd.cut(test_meta["hist_years_before_target"], bins=[-1, 14, 100],
                   labels=["shallow (<=14 prior yrs)", "deep (>=15 prior yrs)"])
    rows = []
    for name, (pd_, _) in preds_test.items():
        for lbl in depth.cat.categories:
            m = (depth == lbl).values
            if m.sum() == 0:
                continue
            rows.append({"Model": name, "regime": str(lbl),
                         **metric_block(test_yd[m], pd_[m])})
    cold = pd.DataFrame(rows)
    print(cold.pivot(index="Model", columns="regime",
                     values=["n", "MAE", "WAPE_pct", "sMAPE_pct"]).to_string(
        float_format=lambda v: f"{v:,.2f}"))

    print("\n--- Stratification B: calendar span of the 5-step input window ---")
    print("(a duplicate-year corridor packs 5 rows into 3 calendar years, so the model")
    print(" sees LESS history than the architecture implies - the closest analogue to a")
    print(" cold start that this split actually contains)")
    rows = []
    for name, (pd_, _) in preds_test.items():
        for span in sorted(test_meta["input_distinct_years"].unique()):
            m = (test_meta["input_distinct_years"] == span).values
            rows.append({"Model": name, "regime": f"{int(span)} calendar yrs in window",
                         **metric_block(test_yd[m], pd_[m])})
    span_tbl = pd.DataFrame(rows)
    print(span_tbl.pivot(index="Model", columns="regime",
                         values=["n", "MAE", "WAPE_pct", "sMAPE_pct"]).to_string(
        float_format=lambda v: f"{v:,.2f}"))
    cold = pd.concat([cold, span_tbl], ignore_index=True)

    # --- duplicate-year contamination ----------------------------------------------
    hr(f"[{tag}] ERROR SPLIT BY DUPLICATE-YEAR CONTAMINATION OF THE INPUT WINDOW")
    rows = []
    for name, (pd_, _) in preds_test.items():
        for lbl, m in (("target_year_in_window", test_meta["target_year_in_input_window"].values),
                       ("clean_window", (~test_meta["target_year_in_input_window"]).values)):
            if m.sum() == 0:
                continue
            rows.append({"Model": name, "window": lbl, **metric_block(test_yd[m], pd_[m])})
    dup = pd.DataFrame(rows)
    if len(dup):
        print(dup.pivot(index="Model", columns="window",
                        values=["n", "MAE", "WAPE_pct"]).to_string(
            float_format=lambda v: f"{v:,.2f}"))

    # --- economic plausibility -----------------------------------------------------
    hr(f"[{tag}] ECONOMIC PLAUSIBILITY OF THE GRU POINT FORECASTS (test split)")
    last_w = np.expm1(test_X[:, -1, 1])
    ratio = np.divide(gru_d, np.maximum(1.0, last_w))
    print(f"  negative demand forecasts : {int((gru_d < 0).sum())}")
    print(f"  zero demand forecasts     : {int((gru_d == 0).sum())}")
    print(f"  forecast / last actual    : p05={np.quantile(ratio,0.05):.3f} "
          f"p50={np.quantile(ratio,0.50):.3f} p95={np.quantile(ratio,0.95):.3f} "
          f"max={ratio.max():.1f}")
    print(f"  forecasts >10x last actual: {int((ratio > 10).sum()):,} "
          f"({100*(ratio > 10).mean():.1f}%)")
    print(f"  forecasts <0.1x last actual: {int((ratio < 0.1).sum()):,} "
          f"({100*(ratio < 0.1).mean():.1f}%)")

    if write_outputs:
        OUT_DIR.mkdir(parents=True, exist_ok=True)
        tbl.to_csv(OUT_DIR / "forecast_metrics.csv", index=False)
        by_year.to_csv(OUT_DIR / "forecast_error_by_year.csv", index=False)
        by_hs.to_csv(OUT_DIR / "forecast_error_by_product.csv", index=False)
        by_c.to_csv(OUT_DIR / "forecast_error_by_country.csv", index=False)
        cold.to_csv(OUT_DIR / "forecast_cold_start.csv", index=False)
        pred_df = test_meta.copy()
        pred_df["actual_demand_kg"] = test_yd
        pred_df["actual_price_usd_per_kg"] = test_yp
        for name, (pdm, ppm) in preds_test.items():
            key = name.replace(" ", "_").replace("(", "").replace(")", "").replace("/", "_")
            pred_df[f"pred_demand__{key}"] = pdm
            pred_df[f"pred_price__{key}"] = ppm
        pred_df.to_parquet(OUT_DIR / "walk_forward_predictions.parquet", index=False)
        print(f"\n  wrote outputs -> {OUT_DIR}")

    return tbl


def main():
    hr("PHASE 4 - PARTNER-DISCOVERY FORECAST WALK-FORWARD VALIDATION")
    print(f"repo     : {REPO}")
    print(f"parquet  : {PARQUET}  exists={PARQUET.exists()}")
    print(f"model dir: {PD_DIR}  exists={PD_DIR.exists()}")
    print(f"sequence_length = {SEQ_LEN} (PartnerFeatureEngineer default; data is ANNUAL)")
    print("split by TARGET YEAR: train <=2020 | val 2021-2022 | test 2023-2024")
    print("NOTE: year 2025 exists in the panel but falls outside all three splits.")

    print("\nShipped benchmark for reference "
          "(benchmark_comparison.csv, as found on disk):")
    bc = PD_DIR / "benchmark_comparison.csv"
    if bc.exists():
        print(pd.read_csv(bc).to_string(index=False))

    run(exclude_wld=False, tag="AS-TRAINED (WLD kept, matches training notebook)",
        write_outputs=True)
    run(exclude_wld=True, tag="AS-SERVED (WLD excluded, matches inference.py:43)",
        write_outputs=False)

    hr("PREDICTION INTERVALS - SCOPE STATEMENT")
    print("No model in this repository produces a prediction interval:")
    print("  * GRUMultiOutputForecaster returns two point scalars (forecasting.py:66-71).")
    print("  * PartnerForecastingPipeline.predict returns two point arrays (:181-190).")
    print("  * The naive / moving-average / trend baselines are point forecasts by")
    print("    construction.")
    print("Native interval coverage is therefore NOT APPLICABLE to the shipped system.")
    print("The coverage figures above are for an EMPIRICAL interval this script builds")
    print("from validation-split log residuals; they describe what a wrapper COULD")
    print("deliver, not anything the production code currently emits.")


if __name__ == "__main__":
    main()
