-- GlobeXAI — Escrow Settlement Columns
-- Migration: 20260824020000_escrow_settlement_columns
--
-- Purpose: extend public.escrow_accounts (added in 20260823000000) so the
-- real TradeEscrow.sol lifecycle can be persisted end to end. Additive only
-- — no existing column, table, or RLS policy is modified or dropped, per
-- the DB rule in Claude_Blockchain_Design_Integration_Pack/04_N8N_BLOCKCHAIN_REWIRE.md:94-99.
--
-- public.escrow_status currently has PENDING/FUNDED/HELD/RELEASED/REFUNDED/
-- DISPUTED (20260822111809). TradeEscrow.sol's on-chain state machine also
-- has RESOLVED (dispute settled with a split) — add it here so the DB can
-- represent that terminal state truthfully instead of forcing it into
-- RELEASED or REFUNDED.

alter type public.escrow_status add value if not exists 'RESOLVED';

-- Tx hash evidence for the two lifecycle events the original columns didn't
-- cover (create_tx_hash/release_tx_hash already existed).
alter table public.escrow_accounts
  add column if not exists dispute_tx_hash varchar(100);

alter table public.escrow_accounts
  add column if not exists resolve_tx_hash varchar(100);

-- On-chain party addresses. public.organizations has no wallet-address
-- column, so these are recorded per-escrow at creation time (on the local
-- demo chain, the well-known Hardhat account addresses).
alter table public.escrow_accounts
  add column if not exists buyer_address varchar(100);

alter table public.escrow_accounts
  add column if not exists seller_address varchar(100);

alter table public.escrow_accounts
  add column if not exists token_address varchar(100);

-- Third release condition mirroring TradeEscrow.sol's ConditionKind.SHIPMENT
-- (docs_verified and inspection_ok already existed).
alter table public.escrow_accounts
  add column if not exists shipment_delivered boolean default false;

-- Existing policies escrow_accounts_select / escrow_accounts_staff_write
-- (20260824000000_row_level_security_and_schema_notes.sql) already cover
-- this table with no column-level restrictions, so they need no change.
