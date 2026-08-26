import sys
import io
from pathlib import Path

# Fix Windows console encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from brain.models.partner_discovery.inference import recommend_destinations

def main():
    res = recommend_destinations(
        "basmati rice",
        requested_quantity_kg=1000.0,
        top_n=20,
        data_dir="backend/brain_temporary/data",
        model_dir="backend/brain_temporary/models/partner_discovery/forecasting"
    )
    
    print(f"Product: {res['product_resolution']['product_description']} (HS {res['product_resolution']['hs6']})")
    print(f"Total Evaluated: {res['total_candidates_evaluated']}")
    print("-" * 85)
    print(f"{'Rank':<5} {'Country':<25} {'ISO3':<6} {'Opp Score':<12} {'Risk Penalty':<14} {'Risk Level':<12} {'Final Score':<12}")
    print("-" * 85)
    
    for i, r in enumerate(res['top_recommendations']):
        dest = r['destination']
        scores = r['scores']
        risk = r['risk']
        print(f"#{i+1:<4} {dest['country_name']:<25} {dest['iso3']:<6} {scores['opportunity_score']:<12.2f} {scores['risk_penalty']:<14.1f} {risk['risk_level']:<12} {scores['final_score']:<12.2f}")
        if r['pros']:
            print(f"     [PRO]: {r['pros'][0]}")
        if r['cons']:
            print(f"     [CON]: {r['cons'][0]}")
        print()

if __name__ == "__main__":
    main()
