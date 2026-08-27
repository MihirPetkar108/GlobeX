import shutil
from pathlib import Path

src_base = Path(r"C:\Users\Aryan\Downloads\brain_temporary")
dst_base = Path(r"C:\Users\Aryan\Downloads\BhugolX\GlobeX\backend\brain")

# 1. Models
dst_models = dst_base / "models"

# Trade Anomaly
dst_ta = dst_models / "trade_anomaly"
dst_ta.mkdir(parents=True, exist_ok=True)
src_ta = src_base / "models" / "trade_anomaly"
if src_ta.exists():
    for f in src_ta.glob("*"):
        if f.is_file():
            shutil.copy2(f, dst_ta / f.name)
            print(f"Copied {f.name} -> {dst_ta}")

# Trade Risk
dst_tr = dst_models / "trade_risk"
dst_tr.mkdir(parents=True, exist_ok=True)
src_tr = src_base / "models" / "trade_risk"
if src_tr.exists():
    for f in src_tr.glob("*"):
        if f.is_file():
            shutil.copy2(f, dst_tr / f.name)
            print(f"Copied {f.name} -> {dst_tr}")

# Partner Discovery (forecasting + destination_ranking)
dst_pd = dst_models / "partner_discovery"
dst_pd_fc = dst_pd / "forecasting"
dst_pd_dr = dst_pd / "destination_ranking"
dst_pd_fc.mkdir(parents=True, exist_ok=True)
dst_pd_dr.mkdir(parents=True, exist_ok=True)

src_fc = src_base / "models" / "partner_forecasting"
if src_fc.exists():
    for f in src_fc.glob("*"):
        if f.is_file():
            shutil.copy2(f, dst_pd_fc / f.name)
            print(f"Copied {f.name} -> {dst_pd_fc}")

src_dr = src_base / "models" / "destination_ranking"
if src_dr.exists():
    for f in src_dr.glob("*"):
        if f.is_file():
            shutil.copy2(f, dst_pd_dr / f.name)
            print(f"Copied {f.name} -> {dst_pd_dr}")

# Also copy partner_forecasting & destination_ranking directly to models/ for existing loaders
dst_pf_direct = dst_models / "partner_forecasting"
dst_pf_direct.mkdir(parents=True, exist_ok=True)
if src_fc.exists():
    for f in src_fc.glob("*"):
        if f.is_file():
            shutil.copy2(f, dst_pf_direct / f.name)

dst_dr_direct = dst_models / "destination_ranking"
dst_dr_direct.mkdir(parents=True, exist_ok=True)
if src_dr.exists():
    for f in src_dr.glob("*"):
        if f.is_file():
            shutil.copy2(f, dst_dr_direct / f.name)

# 2. Data
dst_data_processed = dst_base / "data" / "processed"
dst_data_processed.mkdir(parents=True, exist_ok=True)
src_processed = src_base / "data" / "processed"
if src_processed.exists():
    for f in src_processed.glob("*"):
        if f.is_file():
            shutil.copy2(f, dst_data_processed / f.name)
            print(f"Copied {f.name} -> {dst_data_processed}")

# Also mirror into backend/brain/processed for loader candidates
dst_processed = dst_base / "processed"
dst_processed.mkdir(parents=True, exist_ok=True)
if src_processed.exists():
    for f in src_processed.glob("*"):
        if f.is_file():
            shutil.copy2(f, dst_processed / f.name)

# Copy CSVs into backend/brain/data/final_csv
dst_final_csv = dst_base / "data" / "final_csv"
dst_final_csv.mkdir(parents=True, exist_ok=True)
src_final_csv = src_base / "data_pipeline" / "data" / "final_csv"
if src_final_csv.exists():
    for f in src_final_csv.glob("*"):
        if f.is_file():
            shutil.copy2(f, dst_final_csv / f.name)
            print(f"Copied {f.name} -> {dst_final_csv}")

print("Artifact copying complete!")
