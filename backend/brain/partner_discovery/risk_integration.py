import os
import json
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional

import torch
import torch.nn as nn

class GRUAutoencoder(nn.Module):
    """PyTorch GRU Sequence Autoencoder for corridor trade volatility and anomaly reconstruction."""
    def __init__(self, input_dim: int = 27, hidden_dim: int = 32, latent_dim: int = 16):
        super().__init__()
        self.encoder = nn.GRU(input_dim, hidden_dim, batch_first=True)
        self.fc_enc = nn.Linear(hidden_dim, latent_dim)
        self.fc_dec = nn.Linear(latent_dim, hidden_dim)
        self.decoder = nn.GRU(hidden_dim, hidden_dim, batch_first=True)
        self.output_layer = nn.Linear(hidden_dim, input_dim)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        _, h = self.encoder(x)
        latent = torch.relu(self.fc_enc(h[-1]))
        dec_init = torch.relu(self.fc_dec(latent)).unsqueeze(0)
        decoder_input = torch.zeros(
            x.size(0), x.size(1), self.decoder.input_size,
            dtype=x.dtype, device=x.device,
        )
        out, _ = self.decoder(decoder_input, dec_init)
        recon = self.output_layer(out)
        return recon

class TradeRiskIntegrator:
    """
    Evaluates international trade compliance, sanctions, OFAC listings, SCOMET controls,
    and sequence volatility via PyTorch GRU Autoencoder + Isolation Forest ensemble.
    Strictly obeys: final_score = opportunity_score - risk_penalty.
    """
    def __init__(
        self,
        risk_model_dir: str = "backend/brain/models/trade_risk",
        max_penalty: float = 40.0,
        sanctions_deduction: float = 30.0,
        scomet_deduction: float = 15.0,
        ofac_scale: float = 4.0,
        tariff_threshold: float = 20.0,
        tariff_deduction: float = 10.0
    ):
        self.max_penalty = max_penalty
        self.sanctions_deduction = sanctions_deduction
        self.scomet_deduction = scomet_deduction
        self.ofac_scale = ofac_scale
        self.tariff_threshold = tariff_threshold
        self.tariff_deduction = tariff_deduction
        self.risk_model_dir = risk_model_dir
        
        # Attempt to load GRU Autoencoder and Isolation Forest
        self.gru_autoencoder = None
        self.isolation_forest = None
        self.robust_scaler = None
        self.selected_features = None
        
        self._load_models()

    def _load_models(self):
        try:
            pt_path = os.path.join(self.risk_model_dir, "gru_autoencoder.pt")
            if os.path.exists(pt_path):
                self.gru_autoencoder = GRUAutoencoder()
                state = torch.load(pt_path, weights_only=True)
                self.gru_autoencoder.load_state_dict(state)
                self.gru_autoencoder.eval()
                
            if_path = os.path.join(self.risk_model_dir, "isolation_forest.joblib")
            if os.path.exists(if_path):
                self.isolation_forest = joblib.load(if_path)
                
            sc_path = os.path.join(self.risk_model_dir, "robust_scaler.joblib")
            if os.path.exists(sc_path):
                self.robust_scaler = joblib.load(sc_path)
                
            feat_path = os.path.join(self.risk_model_dir, "selected_features.json")
            if os.path.exists(feat_path):
                with open(feat_path, "r") as f:
                    self.selected_features = json.load(f)
        except Exception as e:
            # Fallback gracefully to rule-based risk penalties
            pass

    def score_corridor(
        self,
        panel: pd.DataFrame,
        partner_iso3: str,
        hs6: int,
        sequence_length: int = 5,
    ) -> Optional[Dict[str, Any]]:
        """Run the persisted GRU autoencoder on observed corridor history.

        The partner endpoint uses this as an evidence signal only. It does not
        rescale the reconstruction error into a match score or risk percentage.
        That keeps country matching and temporal anomaly detection as separate,
        auditable outputs.
        """
        if self.gru_autoencoder is None or self.robust_scaler is None or not self.selected_features:
            return None

        required = {
            "year", "importer_iso3", "hs6", "trade_value_usd",
            "export_net_weight_kg", "transaction_count",
            "fob_unit_value_usd_per_kg", "destination_market_share_pct",
            "destination_gdp_growth", "destination_inflation",
            "destination_applied_tariff_rate", "tariff_preference_margin",
            "sanctions_present", "ofac_entity_count", "scomet_match_flag",
        }
        if not required.issubset(panel.columns):
            return None

        corridor = panel[
            (panel["importer_iso3"].astype(str).str.upper() == str(partner_iso3).upper())
            & (panel["hs6"].astype(int) == int(hs6))
        ].copy()
        if corridor.empty:
            return None

        # The panel can contain multiple source rows per year. Aggregate only
        # observed values before deriving the temporal features.
        sum_columns = [
            "trade_value_usd", "export_net_weight_kg", "transaction_count",
            "sanctions_present", "ofac_entity_count", "scomet_match_flag",
        ]
        mean_columns = [
            "destination_market_share_pct", "destination_gdp_growth",
            "destination_inflation", "destination_applied_tariff_rate",
            "tariff_preference_margin",
        ]
        available_sum = [column for column in sum_columns if column in corridor.columns]
        available_mean = [column for column in mean_columns if column in corridor.columns]
        yearly = corridor.groupby("year", as_index=False)[available_sum].sum()
        means = corridor.groupby("year", as_index=False)[available_mean].mean()
        yearly = yearly.merge(means, on="year", how="left").sort_values("year").reset_index(drop=True)
        if len(yearly) < sequence_length:
            return None

        eps = 1e-9
        trade_value = yearly["trade_value_usd"].fillna(0.0).clip(lower=0.0)
        net_weight = yearly["export_net_weight_kg"].fillna(0.0).clip(lower=0.0)
        tx_count = yearly["transaction_count"].fillna(0.0).clip(lower=0.0)
        unit_value = np.divide(
            trade_value.to_numpy(dtype=float),
            np.maximum(net_weight.to_numpy(dtype=float), eps),
        )
        growth = trade_value.pct_change().replace([np.inf, -np.inf], np.nan).fillna(0.0)
        tx_growth = tx_count.pct_change().replace([np.inf, -np.inf], np.nan).fillna(0.0)
        unit_series = pd.Series(unit_value, index=yearly.index)
        historical_trade_median = trade_value.shift(1).rolling(6, min_periods=1).median()
        historical_unit_median = unit_series.shift(1).rolling(6, min_periods=1).median()
        historical_unit_mean = unit_series.shift(1).rolling(6, min_periods=1).mean()
        historical_unit_std = unit_series.shift(1).rolling(6, min_periods=2).std()
        trade_std = trade_value.shift(1).rolling(6, min_periods=2).std()
        unit_std = unit_series.shift(1).rolling(6, min_periods=2).std()

        features = pd.DataFrame(index=yearly.index)
        features["log_trade_value"] = np.log1p(trade_value)
        features["log_net_weight"] = np.log1p(net_weight)
        features["log_transaction_count"] = np.log1p(tx_count)
        features["trade_growth_mom_calc"] = growth.clip(-10.0, 10.0)
        features["growth_acceleration"] = growth.diff().fillna(0.0).clip(-10.0, 10.0)
        features["tx_count_growth_mom"] = tx_growth.clip(-10.0, 10.0)
        features["trade_val_hist_ratio"] = (trade_value / (historical_trade_median + eps)).replace([np.inf, -np.inf], 0.0).fillna(1.0)
        features["trade_volatility_6m_clean"] = trade_std.fillna(0.0)
        features["unit_value_usd_per_kg"] = unit_series
        features["unit_val_growth_mom"] = unit_series.pct_change().replace([np.inf, -np.inf], np.nan).fillna(0.0).clip(-10.0, 10.0)
        features["unit_val_hist_dev"] = (unit_series - historical_unit_median).fillna(0.0)
        features["unit_val_hist_zscore"] = ((unit_series - historical_unit_mean) / (historical_unit_std + eps)).replace([np.inf, -np.inf], np.nan).fillna(0.0).clip(-10.0, 10.0)
        features["unit_val_volatility_6m_clean"] = unit_std.fillna(0.0)
        features["partner_market_share_latest"] = yearly["destination_market_share_pct"].fillna(0.0)
        features["partner_share_change_mom"] = features["partner_market_share_latest"].diff().fillna(0.0)
        features["partner_share_yoy_growth"] = features["partner_market_share_latest"].pct_change().replace([np.inf, -np.inf], np.nan).fillna(0.0).clip(-10.0, 10.0)
        features["gdp_growth_clean"] = yearly["destination_gdp_growth"].fillna(0.0)
        features["inflation_rate_clean"] = yearly["destination_inflation"].fillna(0.0)
        features["tariff_rate_clean"] = yearly["destination_applied_tariff_rate"].fillna(0.0)
        features["tariff_preference_margin_clean"] = yearly["tariff_preference_margin"].fillna(0.0)
        features["sanctions_present"] = (yearly["sanctions_present"].fillna(0.0) > 0).astype(float)
        features["ofac_entity_count"] = yearly["ofac_entity_count"].fillna(0.0)
        features["scomet_match_flag"] = (yearly["scomet_match_flag"].fillna(0.0) > 0).astype(float)
        year_delta = yearly["year"].diff().fillna(0.0).clip(lower=0.0)
        features["days_since_last_tx"] = year_delta * 365.0
        features["first_seen_flag"] = (np.arange(len(yearly)) == 0).astype(float)
        features["new_corridor_expansion"] = features["first_seen_flag"]
        prior_trade = trade_value.shift(1).fillna(0.0)
        historical_trade = trade_value.shift(2).rolling(6, min_periods=1).max().fillna(0.0)
        features["dormant_corridor_reactivation"] = ((trade_value > 0) & (prior_trade <= 0) & (historical_trade > 0)).astype(float)

        matrix = features[self.selected_features].replace([np.inf, -np.inf], np.nan).fillna(0.0).to_numpy(dtype=np.float32)
        sequence = matrix[-sequence_length:]
        if sequence.shape != (sequence_length, len(self.selected_features)):
            return None

        scaled = self.robust_scaler.transform(sequence)
        input_tensor = torch.from_numpy(np.asarray(scaled, dtype=np.float32)).unsqueeze(0)
        with torch.no_grad():
            reconstructed = self.gru_autoencoder(input_tensor).cpu().numpy()[0]
        reconstruction_error = float(np.mean((reconstructed - scaled) ** 2))

        isolation_decision = None
        if self.isolation_forest is not None:
            isolation_decision = float(self.isolation_forest.decision_function(scaled[-1:].astype(np.float64))[0])

        return {
            "status": "available",
            "model": "GRU Autoencoder",
            "model_version": "trade-risk-gru-v1.0",
            "reconstruction_error": round(reconstruction_error, 8),
            "isolation_forest_decision": round(isolation_decision, 8) if isolation_decision is not None else None,
            "sequence_years": [int(year) for year in yearly["year"].tail(sequence_length).tolist()],
            "features_used": list(self.selected_features),
        }

    def compute_risk_penalties(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Computes composite risk penalty points and risk level classifications.
        """
        df = df.copy()
        
        sanctions = df.get('sanctions_present', pd.Series(0, index=df.index)).fillna(0).values
        ofac_count = df.get('ofac_entity_count', pd.Series(0, index=df.index)).fillna(0).values
        scomet_flag = df.get('scomet_match_flag', pd.Series(0, index=df.index)).fillna(0).values
        tariff = df.get('destination_applied_tariff_rate', pd.Series(0.0, index=df.index)).fillna(0.0).values
        
        penalties = []
        risk_levels = []
        risk_flags_list = []

        for i in range(len(df)):
            pts = 0.0
            flags = []
            
            # 1. Sanctions deduction
            if sanctions[i] > 0:
                pts += self.sanctions_deduction
                flags.append("ACTIVE_TRADE_SANCTIONS")
                
            # 2. OFAC SDN penalty
            if ofac_count[i] > 0:
                ofac_pts = min(20.0, ofac_count[i] * self.ofac_scale)
                pts += ofac_pts
                flags.append(f"OFAC_SDN_LISTED ({int(ofac_count[i])} entities)")
                
            # 3. SCOMET strategic dual-use export control
            if scomet_flag[i] > 0:
                pts += self.scomet_deduction
                flags.append("DGFT_SCOMET_CONTROLLED")
                
            # 4. Prohibitive applied tariff barrier
            if tariff[i] >= self.tariff_threshold:
                pts += self.tariff_deduction
                flags.append(f"HIGH_TARIFF_BARRIER ({tariff[i]:.1f}%)")
                
            # NOTE: no GRU autoencoder reconstruction score here. The
            # checkpoint at backend/brain/models/trade_risk/gru_autoencoder.pt
            # loads (self.gru_autoencoder is not None), but this loop never
            # calls it — there is no per-corridor input sequence built for
            # it. A previous version of this method faked a "gru_risk_score"
            # as pts / 40.0 * 100.0, i.e. a rescale of the rule-based penalty
            # already computed above, with no model inference behind it.
            # That field is removed rather than shipped as fake model output.

            # Cap maximum penalty
            total_penalty = float(np.clip(pts, 0.0, self.max_penalty))
            penalties.append(total_penalty)
            
            # Classify risk level
            if total_penalty >= 25.0:
                level = "HIGH"
            elif total_penalty >= 10.0:
                level = "MEDIUM"
            else:
                level = "LOW"
                
            risk_levels.append(level)
            risk_flags_list.append("; ".join(flags) if flags else "COMPLIANT_CLEAR")
            
        df['risk_penalty'] = np.round(penalties, 2)
        df['risk_level'] = risk_levels
        df['risk_flags'] = risk_flags_list
        
        # Calculate risk-adjusted final score
        if 'opportunity_score' in df.columns:
            final_scores = np.maximum(0.0, df['opportunity_score'] - df['risk_penalty'])
            df['final_score'] = np.round(final_scores, 2)
            df['final_rank'] = df['final_score'].rank(ascending=False, method='min').astype(int)
            
        return df

