import sys
import io
import os
import torch
import numpy as np
import pandas as pd
from pathlib import Path

# Fix Windows console encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from brain.models.partner_discovery.data import PartnerDataLoader
from brain.models.partner_discovery.features import PartnerFeatureEngineer
from brain.models.partner_discovery.forecasting import PartnerForecastingPipeline

def main():
    loader = PartnerDataLoader(data_dir="backend/brain_temporary/data")
    df_panel = loader.load_data(direction="EXPORT", canonical_slice=False, hs6=100630, exclude_wld=True)
    
    engineer = PartnerFeatureEngineer(sequence_length=5)
    df_feat = engineer.engineer_base_features(df_panel)
    
    model_dir = "backend/brain_temporary/models/partner_discovery/forecasting"
    gru_pipeline = PartnerForecastingPipeline(input_dim=len(engineer.feature_columns), hidden_dim=64, num_layers=2)
    gru_pipeline.load(model_dir)
    
    print("Feature columns:", engineer.feature_columns)
    print("Feature means in scaler:", gru_pipeline.feature_means)
    print("Feature stds in scaler:", gru_pipeline.feature_stds)
    
    for c_iso3 in ['GBR', 'JPN', 'ARE', 'USA', 'SAU']:
        sub = df_feat[df_feat['importer_iso3'] == c_iso3].sort_values('year')
        if len(sub) >= 5:
            seq_x = sub[engineer.feature_columns].values[-5:]
            inp = np.expand_dims(seq_x, axis=0)
            pred_d, pred_p = gru_pipeline.predict(inp)
            
            # Also get actual historical average of last 3 years
            recent_d_actual = sub['export_net_weight_kg'].values[-3:]
            recent_p_actual = sub['fob_unit_value_usd_per_kg'].values[-3:]
            
            print(f"\n--- Country {c_iso3} ---")
            print(f"GRU Raw Prediction: Demand = {pred_d[0]:.1f} kg ({pred_d[0]/1000:.1f} MT), Price = ${pred_p[0]:.4f}/kg")
            print(f"Actual History (Last 3 Years): Demand Avg = {np.mean(recent_d_actual)/1000:.1f} MT, Price Avg = ${np.mean(recent_p_actual):.2f}/kg")

if __name__ == "__main__":
    main()
