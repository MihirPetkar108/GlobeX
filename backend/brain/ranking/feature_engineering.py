import os
import numpy as np
import pandas as pd
from typing import Optional, List, Dict, Any

class FeatureEngineer:
    """
    Computes country-product historical analytical features from the Parquet dataset.
    Strictly filters out aggregate destinations ('WLD').
    """
    def __init__(self, parquet_path: Optional[str] = None):
        if parquet_path is None:
            candidates = [
                "backend/brain/processed/01_partner_discovery_india_as_exporter.parquet",
                "data/processed/01_partner_discovery_india_as_exporter.parquet",
                "data_pipeline/data/processed/01_partner_discovery_india_as_exporter.parquet",
                os.path.join(os.path.dirname(__file__), "../../backend/brain/processed/01_partner_discovery_india_as_exporter.parquet"),
                os.path.join(os.path.dirname(__file__), "../../data/processed/01_partner_discovery_india_as_exporter.parquet")
            ]
            for p in candidates:
                if os.path.exists(p):
                    parquet_path = p
                    break

        if parquet_path is None or not os.path.exists(parquet_path):
            raise FileNotFoundError(f"Processed Parquet dataset not found at {parquet_path}")

        self.parquet_path = parquet_path

    def load_clean_data(self, hs6: Optional[int] = None, max_year: Optional[int] = None) -> pd.DataFrame:
        """
        Loads the Parquet analytical dataset, excludes 'WLD' aggregates,
        and optionally filters by HS6 and historical cutoff year (for temporal validation).
        """
        df = pd.read_parquet(self.parquet_path)
        
        # Exclude aggregate destinations
        df = df[df['importer_iso3'].str.upper() != 'WLD'].copy()
        
        if hs6 is not None:
            df = df[df['hs6'] == hs6].copy()
            
        if max_year is not None:
            df = df[df['year'] <= max_year].copy()

        return df

    def compute_country_features_for_product(
        self,
        hs6: int,
        as_of_year: Optional[int] = None
    ) -> pd.DataFrame:
        """
        Computes country-level analytical feature vector for a specific HS6 product
        as of a specific evaluation year (defaulting to the latest available year).
        """
        df = self.load_clean_data(hs6=hs6, max_year=as_of_year)
        if df.empty:
            return pd.DataFrame()

        if as_of_year is None:
            as_of_year = int(df['year'].max())

        # Identify unique destination countries
        destinations = df[['importer_iso3', 'importer_country_name']].drop_duplicates()
        
        records = []
        recent_years = [as_of_year - 2, as_of_year - 1, as_of_year]
        all_available_years = sorted(df['year'].unique())
        total_hist_years = len(all_available_years) if len(all_available_years) > 0 else 1

        for _, dest_row in destinations.iterrows():
            iso3 = dest_row['importer_iso3']
            cname = dest_row['importer_country_name']
            
            dest_df = df[df['importer_iso3'] == iso3].sort_values('year')
            if dest_df.empty:
                continue

            # Latest available observation on or before as_of_year
            latest_row = dest_df[dest_df['year'] <= as_of_year].iloc[-1]
            latest_yr = int(latest_row['year'])
            
            # Recent 3-year window data
            recent_df = dest_df[dest_df['year'].isin(recent_years)]
            
            # 1. Demand / Revealed Market Features
            if not recent_df.empty:
                recent_3y_avg_export_value = float(recent_df['export_value_usd'].mean())
                recent_3y_avg_export_weight = float(recent_df['export_net_weight_kg'].mean())
                recent_3y_median_export_weight = float(recent_df['export_net_weight_kg'].median())
            else:
                recent_3y_avg_export_value = float(latest_row['export_value_usd'])
                recent_3y_avg_export_weight = float(latest_row['export_net_weight_kg'])
                recent_3y_median_export_weight = float(latest_row['export_net_weight_kg'])

            latest_year_export_value = float(latest_row['export_value_usd'])
            latest_year_export_weight = float(latest_row['export_net_weight_kg'])
            destination_market_share_latest = float(latest_row.get('destination_market_share_pct', 0.0))

            # 2. Stability Features
            active_years_df = dest_df[dest_df['export_value_usd'] > 0]
            years_active = int(len(active_years_df))
            activity_ratio = float(round(years_active / total_hist_years, 4))

            # 3. Growth Features (CAGR and MoM)
            # Find values at t, t-1, t-2
            v_t = dest_df[dest_df['year'] == as_of_year]['export_value_usd']
            v_t_val = float(v_t.iloc[0]) if not v_t.empty else latest_year_export_value

            v_t1 = dest_df[dest_df['year'] == as_of_year - 1]['export_value_usd']
            v_t1_val = float(v_t1.iloc[0]) if not v_t1.empty else None

            v_t2 = dest_df[dest_df['year'] == as_of_year - 2]['export_value_usd']
            v_t2_val = float(v_t2.iloc[0]) if not v_t2.empty else None

            w_t = dest_df[dest_df['year'] == as_of_year]['export_net_weight_kg']
            w_t_val = float(w_t.iloc[0]) if not w_t.empty else latest_year_export_weight

            w_t1 = dest_df[dest_df['year'] == as_of_year - 1]['export_net_weight_kg']
            w_t1_val = float(w_t1.iloc[0]) if not w_t1.empty else None

            w_t2 = dest_df[dest_df['year'] == as_of_year - 2]['export_net_weight_kg']
            w_t2_val = float(w_t2.iloc[0]) if not w_t2.empty else None

            growth_data_quality_flag = 0

            # Value CAGR 3Y
            if v_t2_val is not None and v_t2_val > 0 and v_t_val > 0:
                export_value_cagr_3y = float((v_t_val / v_t2_val) ** 0.5 - 1.0)
            elif v_t1_val is not None and v_t1_val > 0 and v_t_val > 0:
                export_value_cagr_3y = float(v_t_val / v_t1_val - 1.0)
                growth_data_quality_flag = 1
            else:
                export_value_cagr_3y = 0.0
                growth_data_quality_flag = 2

            # Weight CAGR 3Y
            if w_t2_val is not None and w_t2_val > 0 and w_t_val > 0:
                export_weight_cagr_3y = float((w_t_val / w_t2_val) ** 0.5 - 1.0)
            elif w_t1_val is not None and w_t1_val > 0 and w_t_val > 0:
                export_weight_cagr_3y = float(w_t_val / w_t1_val - 1.0)
            else:
                export_weight_cagr_3y = 0.0

            # Recent 1Y Growth
            recent_value_growth = float(v_t_val / (v_t1_val + 1e-6) - 1.0) if v_t1_val is not None and v_t1_val > 0 else 0.0
            recent_weight_growth = float(w_t_val / (w_t1_val + 1e-6) - 1.0) if w_t1_val is not None and w_t1_val > 0 else 0.0

            # Clip extreme CAGR/growth to avoid numerical blowing
            export_value_cagr_3y = float(np.clip(export_value_cagr_3y, -0.99, 5.0))
            export_weight_cagr_3y = float(np.clip(export_weight_cagr_3y, -0.99, 5.0))
            recent_value_growth = float(np.clip(recent_value_growth, -0.99, 5.0))
            recent_weight_growth = float(np.clip(recent_weight_growth, -0.99, 5.0))

            # 4. Economic Capacity
            destination_gdp = float(latest_row.get('destination_gdp', 0.0))
            destination_gdp_per_capita = float(latest_row.get('destination_gdp_per_capita', 0.0))
            destination_gdp_growth = float(latest_row.get('destination_gdp_growth', 0.0))
            destination_population = float(latest_row.get('destination_population', 0.0))
            destination_trade_pct_gdp = float(latest_row.get('destination_trade_pct_gdp', 0.0))

            # 5. Trade Access Features
            destination_applied_tariff_rate = float(latest_row.get('destination_applied_tariff_rate', 0.0))
            mfn_tariff_rate = float(latest_row.get('mfn_tariff_rate', 0.0))
            tariff_preference_margin = float(latest_row.get('tariff_preference_margin', 0.0))
            rta_exists = float(latest_row.get('rta_exists', 0.0)) if pd.notnull(latest_row.get('rta_exists')) else 0.0
            rta_status = str(latest_row.get('rta_status', 'None')) if pd.notnull(latest_row.get('rta_status')) else 'None'
            rta_type = str(latest_row.get('rta_type', 'None')) if pd.notnull(latest_row.get('rta_type')) else 'None'
            rta_coverage = str(latest_row.get('rta_coverage', 'None')) if pd.notnull(latest_row.get('rta_coverage')) else 'None'

            # 6. Logistics Features
            destination_port_count = int(latest_row.get('destination_port_count', 0))
            destination_airport_count = int(latest_row.get('destination_airport_count', 0))
            destination_inland_terminal_count = int(latest_row.get('destination_inland_terminal_count', 0))
            destination_locode_count = int(latest_row.get('destination_locode_count', 0))

            # 7. Buyer Ecosystem
            gleif_buyer_count = int(latest_row.get('gleif_buyer_count', 0))
            gleif_active_buyer_count = int(latest_row.get('gleif_active_buyer_count', 0))

            # 8. Risk Features
            sanctions_present = int(latest_row.get('sanctions_present', 0))
            sanctions_entity_count = int(latest_row.get('sanctions_entity_count', 0))
            ofac_entity_count = int(latest_row.get('ofac_entity_count', 0))
            scomet_match_flag = int(latest_row.get('scomet_match_flag', 0))

            records.append({
                'as_of_year': as_of_year,
                'hs6': hs6,
                'product_description': str(latest_row['product_description']),
                'importer_iso3': iso3,
                'importer_country_name': cname,
                # Demand
                'recent_3y_avg_export_value': recent_3y_avg_export_value,
                'recent_3y_avg_export_weight': recent_3y_avg_export_weight,
                'recent_3y_median_export_weight': recent_3y_median_export_weight,
                'latest_year_export_value': latest_year_export_value,
                'latest_year_export_weight': latest_year_export_weight,
                'destination_market_share_latest': destination_market_share_latest,
                # Stability
                'years_active': years_active,
                'activity_ratio': activity_ratio,
                # Growth
                'export_value_cagr_3y': export_value_cagr_3y,
                'export_weight_cagr_3y': export_weight_cagr_3y,
                'recent_value_growth': recent_value_growth,
                'recent_weight_growth': recent_weight_growth,
                'growth_data_quality_flag': growth_data_quality_flag,
                # Economic Capacity
                'destination_gdp': destination_gdp,
                'destination_gdp_per_capita': destination_gdp_per_capita,
                'destination_gdp_growth': destination_gdp_growth,
                'destination_population': destination_population,
                'destination_trade_pct_gdp': destination_trade_pct_gdp,
                # Trade Access
                'destination_applied_tariff_rate': destination_applied_tariff_rate,
                'mfn_tariff_rate': mfn_tariff_rate,
                'tariff_preference_margin': tariff_preference_margin,
                'rta_exists': rta_exists,
                'rta_status': rta_status,
                'rta_type': rta_type,
                'rta_coverage': rta_coverage,
                # Logistics
                'destination_port_count': destination_port_count,
                'destination_airport_count': destination_airport_count,
                'destination_inland_terminal_count': destination_inland_terminal_count,
                'destination_locode_count': destination_locode_count,
                # Buyer Ecosystem
                'gleif_buyer_count': gleif_buyer_count,
                'gleif_active_buyer_count': gleif_active_buyer_count,
                # Risk
                'sanctions_present': sanctions_present,
                'sanctions_entity_count': sanctions_entity_count,
                'ofac_entity_count': ofac_entity_count,
                'scomet_match_flag': scomet_match_flag
            })

        return pd.DataFrame(records)

    def build_all_country_product_features(self, as_of_year: Optional[int] = None) -> pd.DataFrame:
        """Computes country-product features across all HS6 codes in the dataset."""
        df = self.load_clean_data(max_year=as_of_year)
        all_hs6 = sorted(df['hs6'].unique())
        
        dfs = []
        for hs in all_hs6:
            feat_df = self.compute_country_features_for_product(hs6=hs, as_of_year=as_of_year)
            if not feat_df.empty:
                dfs.append(feat_df)
                
        if dfs:
            return pd.concat(dfs, ignore_index=True)
        return pd.DataFrame()
