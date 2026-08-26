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
    
    print("Unique countries for HS 100630:", df['importer_iso3'].nunique())
    print("Unique years:", sorted(df['year'].unique()))
    
    # Let's inspect latest year data sorted by trade_value_usd
    latest_year = df['year'].max()
    latest = df[df['year'] == latest_year].sort_values('export_value_usd', ascending=False)
    
    cols = ['importer_country_name', 'importer_iso3', 'export_value_usd', 'export_net_weight_kg', 'fob_unit_value_usd_per_kg', 'destination_applied_tariff_rate', 'rta_name', 'sanctions_present']
    print(f"\n=== TOP 20 COUNTRIES BY EXPORT VALUE IN {latest_year} FOR BASMATI RICE ===")
    print(latest[cols].head(25).to_string())

if __name__ == "__main__":
    main()
