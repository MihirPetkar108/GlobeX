import sys
import io
import pandas as pd
from pathlib import Path

# Fix Windows console encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from brain.models.partner_discovery.data import PartnerDataLoader

def main():
    loader = PartnerDataLoader(data_dir="backend/brain_temporary/data")
    df = loader.load_data(direction="EXPORT", canonical_slice=False, hs6=100630, exclude_wld=True)
    
    df_2025 = df[df['year'] == 2025]
    print(f"Total rows in 2025: {len(df_2025)}")
    print(f"Unique countries in 2025: {df_2025['importer_iso3'].nunique()}")
    
    # Check why there are multiple rows per country
    sample_usa = df_2025[df_2025['importer_iso3'] == 'USA']
    print("\n--- SAMPLE USA ROWS IN 2025 ---")
    print(sample_usa[['year', 'importer_country_name', 'export_value_usd', 'export_net_weight_kg', 'fob_unit_value_usd_per_kg', 'tariff_type', 'tariff_scope']].to_string())

if __name__ == "__main__":
    main()
