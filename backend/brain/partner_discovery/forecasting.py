import os
import json
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple, Optional, List

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import TensorDataset, DataLoader
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

def calculate_mape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Calculates Mean Absolute Percentage Error with numerical stability."""
    mask = y_true > 0
    if not np.any(mask):
        return 0.0
    return float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100.0)

def calculate_directional_accuracy(y_true: np.ndarray, y_pred: np.ndarray, y_prev: np.ndarray) -> float:
    """Calculates the percentage of correct trade direction calls (up/down)."""
    true_dir = np.sign(y_true - y_prev)
    pred_dir = np.sign(y_pred - y_prev)
    matches = (true_dir == pred_dir)
    return float(np.mean(matches) * 100.0) if len(matches) > 0 else 0.0

class GRUMultiOutputForecaster(nn.Module):
    """
    Shared-Encoder Dual-Head Recurrent Neural Network (GRU)
    Head 1: Log-demand volume forecast (transformed back to Net Weight kg)
    Head 2: Expected FOB Unit Price forecast (USD/kg)
    """
    def __init__(self, input_dim: int = 12, hidden_dim: int = 64, num_layers: int = 2, dropout: float = 0.15):
        super().__init__()
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        
        self.gru = nn.GRU(
            input_size=input_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0.0
        )
        
        # Head 1: Demand Volume (kg in log space)
        self.demand_head = nn.Sequential(
            nn.Linear(hidden_dim, 32),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(32, 1)
        )
        
        # Head 2: FOB Unit Price (USD/kg)
        self.price_head = nn.Sequential(
            nn.Linear(hidden_dim, 32),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(32, 1)
        )

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        gru_out, _ = self.gru(x)
        last_step = gru_out[:, -1, :]
        log_demand_pred = self.demand_head(last_step).squeeze(-1)
        price_pred = torch.relu(self.price_head(last_step).squeeze(-1))
        return log_demand_pred, price_pred

class PartnerForecastingPipeline:
    """
    Manages data scaling, training, evaluation, persistence, and inference
    for the dual-head GRU and baseline benchmark suite.
    """
    def __init__(self, input_dim: int = 12, hidden_dim: int = 64, num_layers: int = 2, lr: float = 0.003):
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        self.lr = lr
        self.model = GRUMultiOutputForecaster(input_dim, hidden_dim, num_layers)
        self.feature_means = None
        self.feature_stds = None
        self.target_stats = {}

    def fit_scaler(self, train_X: np.ndarray):
        flat_x = train_X.reshape(-1, train_X.shape[-1])
        self.feature_means = np.mean(flat_x, axis=0)
        self.feature_stds = np.std(flat_x, axis=0) + 1e-6

    def transform_x(self, X: np.ndarray) -> np.ndarray:
        if self.feature_means is None:
            return X
        return (X - self.feature_means) / self.feature_stds

    def train_gru(
        self,
        train_X: np.ndarray,
        train_y_demand: np.ndarray,
        train_y_price: np.ndarray,
        val_X: np.ndarray,
        val_y_demand: np.ndarray,
        val_y_price: np.ndarray,
        epochs: int = 70,
        batch_size: int = 32,
        patience: int = 15
    ) -> Dict[str, Any]:
        """Trains the PyTorch dual-head GRU with early stopping."""
        self.fit_scaler(train_X)
        norm_train_X = self.transform_x(train_X)
        norm_val_X = self.transform_x(val_X)
        
        train_log_demand = np.log1p(np.maximum(0.0, train_y_demand))
        val_log_demand = np.log1p(np.maximum(0.0, val_y_demand))
        
        t_X = torch.tensor(norm_train_X, dtype=torch.float32)
        t_yd = torch.tensor(train_log_demand, dtype=torch.float32)
        t_yp = torch.tensor(train_y_price, dtype=torch.float32)
        
        v_X = torch.tensor(norm_val_X, dtype=torch.float32)
        v_yd = torch.tensor(val_log_demand, dtype=torch.float32)
        v_yp = torch.tensor(val_y_price, dtype=torch.float32)
        
        dataset = TensorDataset(t_X, t_yd, t_yp)
        loader = DataLoader(dataset, batch_size=batch_size, shuffle=True)
        
        optimizer = optim.AdamW(self.model.parameters(), lr=self.lr, weight_decay=1e-4)
        criterion = nn.SmoothL1Loss()
        
        best_val_loss = float('inf')
        best_state = None
        patience_counter = 0
        history = []
        
        self.model.train()
        for epoch in range(epochs):
            total_loss = 0.0
            for bx, byd, byp in loader:
                optimizer.zero_grad()
                pred_d, pred_p = self.model(bx)
                loss_d = criterion(pred_d, byd)
                loss_p = criterion(pred_p, byp)
                loss = 0.60 * loss_d + 0.40 * loss_p
                loss.backward()
                optimizer.step()
                total_loss += loss.item() * len(bx)
                
            train_loss = total_loss / len(train_X)
            
            # Validation
            self.model.eval()
            with torch.no_grad():
                val_pred_d, val_pred_p = self.model(v_X)
                v_loss_d = criterion(val_pred_d, v_yd)
                v_loss_p = criterion(val_pred_p, v_yp)
                val_loss = (0.60 * v_loss_d + 0.40 * v_loss_p).item()
            self.model.train()
            
            history.append({'epoch': epoch + 1, 'train_loss': train_loss, 'val_loss': val_loss})
            
            if val_loss < best_val_loss:
                best_val_loss = val_loss
                best_state = self.model.state_dict().copy()
                patience_counter = 0
            else:
                patience_counter += 1
                if patience_counter >= patience:
                    break
                    
        if best_state is not None:
            self.model.load_state_dict(best_state)
            
        return {
            'best_val_loss': best_val_loss,
            'epochs_trained': len(history),
            'history': history
        }

    def predict(self, X: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """Runs inference and transforms log demand back to kilograms."""
        self.model.eval()
        norm_X = self.transform_x(X)
        t_X = torch.tensor(norm_X, dtype=torch.float32)
        with torch.no_grad():
            log_d, p = self.model(t_X)
            pred_demand_kg = np.expm1(np.maximum(0.0, log_d.numpy()))
            pred_price = np.maximum(0.01, p.numpy())
        return pred_demand_kg, pred_price

    def save(self, model_dir: str = "models/partner_forecasting"):
        os.makedirs(model_dir, exist_ok=True)
        torch.save(self.model.state_dict(), os.path.join(model_dir, "gru_multi_output.pt"))
        joblib.dump({
            'feature_means': self.feature_means,
            'feature_stds': self.feature_stds,
            'input_dim': self.input_dim,
            'hidden_dim': self.hidden_dim,
            'num_layers': self.num_layers
        }, os.path.join(model_dir, "gru_scaler_metadata.joblib"))

    def load(self, model_dir: str = "models/partner_forecasting"):
        meta = joblib.load(os.path.join(model_dir, "gru_scaler_metadata.joblib"))
        self.feature_means = meta['feature_means']
        self.feature_stds = meta['feature_stds']
        self.input_dim = meta['input_dim']
        self.hidden_dim = meta['hidden_dim']
        self.num_layers = meta['num_layers']
        self.model = GRUMultiOutputForecaster(self.input_dim, self.hidden_dim, self.num_layers)
        self.model.load_state_dict(torch.load(os.path.join(model_dir, "gru_multi_output.pt"), weights_only=True))
        self.model.eval()

def train_and_evaluate_forecasting_models(
    seq_data: Dict[str, Any],
    output_dir: str = "models/partner_forecasting"
) -> pd.DataFrame:
    """
    Trains and benchmarks all 5 candidate models on chronological holdout:
    1. Naive (Last Value)
    2. Moving Average (3-Year)
    3. Ridge Regression (Tabular Lags)
    4. Random Forest (Tabular Lags)
    5. Dual-Head GRU
    """
    os.makedirs(output_dir, exist_ok=True)
    
    train_X = seq_data['train']['X']
    train_yd = seq_data['train']['y_demand']
    train_yp = seq_data['train']['y_price']
    
    val_X = seq_data['val']['X']
    val_yd = seq_data['val']['y_demand']
    val_yp = seq_data['val']['y_price']
    
    test_X = seq_data['test']['X']
    test_yd = seq_data['test']['y_demand']
    test_yp = seq_data['test']['y_price']
    
    # 1. Naive Last Value Baseline
    # Feature 1 is log_export_net_weight, feature 2 is fob_unit_value
    naive_pred_d = np.expm1(test_X[:, -1, 1])
    naive_pred_p = test_X[:, -1, 2]
    
    # 2. Moving Average 3Y Baseline
    ma_pred_d = np.mean(np.expm1(test_X[:, -3:, 1]), axis=1)
    ma_pred_p = np.mean(test_X[:, -3:, 2], axis=1)
    
    # Tabular flattening for Ridge & RF
    flat_train_X = train_X.reshape(len(train_X), -1)
    flat_test_X = test_X.reshape(len(test_X), -1)
    
    # 3. Ridge Regression
    ridge_d = Ridge(alpha=10.0).fit(flat_train_X, np.log1p(train_yd))
    ridge_p = Ridge(alpha=10.0).fit(flat_train_X, train_yp)
    ridge_pred_d = np.expm1(np.maximum(0.0, ridge_d.predict(flat_test_X)))
    ridge_pred_p = np.maximum(0.01, ridge_p.predict(flat_test_X))
    
    # 4. Random Forest
    rf_d = RandomForestRegressor(n_estimators=50, max_depth=8, random_state=42, n_jobs=-1).fit(flat_train_X, np.log1p(train_yd))
    rf_p = RandomForestRegressor(n_estimators=50, max_depth=8, random_state=42, n_jobs=-1).fit(flat_train_X, train_yp)
    rf_pred_d = np.expm1(np.maximum(0.0, rf_d.predict(flat_test_X)))
    rf_pred_p = np.maximum(0.01, rf_p.predict(flat_test_X))
    
    # 5. Dual-Head GRU
    pipeline = PartnerForecastingPipeline(input_dim=train_X.shape[-1], hidden_dim=64, num_layers=2, lr=0.003)
    train_res = pipeline.train_gru(train_X, train_yd, train_yp, val_X, val_yd, val_yp, epochs=70, batch_size=32)
    gru_pred_d, gru_pred_p = pipeline.predict(test_X)
    
    # Save winning GRU pipeline
    pipeline.save(output_dir)
    
    # Build benchmark results table
    prev_d = np.expm1(test_X[:, -1, 1])
    prev_p = test_X[:, -1, 2]
    
    models = [
        ('Naive (Last Value)', naive_pred_d, naive_pred_p),
        ('Moving Average (3-Year)', ma_pred_d, ma_pred_p),
        ('Ridge Regression', ridge_pred_d, ridge_pred_p),
        ('Random Forest Regressor', rf_pred_d, rf_pred_p),
        ('Dual-Head GRU (Deep Learning)', gru_pred_d, gru_pred_p)
    ]
    
    results = []
    for name, pred_d, pred_p in models:
        d_mae = mean_absolute_error(test_yd, pred_d)
        d_rmse = np.sqrt(mean_squared_error(test_yd, pred_d))
        d_mape = calculate_mape(test_yd, pred_d)
        d_dir_acc = calculate_directional_accuracy(test_yd, pred_d, prev_d)
        d_r2 = r2_score(test_yd, pred_d)
        
        p_mae = mean_absolute_error(test_yp, pred_p)
        p_rmse = np.sqrt(mean_squared_error(test_yp, pred_p))
        p_mape = calculate_mape(test_yp, pred_p)
        p_dir_acc = calculate_directional_accuracy(test_yp, pred_p, prev_p)
        p_r2 = r2_score(test_yp, pred_p)
        
        composite_mae = 0.60 * (d_mae / np.mean(test_yd)) + 0.40 * (p_mae / np.mean(test_yp))
        
        results.append({
            'Model': name,
            'Demand_MAE_kg': round(d_mae, 1),
            'Demand_RMSE_kg': round(d_rmse, 1),
            'Demand_MAPE_pct': round(d_mape, 2),
            'Demand_Dir_Acc_pct': round(d_dir_acc, 1),
            'Demand_R2': round(d_r2, 4),
            'Price_MAE_usd': round(p_mae, 3),
            'Price_RMSE_usd': round(p_rmse, 3),
            'Price_MAPE_pct': round(p_mape, 2),
            'Price_Dir_Acc_pct': round(p_dir_acc, 1),
            'Price_R2': round(p_r2, 4),
            'Normalized_Composite_Error': round(composite_mae, 4)
        })
        
    df_results = pd.DataFrame(results).sort_values('Normalized_Composite_Error').reset_index(drop=True)
    df_results.to_csv(os.path.join(output_dir, "benchmark_comparison.csv"), index=False)
    
    return df_results

