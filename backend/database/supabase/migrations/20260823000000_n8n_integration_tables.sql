-- GlobeXAI — n8n Integration Tables
-- Migration: 20260823000000_n8n_integration_tables
--
-- Purpose: Add tables required by n8n workflow branches that have no
-- canonical equivalent in the initial schema.
--
-- Schema mapping (n8n reference name → canonical table):
--   trade_analysis         → NEW: public.trade_analysis  (analysis results cache)
--   counterparties         → public.organizations         (use existing, no new table)
--   escrow_contracts       → NEW: public.escrow_accounts  (re-added after migration 2 dropped it)
--   document_verifications → public.trade_documents       (use verification_result column, no new table)
--   blockchain_events      → NEW: public.blockchain_records (re-added after migration 2 dropped it)
--   shipment_events        → NEW: public.shipment_events  (milestone tracking for n8n polling)
--   trade_data_ingest      → NEW: public.trade_data_ingestion_log (daily ingest audit)
--
-- Safety: All new tables use IF NOT EXISTS.
-- References only canonical tables that exist after migrations 1+2.
-- Does NOT modify or drop any existing columns or tables.

-- ============================================================
-- 1. TRADE ANALYSIS — Results cache from the Analyze Trade workflow
-- ============================================================
create table if not exists public.trade_analysis (
  id                         uuid primary key default gen_random_uuid(),
  -- Link to the requesting user/org (nullable: analysis can be anonymous)
  user_id                    uuid references public.users(id) on delete set null,
  org_id                     uuid references public.organizations(id) on delete set null,
  -- Input parameters
  product                    text not null,
  hs6                        integer,
  hs_code_str                varchar(20),
  origin_country             varchar(100),
  destination_country        varchar(100),
  quantity_kg                numeric(18,3),
  target_price_usd           numeric(18,2),
  -- ML output dimensions (kept separate per architecture contract)
  market_opportunity_score   numeric(6,2),
  destination_rank           integer,
  trade_anomaly_score        numeric(6,4),
  trade_risk_level           varchar(20),
  counterparty_match_score   numeric(6,2),
  counterparty_risk_score    numeric(6,2),
  compliance_score           numeric(6,2),
  overall_trade_score        numeric(6,2),
  recommendation             varchar(20),  -- PROCEED / REVIEW / AVOID
  -- Full JSON blobs for detailed frontend rendering
  market_opportunity_detail  jsonb,
  trade_anomaly_detail       jsonb,
  counterparty_matches       jsonb,
  compliance_detail          jsonb,
  -- Operational metadata
  analysis_id                varchar(36),  -- UUID string from API
  n8n_execution_id           varchar(100),
  model_versions             jsonb,
  latency_ms                 integer,
  status                     varchar(20) default 'COMPLETED',  -- COMPLETED / PARTIAL / FAILED
  error_detail               text,
  created_at                 timestamptz default now(),
  updated_at                 timestamptz default now()
);

create index if not exists idx_trade_analysis_org_id
  on public.trade_analysis (org_id);
create index if not exists idx_trade_analysis_created_at
  on public.trade_analysis (created_at desc);
create index if not exists idx_trade_analysis_hs6
  on public.trade_analysis (hs6);


-- ============================================================
-- 2. ESCROW ACCOUNTS — Re-added (was dropped in migration 2)
-- Maps to n8n: escrow_contracts
-- ============================================================
create table if not exists public.escrow_accounts (
  id                  uuid primary key default gen_random_uuid(),
  trade_id            uuid references public.trades(id) on delete cascade,
  -- Escrow identifiers from the blockchain/smart contract service
  escrow_id           varchar(100) unique,
  contract_address    varchar(100),
  -- Amounts
  amount_usdc         numeric(18,6),
  amount_usd          numeric(18,2),
  token               varchar(20) default 'USDC',
  -- Transaction hashes (testnet)
  create_tx_hash      varchar(100),
  release_tx_hash     varchar(100),
  -- Status
  status              public.escrow_status default 'PENDING',
  -- Settlement conditions
  docs_verified       boolean default false,
  inspection_ok       boolean default false,
  dispute_active      boolean default false,
  -- Chain metadata
  chain               varchar(50) default 'EVM_TESTNET',
  rpc_url             varchar(255),
  -- Tracking linkage
  tracking_number     varchar(100),
  -- Timestamps
  funded_at           timestamptz,
  released_at         timestamptz,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create index if not exists idx_escrow_accounts_trade_id
  on public.escrow_accounts (trade_id);
create index if not exists idx_escrow_accounts_status
  on public.escrow_accounts (status);


-- ============================================================
-- 3. BLOCKCHAIN RECORDS — Re-added (was dropped in migration 2)
-- Maps to n8n: blockchain_events
-- ============================================================
create table if not exists public.blockchain_records (
  id               uuid primary key default gen_random_uuid(),
  trade_id         uuid references public.trades(id) on delete cascade,
  -- Optional link to the specific document
  document_id      uuid references public.trade_documents(id) on delete set null,
  -- Event classification
  event_type       varchar(50) not null,  -- e.g., DOCUMENT_ANCHOR, ESCROW_CREATE, ESCROW_RELEASE
  -- Hashes and transaction data
  document_hash    varchar(100),
  tx_hash          varchar(100),
  block_number     bigint,
  -- Chain context
  chain            varchar(50) default 'EVM_TESTNET',
  contract_address varchar(100),
  -- Metadata
  metadata         jsonb,
  created_at       timestamptz default now()
);

create index if not exists idx_blockchain_records_trade_id
  on public.blockchain_records (trade_id);
create index if not exists idx_blockchain_records_event_type
  on public.blockchain_records (event_type);


-- ============================================================
-- 4. SHIPMENT EVENTS — Milestone tracking for n8n scheduled polling
-- Maps to n8n: shipment_events
-- Complements public.shipments (status update per poll cycle)
-- ============================================================
create table if not exists public.shipment_events (
  id              uuid primary key default gen_random_uuid(),
  -- Link to canonical shipment
  shipment_id     uuid references public.shipments(id) on delete cascade,
  trade_id        uuid references public.trades(id) on delete cascade,
  tracking_number varchar(100),
  -- Milestone from tracking API
  milestone       varchar(50) not null,  -- CREATED / DISPATCHED / IN_TRANSIT / ARRIVING / RECEIVED / UNKNOWN
  raw_status      text,                  -- Raw status string from carrier API
  -- Boolean shorthand used in n8n conditions
  dispatched      boolean default false,
  received        boolean default false,
  -- Source tracking
  carrier         varchar(100),
  tracking_url    varchar(500),
  -- n8n execution linkage
  n8n_execution_id varchar(100),
  created_at      timestamptz default now()
);

create index if not exists idx_shipment_events_trade_id
  on public.shipment_events (trade_id);
create index if not exists idx_shipment_events_tracking_number
  on public.shipment_events (tracking_number);
create index if not exists idx_shipment_events_created_at
  on public.shipment_events (created_at desc);


-- ============================================================
-- 5. TRADE DATA INGESTION LOG — Audit log for daily n8n data pulls
-- Maps to n8n: trade_data_ingest
-- ============================================================
create table if not exists public.trade_data_ingestion_log (
  id             uuid primary key default gen_random_uuid(),
  -- Source metadata
  source         varchar(50) not null,   -- UN_COMTRADE / WITS / WORLDBANK / OTHER
  source_url     varchar(500),
  -- Row counts
  rows_fetched   integer default 0,
  rows_inserted  integer default 0,
  rows_skipped   integer default 0,
  rows_error     integer default 0,
  -- Temporal window
  period_start   varchar(10),            -- e.g., '2025-01'
  period_end     varchar(10),
  -- Status
  status         varchar(20) default 'SUCCESS',  -- SUCCESS / PARTIAL / FAILED
  error_detail   text,
  -- n8n linkage
  n8n_execution_id varchar(100),
  -- Timing
  duration_ms    integer,
  ingested_at    timestamptz default now()
);

create index if not exists idx_trade_data_ingestion_log_source
  on public.trade_data_ingestion_log (source, ingested_at desc);
