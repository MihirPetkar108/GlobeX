import os
import re
import pandas as pd
from typing import Optional, Union, List, Dict, Any

class ProductResolver:
    """
    Resolves user product queries (HS6 code, exact description, or keyword query)
    against the analytical product catalogue.
    """
    def __init__(self, parquet_path: Optional[str] = None):
        if parquet_path is None:
            # Default candidates
            candidates = [
                "brain/processed/01_partner_discovery_india_as_exporter.parquet",
                "backend/brain/processed/01_partner_discovery_india_as_exporter.parquet",
                "data/processed/01_partner_discovery_india_as_exporter.parquet",
                "data_pipeline/data/processed/01_partner_discovery_india_as_exporter.parquet",
                os.path.join(os.path.dirname(__file__), "../brain/processed/01_partner_discovery_india_as_exporter.parquet"),
                os.path.join(os.path.dirname(__file__), "../../brain/processed/01_partner_discovery_india_as_exporter.parquet"),
                os.path.join(os.path.dirname(__file__), "../../backend/brain/processed/01_partner_discovery_india_as_exporter.parquet"),
                os.path.join(os.path.dirname(__file__), "../../data/processed/01_partner_discovery_india_as_exporter.parquet")
            ]
            for p in candidates:
                if os.path.exists(p):
                    parquet_path = p
                    break
        
        if parquet_path is None or not os.path.exists(parquet_path):
            raise FileNotFoundError(f"Processed Parquet dataset not found at {parquet_path}")

        self.parquet_path = parquet_path
        self._catalogue = self._build_catalogue()

    def _build_catalogue(self) -> pd.DataFrame:
        """Loads unique HS6 and product descriptions from Parquet."""
        df = pd.read_parquet(self.parquet_path, columns=['hs6', 'product_description'])
        cat = df.drop_duplicates().sort_values('hs6').reset_index(drop=True)
        return cat

    @property
    def catalogue(self) -> pd.DataFrame:
        """Returns the available product catalogue."""
        return self._catalogue.copy()

    def resolve(self, query: Union[str, int]) -> Dict[str, Any]:
        """
        Resolves a product query to a canonical HS6 code and description.
        Returns a dictionary with status, match_type, hs6, product_description,
        and candidates if ambiguous.
        """
        if isinstance(query, int) or (isinstance(query, str) and query.strip().isdigit()):
            hs6_int = int(query)
            match = self._catalogue[self._catalogue['hs6'] == hs6_int]
            if not match.empty:
                return {
                    "status": "exact_match",
                    "match_type": "hs6_code",
                    "hs6": int(match.iloc[0]['hs6']),
                    "product_description": str(match.iloc[0]['product_description']),
                    "candidates": match.to_dict('records')
                }
            return {
                "status": "not_found",
                "match_type": "hs6_code",
                "hs6": hs6_int,
                "product_description": None,
                "candidates": []
            }

        query_str = str(query).strip().lower()
        
        # 1. Check exact string match (case-insensitive)
        exact = self._catalogue[self._catalogue['product_description'].str.lower() == query_str]
        if not exact.empty:
            return {
                "status": "exact_match",
                "match_type": "exact_description",
                "hs6": int(exact.iloc[0]['hs6']),
                "product_description": str(exact.iloc[0]['product_description']),
                "candidates": exact.to_dict('records')
            }

        # 2. Check substring keyword match
        # Handle special keywords like "basmati", "pepper", "rice", "cotton", "oil", etc.
        words = [w for w in re.split(r'\W+', query_str) if len(w) > 2]
        if not words:
            words = [query_str]

        # Score candidates by matching word count
        matches = []
        for _, row in self._catalogue.iterrows():
            desc = str(row['product_description']).lower()
            score = sum(1 for w in words if w in desc)
            if score > 0:
                matches.append((score, row))

        if matches:
            # Sort descending by word match count
            matches.sort(key=lambda x: x[0], reverse=True)
            top_score = matches[0][0]
            top_candidates = [m[1] for m in matches if m[0] == top_score]
            
            cand_df = pd.DataFrame(top_candidates)
            if len(cand_df) == 1:
                return {
                    "status": "exact_match",
                    "match_type": "keyword_search",
                    "hs6": int(cand_df.iloc[0]['hs6']),
                    "product_description": str(cand_df.iloc[0]['product_description']),
                    "candidates": cand_df.to_dict('records')
                }
            else:
                return {
                    "status": "ambiguous_match",
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

def resolve_product(query: Union[str, int], parquet_path: Optional[str] = None) -> Dict[str, Any]:
    """Convenience helper function to resolve a product query."""
    resolver = ProductResolver(parquet_path)
    return resolver.resolve(query)
