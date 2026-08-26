import os
import re
from typing import Optional, Union, Dict, Any, List, Tuple
import numpy as np
import pandas as pd
import pyarrow.parquet as pq

class PartnerDataLoader:
    """
    Data loader and validation module for the 26-year (2000-2025) and
    canonical recent-history (2010-2025) partner discovery datasets.
    """
    def __init__(self, data_dir: Optional[str] = None):
        if data_dir is None:
            # Discover data directory relative to repository root
            candidates = [
                "data",
                "../data",
                os.path.join(os.path.dirname(__file__), "../../data")
            ]
            for c in candidates:
                if os.path.exists(os.path.join(c, "processed", "partner_discovery_exporter_2000_2025.parquet")) or \
                   os.path.exists(os.path.join(c, "processed", "01_partner_discovery_india_as_exporter.parquet")):
                    data_dir = c
                    break
        if data_dir is None:
            data_dir = "data"
        self.data_dir = data_dir

    def get_parquet_path(self, direction: str = "EXPORT", canonical_slice: bool = False) -> str:
        """Returns the appropriate Parquet path for the requested direction and time window."""
        dir_key = "exporter" if direction.upper() in ["EXPORT", "EXPORTER"] else "importer"
        slice_suffix = "2010_2025" if canonical_slice else "2000_2025"
        
        primary_path = os.path.join(self.data_dir, "processed", f"partner_discovery_{dir_key}_{slice_suffix}.parquet")
        if os.path.exists(primary_path):
            return primary_path
            
        fallback_path = os.path.join(self.data_dir, "processed", f"01_partner_discovery_india_as_{dir_key}.parquet")
        if os.path.exists(fallback_path):
            return fallback_path
            
        # Check brain fallback
        candidate_brain = os.path.join("brain", "processed", f"01_partner_discovery_india_as_{dir_key}.parquet")
        if os.path.exists(candidate_brain):
            return candidate_brain
        brain_path = os.path.join("backend", "brain", "processed", f"01_partner_discovery_india_as_{dir_key}.parquet")
        if os.path.exists(brain_path):
            return brain_path

        raise FileNotFoundError(f"Parquet dataset not found for direction={direction}, slice={canonical_slice}. Checked {primary_path}")

    def load_data(
        self,
        direction: str = "EXPORT",
        canonical_slice: bool = False,
        hs6: Optional[int] = None,
        exclude_wld: bool = True
    ) -> pd.DataFrame:
        """
        Loads the Parquet trade panel dataset with strict type enforcement and aggregate filtering.
        """
        path = self.get_parquet_path(direction=direction, canonical_slice=canonical_slice)
        df = pd.read_parquet(path)
        
        partner_col = "importer_iso3" if direction.upper() in ["EXPORT", "EXPORTER"] else "exporter_iso3"
        
        if exclude_wld and partner_col in df.columns:
            df = df[df[partner_col].str.upper() != "WLD"].copy()
            
        if hs6 is not None:
            df = df[df['hs6'] == int(hs6)].copy()
            
        return df

    def get_product_catalogue(self) -> pd.DataFrame:
        """Returns unique HS6 codes and product descriptions."""
        path = self.get_parquet_path(direction="EXPORT", canonical_slice=False)
        df = pd.read_parquet(path, columns=['hs6', 'product_description'])
        cat = df.drop_duplicates().sort_values('hs6').reset_index(drop=True)
        return cat

    def resolve_product(self, query: Union[str, int]) -> Dict[str, Any]:
        """
        Resolves product queries (exact HS6, numeric with dots/prefixes, text description, or synonyms)
        to a canonical HS6 code and description.
        """
        cat = self.get_product_catalogue()
        
        # 1. Check numeric / sanitized HS code lookup (e.g. 100630, 1006.30, HS 1006.30, HS100630)
        query_raw = str(query).strip()
        digits_only = re.sub(r'[^0-9]', '', query_raw)
        
        if len(digits_only) >= 4:
            # Try exact 6-digit match or prefix 4-digit match
            if len(digits_only) == 6 or len(digits_only) == 5:
                hs6_candidate = int(digits_only)
                match = cat[cat['hs6'] == hs6_candidate]
                if not match.empty:
                    return {
                        "status": "exact_match",
                        "match_type": "hs6_code",
                        "hs6": int(match.iloc[0]['hs6']),
                        "product_description": str(match.iloc[0]['product_description']),
                        "candidates": match.to_dict('records')
                    }
            elif len(digits_only) == 4:
                prefix = int(digits_only)
                match = cat[cat['hs6'].astype(str).str.startswith(str(prefix)) | cat['hs6'].apply(lambda x: f"{x:06d}".startswith(str(prefix)))]
                if not match.empty:
                    return {
                        "status": "exact_match" if len(match) == 1 else "ambiguous_match",
                        "match_type": "hs4_prefix",
                        "hs6": int(match.iloc[0]['hs6']),
                        "product_description": str(match.iloc[0]['product_description']),
                        "candidates": match.to_dict('records')
                    }

        query_str = query_raw.lower()
        
        # 2. Comprehensive Trade Synonym Dictionary
        COMMODITY_SYNONYMS = {
            "basmati": 100630,
            "rice": 100630,
            "paddy": 100630,
            "1121": 100630,
            "shrimp": 30617,
            "shrimps": 30617,
            "prawn": 30617,
            "prawns": 30617,
            "vannamei": 30617,
            "seafood": 30617,
            "coffee": 90121,
            "arabica": 90121,
            "robusta": 90121,
            "tea": 90240,
            "green tea": 90240,
            "black tea": 90240,
            "pepper": 90411,
            "black pepper": 90411,
            "spices": 90411,
            "seeds": 120999,
            "basil": 120999,
            "basil seeds": 120999,
            "palm oil": 151190,
            "oil": 151190,
            "rbd": 151190,
            "coal": 270112,
            "crude": 270900,
            "petroleum": 270900,
            "diesel": 271019,
            "gas oil": 271019,
            "silicon": 280461,
            "api": 293339,
            "heterocyclic": 293339,
            "medicaments": 300490,
            "medicine": 300490,
            "pharma": 300490,
            "drugs": 300490,
            "formulations": 300490,
            "fertiliser": 310520,
            "fertilizer": 310520,
            "npk": 310520,
            "plastic": 390110,
            "plastics": 390110,
            "polyethylene": 390110,
            "cotton": 520512,
            "cotton yarn": 520512,
            "yarn": 520512,
            "textiles": 520512,
            "t-shirt": 610910,
            "t-shirts": 610910,
            "tshirt": 610910,
            "apparel": 610910,
            "trouser": 620342,
            "trousers": 620342,
            "jeans": 620342,
            "tiles": 690721,
            "ceramic": 690721,
            "diamond": 710239,
            "diamonds": 710239,
            "jewellery": 711319,
            "jewelry": 711319,
            "gold": 711319,
            "steel": 720839,
            "hot rolled steel": 720839,
            "coils": 720839,
            "towers": 730890,
            "structures": 730890,
            "aluminium": 760110,
            "aluminum": 760110,
            "turbines": 841199,
            "turbo": 841199,
            "aerospace": 841199,
            "laptop": 847130,
            "laptops": 847130,
            "tablets": 847130,
            "automation": 847989,
            "machinery": 847989,
            "inverter": 850440,
            "inverters": 850440,
            "static converters": 850440,
            "phones": 851713,
            "smartphone": 851713,
            "smartphones": 851713,
            "solar": 854143,
            "solar panels": 854143,
            "photovoltaic": 854143,
            "car": 870322,
            "cars": 870322,
            "vehicles": 870322,
            "auto parts": 870829
        }
        
        # Check synonym dictionary against all query tokens
        for syn_key, target_hs in COMMODITY_SYNONYMS.items():
            if syn_key in query_str:
                match = cat[cat['hs6'] == target_hs]
                if not match.empty:
                    return {
                        "status": "exact_match",
                        "match_type": "synonym_lookup",
                        "hs6": int(match.iloc[0]['hs6']),
                        "product_description": str(match.iloc[0]['product_description']),
                        "candidates": match.to_dict('records')
                    }
        
        # 3. Exact text description match
        exact = cat[cat['product_description'].str.lower() == query_str]
        if not exact.empty:
            return {
                "status": "exact_match",
                "match_type": "exact_description",
                "hs6": int(exact.iloc[0]['hs6']),
                "product_description": str(exact.iloc[0]['product_description']),
                "candidates": exact.to_dict('records')
            }
            
        # 4. Tokenized keyword substring match
        words = [w for w in re.split(r'\W+', query_str) if len(w) > 2]
        if not words:
            words = [query_str]
            
        matches = []
        for _, row in cat.iterrows():
            desc = str(row['product_description']).lower()
            score = sum(1 for w in words if w in desc)
            if score > 0:
                matches.append((score, row))
                
        if matches:
            matches.sort(key=lambda x: x[0], reverse=True)
            top_score = matches[0][0]
            top_candidates = [m[1] for m in matches if m[0] == top_score]
            cand_df = pd.DataFrame(top_candidates)
            
            return {
                "status": "exact_match" if len(cand_df) == 1 else "ambiguous_match",
                "match_type": "keyword_search",
                "hs6": int(cand_df.iloc[0]['hs6']),
                "product_description": str(cand_df.iloc[0]['product_description']),
                "candidates": cand_df.to_dict('records')
            }
            
        return {
            "status": "not_found",
            "match_type": "none",
            "hs6": None,
            "product_description": None,
            "candidates": []
        }

