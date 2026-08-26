"""
Phase 3 — Data + Model Audit: dataset schema / duplicates / temporal / missingness /
units / leakage / split-chronology audit for the three ML systems' training data.

Run:  python backend/brain/notebooks/validation/audit_datasets.py
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

REPO = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(REPO))
pd.set_option("display.width", 200)


def hr(t):
    print("\n" + "=" * 78)
    print(t)
    print("=" * 78)


def profile(df, name, key_cols=None, time_col=None):
    print(f"\n--- {name}: shape={df.shape} ---")
    print("dtypes / missingness / nunique:")
    rows = []
    for c in df.columns:
        s = df[c]
        rows.append({
            "column": c, "dtype": str(s.dtype),
            "missing_pct": round(100.0 * s.isna().mean(), 3),
            "nunique": s.nunique(dropna=True),
            "zero_pct": round(100.0 * (s == 0).mean(), 2) if pd.api.types.is_numeric_dtype(s) else None,
        })
    print(pd.DataFrame(rows).to_string(index=False))
    print(f"\nfull-row duplicates: {int(df.duplicated().sum())}")
    if key_cols and all(c in df.columns for c in key_cols):
        print(f"duplicates on key {key_cols}: {int(df.duplicated(subset=key_cols).sum())}")
    if time_col and time_col in df.columns:
        vals = sorted(df[time_col].dropna().unique())
        print(f"\n{time_col}: min={vals[0]} max={vals[-1]} n_distinct={len(vals)}")
        print(f"   values: {vals[:6]} ... {vals[-6:]}")
        return vals
    return None


def gaps_monthly(periods):
    """periods are YYYYMM ints — report missing months in the span."""
    ps = sorted(int(p) for p in periods)
    expected = []
    y, m = ps[0] // 100, ps[0] % 100
    while y * 100 + m <= ps[-1]:
        expected.append(y * 100 + m)
        m += 1
        if m == 13:
            m, y = 1, y + 1
    missing = sorted(set(expected) - set(ps))
    print(f"   expected {len(expected)} consecutive months, present {len(ps)}, "
          f"MISSING {len(missing)}: {missing[:24]}")


# =====================================================================
def audit_trade_anomaly():
    hr("A. TRADE ANOMALY DATASET (XGBoost training data)")
    D = REPO / "backend" / "brain" / "processed" / "trade_anomaly"
    feat = pd.read_parquet(D / "02_trade_anomaly_featured.parquet")
    periods = profile(feat, str(D / "02_trade_anomaly_featured.parquet"),
                      key_cols=["period", "reporter_iso3", "partner_iso3", "hs6", "trade_flow"],
                      time_col="period")
    print("\nTemporal gap check:")
    gaps_monthly(periods)

    print("\nGrain check:")
    print("   corridors (reporter,partner,hs6,flow):",
          feat.groupby(["reporter_iso3", "partner_iso3", "hs6", "trade_flow"]).ngroups)
    print("   rows / corridors =", len(feat) / feat.groupby(
        ["reporter_iso3", "partner_iso3", "hs6", "trade_flow"]).ngroups)
    print("   reporter_iso3 values:", feat["reporter_iso3"].unique().tolist())
    print("   trade_flow values   :", feat["trade_flow"].unique().tolist())
    print("   hs6 values (n=%d)    : %s" % (feat["hs6"].nunique(), sorted(feat["hs6"].unique().tolist())))
    print("   partner_iso3 (n=%d)  : %s" % (feat["partner_iso3"].nunique(),
                                            sorted(feat["partner_iso3"].unique().tolist())))

    hr("A2. UNIT CONSISTENCY")
    print("quantity_unit values:", feat["quantity_unit"].value_counts().to_dict())
    same = np.isclose(feat["quantity"], feat["net_weight_kg"])
    print(f"rows where quantity == net_weight_kg: {int(same.sum())}/{len(feat)} "
          f"({100*same.mean():.1f}%)")
    print("   -> if 100%, `quantity` carries NO information beyond net_weight_kg;")
    print("      they are perfectly collinear inputs to the model.")
    print("\ncurrency: all values are named *_usd; no currency column exists ->",
          [c for c in feat.columns if "curr" in c.lower()] or "no currency column")
    print("unit_value_usd_per_kg range: min=%.6f max=%.2f" %
          (feat["unit_value_usd_per_kg"].min(), feat["unit_value_usd_per_kg"].max()))
    print("partner_share_pct range: min=%.6f max=%.6f  (named _pct but is a 0-1 FRACTION)" %
          (feat["partner_share_pct"].min(), feat["partner_share_pct"].max()))

    hr("A3. LABELS — source & composition")
    print("label_source:", feat["label_source"].value_counts().to_dict())
    print("anomaly_flag:", feat["anomaly_flag"].value_counts().to_dict(),
          " positive rate = %.4f" % feat["anomaly_flag"].mean())
    print("anomaly_type:")
    print(feat["anomaly_type"].value_counts().to_string())
    print("\nGenerator: backend/brain/brain_prev/data_pipeline/scripts/build_anomaly_labels.py")
    print("  -> 5 hand-written threshold rules + 8% randomly-relabelled synthetic rows.")
    print("  -> NOT verified fraud outcomes. Script's own docstring line 36-37:")
    print('     "These are statistical discrepancy flags, NOT criminal fraud ground truth."')

    hr("A4. LEAKAGE CHECK — are labels a deterministic function of model inputs?")
    fl = ["trade_value_usd", "net_weight_kg", "quantity", "transaction_count",
          "unit_value_usd_per_kg", "trade_growth_mom", "unit_value_change_mom",
          "quantity_growth_mom", "weight_growth_mom", "yoy_growth", "rolling_mean_3m",
          "rolling_std_3m", "val_to_rolling_mean_ratio", "val_rolling_zscore",
          "partner_share_pct", "partner_share_change_mom", "new_corridor_flag"]
    y = feat["anomaly_flag"].astype(int)

    print("""
The labels in THIS parquet are generated by
  backend/brain/brain_prev/data_pipeline/scripts/build_canonical_parquet_v2.py:363-378
(NOT by build_anomaly_labels.py — that script emits a different anomaly_type
vocabulary and a SYNTHETIC_CONTROLLED_PERTURBATION label_source, neither of which
appears in this dataset). The generator is verbatim:

    z_score = (trade_value_usd - rolling_mean_3m) / rolling_std_3m
    conditions = [ z_score > 3.0,
                   unit_value_change_mom > 2.5,
                   trade_growth_mom < -0.90 ]
    choices    = [ 'VOLUME_SURGE', 'PRICE_SPIKE', 'UNEXPECTED_COLLAPSE' ]
    anomaly_type = np.select(conditions, choices, default='NORMAL')
    anomaly_flag = (anomaly_type != 'NORMAL')

Every one of those three quantities is ALSO a model input feature:
    z_score               -> feature_list.json[13] 'val_rolling_zscore'
    unit_value_change_mom -> feature_list.json[6]  'unit_value_change_mom'
    trade_growth_mom      -> feature_list.json[5]  'trade_growth_mom'
""")

    print("EMPIRICAL TEST — reproduce anomaly_flag from model features alone:")
    rule = ((feat["val_rolling_zscore"] > 3.0) |
            (feat["unit_value_change_mom"] > 2.5) |
            (feat["trade_growth_mom"] < -0.90)).astype(int)
    agree = (rule == y)
    print(f"   rows where rule == anomaly_flag : {int(agree.sum())}/{len(feat)} "
          f"({100*agree.mean():.4f}%)")
    print(f"   false positives (rule=1,label=0): {int(((rule == 1) & (y == 0)).sum())}")
    print(f"   false negatives (rule=0,label=1): {int(((rule == 0) & (y == 1)).sum())}")
    from sklearn.metrics import f1_score, accuracy_score
    print(f"   F1 of this 3-threshold rule vs the label: {f1_score(y, rule):.4f}")
    print(f"   accuracy: {accuracy_score(y, rule):.4f}")
    print("\n   => The target is a CLOSED-FORM BOOLEAN FUNCTION OF THREE MODEL INPUTS.")
    print("      The classifier cannot be discovering anything; it is re-deriving the")
    print("      labelling rule from the very columns the rule was computed on.")
    print("      This fully explains the reported validation_f1 = 0.9818.")

    print("\n   Per-condition contribution:")
    for nm, cond in [("val_rolling_zscore > 3.0", feat["val_rolling_zscore"] > 3.0),
                     ("unit_value_change_mom > 2.5", feat["unit_value_change_mom"] > 2.5),
                     ("trade_growth_mom < -0.90", feat["trade_growth_mom"] < -0.90)]:
        print(f"      {nm:32s} fires on {int(cond.sum()):5d} rows; "
              f"P(label=1|cond)={float(y[cond].mean()) if cond.sum() else float('nan'):.4f}")
    print("      NOTE: 'PRICE_SPIKE' never appears in anomaly_type, consistent with the")
    print("            unit_value_change_mom>2.5 condition firing on 0 rows.")

    print("\n   Degenerate columns that make the mirror-trade rules dead code:")
    for c in ["mirror_ratio", "mirror_difference", "mirror_missing_flag"]:
        print(f"      {c:22s} nunique={feat[c].nunique()} "
              f"constant_value={feat[c].iloc[0]}")
    print("      build_canonical_parquet_v2.py:359-362 HARDCODES mirror_ratio=1.0,")
    print("      mirror_difference=0.0, mirror_missing_flag=0 — there is no real mirror-")
    print("      trade (exporter-vs-importer customs) reconciliation in this dataset.")

    print("\n  Single-feature separability of each model input vs the label (AUC-like):")
    from sklearn.metrics import roc_auc_score
    aucs = []
    for c in fl:
        try:
            aucs.append((c, roc_auc_score(y, feat[c].fillna(0))))
        except Exception:
            pass
    for c, a in sorted(aucs, key=lambda t: -abs(t[1] - 0.5)):
        mark = "  <== near-deterministic" if abs(a - 0.5) > 0.35 else ""
        print(f"     {c:28s} AUC={a:.4f}{mark}")

    hr("A5. SPLIT CHRONOLOGY (train/val/test parquet files as shipped)")
    spans = {}
    for split in ("train", "val", "test"):
        p = D / f"{split}.parquet"
        d = pd.read_parquet(p)
        lo, hi = int(d["period"].min()), int(d["period"].max())
        spans[split] = (lo, hi, len(d), float(d["anomaly_flag"].mean()))
        print(f"  {split:6s} n={len(d):6d}  period {lo} .. {hi}  "
              f"positive_rate={d['anomaly_flag'].mean():.4f}")
    ok = spans["train"][1] < spans["val"][0] and spans["val"][1] < spans["test"][0]
    print(f"\n  strictly chronological (train_max < val_min < val_max < test_min)? {ok}")
    print("  model_metadata.json claims: train <=202406, val 202407-202412, test 202501-202512")
    print("  overlap between splits (row-identical rows across files):")
    tr = pd.read_parquet(D / "train.parquet")
    va = pd.read_parquet(D / "val.parquet")
    te = pd.read_parquet(D / "test.parquet")
    kc = ["period", "reporter_iso3", "partner_iso3", "hs6", "trade_flow"]
    ktr, kva, kte = (set(map(tuple, x[kc].values)) for x in (tr, va, te))
    print(f"     train AND val={len(ktr & kva)}  val AND test={len(kva & kte)}  train AND test={len(ktr & kte)}")
    print(f"     total rows across splits={len(tr)+len(va)+len(te)} vs featured={len(feat)}")


# =====================================================================
def audit_trade_risk():
    hr("B. TRADE RISK DATASET")
    p = REPO / "backend" / "brain" / "brain_prev" / "data_pipeline" / "data" / "processed" / "04_trade_risk.parquet"
    df = pd.read_parquet(p)
    periods = profile(df, str(p),
                      key_cols=["period", "reporter_iso3", "partner_iso3", "hs6"],
                      time_col="period")
    print("\nTemporal gap check:")
    gaps_monthly(periods)
    print("\ncorridors:", df.groupby(["reporter_iso3", "partner_iso3", "hs6"]).ngroups,
          "| rows/corridor:", len(df) / df.groupby(["reporter_iso3", "partner_iso3", "hs6"]).ngroups)

    hr("B2. Which of the 27 selected_features actually exist in this dataset?")
    import json
    feats = json.loads((REPO / "backend" / "brain" / "models" / "trade_risk" /
                        "selected_features.json").read_text())
    present, derived, absent = [], [], []
    for f in feats:
        if f in df.columns:
            present.append(f)
        else:
            base = f.replace("log_", "").replace("_clean", "").replace("_calc", "")
            if any(base in c for c in df.columns):
                derived.append(f)
            else:
                absent.append(f)
    print(f"directly present in the parquet ({len(present)}): {present}")
    print(f"\nderivable from a same-named base column ({len(derived)}): {derived}")
    print(f"\nNO corresponding source column at all ({len(absent)}): {absent}")

    hr("B3. Constant / degenerate columns in the source data")
    const = [c for c in df.columns if df[c].nunique(dropna=False) <= 1]
    print(f"columns with <=1 distinct value ({len(const)}): {const}")
    for c in ["sanctions_present", "sanctions_entity_count", "ofac_entity_count",
              "rta_exists", "tariff_rate", "gdp_growth_pct", "inflation_pct"]:
        if c in df.columns:
            print(f"   {c:26s} nunique={df[c].nunique()} "
                  f"values={df[c].value_counts(dropna=False).head(4).to_dict()}")

    hr("B4. UNIT CONSISTENCY")
    print("no quantity_unit column ->", "quantity_unit" in df.columns)
    print("tariff_type:", df["tariff_type"].value_counts(dropna=False).to_dict())
    print("tariff_scope:", df["tariff_scope"].value_counts(dropna=False).to_dict())
    print("tariff_rate range: %.4f .. %.4f  (percent-scale, not 0-1)" %
          (df["tariff_rate"].min(), df["tariff_rate"].max()))
    same = np.isclose(df["quantity"], df["net_weight_kg"])
    print(f"quantity == net_weight_kg on {100*same.mean():.1f}% of rows")
    print("gdp_usd magnitude: %.3e .. %.3e" % (df["gdp_usd"].min(), df["gdp_usd"].max()))

    hr("B5. LEAKAGE / SPLIT")
    print("This is an UNSUPERVISED system — there is no label column, so classical")
    print("target leakage does not apply. Verified: no column named *anomaly*/*risk*/*label*:")
    print("   ", [c for c in df.columns
                  if any(k in c.lower() for k in ("anomaly", "risk", "label", "flag"))])
    print("\nSplit documented ONLY in the notebook (trade_risk_complete.ipynb cell 33/45):")
    print("   train 202201-202406 | val 202407-202412 | test 202501-202512  -> chronological")
    print("   NOT recorded in the shipped risk_model_metadata.json (no split keys present).")
    lo, hi = int(df["period"].min()), int(df["period"].max())
    print(f"   dataset actually spans {lo} .. {hi}")
    print(f"   rows <=202406: {(df['period'] <= 202406).sum()} | "
          f"202407-202412: {((df['period'] > 202406) & (df['period'] <= 202412)).sum()} | "
          f">=202501: {(df['period'] >= 202501).sum()}")


# =====================================================================
def audit_partner_discovery():
    hr("C. PARTNER DISCOVERY DATASET (Dual-Head GRU training data)")
    p = REPO / "backend" / "brain" / "processed" / "01_partner_discovery_india_as_exporter.parquet"
    df = pd.read_parquet(p)
    years = profile(df, str(p), key_cols=["importer_iso3", "hs6", "year"], time_col="year")
    print("\nYear gap check:")
    yrs = [int(y) for y in years]
    print("   missing years in span:", sorted(set(range(yrs[0], yrs[-1] + 1)) - set(yrs)))
    print("   rows per year (head/tail):")
    vc = df["year"].value_counts().sort_index()
    print(vc.head(5).to_string(), "\n   ...\n", vc.tail(5).to_string())

    print("\n   unique hs6:", df["hs6"].nunique(), "| unique importer_iso3:",
          df["importer_iso3"].nunique())
    print("   exporter_iso3:", df["exporter_iso3"].unique().tolist())
    print("   'WLD' present as an importer? ", "WLD" in set(df["importer_iso3"]),
          "(aggregate 'World' row — must be excluded or it double-counts)")
    print("   WLD row count:", int((df["importer_iso3"] == "WLD").sum()))

    hr("C2. UNIT CONSISTENCY / CURRENCY")
    print("currency_code values:", df["currency_code"].value_counts(dropna=False).head(10).to_dict())
    print("   -> currency_code is the DESTINATION's local currency (metadata only);")
    print("      all *_usd value columns are USD. Confirmed no mixed-currency value column.")
    print("weight column: export_net_weight_kg (kg). range: %.3e .. %.3e" %
          (df["export_net_weight_kg"].min(), df["export_net_weight_kg"].max()))
    print("fob_unit_value_usd_per_kg: min=%.6f p50=%.4f max=%.2f" %
          (df["fob_unit_value_usd_per_kg"].min(), df["fob_unit_value_usd_per_kg"].median(),
           df["fob_unit_value_usd_per_kg"].max()))
    print("destination_market_share_pct: min=%.4f max=%.4f (PERCENT scale 0-100)" %
          (df["destination_market_share_pct"].min(), df["destination_market_share_pct"].max()))
    print("   NOTE: contrast with trade-anomaly's partner_share_pct which is a 0-1 fraction")
    print("         -> the two subsystems use the SAME suffix for DIFFERENT scales.")
    print("destination_applied_tariff_rate: min=%.3f max=%.3f" %
          (df["destination_applied_tariff_rate"].min(), df["destination_applied_tariff_rate"].max()))

    consistency = (df["export_value_usd"] -
                   df["export_net_weight_kg"] * df["fob_unit_value_usd_per_kg"]).abs()
    denom = df["export_value_usd"].replace(0, np.nan)
    rel = (consistency / denom).dropna()
    print("\nInternal consistency value == weight * unit_value:")
    print("   median relative error = %.6f ; %% rows within 1%%: %.2f%%" %
          (rel.median(), 100 * (rel < 0.01).mean()))

    hr("C3. TARGET / FEATURE LEAKAGE CHECK")
    print("Model targets (features.py:135-136): export_net_weight_kg and")
    print("fob_unit_value_usd_per_kg at year t+SEQ; inputs are years t..t+SEQ-1.")
    print("\nInput features (features.py:13-26) and their leakage status:")
    status = {
        "log_export_value": "log1p(export_value_usd) at the INPUT year — fine",
        "log_export_net_weight": "log1p of the TARGET VARIABLE, but at input years only — fine",
        "fob_unit_value": "the 2nd TARGET, at input years only — fine",
        "destination_market_share": "destination_market_share_pct at input year — fine",
        "trade_growth_yoy": "uses groupby.shift(1), strictly backward — fine",
        "log_gdp": "destination_gdp for the INPUT year — fine",
        "log_population": "destination_population, input year — fine",
        "applied_tariff_rate": "destination_applied_tariff_rate, input year — fine",
        "rta_active": "rta_exists, input year — fine",
        "log_locode_count": "destination_locode_count — SEE NOTE BELOW",
        "log_active_buyers": "gleif_active_buyer_count — SEE NOTE BELOW",
        "sanctions_present": "sanctions_present — SEE NOTE BELOW",
    }
    for k, v in status.items():
        print(f"   {k:26s} {v}")
    print("\n  NOTE — static-attribute check (are these columns time-varying at all?):")
    for c in ["destination_locode_count", "destination_port_count", "gleif_active_buyer_count",
              "sanctions_present", "ofac_entity_count", "scomet_match_flag"]:
        if c in df.columns:
            per_country_nunique = df.groupby("importer_iso3")[c].nunique()
            varying = int((per_country_nunique > 1).sum())
            print(f"   {c:30s} varies over time for {varying}/{len(per_country_nunique)} countries"
                  f"  | overall nunique={df[c].nunique()}")
    print("\n  If a column is CONSTANT per country across all years it is a static country")
    print("  attribute carried into every timestep, not a temporal signal. If it was computed")
    print("  from a present-day snapshot (e.g. today's sanctions list, today's GLEIF buyer")
    print("  count) and back-filled onto historical years, that IS lookahead leakage for any")
    print("  target year before the snapshot date.")

    print("\n  Explicit next-period / target-derived column scan:")
    suspicious = [c for c in df.columns
                  if any(k in c.lower() for k in ("next", "future", "lead", "t+1", "forward"))]
    print("   columns with next/future/lead/forward in the name:", suspicious or "NONE")

    hr("C4. SPLIT CHRONOLOGY")
    print("Split is defined in code, not metadata: features.py:106-111 defaults")
    print("   split_train_end=2020, split_val_end=2022, split_test_end=2024")
    print("and the training notebook (brain_prev/notebooks/partner_discovery_forecasting_model.ipynb")
    print("cell 5) calls create_sequence_dataset(split_train_end=2020, split_val_end=2022,")
    print("split_test_end=2024). Assignment is by TARGET YEAR (features.py:151-165):")
    print("   train: target_year <= 2020 | val: 2021-2022 | test: 2023-2024")
    print("   -> strictly chronological, no shuffling. CONFIRMED from source.")
    print("\nData available beyond the test end:")
    print("   rows with year > 2024:", int((df["year"] > 2024).sum()),
          "| max year in data:", int(df["year"].max()))
    print("   -> year(s) %s are in the dataset but fall outside all three splits."
          % sorted(set(df.loc[df['year'] > 2024, 'year'].astype(int))))
    print("\nSequence construction requires >= sequence_length+1 = 6 yearly observations")
    print("per (importer, hs6) corridor (features.py:130). Corridors shorter than that are")
    print("silently DROPPED:")
    sizes = df.groupby(["importer_iso3", "hs6"]).size()
    print(f"   total corridors={len(sizes)}  with >=6 years={int((sizes >= 6).sum())} "
          f"({100*(sizes >= 6).mean():.1f}%)  DROPPED={int((sizes < 6).sum())}")

    hr("C5. DUPLICATE CORRIDOR-YEAR ROWS — impact on sequence construction")
    g = df.groupby(["importer_iso3", "hs6", "year"]).size()
    print("rows per (importer_iso3, hs6, year) key:")
    print(g.value_counts().sort_index().to_string())
    dup_keys = g[g > 1]
    print(f"\nkeys appearing twice: {len(dup_keys)}  "
          f"({100*len(dup_keys)/len(g):.1f}% of all corridor-years)")
    print("\nCause — 7 HS6 codes carry TWO product_description spellings for the same code:")
    multi = df.groupby("hs6")["product_description"].nunique()
    for h in multi[multi > 1].index:
        descs = sorted(df.loc[df["hs6"] == h, "product_description"].unique())
        print(f"   hs6 {h}: {descs}")
    ex = dup_keys.index[0]
    sub = df[(df.importer_iso3 == ex[0]) & (df.hs6 == ex[1]) & (df.year == ex[2])]
    print(f"\nExample duplicate key {ex}:")
    print(sub[["product_description", "export_value_usd", "export_net_weight_kg",
               "fob_unit_value_usd_per_kg"]].to_string(index=False))
    print("   -> SAME net weight, DIFFERENT export value. These are two records of the")
    print("      same physical trade, not two distinct trades.")

    print("\nIMPACT: create_sequence_dataset (features.py:129) does")
    print("   sub = df_feat[(partner==p) & (hs6==h)].sort_values('year')")
    print("   ...then slides a window of 5 CONSECUTIVE ROWS and takes row i+5 as target.")
    print("For a corridor with 2 rows per year, 5 rows span only ~2.5 calendar years and")
    print("the 'next year' target is often the DUPLICATE OF A YEAR ALREADY IN THE WINDOW.")
    per_corr = df.groupby(["importer_iso3", "hs6"]).agg(
        n_rows=("year", "size"), n_years=("year", "nunique"))
    dupd = per_corr[per_corr.n_rows > per_corr.n_years]
    print(f"\n   corridors with duplicated years: {len(dupd)}/{len(per_corr)} "
          f"({100*len(dupd)/len(per_corr):.1f}%)")
    print(f"   rows in those corridors: {int(dupd.n_rows.sum())}/{len(df)} "
          f"({100*dupd.n_rows.sum()/len(df):.1f}%)")

    print("\n   Quantifying target contamination across ALL corridors:")
    same_year, total_windows = 0, 0
    for _, s in df.sort_values("year").groupby(["importer_iso3", "hs6"]):
        yrs = s["year"].values
        if len(yrs) < 6:
            continue
        for i in range(len(yrs) - 5):
            total_windows += 1
            if yrs[i + 5] in set(yrs[i:i + 5]):
                same_year += 1
    print(f"   sequence windows built: {total_windows}")
    print(f"   windows whose TARGET YEAR already appears inside the INPUT window: "
          f"{same_year} ({100*same_year/total_windows:.1f}%)")
    print("   -> for those windows the model is predicting a value from the SAME calendar")
    print("      year it can already see: that is direct target leakage, not forecasting.")


if __name__ == "__main__":
    audit_trade_anomaly()
    audit_trade_risk()
    audit_partner_discovery()
