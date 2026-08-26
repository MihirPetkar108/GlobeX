import os
import sys
import numpy as np
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq

def convert_raw_csv_to_parquet(
    raw_csv_path: str = "data/data/final_csv/01_partner_discovery_india_as_exporter_eda.csv",
    output_parquet_paths: list[str] = None
) -> pd.DataFrame:
    """
    Reads the raw India-as-exporter CSV, applies deterministic schema and type normalization,
    and writes the analytical dataset to Parquet format using PyArrow.
    """
    if output_parquet_paths is None:
        output_parquet_paths = [
            "data/processed/01_partner_discovery_india_as_exporter.parquet",
            "data_pipeline/data/processed/01_partner_discovery_india_as_exporter.parquet"
        ]
        
    if not os.path.exists(raw_csv_path):
        # Check alternative root-relative paths
        alt_paths = [
            "../" + raw_csv_path,
            "01_partner_discovery_india_as_exporter_eda.csv",
            os.path.join(os.path.dirname(__file__), "../../", raw_csv_path)
        ]
        found = False
        for p in alt_paths:
            if os.path.exists(p):
                raw_csv_path = p
                found = True
                break
        if not found:
            raise FileNotFoundError(f"Source raw CSV not found at {raw_csv_path}")

    print(f"[Ingestion] Reading raw CSV from: {raw_csv_path}")
    df = pd.read_csv(raw_csv_path)
    raw_rows = len(df)
    print(f"[Ingestion] Raw records: {raw_rows:,} rows, {df.shape[1]} columns")

    # Column Mapping from raw variants
    rename_map = {
        'reporter_iso3': 'exporter_iso3',
        'partner_iso3': 'importer_iso3',
        'partner_name': 'importer_country_name',
        'partner_iso2': 'importer_iso2',
        'partner_numeric': 'importer_numeric',
        'gdp_usd': 'destination_gdp',
        'gdp_per_capita_usd': 'destination_gdp_per_capita',
        'gdp_growth_pct': 'destination_gdp_growth',
        'inflation_pct': 'destination_inflation',
        'population': 'destination_population',
        'trade_pct_gdp': 'destination_trade_pct_gdp',
        'tariff_rate': 'destination_applied_tariff_rate',
        'partner_locode_count': 'destination_locode_count',
        'partner_port_count': 'destination_port_count',
        'partner_airport_count': 'destination_airport_count',
        'partner_inland_terminal_count': 'destination_inland_terminal_count'
    }
    for old_c, new_c in rename_map.items():
        if old_c in df.columns and new_c not in df.columns:
            df[new_c] = df[old_c]

    # Exporter ISO2
    if 'exporter_iso2' not in df.columns:
        df['exporter_iso2'] = 'IN'

    # Export net weight & fob unit value
    if 'export_net_weight_kg' not in df.columns and 'net_weight_kg' in df.columns:
        df['export_net_weight_kg'] = df['net_weight_kg']

    if 'destination_market_share_pct' not in df.columns:
        # Calculate market share per hs6 and year
        yearly_total = df.groupby(['hs6', 'year'])['export_value_usd'].transform('sum')
        df['destination_market_share_pct'] = np.where(yearly_total > 0, (df['export_value_usd'] / yearly_total) * 100.0, 0.0)

    if 'mfn_tariff_rate' not in df.columns:
        df['mfn_tariff_rate'] = df['destination_applied_tariff_rate']

    if 'tariff_preference_margin' not in df.columns:
        df['tariff_preference_margin'] = np.maximum(0.0, df['mfn_tariff_rate'] - df['destination_applied_tariff_rate'])

    if 'gleif_buyer_count' not in df.columns:
        df['gleif_buyer_count'] = df.get('transaction_count', 0)
    if 'gleif_active_buyer_count' not in df.columns:
        df['gleif_active_buyer_count'] = df.get('transaction_count', 0)

    # Schema & Type Normalization
    # 1. String columns
    str_cols = [
        'exporter_iso3', 'exporter_iso2', 'importer_iso3', 'importer_iso2',
        'importer_country_name', 'currency_code', 'currency_name',
        'product_description', 'tariff_type', 'rta_name', 'rta_status',
        'rta_type', 'rta_coverage', 'scomet_category', 'scomet_item_reference'
    ]
    for col in str_cols:
        if col in df.columns:
            df[col] = df[col].astype('string')

    # 2. Integer identifiers and counts
    int_cols = [
        'importer_numeric', 'hs6', 'year', 'transaction_count',
        'destination_locode_count', 'destination_port_count',
        'destination_airport_count', 'destination_inland_terminal_count',
        'scomet_match_flag', 'gleif_buyer_count', 'gleif_active_buyer_count',
        'sanctions_entity_count', 'ofac_entity_count', 'sanctions_present'
    ]
    for col in int_cols:
        if col in df.columns:
            df[col] = df[col].fillna(0).astype('int64')

    # 3. Numeric floating-point measures
    float_cols = [
        'export_value_usd', 'export_net_weight_kg', 'quantity',
        'fob_unit_value_usd_per_kg', 'destination_market_share_pct',
        'destination_gdp', 'destination_gdp_per_capita', 'destination_gdp_growth',
        'destination_inflation', 'destination_population', 'destination_trade_pct_gdp',
        'destination_applied_tariff_rate', 'mfn_tariff_rate', 'tariff_preference_margin',
        'rta_exists'
    ]
    for col in float_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').astype('float64')

    # 4. Parse RTA date fields
    if 'rta_entry_into_force' in df.columns:
        df['rta_entry_into_force'] = pd.to_datetime(df['rta_entry_into_force'], errors='coerce')

    # Write to Parquet using PyArrow engine
    for out_path in output_parquet_paths:
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        df.to_parquet(out_path, engine='pyarrow', index=False, compression='snappy')
        print(f"[Ingestion] Wrote Parquet analytical dataset to: {out_path} ({os.path.getsize(out_path):,} bytes)")

    # Validate reload
    test_load = pd.read_parquet(output_parquet_paths[0], engine='pyarrow')
    assert len(test_load) == raw_rows, f"Row count mismatch: {len(test_load)} vs {raw_rows}"
    print(f"[Ingestion] Successfully verified Parquet dataset reload ({len(test_load):,} rows, {test_load.shape[1]} columns).")

    return test_load

if __name__ == "__main__":
    convert_raw_csv_to_parquet()
