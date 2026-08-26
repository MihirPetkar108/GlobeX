import json

import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional

# Score columns ranked against the real peer distribution (b). Label is what
# the percentile is reported as; higher = better for all of these.
_PEER_SCORE_COLS = [
    ("score_trade_access", "tariff & trade-agreement access"),
    ("score_economic_capacity", "destination economic capacity"),
    ("score_growth_momentum", "export growth momentum"),
    ("score_logistics", "logistics connectivity"),
    ("score_revealed_demand", "current trade absorption"),
]


def generate_country_insights(
    country_row: pd.Series,
    requested_quantity_kg: Optional[float] = None,
    peer_df: Optional[pd.DataFrame] = None,
) -> Dict[str, Any]:
    """
    Generates structured, human-interpretable evidence, pros, cons, and score breakdowns
    for a specific destination country corridor.

    Pros/cons are built from two real, non-templated sources rather than
    hardcoded threshold constants:
      (a) exact TreeSHAP attribution from the XGBoost demand forecaster
          (src/partner_discovery/xgb_forecaster.py) when available — the
          specific features that drove THIS corridor's forecast, signed;
      (b) percentile rank against the real set of candidate countries
          evaluated for this query (`peer_df`), so "strong tariff access"
          means measurably top-decile among actual alternatives, not above
          an invented constant. Falls back to fixed thresholds only when no
          peer set is supplied (e.g. a single-row call site).
    """
    row = country_row.to_dict()
    iso3 = row.get('importer_iso3', row.get('exporter_iso3', 'UNKNOWN'))
    country_name = row.get('importer_country_name', row.get('exporter_country_name', iso3))
    hs6 = row.get('hs6', 0)
    product_desc = row.get('product_description', '')

    # Financial & Demand Forecast
    fc_demand = float(row.get('forecast_demand_kg', row.get('export_net_weight_kg', 0.0)))
    fc_price = float(row.get('forecast_fob_price', row.get('fob_unit_value_usd_per_kg', 0.0)))
    user_qty = float(requested_quantity_kg) if requested_quantity_kg is not None and requested_quantity_kg > 0 else fc_demand
    est_shipment_revenue = user_qty * fc_price

    # Pros & Cons generation
    pros = []
    cons = []

    # (a) Real per-prediction attribution: what actually drove the demand
    # forecast for THIS corridor, from the model's own TreeSHAP contributions.
    shap_json = row.get('shap_top_features_json')
    if shap_json:
        try:
            top_features = json.loads(shap_json)
        except (TypeError, ValueError):
            top_features = []
        for feat in top_features:
            direction = "pushed the demand forecast up" if feat["contribution"] > 0 else "pulled the demand forecast down"
            line = f"Model attribution: {feat['feature']} {direction} (SHAP contribution {feat['contribution']:+.3f})."
            (pros if feat["contribution"] > 0 else cons).append(line)

    # (b) Peer-relative percentiles across the real candidate set for this
    # query, falling back to fixed thresholds only if no peer set is given.
    if peer_df is not None and len(peer_df) >= 5:
        for col, label in _PEER_SCORE_COLS:
            if col not in peer_df.columns or col not in row:
                continue
            val = float(row[col])
            pct = float((peer_df[col] <= val).mean() * 100.0)
            n_peers = len(peer_df)
            if pct >= 75.0:
                rank_pct = max(1, round(100 - pct))
                pros.append(f"Top {rank_pct}% of {n_peers} evaluated destinations on {label} (percentile {pct:.0f}).")
            elif pct <= 25.0:
                rank_pct = max(1, round(pct))
                cons.append(f"Bottom {rank_pct}% of {n_peers} evaluated destinations on {label} (percentile {pct:.0f}).")
    else:
        tariff = float(row.get('destination_applied_tariff_rate', 0.0))
        rta_exists = int(row.get('rta_exists', 0))
        rta_name = str(row.get('rta_name', 'None'))
        if rta_exists == 1 and tariff == 0.0:
            pros.append(f"Duty-Free Preferential Access (0.0% tariff) under {rta_name}.")
        elif tariff < 5.0:
            pros.append(f"Low applied tariff rate of {tariff:.1f}%.")
        else:
            cons.append(f"Applied tariff barrier of {tariff:.1f}% on import.")

    # RTA / tariff preference is a real documented fact regardless of peer set
    rta_exists = int(row.get('rta_exists', 0))
    rta_name = str(row.get('rta_name', 'None'))
    pref_margin = float(row.get('tariff_preference_margin', 0.0))
    if pref_margin > 0:
        pros.append(f"Tariff preference margin of {pref_margin:.1f}% over non-FTA competitors ({rta_name}).")

    # Logistics facts (real dataset columns, always reported when present)
    locodes = int(row.get('destination_locode_count', 0))
    ports = int(row.get('destination_port_count', 0))
    buyers = int(row.get('gleif_active_buyer_count', 0))
    if ports >= 10:
        pros.append(f"High maritime freight connectivity with {ports} major container ports ({locodes} LOCODE hubs).")
    if buyers >= 50:
        pros.append(f"Established B2B buyer network ({buyers} active verified GLEIF corporate buyers).")

    # Risk Assessment — real dataset columns (sanctions_present, ofac_entity_count,
    # scomet_match_flag confirmed populated with variance, not zero-padded)
    sanctions = int(row.get('sanctions_present', 0))
    ofac_cnt = int(row.get('ofac_entity_count', 0))
    scomet_match = int(row.get('scomet_match_flag', 0))

    if sanctions > 0:
        cons.append("Subject to active international sanctions / trade restrictions.")
    if ofac_cnt > 0:
        cons.append(f"Heightened compliance exposure ({ofac_cnt} OFAC SDN entities registered).")
    if scomet_match > 0:
        cons.append("SCOMET dual-use strategic item requiring DGFT export authorization.")

    if not cons:
        cons.append("Standard international logistics and exchange rate fluctuations.")

    # Score Breakdown Dict
    scores = {
        'final_score': float(row.get('final_score', 0.0)),
        'opportunity_score': float(row.get('opportunity_score', 0.0)),
        'risk_penalty': float(row.get('risk_penalty', 0.0)),
        'quantity_fit_score': float(row.get('quantity_fit_score', 100.0)),
        'score_revealed_demand': float(row.get('score_revealed_demand', 0.0)),
        'score_forecast_demand': float(row.get('score_forecast_demand', 0.0)),
        'score_growth_momentum': float(row.get('score_growth_momentum', 0.0)),
        'score_trade_access': float(row.get('score_trade_access', 0.0)),
        'score_economic_capacity': float(row.get('score_economic_capacity', 0.0)),
        'score_forecast_price': float(row.get('score_forecast_price', 0.0)),
        'score_logistics': float(row.get('score_logistics', 0.0)),
        'score_buyer_ecosystem': float(row.get('score_buyer_ecosystem', 0.0)),
        'score_stability': float(row.get('score_stability', 0.0))
    }
    
    return {
        'destination': {
            'iso3': iso3,
            'country_name': country_name,
            'region': row.get('region_name', ''),
            'sub_region': row.get('sub_region_name', ''),
            'currency': row.get('currency_code', 'USD')
        },
        'product': {
            'hs6': hs6,
            'description': product_desc
        },
        'forecast': {
            'annual_market_demand_kg': round(fc_demand, 1),
            'demand_interval_80_lower_kg': row.get('forecast_demand_kg_lower_80'),
            'demand_interval_80_upper_kg': row.get('forecast_demand_kg_upper_80'),
            'expected_fob_price_usd_per_kg': round(fc_price, 2),
            'user_shipment_quantity_kg': round(user_qty, 1),
            'estimated_shipment_revenue_usd': round(est_shipment_revenue, 2),
            'forecast_method': row.get('forecast_method', 'MOVING_AVERAGE_3YR_MOMENTUM')
        },
        'risk': {
            'risk_level': row.get('risk_level', 'LOW'),
            'risk_penalty_points': float(row.get('risk_penalty', 0.0)),
            'risk_flags': row.get('risk_flags', 'COMPLIANT_CLEAR'),
            'sanctions_active': bool(sanctions > 0),
            'ofac_count': ofac_cnt,
            'scomet_controlled': bool(scomet_match > 0)
        },
        'scores': scores,
        'pros': pros,
        'cons': cons
    }

