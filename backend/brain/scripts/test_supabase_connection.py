import os
import httpx
from dotenv import load_dotenv

load_dotenv()

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_ANON_KEY")
secret_key = os.getenv("SUPABASE_SECRET_KEY")

headers = {
    "apikey": supabase_key,
    "Authorization": f"Bearer {supabase_key}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

headers_admin = {
    "apikey": secret_key,
    "Authorization": f"Bearer {secret_key}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

print(f"Connecting to Supabase at {supabase_url}...")

# Test querying tables
tables = ["trade_analysis", "organizations", "trades", "trade_documents", "shipments", "escrow_accounts", "blockchain_records"]

with httpx.Client(timeout=10.0) as client:
    for table in tables:
        try:
            r = client.get(f"{supabase_url}/rest/v1/{table}?select=count", headers=headers)
            print(f"Table '{table}': Status {r.status_code} - {r.text[:100]}")
        except Exception as e:
            print(f"Table '{table}': Exception {e}")
