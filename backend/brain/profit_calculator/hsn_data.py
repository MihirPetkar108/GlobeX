"""
HSN (Harmonized System of Nomenclature) data loader for India tariff/duty calculations.

Provides cached access to HSN codes with associated duties and tax rates.
"""

import functools
from pathlib import Path
import pandas as pd


# Resolve the HSN CSV path relative to repository root
def _get_hsn_csv_path() -> Path:
    """Return the absolute path to the HSN dataset CSV."""
    # Find the repo root by looking for main.py
    current = Path(__file__).resolve()
    while current != current.parent:
        if (current / "main.py").exists():
            return current / "backend" / "brain" / "data" / "india-hsn-dataset-main" / "india-hsn-dataset-main" / "india-hsn-2026.csv"
        current = current.parent

    # Fallback (should not be reached if file structure is correct)
    raise RuntimeError("Could not locate repository root (main.py not found)")


@functools.lru_cache(maxsize=1)
def load_hsn_table() -> pd.DataFrame:
    """
    Load and cache the HSN (India tariff/duty) reference table.

    Returns:
        pd.DataFrame: HSN codes (as index) with tariff rates and tax percentages.
            Index: hsn (8-digit code as string to preserve leading zeros)
            Columns: description, chapter, bcd_pct, sws_pct_of_bcd,
                    igst_pct, cess_pct, igst_verification, bcd_verification, as_of

    Raises:
        FileNotFoundError: If the HSN CSV file is not found.
        pd.errors.ParserError: If the CSV cannot be parsed.
    """
    csv_path = _get_hsn_csv_path()

    # Load the CSV with hsn as string type to preserve leading zeros
    # pd.read_csv will raise FileNotFoundError if file doesn't exist
    df = pd.read_csv(csv_path, dtype={"hsn": str})

    # Index by HSN code for efficient lookups
    return df.set_index("hsn")
