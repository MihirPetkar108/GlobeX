"""
Trade Anomaly Feature Engineering & Preprocessing Pipeline — GLOBEX Trade OS
Implements strict leakage-free temporal feature derivation, chronological splitting,
and train-only fitted transformation pipelines.
"""

import sys
from typing import Dict, List, Optional, Tuple, Any, Union
import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.preprocessing import RobustScaler, OneHotEncoder
from sklearn.impute import SimpleImputer
import joblib

# Support unpickling models saved under legacy module namespaces
sys.modules.setdefault("src.trade_anomaly.feature_pipeline", sys.modules[__name__])
sys.modules.setdefault("trade_anomaly.feature_pipeline", sys.modules[__name__])

# Target and non-feature columns that must never leak into model input matrices
TARGET_COLUMNS = ["anomaly_flag", "anomaly_type", "label_source"]
METADATA_COLUMNS = ["period", "reporter_iso3", "product_description", "quantity_unit"]

# Core behavioural and structural features
CORE_NUMERICAL_FEATURES = [
    "trade_value_usd",
    "net_weight_kg",
    "quantity",
    "transaction_count",
    "unit_value_usd_per_kg",
    "trade_growth_mom",
    "unit_value_change_mom",
    "quantity_growth_mom",
    "weight_growth_mom",
    "yoy_growth",
    "rolling_mean_3m",
    "rolling_std_3m",
    "val_to_rolling_mean_ratio",
    "val_rolling_zscore",
    "partner_share_pct",
    "partner_share_change_mom",
    "new_corridor_flag"
]

CATEGORICAL_FEATURES = [
    "trade_flow",
    "hs6",
    "partner_iso3"
]


def compute_causal_features_for_df(df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes all causal behavioural and rolling features across corridors.
    Ensures that for any observation at time t, rolling statistics use strictly t-1, t-2, t-3.
    """
    df = df.copy()
    
    # Sort strictly
    df = df.sort_values(
        by=["reporter_iso3", "partner_iso3", "hs6", "trade_flow", "period"]
    ).reset_index(drop=True)
    
    # Corridor grouping
    grp_cols = ["reporter_iso3", "partner_iso3", "hs6", "trade_flow"]
    
    # 1. Base unit value
    df["unit_value_usd_per_kg"] = np.where(
        df["net_weight_kg"] > 0,
        df["trade_value_usd"] / df["net_weight_kg"],
        0.0
    )
    
    # 2. Lagged values
    df["prev_val_1m"] = df.groupby(grp_cols)["trade_value_usd"].shift(1)
    df["prev_val_12m"] = df.groupby(grp_cols)["trade_value_usd"].shift(12)
    df["prev_uv_1m"] = df.groupby(grp_cols)["unit_value_usd_per_kg"].shift(1)
    df["prev_qty_1m"] = df.groupby(grp_cols)["quantity"].shift(1)
    df["prev_wt_1m"] = df.groupby(grp_cols)["net_weight_kg"].shift(1)
    
    # 3. Growth features (MoM)
    df["trade_growth_mom"] = np.where(
        (df["prev_val_1m"] > 0) & df["prev_val_1m"].notnull(),
        (df["trade_value_usd"] - df["prev_val_1m"]) / df["prev_val_1m"],
        0.0
    )
    
    df["unit_value_change_mom"] = np.where(
        (df["prev_uv_1m"] > 0) & df["prev_uv_1m"].notnull(),
        (df["unit_value_usd_per_kg"] - df["prev_uv_1m"]) / df["prev_uv_1m"],
        0.0
    )
    
    df["quantity_growth_mom"] = np.where(
        (df["prev_qty_1m"] > 0) & df["prev_qty_1m"].notnull(),
        (df["quantity"] - df["prev_qty_1m"]) / df["prev_qty_1m"],
        0.0
    )
    
    df["weight_growth_mom"] = np.where(
        (df["prev_wt_1m"] > 0) & df["prev_wt_1m"].notnull(),
        (df["net_weight_kg"] - df["prev_wt_1m"]) / df["prev_wt_1m"],
        0.0
    )
    
    # 4. YoY Growth
    df["yoy_growth"] = np.where(
        (df["prev_val_12m"] > 0) & df["prev_val_12m"].notnull(),
        (df["trade_value_usd"] - df["prev_val_12m"]) / df["prev_val_12m"],
        df["trade_growth_mom"]
    )
    
    # 5. Causal Rolling 3-Month Window (Using shift(1) so time t does not leak into rolling baseline)
    # rolling window on shift(1) means mean(t-1, t-2, t-3)
    df["rolling_mean_3m"] = df.groupby(grp_cols)["trade_value_usd"].transform(
        lambda s: s.shift(1).rolling(window=3, min_periods=1).mean()
    )
    # Fallback to current value if no history exists yet
    df["rolling_mean_3m"] = df["rolling_mean_3m"].fillna(df["trade_value_usd"])
    
    df["rolling_std_3m"] = df.groupby(grp_cols)["trade_value_usd"].transform(
        lambda s: s.shift(1).rolling(window=3, min_periods=2).std()
    ).fillna(0.0)
    
    # 6. Deviation from baseline
    df["val_to_rolling_mean_ratio"] = np.where(
        df["rolling_mean_3m"] > 0,
        df["trade_value_usd"] / df["rolling_mean_3m"],
        1.0
    )
    
    df["val_rolling_zscore"] = np.where(
        df["rolling_std_3m"] > 0,
        (df["trade_value_usd"] - df["rolling_mean_3m"]) / df["rolling_std_3m"],
        0.0
    )
    
    # 7. Global partner share per product-flow-period
    tot_product_flow = df.groupby(["period", "hs6", "trade_flow"])["trade_value_usd"].transform("sum")
    df["partner_share_pct"] = np.where(
        tot_product_flow > 0,
        df["trade_value_usd"] / tot_product_flow,
        0.0
    )
    
    df["prev_share_1m"] = df.groupby(grp_cols)["partner_share_pct"].shift(1)
    df["partner_share_change_mom"] = df["partner_share_pct"] - df["prev_share_1m"].fillna(df["partner_share_pct"])
    
    # 8. Corridor maturity / new corridor flag
    cum_obs = df.groupby(grp_cols).cumcount() + 1
    df["new_corridor_flag"] = np.where(cum_obs <= 2, 1, 0)
    
    # Clean up temporary helper columns
    drop_helpers = ["prev_val_1m", "prev_val_12m", "prev_uv_1m", "prev_qty_1m", "prev_wt_1m", "prev_share_1m"]
    df = df.drop(columns=[c for c in drop_helpers if c in df.columns])
    
    return df


def create_chronological_splits(
    df: pd.DataFrame,
    train_end_period: int = 202406,
    val_end_period: int = 202412
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Partitions the dataset into 3 chronological splits without any temporal shuffling:
    - Train: period <= train_end_period (e.g. 202201 - 202406, 30 months ~ 62.5%)
    - Validation: train_end_period < period <= val_end_period (e.g. 202407 - 202412, 6 months ~ 12.5%)
    - Test: period > val_end_period (e.g. 202501 - 202512, 12 months ~ 25.0%)
    """
    train_df = df[df["period"] <= train_end_period].copy().reset_index(drop=True)
    val_df = df[(df["period"] > train_end_period) & (df["period"] <= val_end_period)].copy().reset_index(drop=True)
    test_df = df[df["period"] > val_end_period].copy().reset_index(drop=True)
    
    return train_df, val_df, test_df


class TradeAnomalyPreprocessor(BaseEstimator, TransformerMixin):
    """
    Encapsulates all imputation, one-hot encoding, and robust scaling transformations.
    Strictly fit only on the training set to prevent data leakage.
    """
    
    def __init__(
        self,
        numerical_features: Optional[List[str]] = None,
        categorical_features: Optional[List[str]] = None
    ):
        self.numerical_features = numerical_features or CORE_NUMERICAL_FEATURES
        self.categorical_features = categorical_features or CATEGORICAL_FEATURES
        
        self.num_imputer = SimpleImputer(strategy="median")
        self.scaler = RobustScaler(unit_variance=True)
        self.encoder = OneHotEncoder(handle_unknown="ignore", sparse_output=False)
        self.fitted_ = False
        self.feature_names_out_: List[str] = []
        
    def fit(self, X: pd.DataFrame, y=None):
        X_df = X.copy()
        
        # 1. Fit Imputer & Scaler on numerical features
        num_data = X_df[self.numerical_features]
        imputed_num = self.num_imputer.fit_transform(num_data)
        self.scaler.fit(imputed_num)
        
        # 2. Fit OneHotEncoder on categorical features
        cat_data = X_df[self.categorical_features].astype(str)
        self.encoder.fit(cat_data)
        
        # 3. Cache output feature names
        cat_names = list(self.encoder.get_feature_names_out(self.categorical_features))
        self.feature_names_out_ = self.numerical_features + cat_names
        self.fitted_ = True
        return self
        
    def transform(self, X: pd.DataFrame) -> np.ndarray:
        if not self.fitted_:
            raise ValueError("TradeAnomalyPreprocessor must be fitted before transforming data.")
            
        X_df = X.copy()
        
        # Numerical transformation
        num_data = X_df[self.numerical_features]
        imputed_num = self.num_imputer.transform(num_data)
        scaled_num = self.scaler.transform(imputed_num)
        
        # Categorical transformation
        cat_data = X_df[self.categorical_features].astype(str)
        encoded_cat = self.encoder.transform(cat_data)
        
        # Concatenate horizontally
        return np.hstack([scaled_num, encoded_cat])
        
    def get_feature_names(self) -> List[str]:
        return self.feature_names_out_
        
    def save(self, filepath: str):
        joblib.dump(self, filepath)
        
    @classmethod
    def load(cls, filepath: str) -> "TradeAnomalyPreprocessor":
        return joblib.load(filepath)
