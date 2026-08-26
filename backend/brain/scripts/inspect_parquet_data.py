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
    cat = loader.get_product_catalogue()
    print("=== PRODUCT CATALOGUE (First 20) ===")
    print(cat.head(20).to_string())
    print("\nTotal products in catalogue:", len(cat))
    
    # Test product resolutions
    test_queries = [
        "Basmati Rice",
        "1000 kg basmati rice",
        "rice",
        "1006.30",
        "100630",
        "Cotton Yarn",
        "Black Pepper",
        "Cashews",
        "Turmeric",
        "Shrimp",
        "Tea",
        "Coffee",
        "Wheat"
    ]
    
    print("\n=== TESTING PRODUCT RESOLUTIONS ===")
    for q in test_queries:
        res = loader.resolve_product(q)
        print(f"Query: '{q}' => Status: {res['status']} | HS6: {res['hs6']} | Desc: {res['product_description']}")
        
    # Inspect actual columns and values for HS 100630
    df = loader.load_data(direction="EXPORT", canonical_slice=False, hs6=100630, exclude_wld=True)
    print("\n=== COLUMNS IN DATASET FOR HS 100630 ===")
    print(list(df.columns))
    print("\n=== SAMPLE ROWS (Latest Year) ===")
    latest_year = df['year'].max() if 'year' in df.columns else 2024
    df_latest = df[df['year'] == latest_year] if 'year' in df.columns else df
    cols_to_show = [c for c in ['year', 'importer_country_name', 'importer_iso3', 'export_net_weight_kg', 'trade_value_usd', 'fob_unit_value_usd_per_kg', 'destination_applied_tariff_rate', 'rta_name'] if c in df.columns]
    print(df_latest[cols_to_show].head(10).to_string())

if __name__ == "__main__":
    main()
