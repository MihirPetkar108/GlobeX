"""
Phase 3 — Data + Model Audit: trade-risk artifacts (Isolation Forest + RobustScaler
+ GRU Autoencoder) verification.

Run:  python backend/brain/notebooks/validation/audit_trade_risk.py
"""
import json
import sys
from pathlib import Path

import joblib
import numpy as np

REPO = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(REPO))
MODEL_DIR = REPO / "backend" / "brain" / "models" / "trade_risk"


def hr(t):
    print("\n" + "=" * 78)
    print(t)
    print("=" * 78)


def main():
    hr("0. Artifact inventory")
    for f in sorted(MODEL_DIR.iterdir()):
        print(f"  {f.stat().st_size:>12,d}  {f.name}")

    feats = json.loads((MODEL_DIR / "selected_features.json").read_text())
    meta = json.loads((MODEL_DIR / "risk_model_metadata.json").read_text())

    hr("1. selected_features.json / risk_model_metadata.json")
    print("selected_features.json n=%d" % len(feats))
    for i, f in enumerate(feats):
        print(f"   [{i:2d}] {f}")
    print("\nmetadata keys:", list(meta.keys()))
    for k, v in meta.items():
        if k != "selected_features":
            print(f"   {k}: {v}")
    print("\nmetadata.selected_features == selected_features.json ?",
          meta.get("selected_features") == feats)
    print("training period documented in metadata?",
          any(k for k in meta if "period" in k.lower() or "date" in k.lower() or "train" in k.lower()))

    hr("2. RobustScaler introspection")
    scaler = joblib.load(MODEL_DIR / "robust_scaler.joblib")
    print("type:", type(scaler))
    print("n_features_in_:", getattr(scaler, "n_features_in_", None))
    print("feature_names_in_:", getattr(scaler, "feature_names_in_", None))
    print("center_ (median per feature):")
    for f, c, s in zip(feats, scaler.center_, scaler.scale_):
        print(f"   {f:34s} center={c:>16.6f}  scale={s:>16.6f}")

    hr("3. IsolationForest introspection")
    iso = joblib.load(MODEL_DIR / "isolation_forest.joblib")
    print("type:", type(iso))
    inner = getattr(iso, "model", iso)
    print("inner model type:", type(inner))
    for a in ("n_features_in_", "n_estimators", "contamination", "max_samples_",
              "offset_", "random_state", "bootstrap"):
        if hasattr(inner, a):
            print(f"   {a} = {getattr(inner, a)}")
    print("n_features_in_ == len(selected_features)?",
          getattr(inner, "n_features_in_", None) == len(feats))

    hr("4. Isolation Forest smoke test — FULL 27-feature vector")
    rng = np.random.default_rng(0)
    # A plausible row: values placed at the scaler's own centers = a perfectly typical entity
    typical = scaler.center_.reshape(1, -1).copy()
    Xs = scaler.transform(typical)
    print("scaled typical row:", np.round(Xs.ravel(), 4))
    print("decision_function(typical) =", float(inner.decision_function(Xs)[0]))
    print("predict(typical)           =", int(inner.predict(Xs)[0]), "(1=inlier, -1=outlier)")

    extreme = typical + 10.0 * scaler.scale_.reshape(1, -1)
    Xe = scaler.transform(extreme)
    print("decision_function(+10*scale outlier) =", float(inner.decision_function(Xe)[0]))
    print("predict(+10*scale outlier)           =", int(inner.predict(Xe)[0]))

    hr("5. REPRODUCING THE LIVE API'S FEATURE VECTOR (counterparty_api.py:398-425)")
    print("The live endpoint fills ONLY indices 0-4 of a 27-wide zero array:")
    for i in range(5):
        print(f"   [{i}] {feats[i]}")
    print("   [5..26] left as 0.0 -> %d of %d features (%.1f%%) are zero-filled\n"
          % (len(feats) - 5, len(feats), 100 * (len(feats) - 5) / len(feats)))

    def api_vector(completed, trust_score, dispute_rate):
        v = np.zeros((1, len(feats)))
        v[0, 0] = np.log1p(completed * 10000.0)
        v[0, 1] = np.log1p(completed * 5000.0)
        v[0, 2] = np.log1p(completed)
        v[0, 3] = float(trust_score)
        v[0, 4] = float(1.0 - dispute_rate)
        return v

    print("Does the API's zero-padded vector still produce a plausible-looking score?")
    print(f"{'completed':>10} {'trust':>7} {'dispute':>8} | {'decision_function':>18} {'predict':>8} "
          f"{'<-0.10 flag':>12}")
    for completed, trust, disp in [(0, 0.10, 0.90), (2, 0.35, 0.40), (25, 0.72, 0.05),
                                   (500, 0.95, 0.00), (99999, 0.99, 0.0)]:
        v = api_vector(completed, trust, disp)
        vs = scaler.transform(v)
        d = float(inner.decision_function(vs)[0])
        p = int(inner.predict(vs)[0])
        print(f"{completed:>10} {trust:>7.2f} {disp:>8.2f} | {d:>18.6f} {p:>8} {str(d < -0.10):>12}")

    print("\nSemantic-misassignment check — the API writes the WRONG quantities into slots 3 and 4:")
    print(f"   slot [3] is '{feats[3]}' (a month-over-month trade growth rate)")
    print("       but the API writes `trust_score` (a 0-1 reputation score)")
    print(f"   slot [4] is '{feats[4]}' (2nd derivative of trade growth)")
    print("       but the API writes `1.0 - dispute_rate`")

    print("\nScore spread across the whole plausible API input domain:")
    grid = []
    for completed in [0, 1, 5, 20, 100, 1000, 10000]:
        for trust in [0.0, 0.5, 1.0]:
            for disp in [0.0, 0.5, 1.0]:
                grid.append(float(inner.decision_function(
                    scaler.transform(api_vector(completed, trust, disp)))[0]))
    grid = np.array(grid)
    print(f"   n={len(grid)}  min={grid.min():.6f}  max={grid.max():.6f}  "
          f"range={np.ptp(grid):.6f}  std={grid.std():.6f}")
    print(f"   fraction crossing the API's -0.10 alert cutoff: "
          f"{float((grid < -0.10).mean()):.3f}")
    print(f"   fraction IsolationForest.predict() calls -1 (outlier): "
          f"{float((grid < 0).mean()):.3f}   <-- 1.000 means EVERY counterparty is an outlier")

    hr("5b. DEGENERATE-FEATURE CHECK on the fitted RobustScaler")
    # RobustScaler sets scale_ = 1.0 when a feature's IQR is 0 (i.e. the feature was
    # constant across >=50% of the training rows). center_ = the training median.
    degenerate = [(i, f) for i, (f, c, s) in enumerate(zip(feats, scaler.center_, scaler.scale_))
                  if c == 0.0 and s == 1.0]
    informative = [(i, f) for i, f in enumerate(feats) if (i, f) not in degenerate]
    print(f"features with center_==0 AND scale_==1 (zero IQR => CONSTANT in training data): "
          f"{len(degenerate)}/{len(feats)}")
    for i, f in degenerate:
        print(f"   [{i:2d}] {f}")
    print(f"\nfeatures carrying real variation: {len(informative)}/{len(feats)}")
    for i, f in informative:
        print(f"   [{i:2d}] {f}  center={scaler.center_[i]:.4f} scale={scaler.scale_[i]:.4f}")

    hr("6. GRU Autoencoder (gru_autoencoder.pt) — raw load")
    import torch
    p = MODEL_DIR / "gru_autoencoder.pt"
    obj = None
    try:
        obj = torch.load(p, map_location="cpu")
        print("torch.load(weights_only default) SUCCEEDED")
    except Exception as e:
        print("torch.load(default) failed: %s: %s" % (type(e).__name__, e))
        # SECURITY NOTE: weights_only=False executes arbitrary pickle opcodes. Acceptable
        # ONLY because this is a local, repo-tracked, trusted artifact being audited
        # offline. It must NEVER be used on an artifact from an untrusted source.
        obj = torch.load(p, map_location="cpu", weights_only=False)
        print("torch.load(weights_only=False) SUCCEEDED (see security note in source)")

    print("\nloaded object type:", type(obj))
    is_state_dict = isinstance(obj, dict) and all(
        isinstance(v, torch.Tensor) for v in obj.values()) if isinstance(obj, dict) else False
    if isinstance(obj, dict):
        print("dict keys:", list(obj.keys()))
    print("is a raw state_dict (all values Tensors)?", is_state_dict)

    sd = obj if is_state_dict else (obj.get("state_dict") if isinstance(obj, dict)
                                    and "state_dict" in obj else None)
    if sd is None and hasattr(obj, "state_dict"):
        sd = obj.state_dict()
        print("-> object is a full nn.Module; extracted .state_dict()")
    if sd is None and isinstance(obj, dict):
        sd = {k: v for k, v in obj.items() if isinstance(v, torch.Tensor)}

    hr("7. GRU Autoencoder — tensor shapes / inferred architecture")
    for k, v in sd.items():
        print(f"   {k:34s} {tuple(v.shape)}")

    # nn.GRU weight_ih_l0 has shape (3*hidden, input_dim); weight_hh_l0 is (3*hidden, hidden)
    enc_ih = sd["encoder.weight_ih_l0"]
    hidden = enc_ih.shape[0] // 3
    input_dim = enc_ih.shape[1]
    bottleneck = sd["fc_enc.weight"].shape[0]
    n_layers = len([k for k in sd if k.startswith("encoder.weight_ih_l")])
    out_dim = sd["output_layer.weight"].shape[0]
    print(f"\n   INFERRED input_dim   = {input_dim}   (from encoder.weight_ih_l0[1])")
    print(f"   INFERRED hidden_dim  = {hidden}   (from encoder.weight_ih_l0[0] / 3)")
    print(f"   INFERRED bottleneck  = {bottleneck}   (from fc_enc.weight[0])")
    print(f"   INFERRED num_layers  = {n_layers}")
    print(f"   INFERRED output_dim  = {out_dim}   (reconstructs input => autoencoder confirmed)")
    print(f"   input_dim == len(selected_features)? {input_dim == len(feats)}")
    print("   NOTE: sequence length is NOT recoverable from a GRU state_dict "
          "(GRU is length-agnostic); it must come from metadata/notebook.")

    hr("8. GRU Autoencoder — load_state_dict")
    print("The checkpoint's parameter names are:")
    print("   encoder.* / fc_enc.* / fc_dec.* / decoder.* / output_layer.*")
    print("src/trade_anomaly/models.py:151 PyTorchGRUAutoencoder uses:")
    print("   encoder_gru.* / fc_bottleneck.* / fc_expand.* / decoder_gru.* / fc_out.*")
    from src.trade_anomaly.models import PyTorchGRUAutoencoder
    try:
        ref = PyTorchGRUAutoencoder(input_dim=input_dim, hidden_dim=hidden,
                                    bottleneck_dim=bottleneck, num_layers=n_layers)
        ref.load_state_dict(sd, strict=True)
        print("=> loads into the src/ class: YES")
    except Exception as e:
        print("=> loads into the src/ class: NO --", type(e).__name__)
        print("   (first 300 chars):", str(e)[:300])

    # Faithful RECONSTRUCTION of the architecture implied by the checkpoint's own tensor
    # shapes and names. This is NOT the original training class (no such class exists in
    # the repo — see the finding-change record in the Phase 3 report); it is derived
    # purely from the state_dict and is used only to prove the weights load and run.
    import torch.nn as nn

    class ReconstructedGRUAutoencoder(nn.Module):
        def __init__(self, input_dim, hidden_dim, bottleneck_dim):
            super().__init__()
            self.encoder = nn.GRU(input_dim, hidden_dim, num_layers=1, batch_first=True)
            self.fc_enc = nn.Linear(hidden_dim, bottleneck_dim)
            self.fc_dec = nn.Linear(bottleneck_dim, hidden_dim)
            self.decoder = nn.GRU(hidden_dim, hidden_dim, num_layers=1, batch_first=True)
            self.output_layer = nn.Linear(hidden_dim, input_dim)

        def forward(self, x):
            T = x.shape[1]
            _, h = self.encoder(x)
            z = self.fc_enc(h[-1])
            e = self.fc_dec(z).unsqueeze(1).repeat(1, T, 1)
            d, _ = self.decoder(e)
            return self.output_layer(d)

    m = ReconstructedGRUAutoencoder(input_dim, hidden, bottleneck)
    res = m.load_state_dict(sd, strict=True)
    print("\n=> loads into the shape-derived reconstruction (strict=True):", res)
    m.eval()

    hr("9. GRU Autoencoder — reconstruction smoke test")
    print("Notebook (trade_risk_complete.ipynb cell 33/45) declares seq_len = 12.\n")
    for T in (3, 6, 12):
        x = torch.tensor(rng.normal(size=(4, T, input_dim)), dtype=torch.float32)
        with torch.no_grad():
            rec = m(x)
        err_last = torch.mean((x[:, -1, :] - rec[:, -1, :]) ** 2, dim=-1).numpy()
        print(f"   T={T:>2}: in={tuple(x.shape)} out={tuple(rec.shape)} "
              f"recon_MSE(last step)={np.round(err_last, 5)}")
    print("\n   -> forward pass works at ANY T, confirming seq length is not baked in.")
    print("   -> NO reconstruction-error threshold is stored in risk_model_metadata.json;")
    print("      metadata only gives ensemble_formula '0.50*if_score + 0.50*gru_score'")
    print("      and percentile risk_cutoffs, with no saved percentile reference values.")


if __name__ == "__main__":
    main()
