-- GLOBEX — Row-Level Security + migration-history documentation
-- Fixes GitHub issue #1 (zero RLS across 22 multi-tenant tables) and
-- issue #7 (escrow_accounts/blockchain_records created -> dropped -> recreated
-- across three earlier migrations, with the second definition winning).
--
-- Design:
--   * Existing migrations (20260822111809, 20260822120632, 20260823000000) are
--     NOT edited or reordered — they are shared history, already applied by
--     other developers, and this project's own RED-file protocol forbids
--     rewriting applied migrations. This file documents the churn via
--     COMMENT ON TABLE instead, and is purely additive from here down.
--   * The `postgres` role (used by local Supabase superuser connections and by
--     this backend's SUPABASE_DB_URL/DATABASE_URL connection per src/db/client.py)
--     is a superuser and bypasses RLS unconditionally, so the FastAPI backend's
--     own direct-Postgres access is unaffected by everything below. These
--     policies protect the threat this ticket calls out specifically: direct
--     PostgREST/Supabase-client access (anon/authenticated JWT roles), where no
--     policy has ever existed to enforce organization_id scoping.
--   * `listings`, `organizations`, and `trust_scores` intentionally keep SELECT
--     broader than org-membership: the product is a B2B marketplace where
--     counterparties must be able to discover each other's active listings,
--     look up an organization's basic profile, and see a prospective partner's
--     trust score before trading. Mutations on all three stay scoped to the
--     owning org (or internal staff / system for the computed trust_scores).

-- ============================================================
-- 0. Historical documentation (issue #7)
-- ============================================================

comment on table public.blockchain_records is
  'Anchored document/trade hashes. Defined in 20260822111809, dropped in '
  '20260822120632, recreated with a different column set in 20260823000000 — '
  'that later definition is canonical. Read this table''s current columns from '
  '20260823000000_n8n_integration_tables.sql, not from the initial schema file.';

comment on table public.escrow_accounts is
  'Escrow ledger rows. Defined in 20260822111809, dropped in 20260822120632, '
  'recreated with a different column set (USDC-specific fields, tx hashes) in '
  '20260823000000 — that later definition is canonical. No financial escrow '
  'capability exists yet in blockchain/contracts/TradeLedger.sol; this table is '
  'schema-only until issue #8 (real financial escrow) is scoped and built.';

-- ============================================================
-- 1. Helper functions (security definer: safe to reference
--    RLS-protected tables from inside a policy without recursion)
-- ============================================================

create or replace function public.current_app_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.users where auth_id = auth.uid();
$$;

create or replace function public.is_internal_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where auth_id = auth.uid() and platform_role is not null
  );
$$;

create or replace function public.user_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select om.organization_id
  from public.organization_members om
  join public.users u on u.id = om.user_id
  where u.auth_id = auth.uid() and om.is_active = true;
$$;

create or replace function public.user_matches_trade(p_trade_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.trades t
    where t.id = p_trade_id
      and (t.exporter_id in (select public.user_org_ids())
           or t.importer_id in (select public.user_org_ids()))
  );
$$;

-- ============================================================
-- 2. Enable RLS on every application table
-- ============================================================

alter table public.users enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.member_invitations enable row level security;
alter table public.audit_log enable row level security;
alter table public.notifications enable row level security;
alter table public.verification_documents enable row level security;
alter table public.verification_reviews enable row level security;
alter table public.listings enable row level security;
alter table public.trades enable row level security;
alter table public.trade_documents enable row level security;
alter table public.trade_offers enable row level security;
alter table public.trust_scores enable row level security;
alter table public.shipments enable row level security;
alter table public.delivery_confirmations enable row level security;
alter table public.disputes enable row level security;
alter table public.blockchain_records enable row level security;
alter table public.escrow_accounts enable row level security;
alter table public.trade_analysis enable row level security;
alter table public.shipment_events enable row level security;
alter table public.trade_data_ingestion_log enable row level security;

-- ============================================================
-- 3. Policies
-- ============================================================

-- users: self, or internal staff can see/manage everyone
create policy users_select on public.users
  for select to authenticated
  using (auth_id = auth.uid() or public.is_internal_staff());

create policy users_update on public.users
  for update to authenticated
  using (auth_id = auth.uid() or public.is_internal_staff())
  with check (auth_id = auth.uid() or public.is_internal_staff());

create policy users_staff_write on public.users
  for insert to authenticated
  with check (public.is_internal_staff());

create policy users_staff_delete on public.users
  for delete to authenticated
  using (public.is_internal_staff());

-- organizations: directory-style SELECT for any signed-in user (needed for
-- counterparty discovery); mutation scoped to members of that org or staff
create policy organizations_select on public.organizations
  for select to authenticated
  using (true);

create policy organizations_insert on public.organizations
  for insert to authenticated
  with check (true);

create policy organizations_update on public.organizations
  for update to authenticated
  using (id in (select public.user_org_ids()) or public.is_internal_staff())
  with check (id in (select public.user_org_ids()) or public.is_internal_staff());

create policy organizations_delete on public.organizations
  for delete to authenticated
  using (public.is_internal_staff());

-- organization_members: visible/manageable by members of the same org, or staff
create policy organization_members_all on public.organization_members
  for all to authenticated
  using (organization_id in (select public.user_org_ids()) or public.is_internal_staff())
  with check (organization_id in (select public.user_org_ids()) or public.is_internal_staff());

-- member_invitations: same org, or staff
create policy member_invitations_all on public.member_invitations
  for all to authenticated
  using (organization_id in (select public.user_org_ids()) or public.is_internal_staff())
  with check (organization_id in (select public.user_org_ids()) or public.is_internal_staff());

-- audit_log: append-only, own entries visible, staff sees all
create policy audit_log_select on public.audit_log
  for select to authenticated
  using (user_id = public.current_app_user_id() or public.is_internal_staff());

create policy audit_log_insert on public.audit_log
  for insert to authenticated
  with check (user_id = public.current_app_user_id() or public.is_internal_staff());

-- notifications: own inbox only; system/staff generates them
create policy notifications_select on public.notifications
  for select to authenticated
  using (user_id = public.current_app_user_id());

create policy notifications_update on public.notifications
  for update to authenticated
  using (user_id = public.current_app_user_id())
  with check (user_id = public.current_app_user_id());

create policy notifications_staff_insert on public.notifications
  for insert to authenticated
  with check (public.is_internal_staff());

-- verification_documents: own org, or staff (verification officers review all)
create policy verification_documents_all on public.verification_documents
  for all to authenticated
  using (organization_id in (select public.user_org_ids()) or public.is_internal_staff())
  with check (organization_id in (select public.user_org_ids()) or public.is_internal_staff());

-- verification_reviews: own org can read outcomes; only staff writes reviews
create policy verification_reviews_select on public.verification_reviews
  for select to authenticated
  using (organization_id in (select public.user_org_ids()) or public.is_internal_staff());

create policy verification_reviews_staff_write on public.verification_reviews
  for all to authenticated
  using (public.is_internal_staff())
  with check (public.is_internal_staff());

-- listings: ACTIVE listings are marketplace-public; owning org sees/manages all
-- of its own regardless of status
create policy listings_select on public.listings
  for select to authenticated
  using (
    status = 'ACTIVE'
    or organization_id in (select public.user_org_ids())
    or public.is_internal_staff()
  );

create policy listings_insert on public.listings
  for insert to authenticated
  with check (organization_id in (select public.user_org_ids()) or public.is_internal_staff());

create policy listings_update on public.listings
  for update to authenticated
  using (organization_id in (select public.user_org_ids()) or public.is_internal_staff())
  with check (organization_id in (select public.user_org_ids()) or public.is_internal_staff());

create policy listings_delete on public.listings
  for delete to authenticated
  using (organization_id in (select public.user_org_ids()) or public.is_internal_staff());

-- trades: either counterparty org, or staff
create policy trades_select on public.trades
  for select to authenticated
  using (
    exporter_id in (select public.user_org_ids())
    or importer_id in (select public.user_org_ids())
    or public.is_internal_staff()
  );

create policy trades_insert on public.trades
  for insert to authenticated
  with check (
    exporter_id in (select public.user_org_ids())
    or importer_id in (select public.user_org_ids())
    or public.is_internal_staff()
  );

create policy trades_update on public.trades
  for update to authenticated
  using (
    exporter_id in (select public.user_org_ids())
    or importer_id in (select public.user_org_ids())
    or public.is_internal_staff()
  )
  with check (
    exporter_id in (select public.user_org_ids())
    or importer_id in (select public.user_org_ids())
    or public.is_internal_staff()
  );

-- trade_documents / trade_offers / shipments / disputes / blockchain_records /
-- escrow_accounts / shipment_events: all keyed by trade_id, scoped via the
-- same trades org-match helper
create policy trade_documents_all on public.trade_documents
  for all to authenticated
  using (public.user_matches_trade(trade_id) or public.is_internal_staff())
  with check (public.user_matches_trade(trade_id) or public.is_internal_staff());

create policy trade_offers_all on public.trade_offers
  for all to authenticated
  using (public.user_matches_trade(trade_id) or public.is_internal_staff())
  with check (public.user_matches_trade(trade_id) or public.is_internal_staff());

create policy shipments_all on public.shipments
  for all to authenticated
  using (public.user_matches_trade(trade_id) or public.is_internal_staff())
  with check (public.user_matches_trade(trade_id) or public.is_internal_staff());

create policy disputes_all on public.disputes
  for all to authenticated
  using (public.user_matches_trade(trade_id) or public.is_internal_staff())
  with check (public.user_matches_trade(trade_id) or public.is_internal_staff());

-- blockchain_records / escrow_accounts: org-visible, but system/staff-only
-- writes (both are populated by the backend after real anchoring/escrow
-- lifecycle events, never directly by a trading party)
create policy blockchain_records_select on public.blockchain_records
  for select to authenticated
  using (public.user_matches_trade(trade_id) or public.is_internal_staff());

create policy blockchain_records_staff_write on public.blockchain_records
  for all to authenticated
  using (public.is_internal_staff())
  with check (public.is_internal_staff());

create policy escrow_accounts_select on public.escrow_accounts
  for select to authenticated
  using (public.user_matches_trade(trade_id) or public.is_internal_staff());

create policy escrow_accounts_staff_write on public.escrow_accounts
  for all to authenticated
  using (public.is_internal_staff())
  with check (public.is_internal_staff());

create policy shipment_events_select on public.shipment_events
  for select to authenticated
  using (public.user_matches_trade(trade_id) or public.is_internal_staff());

create policy shipment_events_staff_write on public.shipment_events
  for all to authenticated
  using (public.is_internal_staff())
  with check (public.is_internal_staff());

-- delivery_confirmations: via shipments.trade_id
create policy delivery_confirmations_all on public.delivery_confirmations
  for all to authenticated
  using (
    public.is_internal_staff()
    or exists (
      select 1 from public.shipments s
      where s.id = delivery_confirmations.shipment_id
        and public.user_matches_trade(s.trade_id)
    )
  )
  with check (
    public.is_internal_staff()
    or exists (
      select 1 from public.shipments s
      where s.id = delivery_confirmations.shipment_id
        and public.user_matches_trade(s.trade_id)
    )
  );

-- trust_scores: any authenticated user may look up a prospective partner's
-- score (needed for marketplace trust display); only staff/system computes it
create policy trust_scores_select on public.trust_scores
  for select to authenticated
  using (true);

create policy trust_scores_staff_write on public.trust_scores
  for all to authenticated
  using (public.is_internal_staff())
  with check (public.is_internal_staff());

-- trade_analysis: own org's analyses, or the requesting user's own anonymous
-- (org_id null) runs, or staff
create policy trade_analysis_all on public.trade_analysis
  for all to authenticated
  using (
    (org_id is not null and org_id in (select public.user_org_ids()))
    or user_id = public.current_app_user_id()
    or public.is_internal_staff()
  )
  with check (
    (org_id is not null and org_id in (select public.user_org_ids()))
    or user_id = public.current_app_user_id()
    or public.is_internal_staff()
  );

-- trade_data_ingestion_log: internal/system audit only, no org concept
create policy trade_data_ingestion_log_staff_only on public.trade_data_ingestion_log
  for all to authenticated
  using (public.is_internal_staff())
  with check (public.is_internal_staff());
