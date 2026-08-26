"""
Phase 3 — Data + Model Audit: partner-discovery Dual-Head GRU verification.

Loads backend/brain/brain_prev/models/partner_discovery/forecasting/gru_multi_output.pt
using the REAL GRUMultiOutputForecaster / PartnerForecastingPipeline from
src/partner_discovery/forecasting.py (imported, not reimplemented).

Run:  python backend/brain/notebooks/validation/audit_partner_discovery_gru.py
"""
import sys
from pathlib import Path

import joblib
import numpy as np
import torch

REPO = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(REPO))

PD_DIR = REPO / "backend" / "brain" / "brain_prev" / "models" / "partner_discovery" / "forecasting"
DUP_DIR = REPO / "backend" / "brain" / "brain_prev" / "models" / "partner_forecasting"

from src.partner_discovery.forecasting import (  # noqa: E402
    GRUMultiOutputForecaster, PartnerForecastingPipeline)
from src.partner_discovery.features import PartnerFeatureEngineer  # noqa: E402


def hr(t):
    print("\n" + "=" * 78)
    print(t)
    print("=" * 78)


def main():
    hr("0. Artifact inventory")
    for f in sorted(PD_DIR.iterdir()):
        print(f"  {f.stat().st_size:>10,d}  {f.name}")

    hr("1. Duplicate-directory check (partner_discovery/forecasting vs partner_forecasting)")
    import hashlib
    for name in ("gru_multi_output.pt", "gru_scaler_metadata.joblib", "metadata.joblib"):
        a, b = PD_DIR / name, DUP_DIR / name
        ha = hashlib.sha256(a.read_bytes()).hexdigest()[:16] if a.exists() else "MISSING"
        hb = hashlib.sha256(b.read_bytes()).hexdigest()[:16] if b.exists() else "MISSING"
        print(f"  {name:30s} pd={ha}  pf={hb}  identical={ha == hb}")

    hr("2. gru_scaler_metadata.joblib")
    sc = joblib.load(PD_DIR / "gru_scaler_metadata.joblib")
    print("type:", type(sc), "keys:", list(sc.keys()) if isinstance(sc, dict) else None)
    for k, v in sc.items():
        if isinstance(v, np.ndarray):
            print(f"  {k}: ndarray shape={v.shape}")
            print(f"     {np.round(v, 6)}")
        else:
            print(f"  {k}: {v}")
    print("\nNOTE: this is a plain z-score (mean/std) standardisation fitted in "
          "PartnerForecastingPipeline.fit_scaler() (forecasting.py:88-91) on the FLATTENED "
          "training sequence tensor — NOT an sklearn scaler object.")

    hr("3. metadata.joblib")
    md = joblib.load(PD_DIR / "metadata.joblib")
    print("type:", type(md))
    if isinstance(md, dict):
        for k, v in md.items():
            print(f"  {k}: {v}")
    else:
        print(md)

    hr("4. benchmark_comparison.csv (as shipped alongside the artifact)")
    bc = PD_DIR / "benchmark_comparison.csv"
    if bc.exists():
        print(bc.read_text())

    hr("5. Raw checkpoint introspection")
    sd = torch.load(PD_DIR / "gru_multi_output.pt", map_location="cpu")
    print("loaded type:", type(sd))
    is_sd = isinstance(sd, dict) and all(isinstance(v, torch.Tensor) for v in sd.values())
    print("is a raw state_dict?", is_sd)
    for k, v in sd.items():
        print(f"   {k:28s} {tuple(v.shape)}")
    ih = sd["gru.weight_ih_l0"]
    hidden = ih.shape[0] // 3
    input_dim = ih.shape[1]
    n_layers = len([k for k in sd if k.startswith("gru.weight_ih_l")])
    print(f"\n   INFERRED input_dim={input_dim}, hidden_dim={hidden}, num_layers={n_layers}")
    print("   heads:", sorted({k.split('.')[0] for k in sd if 'head' in k}))

    hr("6. Feature order / sequence length (src/partner_discovery/features.py)")
    eng = PartnerFeatureEngineer()
    print("PartnerFeatureEngineer.sequence_length =", eng.sequence_length)
    print("feature_columns (n=%d), EXACT MODEL INPUT ORDER:" % len(eng.feature_columns))
    for i, f in enumerate(eng.feature_columns):
        print(f"   [{i:2d}] {f}")
    print("\ncheckpoint input_dim == len(feature_columns)? ",
          input_dim == len(eng.feature_columns))

    hr("7. Load via the REAL pipeline class (PartnerForecastingPipeline.load)")
    pipe = PartnerForecastingPipeline(input_dim=input_dim, hidden_dim=hidden,
                                      num_layers=n_layers)
    pipe.load(str(PD_DIR))
    print("loaded OK. model =", type(pipe.model).__name__)
    print("  input_dim=%s hidden_dim=%s num_layers=%s" %
          (pipe.input_dim, pipe.hidden_dim, pipe.num_layers))
    print("  feature_means set?", pipe.feature_means is not None,
          "| feature_stds set?", pipe.feature_stds is not None)
    n_params = sum(p.numel() for p in pipe.model.parameters())
    print("  total parameters:", f"{n_params:,}")

    hr("8. Target transformation (evidence from forecasting.py)")
    print("  TRAIN (forecasting.py:115-116):")
    print("     train_log_demand = np.log1p(np.maximum(0.0, train_y_demand))")
    print("     -> demand head is trained on log1p(net_weight_kg)")
    print("     price head is trained on RAW fob_unit_value_usd_per_kg (NO log)")
    print("  PREDICT (forecasting.py:188-189):")
    print("     pred_demand_kg = np.expm1(np.maximum(0.0, log_d))   # back to kg")
    print("     pred_price     = np.maximum(0.01, p)                # floored at $0.01/kg")
    print("  ARCHITECTURE constraint (forecasting.py:70):")
    print("     price_pred = torch.relu(price_head(...))  -> price CANNOT go negative")
    print("     demand: np.maximum(0.0, log_d) then expm1 -> demand CANNOT go negative")
    print("     => min possible demand = expm1(0) = 0.0 kg; min price = 0.01 USD/kg")

    hr("9. INFERENCE SMOKE TEST — synthetic (1, 5, 12) sequence")
    rng = np.random.default_rng(42)
    # A plausible corridor: ~$4.4M/yr, ~1.5M kg, ~$2.9/kg, 6% share, modest growth,
    # mid-size economy, 5% tariff, RTA active, 40 ports, 900 buyers, no sanctions.
    base = np.array([
        np.log1p(4_400_000.0),   # log_export_value
        np.log1p(1_500_000.0),   # log_export_net_weight
        2.90,                    # fob_unit_value
        6.0,                     # destination_market_share (pct units in source col)
        0.08,                    # trade_growth_yoy
        np.log1p(4.5e11),        # log_gdp
        np.log1p(9.8e7),         # log_population
        5.0,                     # applied_tariff_rate
        1.0,                     # rta_active
        np.log1p(40.0),          # log_locode_count
        np.log1p(900.0),         # log_active_buyers
        0.0,                     # sanctions_present
    ], dtype=np.float32)
    seq = np.tile(base, (5, 1))
    seq[:, 0] += np.linspace(-0.12, 0.12, 5)   # mild upward value trend
    seq[:, 1] += np.linspace(-0.10, 0.10, 5)
    X = seq[None, :, :]
    print("input shape:", X.shape, "(batch, sequence_length=5, n_features=12)")

    d, p = pipe.predict(X)
    print("\nRAW OUTPUT:")
    print("   forecast demand = %.2f kg" % float(d[0]))
    print("   forecast price  = %.4f USD/kg" % float(p[0]))
    print("   implied trade value = %.2f USD" % (float(d[0]) * float(p[0])))
    print("   (input last-step actual: %.0f kg @ $%.2f/kg = $%.0f)"
          % (np.expm1(seq[-1, 1]), seq[-1, 2], np.expm1(seq[-1, 1]) * seq[-1, 2]))

    hr("10. Output-range sweep over 200 randomised plausible corridors")
    P = np.tile(base, (200, 5, 1)).astype(np.float32)
    P[:, :, 0] += rng.normal(0, 1.5, (200, 5))
    P[:, :, 1] += rng.normal(0, 1.5, (200, 5))
    P[:, :, 2] *= rng.uniform(0.2, 5.0, (200, 1))
    P[:, :, 3] = rng.uniform(0, 40, (200, 1))
    dd, pp = pipe.predict(P)
    print("demand_kg : min=%.3f  p50=%.3f  max=%.3f  n_negative=%d  n_zero=%d"
          % (dd.min(), np.median(dd), dd.max(), int((dd < 0).sum()), int((dd == 0).sum())))
    print("price     : min=%.4f  p50=%.4f  max=%.4f  n_at_floor(0.01)=%d"
          % (pp.min(), np.median(pp), pp.max(), int((pp <= 0.01).sum())))

    hr("11. inference.py post-processing guardrails actually applied in production")
    print("src/partner_discovery/inference.py:86-92 OVERRIDES the model output when:")
    print("   price  < 0.10 or > 100000.0 or NaN  -> replaced by median of last 3 actuals")
    print("   demand < 100.0 or > 50x hist_avg or NaN -> replaced by hist_avg * 1.05")
    print("\nApplying those exact rules to the sweep above:")
    hist_avg_d = float(np.expm1(base[1]))
    hist_avg_p = float(base[2])
    price_over = (pp < 0.10) | (pp > 100000.0) | np.isnan(pp)
    dem_over = (dd < 100.0) | (dd > hist_avg_d * 50.0) | np.isnan(dd)
    print("   price overridden  : %d/200 (%.1f%%)" % (price_over.sum(), 100 * price_over.mean()))
    print("   demand overridden : %d/200 (%.1f%%)" % (dem_over.sum(), 100 * dem_over.mean()))
    print("   both overridden   : %d/200 (%.1f%%)"
          % ((price_over & dem_over).sum(), 100 * (price_over & dem_over).mean()))
    print("\n   NOTE: when both are overridden the result is IDENTICAL to the no-model")
    print("   heuristic fallback (inference.py:95-96), i.e. the GRU contributes nothing.")

    hr("12. PREPROCESSING MISMATCH CHECK — inference.py vs what the model needs")
    print("inference.py:80 builds the sequence as:")
    print("   seq_x = sub[engineer.feature_columns].values[-5:]")
    print("   inp   = np.expand_dims(seq_x, axis=0)")
    print("   pred  = gru_pipeline.predict(inp)")
    print("-> predict() DOES apply transform_x() internally (forecasting.py:184), so the")
    print("   z-score standardisation IS applied. No double-scaling, no missing scaling.")
    print("\nRemaining wiring defects (path + dir-name), verified on disk:")
    for cand in [REPO / "backend" / "brain_temporary" / "models" / "partner_discovery" / "forecasting",
                 REPO / "models" / "partner_forecasting",
                 PD_DIR]:
        print(f"   exists={str(cand.exists()):5s}  {cand}")
    print("\n   src/api/partner_discovery_api.py:32-33 -> backend/brain_temporary/... (MISSING)")
    print("   src/partner_discovery/inference.py:19 default -> models/partner_forecasting (MISSING)")
    print("   real artifact lives at brain_prev/models/partner_discovery/forecasting (EXISTS)")


if __name__ == "__main__":
    main()
