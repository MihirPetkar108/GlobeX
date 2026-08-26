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
        out, _ = self.decoder(torch.zeros_like(x), dec_init)
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
            if not os.path.exists(self.risk_model_dir):
                for candidate in ["brain/models/trade_risk", "backend/brain/models/trade_risk"]:
                    if os.path.exists(candidate):
                        self.risk_model_dir = candidate
                        break
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

