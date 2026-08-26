import sys
import io
from pathlib import Path

# Fix Windows console encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from brain.models.partner_discovery.inference import recommend_destinations

def main():
    queries = [
        "1006.30",
        "HS 1006.30",
        "Basmati Rice",
        "1000 kg basmati rice",
        "0904.11",
        "Black Pepper",
        "520512",
        "Cotton Yarn",
        "Shrimp",
        "Coffee",
        "Tea",
        "Diamonds",
        "Gold Jewellery",
        "Solar Panels",
        "Diesel"
    ]
    
    for q in queries:
        r = recommend_destinations(
            q,
            requested_quantity_kg=1000.0,
            top_n=3,
            data_dir="backend/brain_temporary/data",
            model_dir="backend/brain_temporary/models/partner_discovery/forecasting"
        )
        if r['status'] == 'error':
            print(f"❌ Query '{q}' failed: {r['message']}")
            continue
            
        top1 = r['top_recommendations'][0]
        print(f"✅ Query: '{q}'")
        print(f"   Resolved HS: {r['product_resolution']['hs6']} ({r['product_resolution']['product_description']})")
        print(f"   Top Destination: #{top1['destination']['country_name']} ({top1['destination']['iso3']})")
        print(f"   Annual Demand: {top1['forecast']['annual_market_demand_kg']/1000:,.1f} MT")
        print(f"   Expected FOB: ${top1['forecast']['expected_fob_price_usd_per_kg']:.2f} / kg")
        print(f"   Est. Revenue for 1,000 kg: ${top1['forecast']['estimated_shipment_revenue_usd']:,.2f} USD")
        print(f"   Pro: {top1['pros'][0] if top1['pros'] else 'N/A'}")
        print()

if __name__ == "__main__":
    main()
