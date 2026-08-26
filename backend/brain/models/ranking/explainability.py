import pandas as pd
from typing import List

def generate_reasons_for_ranking(df: pd.DataFrame) -> List[str]:
    """
    Generates standardized, transparent, evidence-grounded reason codes
    for each ranked destination country.
    """
    reasons_list = []
    for _, row in df.iterrows():
        reasons = []

        # 1. Demand signal
        if row.get('demand_score', 0) >= 70.0:
            reasons.append("HIGH_REVEALED_DEMAND")
        elif row.get('demand_score', 0) <= 30.0:
            reasons.append("EMERGING_DEMAND")

        # 2. Growth signal
        if row.get('growth_score', 0) >= 70.0:
            reasons.append("STRONG_RECENT_GROWTH")

        # 3. Tariff & Trade Access
        tariff = row.get('tariff_rate', 10.0)
        if tariff <= 5.0:
            reasons.append("LOW_TARIFF")
        elif tariff >= 20.0:
            reasons.append("ELEVATED_TARIFF_BARRIER")

        if "Yes" in str(row.get('rta', '')):
            reasons.append("RTA_SUPPORT")

        # 4. Logistics
        if row.get('logistics_score', 0) >= 70.0:
            reasons.append("STRONG_LOGISTICS")

        # 5. Buyer ecosystem
        if row.get('buyer_score', 0) >= 70.0:
            reasons.append("ACTIVE_BUYER_ECOSYSTEM")

        # 6. Stability
        if row.get('stability_score', 0) >= 70.0:
            reasons.append("STABLE_CORRIDOR")

        # 7. Quantity Fit
        if row.get('quantity_fit', 0) >= 85.0:
            reasons.append("QUANTITY_FITS_HISTORY")
        elif row.get('quantity_fit', 0) <= 40.0:
            reasons.append("HIGH_VOLUME_STRAIN")

        # 8. Risk flags
        risk_flag_str = str(row.get('risk_flag', 'NONE'))
        if risk_flag_str != 'NONE':
            reasons.append("RISK_FLAG_ACTIVE")
        if "SCOMET" in risk_flag_str:
            reasons.append("SCOMET_ALERT")

        if not reasons:
            reasons.append("BALANCED_COMPOSITE_SCORE")

        reasons_list.append("; ".join(reasons))

    return reasons_list
