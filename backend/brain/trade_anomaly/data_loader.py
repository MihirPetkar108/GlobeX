"""
Trade Anomaly Ingestion & Data Management Module — GLOBEX Trade OS
Loads raw trade anomaly data, validates schemas, converts to optimized columnar Parquet,
and provides fast indexed retrieval of corridor historical time-series.
"""

import os
from pathlib import Path
from typing import Optional, Tuple, Dict, Any, List
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq

# Default directory paths
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
RAW_CSV_PATH = PROJECT_ROOT / "backend" / "brain" / "data" / "final_csv" / "02_trade_anomaly_dl.csv"
PROCESSED_DIR = PROJECT_ROOT / "backend" / "brain" / "processed" / "trade_anomaly"
PARQUET_PATH = PROCESSED_DIR / "02_trade_anomaly.parquet"


def validate_and_convert_csv_to_parquet(
    raw_csv_path: Optional[Path] = None,
    output_parquet_path: Optional[Path] = None
) -> pd.DataFrame:
    """
    Ingests the raw 02_trade_anomaly_dl.csv dataset, validates data types and constraints,
    and writes a compressed, strongly-typed Parquet file.
    
    Returns the cleaned pandas DataFrame.
    """
    src_path = Path(raw_csv_path) if raw_csv_path else RAW_CSV_PATH
    dest_path = Path(output_parquet_path) if output_parquet_path else PARQUET_PATH
    
    if not src_path.exists():
        raise FileNotFoundError(f"Raw source CSV not found at: {src_path}")
    
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Read raw CSV
    df = pd.read_csv(src_path)
    
    # Validation checks
    assert len(df) == 12288, f"Expected 12,288 rows, found {len(df)}"
    assert df["period"].nunique() == 48, f"Expected 48 periods, found {df['period'].nunique()}"
    
    # Cast types strictly
    df["period"] = df["period"].astype(int)
    df["reporter_iso3"] = df["reporter_iso3"].astype(str).str.strip()
    df["partner_iso3"] = df["partner_iso3"].astype(str).str.strip()
    df["hs6"] = df["hs6"].astype(int)
    df["trade_flow"] = df["trade_flow"].astype(str).str.strip()
    df["product_description"] = df["product_description"].astype(str)
    df["quantity_unit"] = df["quantity_unit"].astype(str)
    df["anomaly_type"] = df["anomaly_type"].astype(str).str.strip()
    df["label_source"] = df["label_source"].astype(str).str.strip()
    df["anomaly_flag"] = df["anomaly_flag"].astype(int)
    df["new_corridor_flag"] = df["new_corridor_flag"].astype(int)
    df["mirror_missing_flag"] = df["mirror_missing_flag"].astype(int)
    
    float_cols = [
        "trade_value_usd", "net_weight_kg", "quantity", "unit_value_usd_per_kg",
        "trade_growth_mom", "unit_value_change_mom", "quantity_growth_mom",
        "weight_growth_mom", "yoy_growth", "rolling_mean_3m", "rolling_std_3m",
        "partner_share_pct", "partner_share_change_mom", "mirror_trade_value",
        "mirror_ratio", "mirror_difference"
    ]
    for col in float_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
            
    # Sort deterministically by corridor and period
    df = df.sort_values(
        by=["reporter_iso3", "partner_iso3", "hs6", "trade_flow", "period"]
    ).reset_index(drop=True)
    
    # Write to Parquet using PyArrow
    table = pa.Table.from_pandas(df)
    pq.write_table(table, dest_path, compression="snappy")
    
    return df


def load_trade_anomaly_data(parquet_path: Optional[Path] = None) -> pd.DataFrame:
    """
    Loads the processed trade anomaly dataset from Parquet, converting from CSV if needed.
    """
    p_path = Path(parquet_path) if parquet_path else PARQUET_PATH
    if not p_path.exists():
        return validate_and_convert_csv_to_parquet(output_parquet_path=p_path)
    return pd.read_parquet(p_path)


def get_corridor_history(
    df: pd.DataFrame,
    partner_iso3: str,
    hs6: int,
    trade_flow: str,
    reporter_iso3: str = "IND"
) -> pd.DataFrame:
    """
    Retrieves the complete sorted chronological history for a specific trade corridor.
    """
    partner_clean = str(partner_iso3).strip().upper()
    flow_clean = str(trade_flow).strip().capitalize()
    hs6_clean = int(hs6)
    
    mask = (
        (df["reporter_iso3"] == reporter_iso3) &
        (df["partner_iso3"] == partner_clean) &
        (df["hs6"] == hs6_clean) &
        (df["trade_flow"] == flow_clean)
    )
    
    corridor_df = df[mask].sort_values("period").reset_index(drop=True)
    return corridor_df


def get_dataset_coverage(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Returns the supported partners, products, flows, and period ranges in the dataset.
    """
    return {
        "reporters": sorted(df["reporter_iso3"].unique().tolist()),
        "partners": sorted(df["partner_iso3"].unique().tolist()),
        "hs6_codes": sorted(df["hs6"].unique().tolist()),
        "products": df[["hs6", "product_description"]].drop_duplicates().to_dict("records"),
        "trade_flows": sorted(df["trade_flow"].unique().tolist()),
        "min_period": int(df["period"].min()),
        "max_period": int(df["period"].max()),
        "total_periods": int(df["period"].nunique()),
        "total_corridors": int(df.groupby(["partner_iso3", "hs6", "trade_flow"]).ngroups)
    }
