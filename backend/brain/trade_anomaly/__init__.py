"""
Trade Anomaly Detection Module — GLOBEX Trade OS
"""

from src.trade_anomaly.data_loader import (
    validate_and_convert_csv_to_parquet,
    load_trade_anomaly_data,
    get_corridor_history,
    get_dataset_coverage
)
from src.trade_anomaly.feature_pipeline import (
    TradeAnomalyPreprocessor,
    compute_causal_features_for_df,
    create_chronological_splits,
    CORE_NUMERICAL_FEATURES,
    CATEGORICAL_FEATURES
)
from src.trade_anomaly.models import (
    IsolationForestAnomalyModel,
    XGBoostAnomalyModel,
    PyTorchMLPAutoencoder,
    PyTorchGRUAutoencoder,
    PyTorchTCNAutoencoder,
    PyTorchTransformerAutoencoder,
    build_corridor_sequences,
    train_neural_autoencoder,
    compute_reconstruction_errors
)
from src.trade_anomaly.inference import TradeAnomalyInferenceService
from src.trade_anomaly.api import router as trade_anomaly_router

__all__ = [
    "validate_and_convert_csv_to_parquet",
    "load_trade_anomaly_data",
    "get_corridor_history",
    "get_dataset_coverage",
    "TradeAnomalyPreprocessor",
    "compute_causal_features_for_df",
    "create_chronological_splits",
    "CORE_NUMERICAL_FEATURES",
    "CATEGORICAL_FEATURES",
    "IsolationForestAnomalyModel",
    "XGBoostAnomalyModel",
    "PyTorchMLPAutoencoder",
    "PyTorchGRUAutoencoder",
    "PyTorchTCNAutoencoder",
    "PyTorchTransformerAutoencoder",
    "build_corridor_sequences",
    "train_neural_autoencoder",
    "compute_reconstruction_errors",
    "TradeAnomalyInferenceService",
    "trade_anomaly_router"
]
