import sys
import io
import pandas as pd
import numpy as np
from pathlib import Path

# Fix Windows console encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from brain.models.partner_discovery.data import PartnerDataLoader
from brain.models.partner_discovery.ranking import OpportunityRankingEngine
from brain.models.partner_discovery.risk_integration import TradeRiskIntegrator

def run_test(weights=None):
    loader = PartnerDataLoader(data_dir="backend/brain_temporary/data")
    
    test_products = [
        ("Basmati Rice", 100630),
        ("Black Pepper", 90411),
        ("Cotton Yarn", 520512),
        ("Shrimp", 30617),
        ("Coffee", 90121),
        ("Diamonds", 710239)
    ]
    
    for prod_name, hs in test_products:
        df_panel = loader.load_data(direction="EXPORT", hs6=hs, exclude_wld=True)
        
        # Deduplicate latest year per country
        max_year = df_panel['year'].max()
        df_2025 = df_panel[df_panel['year'] == max_year].sort_values('export_value_usd', ascending=False).groupby('importer_iso3', as_index=False).first()
        
        # Build forecast
        df_forecast = df_2025[['importer_iso3', 'hs6']].copy()
        df_forecast['forecast_demand_kg'] = df_2025['export_net_weight_kg'] * 1.05
        df_forecast['forecast_fob_price'] = df_2025['fob_unit_value_usd_per_kg']
        
        ranker = OpportunityRankingEngine(weights=weights)
        df_ranked = ranker.rank_destinations(df_2025, df_forecast, user_quantity_kg=1000.0)
        
        risk_integrator = TradeRiskIntegrator()
        df_final = risk_integrator.compute_risk_penalties(df_ranked)
        df_final = df_final.sort_values('final_score', ascending=False).reset_index(drop=True)
        
        print(f"\n==================================================")
        print(f"🎯 TOP 5 DESTINATIONS FOR: {prod_name} (HS {hs})")
        print(f"==================================================")
        for idx, (_, r) in enumerate(df_final.head(5).iterrows(), 1):
            print(f"#{idx} {r['importer_country_name']} ({r['importer_iso3']}): Final Score = {r['final_score']:.1f} | Trade Value = ${r['export_value_usd']:,.0f} | Demand = {r['forecast_demand_kg']/1000:,.1f} MT | Risk: {r['risk_level']}")

if __name__ == "__main__":
    # Test with demand-focused weights (Revealed: 35%, Forecast: 20%, Trade Access: 15%, Econ: 10%, Growth: 10%, Price: 5%, Logistics: 5%)
    weights = {
        'revealed_demand': 0.35,
        'forecast_demand': 0.20,
        'trade_access': 0.15,
        'economic_capacity': 0.10,
        'growth_momentum': 0.10,
        'forecast_price': 0.05,
        'logistics': 0.05
    }
    run_test(weights)
