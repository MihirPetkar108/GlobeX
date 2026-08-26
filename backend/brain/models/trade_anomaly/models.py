"""
Trade Anomaly Model Architectures & Training Framework — GLOBEX Trade OS
Implements 6 distinct model families:
1. Isolation Forest (Unsupervised Classical Baseline)
2. XGBoost Classifier (Supervised Tabular Baseline)
3. MLP Autoencoder (Neural Reconstruction Baseline)
4. GRU Autoencoder (Recurrent Sequence Autoencoder)
5. TCN Autoencoder (Temporal Convolutional Network)
6. Small Transformer Autoencoder (Self-Attention Sequence Autoencoder)
"""

import math
from typing import Dict, List, Optional, Tuple, Any, Union
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import TensorDataset, DataLoader
from sklearn.ensemble import IsolationForest
import xgboost as xgb
import joblib


# ==========================================
# 1. ISOLATION FOREST BASELINE
# ==========================================
class IsolationForestAnomalyModel:
    """
    Unsupervised classical anomaly detection baseline.
    Uses path length in random partition trees to isolate anomalies.
    """
    
    def __init__(self, n_estimators: int = 150, contamination: float = 0.08, random_state: int = 42):
        self.n_estimators = n_estimators
        self.contamination = contamination
        self.random_state = random_state
        self.model = IsolationForest(
            n_estimators=self.n_estimators,
            contamination=self.contamination,
            random_state=self.random_state,
            n_jobs=-1
        )
        
    def fit(self, X: np.ndarray):
        self.model.fit(X)
        return self
        
    def predict_score(self, X: np.ndarray) -> np.ndarray:
        """
        Computes anomaly score in [0, 1] where 1 is highly anomalous.
        Inverts decision_function: lower decision_function -> higher anomaly score.
        """
        raw_scores = self.model.decision_function(X)
        # Shift and scale raw scores so lower values map to higher anomaly probability
        # raw_scores typically range in [-0.5, 0.5]
        anomaly_scores = 1.0 / (1.0 + np.exp(raw_scores * 5.0))
        return anomaly_scores
        
    def save(self, filepath: str):
        joblib.dump(self, filepath)
        
    @classmethod
    def load(cls, filepath: str) -> "IsolationForestAnomalyModel":
        return joblib.load(filepath)


# ==========================================
# 2. XGBOOST SUPERVISED BASELINE
# ==========================================
class XGBoostAnomalyModel:
    """
    Strong gradient-boosted tabular baseline trained on heuristic anomaly flags.
    Handles severe class imbalance via scale_pos_weight.
    """
    
    def __init__(
        self,
        n_estimators: int = 200,
        learning_rate: float = 0.05,
        max_depth: int = 5,
        scale_pos_weight: float = 9.0,
        subsample: float = 0.8,
        colsample_bytree: float = 0.8,
        reg_alpha: float = 0.1,
        reg_lambda: float = 1.0,
        random_state: int = 42
    ):
        self.params = {
            "n_estimators": n_estimators,
            "learning_rate": learning_rate,
            "max_depth": max_depth,
            "scale_pos_weight": scale_pos_weight,
            "subsample": subsample,
            "colsample_bytree": colsample_bytree,
            "reg_alpha": reg_alpha,
            "reg_lambda": reg_lambda,
            "random_state": random_state,
            "eval_metric": "logloss",
            "n_jobs": -1
        }
        self.model = xgb.XGBClassifier(**self.params)
        
    def fit(self, X: np.ndarray, y: np.ndarray, eval_set: Optional[List[Tuple[np.ndarray, np.ndarray]]] = None):
        self.model.fit(X, y, eval_set=eval_set, verbose=False)
        return self
        
    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        return self.model.predict_proba(X)[:, 1]
        
    def predict(self, X: np.ndarray, threshold: float = 0.5) -> np.ndarray:
        return (self.predict_proba(X) >= threshold).astype(int)
        
    def save(self, filepath: str):
        joblib.dump(self, filepath)
        
    @classmethod
    def load(cls, filepath: str) -> "XGBoostAnomalyModel":
        return joblib.load(filepath)


# ==========================================
# 3. MLP AUTOENCODER
# ==========================================
class PyTorchMLPAutoencoder(nn.Module):
    def __init__(self, input_dim: int, hidden_dim: int = 32, bottleneck_dim: int = 8, dropout: float = 0.1):
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, bottleneck_dim),
            nn.GELU()
        )
        self.decoder = nn.Sequential(
            nn.Linear(bottleneck_dim, hidden_dim),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, input_dim)
        )
        
    def forward(self, x):
        z = self.encoder(x)
        x_rec = self.decoder(z)
        return x_rec


# ==========================================
# 4. GRU AUTOENCODER
# ==========================================
class PyTorchGRUAutoencoder(nn.Module):
    def __init__(self, input_dim: int, hidden_dim: int = 32, bottleneck_dim: int = 8, num_layers: int = 1, dropout: float = 0.1):
        super().__init__()
        self.hidden_dim = hidden_dim
        self.bottleneck_dim = bottleneck_dim
        self.num_layers = num_layers
        
        self.encoder_gru = nn.GRU(
            input_size=input_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0.0
        )
        self.fc_bottleneck = nn.Linear(hidden_dim, bottleneck_dim)
        self.fc_expand = nn.Linear(bottleneck_dim, hidden_dim)
        
        self.decoder_gru = nn.GRU(
            input_size=hidden_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0.0
        )
        self.fc_out = nn.Linear(hidden_dim, input_dim)
        
    def forward(self, x):
        # x shape: (B, T, D)
        B, T, D = x.shape
        _, h_n = self.encoder_gru(x) # h_n: (num_layers, B, hidden_dim)
        last_hidden = h_n[-1] # (B, hidden_dim)
        
        bottleneck = self.fc_bottleneck(last_hidden) # (B, bottleneck_dim)
        expanded = self.fc_expand(bottleneck) # (B, hidden_dim)
        
        # Repeat vector along sequence dimension
        repeated = expanded.unsqueeze(1).repeat(1, T, 1) # (B, T, hidden_dim)
        dec_out, _ = self.decoder_gru(repeated)
        x_rec = self.fc_out(dec_out) # (B, T, D)
        return x_rec


# ==========================================
# 5. TCN (TEMPORAL CONVOLUTIONAL) AUTOENCODER
# ==========================================
class ChausalConv1d(nn.Module):
    def __init__(self, in_channels: int, out_channels: int, kernel_size: int = 3, dilation: int = 1):
        super().__init__()
        self.pad = (kernel_size - 1) * dilation
        self.conv = nn.Conv1d(in_channels, out_channels, kernel_size=kernel_size, dilation=dilation)
        
    def forward(self, x):
        # x shape: (B, C, T)
        x_padded = nn.functional.pad(x, (self.pad, 0))
        return self.conv(x_padded)


class PyTorchTCNAutoencoder(nn.Module):
    def __init__(self, input_dim: int, num_filters: int = 32, bottleneck_dim: int = 8, kernel_size: int = 3, dropout: float = 0.1):
        super().__init__()
        self.conv1 = ChausalConv1d(input_dim, num_filters, kernel_size=kernel_size, dilation=1)
        self.relu1 = nn.GELU()
        self.drop1 = nn.Dropout(dropout)
        
        self.conv2 = ChausalConv1d(num_filters, num_filters, kernel_size=kernel_size, dilation=2)
        self.relu2 = nn.GELU()
        self.drop2 = nn.Dropout(dropout)
        
        self.to_bottleneck = nn.Linear(num_filters, bottleneck_dim)
        self.from_bottleneck = nn.Linear(bottleneck_dim, num_filters)
        
        self.deconv1 = ChausalConv1d(num_filters, num_filters, kernel_size=kernel_size, dilation=1)
        self.deconv2 = ChausalConv1d(num_filters, input_dim, kernel_size=kernel_size, dilation=1)
        
    def forward(self, x):
        # x: (B, T, D) -> transpose to (B, D, T) for Conv1d
        B, T, D = x.shape
        x_t = x.transpose(1, 2)
        
        out = self.drop1(self.relu1(self.conv1(x_t)))
        out = self.drop2(self.relu2(self.conv2(out))) # (B, num_filters, T)
        
        # Bottleneck across channels
        out_trans = out.transpose(1, 2) # (B, T, num_filters)
        bottleneck = self.to_bottleneck(out_trans) # (B, T, bottleneck_dim)
        expanded = self.from_bottleneck(bottleneck).transpose(1, 2) # (B, num_filters, T)
        
        dec_out = self.relu1(self.deconv1(expanded))
        x_rec = self.deconv2(dec_out).transpose(1, 2) # (B, T, D)
        return x_rec


# ==========================================
# 6. SMALL TRANSFORMER AUTOENCODER
# ==========================================
class PositionalEncoding(nn.Module):
    def __init__(self, d_model: int, max_len: int = 100):
        super().__init__()
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model))
        pe[:, 0::2] = torch.sin(position * div_term)
        if d_model % 2 == 1:
            pe[:, 1::2] = torch.cos(position * div_term[:-1])
        else:
            pe[:, 1::2] = torch.cos(position * div_term)
        self.register_buffer('pe', pe.unsqueeze(0))
        
    def forward(self, x):
        return x + self.pe[:, :x.size(1), :]


class PyTorchTransformerAutoencoder(nn.Module):
    def __init__(self, input_dim: int, d_model: int = 32, nhead: int = 4, num_layers: int = 1, dim_feedforward: int = 64, dropout: float = 0.1):
        super().__init__()
        self.input_proj = nn.Linear(input_dim, d_model)
        self.pos_encoder = PositionalEncoding(d_model)
        
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=nhead,
            dim_feedforward=dim_feedforward,
            dropout=dropout,
            batch_first=True
        )
        self.transformer_encoder = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
        self.output_proj = nn.Linear(d_model, input_dim)
        
    def forward(self, x):
        # x: (B, T, D)
        x_proj = self.input_proj(x)
        x_pos = self.pos_encoder(x_proj)
        encoded = self.transformer_encoder(x_pos)
        x_rec = self.output_proj(encoded)
        return x_rec


# ==========================================
# SEQUENCE BUILDING UTILITIES
# ==========================================
def build_corridor_sequences(
    df: pd.DataFrame,
    feature_matrix: np.ndarray,
    seq_length: int = 6
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, pd.DataFrame]:
    """
    Constructs fixed-length sliding window sequences per corridor.
    
    Returns:
    - X_seq: (N_seq, seq_length, num_features)
    - y_seq: (N_seq,) binary anomaly label of the current (last) timestep
    - y_type_seq: (N_seq,) semantic anomaly type string of the current timestep
    - meta_seq: DataFrame with period, corridor metadata of the current timestep
    """
    df = df.copy().reset_index(drop=True)
    grp_cols = ["reporter_iso3", "partner_iso3", "hs6", "trade_flow"]
    
    seq_list = []
    y_list = []
    y_type_list = []
    meta_list = []
    
    # Iterate through each corridor series
    for _, grp_idx in df.groupby(grp_cols).groups.items():
        indices = list(grp_idx)
        if len(indices) < seq_length:
            continue
        
        # Sliding window
        for i in range(len(indices) - seq_length + 1):
            window_indices = indices[i : i + seq_length]
            target_idx = window_indices[-1]
            
            seq_features = feature_matrix[window_indices]
            seq_list.append(seq_features)
            y_list.append(df.loc[target_idx, "anomaly_flag"])
            y_type_list.append(df.loc[target_idx, "anomaly_type"])
            meta_list.append(df.loc[target_idx])
            
    X_seq = np.array(seq_list, dtype=np.float32)
    y_seq = np.array(y_list, dtype=np.int64)
    y_type_seq = np.array(y_type_list, dtype=object)
    meta_df = pd.DataFrame(meta_list).reset_index(drop=True)
    
    return X_seq, y_seq, y_type_seq, meta_df


def train_neural_autoencoder(
    model: nn.Module,
    train_loader: DataLoader,
    val_loader: Optional[DataLoader] = None,
    epochs: int = 30,
    lr: float = 1e-3,
    weight_decay: float = 1e-5,
    patience: int = 7,
    device: str = "cpu"
) -> Dict[str, List[float]]:
    """
    Trains a PyTorch autoencoder model with Adam optimizer, MSE loss, and early stopping.
    """
    model.to(device)
    optimizer = optim.AdamW(model.parameters(), lr=lr, weight_decay=weight_decay)
    criterion = nn.MSELoss()
    
    history = {"train_loss": [], "val_loss": []}
    best_val_loss = float("inf")
    patience_counter = 0
    best_weights = None
    
    for epoch in range(epochs):
        model.train()
        running_train_loss = 0.0
        for batch in train_loader:
            x_batch = batch[0].to(device)
            optimizer.zero_grad()
            x_rec = model(x_batch)
            loss = criterion(x_rec, x_batch)
            loss.backward()
            optimizer.step()
            running_train_loss += loss.item() * len(x_batch)
            
        epoch_train_loss = running_train_loss / len(train_loader.dataset)
        history["train_loss"].append(epoch_train_loss)
        
        if val_loader:
            model.eval()
            running_val_loss = 0.0
            with torch.no_grad():
                for batch in val_loader:
                    x_val = batch[0].to(device)
                    x_rec = model(x_val)
                    loss = criterion(x_rec, x_val)
                    running_val_loss += loss.item() * len(x_val)
            epoch_val_loss = running_val_loss / len(val_loader.dataset)
            history["val_loss"].append(epoch_val_loss)
            
            if epoch_val_loss < best_val_loss:
                best_val_loss = epoch_val_loss
                patience_counter = 0
                best_weights = {k: v.cpu().clone() for k, v in model.state_dict().items()}
            else:
                patience_counter += 1
                if patience_counter >= patience:
                    break
        else:
            best_weights = {k: v.cpu().clone() for k, v in model.state_dict().items()}
            
    if best_weights:
        model.load_state_dict(best_weights)
        
    return history


def compute_reconstruction_errors(model: nn.Module, data: np.ndarray, is_sequential: bool = False, device: str = "cpu") -> np.ndarray:
    """
    Computes sample-level Mean Squared Reconstruction Error.
    For sequential inputs (B, T, D), computes the error at the latest timestep (T-1).
    """
    model.eval()
    model.to(device)
    tensor_data = torch.tensor(data, dtype=torch.float32).to(device)
    
    with torch.no_grad():
        rec_data = model(tensor_data)
        if is_sequential:
            # Error specifically on the latest observation in the sequence
            diff = tensor_data[:, -1, :] - rec_data[:, -1, :]
        else:
            diff = tensor_data - rec_data
            
        mse = torch.mean(diff ** 2, dim=-1).cpu().numpy()
    return mse
