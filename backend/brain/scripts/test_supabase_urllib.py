import urllib.request
import urllib.error
import json
import sys

# Fix encoding
sys.stdout.reconfigure(encoding='utf-8')

supabase_url = "https://inakttzrxtyvzxsqooir.supabase.co"
supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluYWt0dHpyeHR5dnp4c3Fvb2lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczODQ3NzksImV4cCI6MjEwMjk2MDc3OX0.q1saIa_fFqQAqJd07FvBxE0kqHbre_dq61fXCw9myFo"

headers = {
    "apikey": supabase_key,
    "Authorization": f"Bearer {supabase_key}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

print(f"Connecting to Supabase at {supabase_url}...")

tables = [
    "trade_analysis", 
    "organizations", 
    "trades", 
    "trade_documents", 
    "shipments", 
    "escrow_accounts", 
    "blockchain_records", 
    "users",
    "organization_members",
    "listings",
    "disputes",
    "notifications",
    "trust_scores"
]

for table in tables:
    req = urllib.request.Request(f"{supabase_url}/rest/v1/{table}?select=*", headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            print(f"SUCCESS: Table '{table}' exists! Row count: {len(data)}")
            if len(data) > 0:
                print(f"   Sample: {list(data[0].keys())}")
    except urllib.error.HTTPError as e:
        print(f"NOT FOUND / ERROR: Table '{table}' -> HTTP {e.code}: {e.reason}")
    except Exception as e:
        print(f"EXCEPT: Table '{table}' -> {e}")
