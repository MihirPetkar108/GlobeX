"""
Phase 4b - Partner-discovery Dual-Head GRU retrain on leakage-corrected data.

Fixes applied to the DATA ONLY (the model class and training loop are reused as-is
from src/partner_discovery/forecasting.py):

  1. Deduplicate the two product_description spellings per HS6 so that
     (importer_iso3, hs6, year) is a unique key.
  2. Exclude the 'WLD' World aggregate, matching live inference (inference.py:43).
  3. Drop 'sanctions_present' from the feature list - it is a present-day snapshot
     back-filled onto 2000-2025 (lookahead leakage) and no historical series exists.

Everything else (PartnerFeatureEngineer, create_sequence_dataset, the chronological
split, GRUMultiOutputForecaster, PartnerForecastingPipeline.train_gru) is imported,
not reimplemented. Metric definitions and baselines are imported from the Phase 4
walk-forward script so the comparison is apples-to-apples.

Usage:  python backend/brain/notebooks/validation/phase4b_gru_retrain.py
"""
import sys
import json
import importlib.util
from pathlib import Path

import numpy as np
import pandas as pd
import torch

REPO = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(REPO))

PARQUET = REPO / "backend" / "brain" / "processed" / "01_partner_discovery_india_as_exporter.parquet"
OUT_DIR = REPO / "reports" / "production" / "phase4b_outputs"
MODEL_V2 = REPO / "backend" / "brain" / "models" / "partner_discovery_v2"

from src.partner_discovery.features import PartnerFeatureEngineer            # noqa: E402
from src.partner_discovery.forecasting import PartnerForecastingPipeline     # noqa: E402

# Reuse Phase 4's metric + baseline implementations verbatim.
_spec = importlib.util.spec_from_file_location(
    "phase4_wf", str(Path(__file__).with_name("phase4_forecast_walkforward.py"))
)
p4 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(p4)

SEQ_LEN = 5
SEED = 20260824
KEY = ["importer_iso3", "hs6", "year"]
DUP_HS6 = [100630, 271019, 300490, 520512, 711319, 847130, 851712]


def hr(t):
    print("\n" + "=" * 78)
    print(t)
    print("=" * 78)


# ----------------------------------------------------------------------------------
# Step 0 - evidence for the dedup decision
# ----------------------------------------------------------------------------------
def dedup_evidence(df_raw):
    hr("0. DEDUP EVIDENCE - are the two spellings one trade or two?")
    dup_mask = df_raw.duplicated(subset=KEY, keep=False)
    dup = df_raw[dup_mask].copy()
    print("rows on duplicated keys : {} / {} ({:.2f}%)".format(
        int(dup_mask.sum()), len(df_raw), dup_mask.mean() * 100))
    print("distinct duplicated keys: {}".format(dup[KEY].drop_duplicates().shape[0]))
    print("affected HS6 codes      : {}".format(sorted(dup.hs6.unique().tolist())))

    mapping = {h: sorted(g.product_description.unique()) for h, g in dup.groupby("hs6")}
    dup["variant"] = [mapping[h].index(d) for h, d in zip(dup.hs6, dup.product_description)]
    a = dup[dup.variant == 0].set_index(KEY).sort_index()
    b = dup[dup.variant == 1].set_index(KEY).sort_index()
    assert a.index.equals(b.index), "variant panels are not key-aligned"

    same_w = int((a.export_net_weight_kg.values == b.export_net_weight_kg.values).sum())
    same_q = int((a.quantity.values == b.quantity.values).sum())
    print("\npairs with BIT-IDENTICAL export_net_weight_kg : {} / {}".format(same_w, len(a)))
    print("pairs with BIT-IDENTICAL quantity             : {} / {}".format(same_q, len(a)))

    r = b.export_value_usd.values / a.export_value_usd.values
    print("\nvalue ratio variantB / variantA, per HS6 (min / median / max):")
    tmp = pd.DataFrame({"hs6": a.index.get_level_values("hs6"), "r": r})
    print(tmp.groupby("hs6").r.agg(["min", "median", "max"]).to_string())

    cols = [c for c in df_raw.columns if c not in ("product_description",) + tuple(KEY)]
    diff = []
    for c in cols:
        va, vb = a[c], b[c]
        if pd.api.types.is_numeric_dtype(va):
            neq = ~np.isclose(va.astype(float).values, vb.astype(float).values,
                              rtol=1e-9, atol=0.0, equal_nan=True)
        else:
            neq = (va.values != vb.values)
        if neq.mean() > 0:
            diff.append((c, float(neq.mean() * 100)))
    print("\ncolumns that differ within a pair (every other column is identical):")
    for c, f in diff:
        print("  {:34s} {:6.2f}% of pairs".format(c, f))
    return {
        "dup_rows": int(dup_mask.sum()),
        "dup_keys": int(dup[KEY].drop_duplicates().shape[0]),
        "pairs_same_weight": same_w,
        "pairs_same_quantity": same_q,
        "n_pairs": int(len(a)),
        "value_ratio_by_hs6": tmp.groupby("hs6").r.median().round(6).to_dict(),
        "differing_columns": diff,
    }


# ----------------------------------------------------------------------------------
# Step 1 - build the corrected panel
# ----------------------------------------------------------------------------------
def build_fixed_panel(df_raw):
    hr("1. BUILD CORRECTED PANEL")
    df = df_raw.copy()
    n0 = len(df)

    # (a) exclude the WLD World aggregate - matches inference.py:43
    df = df[df["importer_iso3"].str.upper() != "WLD"].copy()
    n1 = len(df)
    print("(a) exclude WLD          : {} -> {}  (-{} rows)".format(n0, n1, n0 - n1))

    # (b) canonicalise product_description: keep the first record in native file order
    #     for each (importer_iso3, hs6, year). File order is preserved (no sort above),
    #     so this is deterministic and reproducible.
    canon = df.groupby("hs6", sort=False)["product_description"].first().to_dict()
    df = df.drop_duplicates(subset=KEY, keep="first").copy()
    n2 = len(df)
    print("(b) dedup corridor-years : {} -> {}  (-{} rows)".format(n1, n2, n1 - n2))
    for h in DUP_HS6:
        print("      hs6 {} kept spelling: {!r}".format(h, canon[h]))

    assert not df.duplicated(subset=KEY).any(), "duplicate keys survived dedup"
    print("\nduplicate (importer_iso3, hs6, year) keys remaining: {}".format(
        int(df.duplicated(subset=KEY).sum())))
    print("final panel: {} x {}, {} importers, {} HS6, years {}-{}".format(
        df.shape[0], df.shape[1], df.importer_iso3.nunique(), df.hs6.nunique(),
        df.year.min(), df.year.max()))
    return df, {"n_raw": n0, "n_after_wld": n1, "n_after_dedup": n2,
                "kept_spellings": {str(h): canon[h] for h in DUP_HS6}}


# ----------------------------------------------------------------------------------
# Step 2 - leakage audit (before / after)
# ----------------------------------------------------------------------------------
def leakage_audit(df_panel, engineer, label):
    df_feat = engineer.engineer_base_features(df_panel)
    wins = p4.replicate_window_years(df_feat, "importer_iso3")
    all_w = pd.concat([wins["train"], wins["val"], wins["test"]], ignore_index=True)
    out = {}
    print("\n--- {} ---".format(label))
    for split in ("train", "val", "test"):
        w = wins[split]
        if len(w) == 0:
            continue
        leak = int(w.target_year_in_input_window.sum())
        out[split] = {"n": int(len(w)), "leaky": leak,
                      "pct": round(leak / len(w) * 100.0, 4)}
        print("  {:5s}: {:6d} windows | target-year-in-input-window {:5d} ({:6.2f}%)".format(
            split, len(w), leak, leak / len(w) * 100))
    leak_all = int(all_w.target_year_in_input_window.sum())
    out["all"] = {"n": int(len(all_w)), "leaky": leak_all,
                  "pct": round(leak_all / len(all_w) * 100.0, 4)}
    print("  ALL  : {:6d} windows | target-year-in-input-window {:5d} ({:6.2f}%)".format(
        len(all_w), leak_all, leak_all / len(all_w) * 100))
    print("  input-window distinct calendar years: {}".format(
        dict(all_w.input_distinct_years.value_counts().sort_index())))
    return out, wins


# ----------------------------------------------------------------------------------
# Step 3 - split hygiene
# ----------------------------------------------------------------------------------
def split_hygiene(seq):
    hr("3. SPLIT HYGIENE - row-key overlap across chronological splits")
    keys = {}
    for s in ("train", "val", "test"):
        m = seq[s]["meta"]
        keys[s] = set(zip(m.partner_iso3, m.hs6, m.target_year))
        yrs = sorted(m.target_year.unique().tolist())
        print("  {:5s}: n={:6d}  unique keys={:6d}  target years {}-{}".format(
            s, len(m), len(keys[s]), yrs[0], yrs[-1]))
    ok = True
    for a, b in (("train", "val"), ("train", "test"), ("val", "test")):
        ov = keys[a] & keys[b]
        print("  overlap {}/{}: {}".format(a, b, len(ov)))
        ok = ok and (len(ov) == 0)
    dup_within = {s: int(len(seq[s]["meta"]) - len(keys[s])) for s in keys}
    print("  duplicate keys WITHIN a split: {}".format(dup_within))
    assert ok, "chronological splits overlap"
    return {"sizes": {s: int(len(seq[s]["meta"])) for s in keys},
            "overlaps_zero": bool(ok), "dup_within": dup_within}


# ----------------------------------------------------------------------------------
# Step 4 - evaluation
# ----------------------------------------------------------------------------------
def evaluate(name_to_pred, test_yd, test_yp, test_X):
    prev_d = np.expm1(test_X[:, -1, 1])
    prev_p = test_X[:, -1, 2]
    rows = []
    for name, (pd_, pp_) in name_to_pred.items():
        d = p4.metric_block(test_yd, pd_, prev_d)
        p = p4.metric_block(test_yp, pp_, prev_p)
        rows.append({
            "Model": name,
            "D_MAE_kg": d["MAE"], "D_RMSE_kg": d["RMSE"], "D_WAPE_pct": d["WAPE_pct"],
            "D_sMAPE_pct": d["sMAPE_pct"], "D_MAPE_pct": d["MAPE_pct"],
            "D_DirAcc_pct": d["DirAcc_pct"], "D_R2": d["R2"],
            "P_MAE_usd": p["MAE"], "P_RMSE_usd": p["RMSE"], "P_WAPE_pct": p["WAPE_pct"],
            "P_sMAPE_pct": p["sMAPE_pct"], "P_R2": p["R2"],
        })
    return pd.DataFrame(rows)


def breakdown(name_to_pred, test_yd, meta, by, top=8):
    recs = []
    grp = meta[by].values
    if top:
        keep = pd.Series(grp).value_counts().head(top).index.tolist()
    else:
        keep = sorted(pd.unique(grp).tolist())
    for name, (pdem, _) in name_to_pred.items():
        for g in keep:
            m = grp == g
            recs.append({"Model": name, by: g, "n": int(m.sum()),
                         "WAPE_pct": round(p4.wape(test_yd[m], pdem[m]), 2)})
    return pd.DataFrame(recs).pivot(index="Model", columns=by, values="WAPE_pct")


# ----------------------------------------------------------------------------------
def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    np.random.seed(SEED)
    torch.manual_seed(SEED)

    df_raw = pd.read_parquet(PARQUET)
    hr("PHASE 4b - GRU RETRAIN ON LEAKAGE-CORRECTED PARTNER-DISCOVERY DATA")
    print("parquet : {}".format(PARQUET))
    print("shape   : {}".format(df_raw.shape))
    print("torch   : {}   seed: {}".format(torch.__version__, SEED))

    ev = dedup_evidence(df_raw)
    df_fixed, counts = build_fixed_panel(df_raw)

    # feature list: original 12 minus the back-filled sanctions snapshot
    eng_full = PartnerFeatureEngineer(sequence_length=SEQ_LEN)
    orig_feats = list(eng_full.feature_columns)
    new_feats = [f for f in orig_feats if f != "sanctions_present"]
    engineer = PartnerFeatureEngineer(sequence_length=SEQ_LEN)
    engineer.feature_columns = new_feats

    hr("2. LEAKAGE AUDIT - target year inside the 5-step input window")
    print("Check replicated from Phase 4 (replicate_window_years), same code path.")
    baseline_leak, _ = leakage_audit(df_raw, eng_full, "BEFORE (raw panel, WLD kept, 12 feats)")
    fixed_leak, _ = leakage_audit(df_fixed, engineer, "AFTER  (deduped, WLD excluded, 11 feats)")

    hr("2b. FEATURE-SET CHANGE")
    print("original feature list ({}): {}".format(len(orig_feats), orig_feats))
    print("retrained feature list ({}): {}".format(len(new_feats), new_feats))
    print("dropped: sanctions_present  (constant per country across all 26 years -> "
          "2026 snapshot back-filled onto history = lookahead leakage)")
    print("note: ofac_entity_count was NEVER a model feature (not in feature_columns); "
          "it is a dataset column only.")

    seq = engineer.create_sequence_dataset(
        df_fixed, split_train_end=2020, split_val_end=2022, split_test_end=2024)
    hyg = split_hygiene(seq)

    tr, va, te = seq["train"], seq["val"], seq["test"]
    print("\ntensors: train X {} | val X {} | test X {}".format(
        tr["X"].shape, va["X"].shape, te["X"].shape))

    # ---------------- train ----------------
    hr("4. TRAIN - GRUMultiOutputForecaster via PartnerForecastingPipeline.train_gru")
    pipe = PartnerForecastingPipeline(input_dim=tr["X"].shape[-1], hidden_dim=64,
                                      num_layers=2, lr=0.003)
    print("hyperparameters: hidden_dim=64 num_layers=2 lr=0.003 epochs=70 "
          "batch_size=32 patience=15  (train_and_evaluate_forecasting_models defaults)")
    res = pipe.train_gru(tr["X"], tr["y_demand"], tr["y_price"],
                         va["X"], va["y_demand"], va["y_price"],
                         epochs=70, batch_size=32, patience=15)
    print("epochs trained: {}  best val loss: {:.6f}".format(
        res["epochs_trained"], res["best_val_loss"]))
    for h in res["history"][:5] + res["history"][-5:]:
        print("  epoch {:3d}  train {:.6f}  val {:.6f}".format(
            h["epoch"], h["train_loss"], h["val_loss"]))

    # ---------------- predict + baselines ----------------
    hr("5. HELD-OUT TEST EVALUATION (target years 2023-2024)")
    gru_d, gru_p = pipe.predict(te["X"])
    base = p4.baselines(te["X"])
    preds = dict(base)
    preds["Dual-Head GRU v2 (retrained)"] = (gru_d, gru_p)
    g_d, g_p, _p_over, _d_over = p4.apply_production_guardrails(gru_d, gru_p, te["X"])
    preds["Dual-Head GRU v2 + prod guardrails"] = (g_d, g_p)

    tbl = evaluate(preds, te["y_demand"], te["y_price"], te["X"])
    dcols = ["Model", "D_MAE_kg", "D_RMSE_kg", "D_WAPE_pct", "D_sMAPE_pct",
             "D_MAPE_pct", "D_DirAcc_pct", "D_R2"]
    pcols = ["Model", "P_MAE_usd", "P_RMSE_usd", "P_WAPE_pct", "P_sMAPE_pct", "P_R2"]
    print("\nDEMAND (kg):")
    print(tbl[dcols].sort_values("D_WAPE_pct").to_string(
        index=False, float_format=lambda x: "{:,.3f}".format(x)))
    print("\nPRICE (USD/kg):")
    print(tbl[pcols].sort_values("P_WAPE_pct").to_string(
        index=False, float_format=lambda x: "{:,.3f}".format(x)))

    hr("6. ERROR BREAKDOWNS (demand WAPE %)")
    print("\nby target year:")
    print(breakdown(preds, te["y_demand"], te["meta"], "target_year", top=None).to_string())
    print("\nby HS6 (top 8 by test-window count):")
    print(breakdown(preds, te["y_demand"], te["meta"], "hs6", top=8).to_string())
    print("\nby importer (top 10 by test-window count):")
    print(breakdown(preds, te["y_demand"], te["meta"], "partner_iso3", top=10).to_string())

    hr("7. SANITY CHECK - individual GRU predictions vs last actual")
    last = np.expm1(te["X"][:, -1, 1])
    ratio = gru_d / np.maximum(1.0, last)
    print("negative demand forecasts : {}".format(int((gru_d < 0).sum())))
    print("zero demand forecasts     : {}".format(int((gru_d == 0).sum())))
    print("forecast / last actual    : p05 {:.3f}  p50 {:.3f}  p95 {:.3f}  max {:.3f}".format(
        np.percentile(ratio, 5), np.median(ratio), np.percentile(ratio, 95), ratio.max()))
    print("price at the $0.01 floor  : {} / {} ({:.2f}%)".format(
        int((gru_p <= 0.0100001).sum()), len(gru_p), (gru_p <= 0.0100001).mean() * 100))
    idx = np.random.RandomState(0).choice(len(gru_d), 8, replace=False)
    m = te["meta"]
    ma3 = base["Moving Average (3-year)"][0]
    print("\n8 randomly sampled test windows (demand kg):")
    print("{:>18} {:>5} {:>16} {:>16} {:>16} {:>16}".format(
        "corridor", "yr", "last_actual", "actual", "gru_v2", "ma3"))
    for i in idx:
        print("{:>18} {:>5} {:>16,.0f} {:>16,.0f} {:>16,.0f} {:>16,.0f}".format(
            "{}/{}".format(m.partner_iso3[i], m.hs6[i]), int(m.target_year[i]),
            last[i], te["y_demand"][i], gru_d[i], ma3[i]))

    # ---------------- persist ----------------
    hr("8. ARTIFACTS")
    MODEL_V2.mkdir(parents=True, exist_ok=True)
    pipe.save(str(MODEL_V2))
    (MODEL_V2 / "feature_names.json").write_text(json.dumps(new_feats, indent=2))
    gru_row = tbl[tbl.Model == "Dual-Head GRU v2 (retrained)"].iloc[0].to_dict()
    ma_row = tbl[tbl.Model == "Moving Average (3-year)"].iloc[0].to_dict()
    meta_out = {
        "model": "GRUMultiOutputForecaster",
        "version": "partner_discovery_v2",
        "trained_at_utc": pd.Timestamp.utcnow().isoformat(),
        "source_parquet": "backend/brain/processed/01_partner_discovery_india_as_exporter.parquet",
        "data_fixes": {
            "dedup_key": KEY,
            "dedup_method": "drop_duplicates(subset=key, keep='first') in native file order",
            "exclude_wld": True,
            "dropped_features": ["sanctions_present"],
        },
        "row_counts": counts,
        "feature_names": new_feats,
        "sequence_length": SEQ_LEN,
        "split": {"train_end": 2020, "val_end": 2022, "test_end": 2024},
        "split_sizes": hyg["sizes"],
        "leakage_pct_target_year_in_window": {"before": baseline_leak, "after": fixed_leak},
        "hyperparameters": {"hidden_dim": 64, "num_layers": 2, "lr": 0.003,
                            "epochs": 70, "batch_size": 32, "patience": 15, "seed": SEED},
        "training": {"epochs_trained": res["epochs_trained"],
                     "best_val_loss": res["best_val_loss"]},
        "test_metrics_gru": gru_row,
        "test_metrics_moving_average_3y": ma_row,
        "promoted": bool(gru_row["D_WAPE_pct"] < ma_row["D_WAPE_pct"]),
    }
    (MODEL_V2 / "metadata.json").write_text(json.dumps(meta_out, indent=2, default=str))
    tbl.to_csv(OUT_DIR / "phase4b_test_metrics.csv", index=False)
    pd.DataFrame(res["history"]).to_csv(OUT_DIR / "phase4b_train_history.csv", index=False)
    (OUT_DIR / "phase4b_dedup_evidence.json").write_text(json.dumps(ev, indent=2, default=str))
    print("wrote {}".format(MODEL_V2))
    print("wrote {}".format(OUT_DIR))

    hr("9. VERDICT INPUT")
    print("GRU v2 demand WAPE       : {:.2f}%".format(gru_row["D_WAPE_pct"]))
    print("Moving Average (3y) WAPE : {:.2f}%".format(ma_row["D_WAPE_pct"]))
    print("PROMOTE" if meta_out["promoted"] else "DO NOT PROMOTE")


if __name__ == "__main__":
    main()
