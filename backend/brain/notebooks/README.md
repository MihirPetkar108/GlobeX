# GlobeX Machine Learning & Data Science Notebook Laboratory

This directory contains the end-to-end Exploratory Data Analysis (EDA), Feature Engineering, Hyperparameter Optimization, and Model Training pipelines for all 6 core machine learning models powering the GlobeX Global Trade Platform.

---

## 📚 Notebook Catalog

| # | Notebook | Primary Problem & Objective | Dataset Source | Model Family | Key Output Artifacts |
|---|:---|:---|:---|:---|:---|
| **01** | [`01_Trade_Anomaly_Detection.ipynb`](./01_Trade_Anomaly_Detection.ipynb) | Detects customs value misdeclarations, unit price deviations, and volume surges. | `02_trade_anomaly_dl.csv` | **XGBoost Classifier** + Stratified GridSearchCV + TreeSHAP | `xgboost_anomaly_model.joblib`<br/>`preprocessor.joblib` |
| **02** | [`02_Trade_Risk_Assessment_Ensemble.ipynb`](./02_Trade_Risk_Assessment_Ensemble.ipynb) | 6-factor multidimensional risk scoring (Counterparty, Transaction, Regulatory, Document, Shipment). | `04_trade_risk_eda.csv`<br/>`04_trade_risk_ml.csv` | **Isolation Forest** + `RobustScaler` + Risk Calibration | `isolation_forest.joblib`<br/>`robust_scaler.joblib` |
| **03** | [`03_Global_Partner_Demand_Forecaster.ipynb`](./03_Global_Partner_Demand_Forecaster.ipynb) | 25-year bilateral demand forecaster across HS6 corridors with probabilistic uncertainty intervals. | `01_partner_discovery_india_as_exporter_eda.csv` | **XGBoost Quantile Regressors** (Q10, Q50, Q90) | `demand_q10.joblib`<br/>`demand_q50.joblib`<br/>`demand_q90.joblib` |
| **04** | [`04_Destination_Country_Ranking_Engine.ipynb`](./04_Destination_Country_Ranking_Engine.ipynb) | Multi-criteria destination market ranking across 4 selectable strategy regimes (`balanced`, `aggressive`, `conservative`, `risk_averse`). | `destination_country_ranking_features.csv` | **Multi-Criteria Decision Analysis (MCDA)** + Dynamic Normalizer | `ranking_weights.json`<br/>Recommendation Matrices |
| **05** | [`05_Counterparty_Matching_and_Trust_Scoring.ipynb`](./05_Counterparty_Matching_and_Trust_Scoring.ipynb) | Semantic commodity matchmaking, capacity alignment, and composite trust scoring (0-100). | `01_partner_discovery_ml.csv` | **Semantic Vectorizer** + Multi-Factor Trust Calibrator | `verified_counterparties.json` |
| **06** | [`06_Document_Intelligence_and_Verification.ipynb`](./06_Document_Intelligence_and_Verification.ipynb) | Document entity extraction, cross-document weight/date reconciliation, and SHA-256 digital proofs. | `03_document_intelligence_eda.csv` | **Rule-based & Regex NER** + Cross-Doc Reconciler | Extracted schemas & Hash proofs |

---

## 🔬 Rigorous Human Data Science Workflow Applied in Each Notebook

Each notebook follows a thorough, human-crafted data science methodology:
1. **Dataset Ingestion & BFM4**: Shape, `.info()`, data types, memory profiling.
2. **Extended Percentile Audit**: Inspecting 1st, 5th, 25th, 50th, 75th, 95th, and 99th percentiles for heavy-tailed trade distributions.
3. **Missing Value Diagnostics**: Null pattern matrix and non-blind imputation reasoning.
4. **Visual Exploratory Analysis**: Univariate histograms, KDEs, boxplots, bivariate scatterplots, and Pearson/Spearman correlation heatmaps.
5. **Feature Engineering & Preprocessing**: Domain transformations (unit prices, log-transforms, lag features, rolling statistics, robust scaling).
6. **Multi-Model Benchmarking**: Comparing baseline algorithms (Logistic/Linear, Random Forest, Isolation Forest, XGBoost).
7. **Hyperparameter Tuning**: Cross-validation (Stratified K-Fold / TimeSeriesSplit) using `GridSearchCV`.
8. **Evaluation & Explainability**: Confusion matrices, ROC/PR curves, regression metrics (RMSE, MAE, R², PICP), and TreeSHAP attribution.
9. **Model Persistence**: Serializing trained models and preprocessors to `.joblib` / `.json` for production deployment.
