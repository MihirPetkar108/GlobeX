import numpy as np
import pandas as pd
from typing import Tuple, List, Dict, Any, Optional

class PartnerFeatureEngineer:
    """
    Feature engineering pipeline for partner trade forecasting and multi-criteria ranking.
    Builds lag features, rolling momentum statistics, log-transformed metrics,
    and sequence tensors with zero future leakage.
    """
    def __init__(self, sequence_length: int = 5):
        self.sequence_length = sequence_length
        self.feature_columns = [
            'log_export_value',
            'log_export_net_weight',
            'fob_unit_value',
            'destination_market_share',
            'trade_growth_yoy',
            'log_gdp',
            'log_population',
            'applied_tariff_rate',
            'rta_active',
            'log_locode_count',
            'log_active_buyers',
            'sanctions_present'
        ]

    def engineer_base_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Computes logarithmic transforms, momentum indicators, and ratios on panel data.
        Ensures sorting by corridor and chronological year.
        """
        df = df.copy()
        
        # Sort panel
        partner_col = 'importer_iso3' if 'importer_iso3' in df.columns else 'exporter_iso3'
        df = df.sort_values(by=[partner_col, 'hs6', 'year']).reset_index(drop=True)
        
        # Logarithmic transformations
        df['log_export_value'] = np.log1p(np.maximum(0.0, df['export_value_usd'].fillna(0.0)))
        df['log_export_net_weight'] = np.log1p(np.maximum(0.0, df['export_net_weight_kg'].fillna(0.0)))
        df['fob_unit_value'] = df['fob_unit_value_usd_per_kg'].fillna(0.0)
        df['destination_market_share'] = df['destination_market_share_pct'].fillna(0.0)
        
        # Economic & Infrastructure logs
        df['log_gdp'] = np.log1p(np.maximum(0.0, df['destination_gdp'].fillna(0.0)))
        df['log_population'] = np.log1p(np.maximum(0.0, df['destination_population'].fillna(0.0)))
        df['applied_tariff_rate'] = df['destination_applied_tariff_rate'].fillna(0.0)
        df['rta_active'] = df['rta_exists'].fillna(0).astype(float)
        
        locode_col = 'destination_locode_count' if 'destination_locode_count' in df.columns else 'supplier_locode_count'
        df['log_locode_count'] = np.log1p(np.maximum(0.0, df[locode_col].fillna(0.0)))
        
        buyer_col = 'gleif_active_buyer_count' if 'gleif_active_buyer_count' in df.columns else 'gleif_active_supplier_count'
        df['log_active_buyers'] = np.log1p(np.maximum(0.0, df[buyer_col].fillna(0.0)))
        
        sanct_col = 'sanctions_present' if 'sanctions_present' in df.columns else 'sanctions_entity_count'
        df['sanctions_present'] = np.where(df[sanct_col] > 0, 1.0, 0.0)
        
        # Corridor-level grouped momentum and lag features
        group_cols = [partner_col, 'hs6']
        
        # Lagged demand and unit value
        df['lag1_export_net_weight'] = df.groupby(group_cols)['export_net_weight_kg'].shift(1).fillna(0.0)
        df['lag2_export_net_weight'] = df.groupby(group_cols)['export_net_weight_kg'].shift(2).fillna(0.0)
        df['lag3_export_net_weight'] = df.groupby(group_cols)['export_net_weight_kg'].shift(3).fillna(0.0)
        
        df['lag1_fob_unit_value'] = df.groupby(group_cols)['fob_unit_value_usd_per_kg'].shift(1).fillna(0.0)
        df['lag2_fob_unit_value'] = df.groupby(group_cols)['fob_unit_value_usd_per_kg'].shift(2).fillna(0.0)
        
        # YoY trade volume growth rate
        prev_weight = df.groupby(group_cols)['export_net_weight_kg'].shift(1)
        curr_weight = df['export_net_weight_kg']
        growth_raw = np.where(
            prev_weight > 0,
            ((curr_weight - prev_weight) / prev_weight),
            0.0
        )
        df['trade_growth_yoy'] = np.nan_to_num(np.clip(growth_raw, -1.0, 5.0), nan=0.0)
        
        # Rolling 3-year mean and CAGR momentum
        df['roll3_mean_weight'] = df.groupby(group_cols)['export_net_weight_kg'].transform(
            lambda s: s.rolling(3, min_periods=1).mean()
        ).fillna(0.0)
        
        df['roll3_mean_value'] = df.groupby(group_cols)['export_value_usd'].transform(
            lambda s: s.rolling(3, min_periods=1).mean()
        ).fillna(0.0)
        
        df['roll3_mean_price'] = df.groupby(group_cols)['fob_unit_value_usd_per_kg'].transform(
            lambda s: s.rolling(3, min_periods=1).mean()
        ).fillna(0.0)
        
        # 3-year CAGR
        shift3_val = df.groupby(group_cols)['export_value_usd'].shift(3)
        cagr_raw = np.where(
            shift3_val > 0,
            (np.maximum(0.0, df['export_value_usd']) / shift3_val) ** (1.0 / 3.0) - 1.0,
            0.0
        )
        df['cagr_3yr'] = np.nan_to_num(np.clip(cagr_raw, -0.5, 2.0), nan=0.0)

        
        return df

    def create_sequence_dataset(
        self,
        df: pd.DataFrame,
        split_train_end: int = 2020,
        split_val_end: int = 2022,
        split_test_end: int = 2024
    ) -> Dict[str, Any]:
        """
        Creates sequence tensors of shape (N, sequence_length, num_features)
        and dual-head targets (N, 2) [demand_kg, price_usd_per_kg] partitioned chronologically.
        """
        df_feat = self.engineer_base_features(df)
        partner_col = 'importer_iso3' if 'importer_iso3' in df_feat.columns else 'exporter_iso3'
        
        corridors = df_feat[[partner_col, 'hs6']].drop_duplicates().values
        
        train_X, train_y_demand, train_y_price, train_meta = [], [], [], []
        val_X, val_y_demand, val_y_price, val_meta = [], [], [], []
        test_X, test_y_demand, test_y_price, test_meta = [], [], [], []
        
        feature_cols = self.feature_columns
        
        for partner, hs6 in corridors:
            sub = df_feat[(df_feat[partner_col] == partner) & (df_feat['hs6'] == hs6)].sort_values('year')
            if len(sub) < self.sequence_length + 1:
                continue
                
            years = sub['year'].values
            feats = sub[feature_cols].values
            target_demand = sub['export_net_weight_kg'].values
            target_price = sub['fob_unit_value_usd_per_kg'].values
            
            for i in range(len(sub) - self.sequence_length):
                target_year = years[i + self.sequence_length]
                seq_x = feats[i:i + self.sequence_length]
                y_d = target_demand[i + self.sequence_length]
                y_p = target_price[i + self.sequence_length]
                
                meta = {
                    'partner_iso3': partner,
                    'hs6': hs6,
                    'target_year': target_year,
                    'country_name': sub.iloc[i + self.sequence_length].get('importer_country_name', partner)
                }
                
                if target_year <= split_train_end:
                    train_X.append(seq_x)
                    train_y_demand.append(y_d)
                    train_y_price.append(y_p)
                    train_meta.append(meta)
                elif target_year <= split_val_end:
                    val_X.append(seq_x)
                    val_y_demand.append(y_d)
                    val_y_price.append(y_p)
                    val_meta.append(meta)
                elif target_year <= split_test_end:
                    test_X.append(seq_x)
                    test_y_demand.append(y_d)
                    test_y_price.append(y_p)
                    test_meta.append(meta)
                    
        return {
            'train': {
                'X': np.array(train_X, dtype=np.float32),
                'y_demand': np.array(train_y_demand, dtype=np.float32),
                'y_price': np.array(train_y_price, dtype=np.float32),
                'meta': pd.DataFrame(train_meta)
            },
            'val': {
                'X': np.array(val_X, dtype=np.float32),
                'y_demand': np.array(val_y_demand, dtype=np.float32),
                'y_price': np.array(val_y_price, dtype=np.float32),
                'meta': pd.DataFrame(val_meta)
            },
            'test': {
                'X': np.array(test_X, dtype=np.float32),
                'y_demand': np.array(test_y_demand, dtype=np.float32),
                'y_price': np.array(test_y_price, dtype=np.float32),
                'meta': pd.DataFrame(test_meta)
            },
            'feature_names': feature_cols
        }

