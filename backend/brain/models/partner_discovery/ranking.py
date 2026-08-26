import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional

def _minmax_score(values: np.ndarray) -> np.ndarray:
    """Computes min-max normalized scores mapped strictly to [0.0, 100.0]."""
    if len(values) == 0:
        return np.array([])
    min_v, max_v = np.nanmin(values), np.nanmax(values)
    if max_v <= min_v or np.isnan(min_v) or np.isnan(max_v):
        return np.full(len(values), 50.0)
    scores = ((values - min_v) / (max_v - min_v)) * 100.0
    return np.nan_to_num(scores, nan=50.0)

class OpportunityRankingEngine:
    """
    Computes multi-dimensional market opportunity scores for destination corridors.
    Combines revealed trade absorption, forecasted demand, tariff & RTA preferences,
    macroeconomic capacity, logistics, buyer density, and user shipment quantity-fit.
    """
    DEFAULT_WEIGHTS = {
        'revealed_demand': 0.35,
        'forecast_demand': 0.25,
        'trade_access': 0.15,
        'economic_capacity': 0.10,
        'growth_momentum': 0.10,
        'logistics': 0.05
    }

    def __init__(self, weights: Optional[Dict[str, float]] = None):
        self.weights = weights if weights is not None else self.DEFAULT_WEIGHTS.copy()
        
        # Ensure normalized weights sum to 1.0
        total_w = sum(self.weights.values())
        self.weights = {k: v / total_w for k, v in self.weights.items()}

    def compute_quantity_fit_score(self, user_quantity_kg: float, partner_trade_volume_kg: np.ndarray) -> np.ndarray:
        """
        Evaluates how well the user requested shipment volume matches each destination's annual market capacity.
        Returns a score in [0.0, 100.0].
        """
        if user_quantity_kg <= 0:
            return np.full(len(partner_trade_volume_kg), 100.0)
            
        user_log = np.log10(max(1.0, user_quantity_kg))
        market_log = np.log10(np.maximum(1.0, partner_trade_volume_kg))
        
        diff = market_log - user_log
        fit_scores = np.where(
            diff >= 1.0,
            np.minimum(100.0, 80.0 + 20.0 * (1.0 / (1.0 + np.exp(-(diff - 2.0))))),
            np.maximum(10.0, 80.0 - 35.0 * (1.0 - diff))
        )
        return np.clip(fit_scores, 0.0, 100.0)

    def rank_destinations(
        self,
        panel_df: pd.DataFrame,
        forecast_df: Optional[pd.DataFrame] = None,
        user_quantity_kg: Optional[float] = None,
        regime: str = "balanced"
    ) -> pd.DataFrame:
        """
        Computes opportunity scores and rankings for candidate destinations.
        """
        df = panel_df.copy()
        partner_col = 'importer_iso3' if 'importer_iso3' in df.columns else 'exporter_iso3'
        
        # Filter latest context year (2025)
        max_year = df['year'].max()
        latest = df[df['year'] == max_year].copy()
        
        if latest.empty:
            latest = df.sort_values('year').groupby([partner_col, 'hs6']).last().reset_index()
            
        # Deduplicate per country corridor taking top trade value record
        latest = latest.sort_values('export_value_usd', ascending=False).groupby([partner_col, 'hs6'], as_index=False).first()
            
        # Merge forecast values if available
        if forecast_df is not None and not forecast_df.empty:
            merge_keys = [partner_col, 'hs6'] if 'hs6' in forecast_df.columns else [partner_col]
            latest = latest.merge(forecast_df, on=merge_keys, how='left', suffixes=('', '_pred'))
            if 'forecast_demand_kg' not in latest.columns and 'export_net_weight_kg_pred' in latest.columns:
                latest['forecast_demand_kg'] = latest['export_net_weight_kg_pred']
            if 'forecast_fob_price' not in latest.columns and 'fob_unit_value_usd_per_kg_pred' in latest.columns:
                latest['forecast_fob_price'] = latest['fob_unit_value_usd_per_kg_pred']
        else:
            latest['forecast_demand_kg'] = latest['export_net_weight_kg'] * 1.05
            latest['forecast_fob_price'] = latest['fob_unit_value_usd_per_kg']
            
        # 1. Revealed Demand Component (Market Trade Value Absorption for this HS commodity)
        rev_demand = np.log1p(np.maximum(0.0, latest['export_value_usd'].fillna(0.0)))
        score_rev_demand = _minmax_score(rev_demand.values)
        
        # 2. Forecast Demand Component (Net Weight Demand in kg for this HS commodity)
        fc_demand = np.log1p(np.maximum(0.0, latest['forecast_demand_kg'].fillna(0.0)))
        score_fc_demand = _minmax_score(fc_demand.values)
        
        # 3. Growth Momentum Component
        growth = latest.get('cagr_3yr', latest.get('destination_gdp_growth', pd.Series(0.0, index=latest.index))).fillna(0.0)
        score_growth = _minmax_score(growth.values)
        
        # 4. Trade Access Component (Applied Tariff + FTA/CEPA preference)
        tariff = latest['destination_applied_tariff_rate'].fillna(10.0).values
        pref = latest.get('tariff_preference_margin', pd.Series(0.0, index=latest.index)).fillna(0.0).values
        rta = latest.get('rta_exists', pd.Series(0, index=latest.index)).fillna(0).values
        access_metric = (100.0 - np.clip(tariff * 4.0, 0.0, 100.0)) + (pref * 3.0) + (rta * 15.0)
        score_access = _minmax_score(access_metric)
        
        # 5. Economic Capacity Component
        gdp = np.log1p(np.maximum(0.0, latest['destination_gdp'].fillna(0.0)))
        pop = np.log1p(np.maximum(0.0, latest['destination_population'].fillna(0.0)))
        econ_metric = 0.70 * gdp.values + 0.30 * pop.values
        score_econ = _minmax_score(econ_metric)
        
        # 6. Logistics Component
        locodes = np.log1p(np.maximum(0.0, latest.get('destination_locode_count', pd.Series(10, index=latest.index)).fillna(0.0)))
        score_logistics = _minmax_score(locodes.values)
        
        # Aggregate weighted base opportunity score
        w = self.weights
        base_opp = (
            w.get('revealed_demand', 0.35) * score_rev_demand +
            w.get('forecast_demand', 0.25) * score_fc_demand +
            w.get('trade_access', 0.15) * score_access +
            w.get('economic_capacity', 0.10) * score_econ +
            w.get('growth_momentum', 0.10) * score_growth +
            w.get('logistics', 0.05) * score_logistics
        )
        
        # Quantity-fit adjustment
        if user_quantity_kg is not None and user_quantity_kg > 0:
            fit_scores = self.compute_quantity_fit_score(user_quantity_kg, latest['export_net_weight_kg'].values)
            final_opp = 0.90 * base_opp + 0.10 * fit_scores
        else:
            fit_scores = np.full(len(latest), 100.0)
            final_opp = base_opp
            
        latest['score_revealed_demand'] = np.round(score_rev_demand, 2)
        latest['score_forecast_demand'] = np.round(score_fc_demand, 2)
        latest['score_growth_momentum'] = np.round(score_growth, 2)
        latest['score_trade_access'] = np.round(score_access, 2)
        latest['score_economic_capacity'] = np.round(score_econ, 2)
        latest['score_logistics'] = np.round(score_logistics, 2)
        latest['quantity_fit_score'] = np.round(fit_scores, 2)
        latest['base_opportunity_score'] = np.round(base_opp, 2)
        latest['opportunity_score'] = np.round(np.clip(final_opp, 0.0, 100.0), 2)
        
        # Rank descending
        latest['opportunity_rank'] = latest['opportunity_score'].rank(ascending=False, method='min').astype(int)
        
        return latest.sort_values('opportunity_rank').reset_index(drop=True)

