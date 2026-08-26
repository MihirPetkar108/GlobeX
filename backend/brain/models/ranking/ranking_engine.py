import os
import numpy as np
import pandas as pd
from typing import Optional, Union, Dict, Any, List

from .product_resolver import ProductResolver, resolve_product
from .feature_engineering import FeatureEngineer
from .explainability import generate_reasons_for_ranking

DEFAULT_WEIGHTS = {
    "demand": 0.30,
    "growth": 0.20,
    "access": 0.15,
    "economic_capacity": 0.10,
    "logistics": 0.10,
    "buyer_ecosystem": 0.05,
    "stability": 0.05,
    "risk": 0.05,
}

class DestinationRankingEngine:
    """
    Explainable, evidence-grounded destination ranking engine for India exporters.
    """
    def __init__(
        self,
        weights: Optional[Dict[str, float]] = None,
        parquet_path: Optional[str] = None
    ):
        self.weights = weights or DEFAULT_WEIGHTS.copy()
        self._validate_weights(self.weights)
        self.parquet_path = parquet_path
        self.resolver = ProductResolver(parquet_path=parquet_path)
        self.fe = FeatureEngineer(parquet_path=parquet_path)

    @staticmethod
    def _validate_weights(w: Dict[str, float]):
        total = sum(w.values())
        if not np.isclose(total, 1.0, atol=1e-5):
            raise ValueError(f"Ranking weights must sum to 1.0. Current sum: {total:.4f}")

    @staticmethod
    def _percentile_score(series: pd.Series, ascending: bool = True) -> pd.Series:
        """
        Computes percentile rank in [0, 100].
        If ascending=True: higher raw value -> higher score (positive signal).
        If ascending=False: higher raw value -> lower score (negative signal).
        """
        if series.nunique() <= 1:
            return pd.Series(50.0, index=series.index)
        
        # Rank values
        ranks = series.rank(pct=True, ascending=ascending) * 100.0
        return ranks

    def rank_destinations(
        self,
        product_query: Union[str, int],
        quantity_kg: float = 1000.0,
        top_n: int = 5,
        hs6: Optional[int] = None,
        as_of_year: Optional[int] = None,
        custom_weights: Optional[Dict[str, float]] = None
    ) -> pd.DataFrame:
        """
        Ranks the top destination countries for India's export of a given product.
        """
        weights = custom_weights or self.weights
        self._validate_weights(weights)

        # 1. Resolve Product
        if hs6 is not None:
            resolved_hs6 = int(hs6)
            resolved_desc = "HS6 " + str(resolved_hs6)
        else:
            res = self.resolver.resolve(product_query)
            if res['status'] == 'not_found' or res['hs6'] is None:
                raise ValueError(f"Product query '{product_query}' could not be resolved to a valid HS6 code.")
            resolved_hs6 = res['hs6']
            resolved_desc = res['product_description']

        # 2. Extract Country-Product Features
        feat_df = self.fe.compute_country_features_for_product(
            hs6=resolved_hs6,
            as_of_year=as_of_year
        )

        if feat_df.empty:
            return pd.DataFrame()

        # Ensure WLD is never in results
        feat_df = feat_df[feat_df['importer_iso3'].str.upper() != 'WLD'].copy()
        if feat_df.empty:
            return pd.DataFrame()

        # 3. Compute Normalized Component Scores [0, 100]
        # (a) Demand Component (30%)
        # Combine log export weight, log export value, latest weight, market share
        s_w_avg = self._percentile_score(np.log1p(feat_df['recent_3y_avg_export_weight'].clip(lower=0)))
        s_v_avg = self._percentile_score(np.log1p(feat_df['recent_3y_avg_export_value'].clip(lower=0)))
        s_w_lat = self._percentile_score(np.log1p(feat_df['latest_year_export_weight'].clip(lower=0)))
        s_mshare = self._percentile_score(feat_df['destination_market_share_latest'])
        demand_score = 0.40 * s_w_avg + 0.30 * s_v_avg + 0.20 * s_w_lat + 0.10 * s_mshare

        # (b) Growth Component (20%)
        # Value CAGR, Weight CAGR, Recent Growth
        s_cagr_v = self._percentile_score(feat_df['export_value_cagr_3y'])
        s_cagr_w = self._percentile_score(feat_df['export_weight_cagr_3y'])
        s_rec_g = self._percentile_score(feat_df['recent_weight_growth'])
        growth_score = 0.40 * s_cagr_w + 0.40 * s_cagr_v + 0.20 * s_rec_g

        # (c) Access Component (15%)
        # Tariff (negative), Preference margin (positive), RTA (positive)
        s_tariff = self._percentile_score(feat_df['destination_applied_tariff_rate'], ascending=False)
        s_pref = self._percentile_score(feat_df['tariff_preference_margin'], ascending=True)
        s_rta = np.where(feat_df['rta_exists'] == 1, 100.0, 30.0)
        access_score = 0.50 * s_tariff + 0.25 * s_pref + 0.25 * s_rta

        # (d) Economic Capacity Component (10%)
        # GDP, GDP per capita, GDP growth, Population
        s_gdp = self._percentile_score(np.log1p(feat_df['destination_gdp'].clip(lower=0)))
        s_gdppc = self._percentile_score(feat_df['destination_gdp_per_capita'])
        s_gdpg = self._percentile_score(feat_df['destination_gdp_growth'])
        s_pop = self._percentile_score(np.log1p(feat_df['destination_population'].clip(lower=0)))
        economic_score = 0.40 * s_gdp + 0.30 * s_gdppc + 0.15 * s_gdpg + 0.15 * s_pop

        # (e) Logistics Readiness (10%)
        # Ports, Airports, Terminals, LOCODEs
        s_port = self._percentile_score(np.log1p(feat_df['destination_port_count']))
        s_air = self._percentile_score(np.log1p(feat_df['destination_airport_count']))
        s_term = self._percentile_score(np.log1p(feat_df['destination_inland_terminal_count']))
        s_loc = self._percentile_score(np.log1p(feat_df['destination_locode_count']))
        logistics_score = 0.35 * s_port + 0.25 * s_air + 0.20 * s_term + 0.20 * s_loc

        # (f) Buyer Ecosystem (5%)
        s_gleif = self._percentile_score(np.log1p(feat_df['gleif_buyer_count']))
        s_gleif_act = self._percentile_score(np.log1p(feat_df['gleif_active_buyer_count']))
        buyer_score = 0.50 * s_gleif + 0.50 * s_gleif_act

        # (g) Stability (5%)
        s_act_ratio = self._percentile_score(feat_df['activity_ratio'])
        s_y_act = self._percentile_score(feat_df['years_active'])
        stability_score = 0.60 * s_act_ratio + 0.40 * s_y_act

        # (h) Risk Component (5%)
        # 100 base, penalized for sanctions, ofac, scomet
        risk_penalty = (
            feat_df['sanctions_present'] * 30.0 +
            np.clip(feat_df['ofac_entity_count'], 0, 5) * 5.0 +
            feat_df['scomet_match_flag'] * 40.0
        )
        risk_adjustment = np.clip(100.0 - risk_penalty, 0.0, 100.0)

        # 4. Quantity-Aware Fit Modifier [0, 100]
        typical_annual_wt = feat_df['recent_3y_median_export_weight'].clip(lower=1.0)
        coverage_ratio = quantity_kg / typical_annual_wt
        
        # Bounded quantity fit mapping
        quantity_fit = np.where(
            coverage_ratio <= 0.05,
            100.0,
            np.where(
                coverage_ratio <= 0.50,
                100.0 - 30.0 * (coverage_ratio - 0.05) / 0.45,
                np.where(
                    coverage_ratio <= 1.00,
                    70.0 - 30.0 * (coverage_ratio - 0.50) / 0.50,
                    np.maximum(10.0, 50.0 / coverage_ratio)
                )
            )
        )

        # 5. Base Weighted Score Calculation
        base_score = (
            weights['demand'] * demand_score +
            weights['growth'] * growth_score +
            weights['access'] * access_score +
            weights['economic_capacity'] * economic_score +
            weights['logistics'] * logistics_score +
            weights['buyer_ecosystem'] * buyer_score +
            weights['stability'] * stability_score +
            weights['risk'] * risk_adjustment
        )

        # Combine Base Score (90%) with Quantity Fit (10%)
        final_score = 0.90 * base_score + 0.10 * quantity_fit

        # Additional SCOMET match flag deduction
        scomet_deduction = np.where(feat_df['scomet_match_flag'] == 1, 10.0, 0.0)
        final_score = np.clip(final_score - scomet_deduction, 0.0, 100.0)

        # Format Risk Flags
        risk_flags = []
        for _, r in feat_df.iterrows():
            flags = []
            if r['sanctions_present'] == 1:
                flags.append("SANCTIONS_PRESENT")
            if r['ofac_entity_count'] > 0:
                flags.append(f"OFAC_ENTITIES_{int(r['ofac_entity_count'])}")
            if r['scomet_match_flag'] == 1:
                flags.append("SCOMET_RESTRICTION")
            if r['destination_applied_tariff_rate'] >= 25.0:
                flags.append("HIGH_TARIFF_BARRIER")
            risk_flags.append("; ".join(flags) if flags else "NONE")

        # Compile Full Result DataFrame
        results_df = pd.DataFrame({
            'country': feat_df['importer_country_name'],
            'iso3': feat_df['importer_iso3'],
            'hs6': resolved_hs6,
            'product': resolved_desc,
            'final_score': final_score.round(2),
            'demand_score': demand_score.round(2),
            'growth_score': growth_score.round(2),
            'access_score': access_score.round(2),
            'economic_score': economic_score.round(2),
            'logistics_score': logistics_score.round(2),
            'buyer_score': buyer_score.round(2),
            'stability_score': stability_score.round(2),
            'risk_adjustment': risk_adjustment.round(2),
            'quantity_fit': quantity_fit.round(2),
            'recent_export_weight_kg': feat_df['recent_3y_avg_export_weight'].round(1),
            'recent_export_value_usd': feat_df['recent_3y_avg_export_value'].round(2),
            'tariff_rate': feat_df['destination_applied_tariff_rate'].round(1),
            'rta': np.where(feat_df['rta_exists'] == 1, "Yes (In Force)", "No"),
            'risk_flag': risk_flags,
            'coverage_ratio': coverage_ratio.round(4)
        })

        # Sort descending by final score
        results_df = results_df.sort_values(by='final_score', ascending=False).reset_index(drop=True)
        results_df['rank'] = results_df.index + 1

        # Generate Explainability Reason Codes
        results_df['reason_codes'] = generate_reasons_for_ranking(results_df)

        # Standard Column Order
        cols = [
            'rank', 'country', 'iso3', 'hs6', 'product', 'final_score',
            'demand_score', 'growth_score', 'access_score', 'economic_score',
            'logistics_score', 'buyer_score', 'stability_score', 'risk_adjustment',
            'quantity_fit', 'recent_export_weight_kg', 'recent_export_value_usd',
            'tariff_rate', 'rta', 'risk_flag', 'reason_codes'
        ]

        return results_df[cols].head(top_n)

def rank_export_destinations(
    product_query: Union[str, int],
    quantity_kg: float = 1000.0,
    top_n: int = 5,
    hs6: Optional[int] = None,
    parquet_path: Optional[str] = None,
    custom_weights: Optional[Dict[str, float]] = None
) -> pd.DataFrame:
    """
    Primary API function to rank export destination countries for India.
    """
    engine = DestinationRankingEngine(parquet_path=parquet_path, weights=custom_weights)
    return engine.rank_destinations(
        product_query=product_query,
        quantity_kg=quantity_kg,
        top_n=top_n,
        hs6=hs6
    )
