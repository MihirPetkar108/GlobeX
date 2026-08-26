import sys
import io
import pandas as pd
import numpy as np
from pathlib import Path

# Fix Windows console encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from brain.models.partner_discovery.data import PartnerDataLoader
from brain.models.partner_discovery.risk_integration import TradeRiskIntegrator

def _minmax_score(values: np.ndarray) -> np.ndarray:
    min_v, max_v = np.min(values), np.max(values)
    if max_v <= min_v:
        return np.full(len(values), 50.0)
    return ((values - min_v) / (max_v - min_v)) * 100.0

def rank_test(df_panel, user_quantity_kg=1000.0):
    max_year = df_panel['year'].max()
    # Deduplicate by importer_iso3 taking the top trade value
    latest = df_panel[df_panel['year'] == max_year].sort_values('export_value_usd', ascending=False).groupby('importer_iso3', as_index=False).first()
    
    # 1. Revealed Demand (Market Value Absorption for this specific product)
    rev_demand = np.log1p(np.maximum(0.0, latest['export_value_usd'].fillna(0.0)))
    score_rev_demand = _minmax_score(rev_demand.values)
    
    # 2. Forecast Demand (Net Weight volume for this specific product)
    fc_demand = np.log1p(np.maximum(0.0, latest['export_net_weight_kg'].fillna(0.0)))
    score_fc_demand = _minmax_score(fc_demand.values)
    
    # 3. Growth Momentum
    growth = latest.get('cagr_3yr', latest.get('destination_gdp_growth', pd.Series(0.0, index=latest.index))).fillna(0.0)
    score_growth = _minmax_score(growth.values)
    
    # 4. Trade Access (Applied Tariff + RTA/FTA preference)
    tariff = latest['destination_applied_tariff_rate'].fillna(10.0).values
    pref = latest.get('tariff_preference_margin', pd.Series(0.0, index=latest.index)).fillna(0.0).values
    rta = latest.get('rta_exists', pd.Series(0, index=latest.index)).fillna(0).values
    access_metric = (100.0 - np.clip(tariff * 4.0, 0.0, 100.0)) + (pref * 3.0) + (rta * 15.0)
    score_access = _minmax_score(access_metric)
    
    # 5. Economic Capacity (GDP + Population)
    gdp = np.log1p(np.maximum(0.0, latest['destination_gdp'].fillna(0.0)))
    pop = np.log1p(np.maximum(0.0, latest['destination_population'].fillna(0.0)))
    econ_metric = 0.70 * gdp.values + 0.30 * pop.values
    score_econ = _minmax_score(econ_metric)
    
    # 6. Logistics
    locodes = np.log1p(np.maximum(0.0, latest.get('destination_locode_count', pd.Series(10, index=latest.index)).fillna(0.0)))
    score_logistics = _minmax_score(locodes.values)
    
    # Demand-dominated weights: Revealed Demand (35%), Forecast Demand (25%), Trade Access (15%), Economic Capacity (10%), Growth (10%), Logistics (5%)
    base_opp = (
        0.35 * score_rev_demand +
        0.25 * score_fc_demand +
        0.15 * score_access +
        0.10 * score_econ +
        0.10 * score_growth +
        0.05 * score_logistics
    )
    
    latest['opportunity_score'] = np.round(np.clip(base_opp, 0.0, 100.0), 2)
    latest['forecast_demand_kg'] = latest['export_net_weight_kg'] * 1.05
    latest['forecast_fob_price'] = latest['fob_unit_value_usd_per_kg']
    
    risk_integrator = TradeRiskIntegrator()
    df_final = risk_integrator.compute_risk_penalties(latest)
    df_final = df_final.sort_values('final_score', ascending=False).reset_index(drop=True)
    df_final['final_rank'] = range(1, len(df_final) + 1)
    return df_final

def main():
    loader = PartnerDataLoader(data_dir="backend/brain_temporary/data")
    
    products = [
        ("Basmati Rice", 100630),
        ("Black Pepper", 90411),
        ("Cotton Yarn", 520512),
        ("Shrimp", 30617),
        ("Coffee", 90121),
        ("Diamonds", 710239)
    ]
    
    for prod_name, hs in products:
        df_panel = loader.load_data(direction="EXPORT", hs6=hs, exclude_wld=True)
        res = rank_test(df_panel)
        print(f"\n=======================================================")
        print(f"🎯 TOP 5 RANKED MARKETS FOR: {prod_name} (HS {hs})")
        print(f"=======================================================")
        for idx, (_, r) in enumerate(res.head(5).iterrows(), 1):
            print(f"#{idx} {r['importer_country_name']} ({r['importer_iso3']}): Score = {r['final_score']:.1f} | Demand = {r['forecast_demand_kg']/1000:,.1f} MT | Trade Value = ${r['export_value_usd']:,.0f} | Risk = {r['risk_level']} | RTA = {r['rta_name']}")

if __name__ == "__main__":
    main()
