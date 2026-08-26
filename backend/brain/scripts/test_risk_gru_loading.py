import sys
import io
import os
import torch
import torch.nn as nn
import joblib
import json
import numpy as np
from pathlib import Path

# Fix Windows console encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

def main():
    risk_dir = "backend/brain/models/trade_risk"
    print("Files in risk_dir:", os.listdir(risk_dir))
    
    with open(os.path.join(risk_dir, "selected_features.json")) as f:
        features = json.load(f)
    print("Number of features:", len(features))
    
    scaler = joblib.load(os.path.join(risk_dir, "robust_scaler.joblib"))
    print("Robust scaler loaded successfully!")
    
    iso_forest = joblib.load(os.path.join(risk_dir, "isolation_forest.joblib"))
    print("Isolation forest loaded successfully!")
    
    # Check PyTorch GRU autoencoder state dict keys
    state = torch.load(os.path.join(risk_dir, "gru_autoencoder.pt"), weights_only=True)
    print("GRU Autoencoder state keys:", list(state.keys()))

if __name__ == "__main__":
    main()
