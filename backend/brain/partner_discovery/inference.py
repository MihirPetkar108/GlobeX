import json
import re

import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Union

from .data import PartnerDataLoader
from .features import PartnerFeatureEngineer
from .ranking import OpportunityRankingEngine
from .risk_integration import TradeRiskIntegrator
from .explainability import generate_country_insights
from .xgb_forecaster import get_forecaster as get_xgb_forecaster

_LAG_RE = re.compile(r"^f(\d+)_lag(\d+)$")

# Human-readable labels for the 11 leakage-audited base features + derived
# residual/trend features xgb_forecaster.build_features() adds. Order of the
# base 11 must match engineer_11 in recommend_destinations().
_DERIVED_LABELS = {
    "d_last_minus_ma3": "demand vs its own 3yr average",
    "d_slope5": "5-year demand trend",
    "d_std5": "5-year demand volatility",
    "d_std3": "3-year demand volatility",
    "d_yoy_last": "most recent year-over-year demand change",
    "d_yoy_prev": "prior year-over-year demand change",
    "d_range5": "5-year demand range",
    "p_last_over_ma3": "unit price vs its own 3yr average",
    "p_slope5": "5-year unit price trend",
    "p_cv5": "5-year unit price volatility",
    "p_yoy_last": "most recent year-over-year price change",
}


def _humanize_xgb_feature(fname: str, base_feature_cols: List[str]) -> str:
    """Maps an internal xgb_forecaster feature name (fN_lagK or a derived
    name) to a human-readable label for real, per-prediction attribution."""
    m = _LAG_RE.match(fname)
    if m:
        idx, lag = int(m.group(1)), int(m.group(2))
        base = base_feature_cols[idx] if idx < len(base_feature_cols) else fname
        base_label = base.replace("_", " ")
        return f"{base_label} ({lag}yr ago)" if lag > 0 else f"{base_label} (most recent year)"
    return _DERIVED_LABELS.get(fname, fname.replace("_", " "))

def recommend_destinations(
    product_query: Union[str, int],
    requested_quantity_kg: Optional[float] = None,
    top_n: int = 10,
    regime: str = "balanced",
    data_dir: Optional[str] = None,
    model_dir: str = "models/partner_forecasting"  # unused — GRU forecaster disabled, kept for caller signature compatibility
) -> Dict[str, Any]:
    """
    End-to-End Partner Discovery, Forecasting, and Risk-Adjusted Recommendation Engine.
    
    Example:
        recommend_destinations("basil seeds", requested_quantity_kg=1000.0, top_n=5)
    """
    # 1. Product Resolution
    loader = PartnerDataLoader(data_dir=data_dir)
    res = loader.resolve_product(product_query)
    
    if res['status'] == 'not_found' or res['hs6'] is None:
        return {
            'status': 'error',
            'message': f"Product '{product_query}' could not be resolved to a known HS6 product.",
            'product_resolution': res,
            'recommendations': []
        }
        
    hs6 = res['hs6']
    product_desc = res['product_description']
    
    # 2. Load panel trade dataset for HS6
    df_panel = loader.load_data(direction="EXPORT", canonical_slice=False, hs6=hs6, exclude_wld=True)
    if df_panel.empty:
        return {
            'status': 'error',
            'message': f"No export history found for HS6 {hs6}.",
            'product_resolution': res,
            'recommendations': []
        }
        
    # 3. Forecast generation (using GRU model if saved, else rolling baseline)
    engineer = PartnerFeatureEngineer(sequence_length=5)
    df_feat = engineer.engineer_base_features(df_panel)
    
    latest_year = df_feat['year'].max()
    corridors = df_feat['importer_iso3'].unique()
    
    forecast_rows = []

    # DEMAND: real XGBoost residual forecaster (backend/brain/models/partner_discovery_xgb),
    # promoted by backend/brain/notebooks/validation/phase4c_xgb_residual.py after
    # beating the production MA3 formula on a held-out walk-forward backtest
    # (26.35% vs 28.41% demand WAPE, target years 2023-2024). It predicts a
    # RESIDUAL against the MA3 anchor (model_output ~= 0 reproduces MA3 exactly),
    # so a corridor with too little history to model degrades to the same
    # formula, never to a worse or fabricated number. A prior Dual-Head GRU
    # (61.14% WAPE) was rejected on the same backtest — see phase4b_outputs.
    #
    # PRICE: stays on the median-of-last-3 formula. fob_unit_value_usd_per_kg
    # is a perfectly linear synthetic series in this dataset (phase4c_xgb_residual
    # section 5b), so no price model was trained — that would be fitting a
    # straight line and shipping a fabricated capability.
    xgb_forecaster = get_xgb_forecaster()
    engineer_11 = [c for c in engineer.feature_columns if c != 'sanctions_present']

    for c_iso3 in corridors:
        sub = df_feat[df_feat['importer_iso3'] == c_iso3].sort_values('year')

        # Historical metrics for this specific HS commodity in this destination corridor
        recent_d = sub['export_net_weight_kg'].values[-3:]
        recent_p = sub['fob_unit_value_usd_per_kg'].values[-3:]
        hist_avg_d = float(np.mean(recent_d)) if len(recent_d) > 0 else 50000.0
        hist_avg_p = float(np.median(recent_p)) if len(recent_p) > 0 else 2.50

        fc_p = hist_avg_p  # price formula, unconditionally (see note above)

        fc_d = hist_avg_d * 1.05
        forecast_method = 'MOVING_AVERAGE_3YR_MOMENTUM'
        demand_lower = demand_upper = None

        shap_top_json = None
        if xgb_forecaster.available and len(sub) >= 5:
            seq_batch = np.expand_dims(sub[engineer_11].values[-5:], axis=0)
            xgb_pred = xgb_forecaster.predict_demand(seq_batch)
            if xgb_pred is not None:
                fc_d = float(xgb_pred['point'][0])
                demand_lower = float(xgb_pred['lower'][0])
                demand_upper = float(xgb_pred['upper'][0])
                forecast_method = 'XGB_RESIDUAL_ON_MA3_V1'

                # Exact TreeSHAP contributions for this corridor's forecast —
                # replaces hardcoded if/elif thresholds in explainability.py
                # with the model's actual reasoning for this specific prediction.
                contribs = xgb_forecaster.shap_contributions(seq_batch)
                if contribs is not None:
                    row_contribs = contribs[0, :-1]  # drop bias term
                    top_idx = np.argsort(np.abs(row_contribs))[::-1][:3]
                    top_features = []
                    for i in top_idx:
                        fname = xgb_forecaster.feature_names[i] if i < len(xgb_forecaster.feature_names) else f"f{i}"
                        base = _humanize_xgb_feature(fname, engineer_11)
                        top_features.append({
                            "feature": base,
                            "contribution": round(float(row_contribs[i]), 4),
                        })
                    shap_top_json = json.dumps(top_features)

        forecast_rows.append({
            'importer_iso3': c_iso3,
            'hs6': hs6,
            'forecast_demand_kg': round(fc_d, 1),
            'forecast_demand_kg_lower_80': round(demand_lower, 1) if demand_lower is not None else None,
            'forecast_demand_kg_upper_80': round(demand_upper, 1) if demand_upper is not None else None,
            'forecast_fob_price': round(fc_p, 2),
            'forecast_method': forecast_method,
            'shap_top_features_json': shap_top_json,
        })

    df_forecast = pd.DataFrame(forecast_rows)
    
    # 4. Multi-Criteria Opportunity Ranking with Quantity-Fit
    ranker = OpportunityRankingEngine()
    df_ranked = ranker.rank_destinations(
        panel_df=df_panel,
        forecast_df=df_forecast,
        user_quantity_kg=requested_quantity_kg,
        regime=regime
    )
    
    # 5. Risk and Compliance Integration (Strict constraint: final_score = opp_score - risk_penalty)
    risk_integrator = TradeRiskIntegrator()
    df_final = risk_integrator.compute_risk_penalties(df_ranked)
    
    # Sort strictly by final_score descending
    df_final = df_final.sort_values('final_score', ascending=False).reset_index(drop=True)
    df_final['final_rank'] = range(1, len(df_final) + 1)
    
    # 6. Format Top-N Recommendations with Explainability
    top_df = df_final.head(top_n).copy()
    
    recommendations = []
    for _, r in top_df.iterrows():
        insights = generate_country_insights(r, requested_quantity_kg=requested_quantity_kg, peer_df=df_final)
        recommendations.append(insights)
        
    return {
        'status': 'success',
        'product_resolution': res,
        'requested_quantity_kg': requested_quantity_kg,
        'regime': regime,
        'total_candidates_evaluated': len(df_final),
        'top_recommendations': recommendations,
        'summary_table': top_df[[
            'final_rank', 'importer_iso3', 'importer_country_name', 'final_score',
            'opportunity_score', 'risk_penalty', 'risk_level', 'forecast_demand_kg',
            'forecast_fob_price', 'destination_applied_tariff_rate', 'rta_name'
        ]].to_dict('records')
    }

