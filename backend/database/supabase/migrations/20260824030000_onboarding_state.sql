-- GLOBEX — Onboarding state machine support
-- Adds server-persisted onboarding progress to organizations (additive only,
-- no existing column/table changed) and two RLS bootstrap policies that were
-- missing before this migration: without them, a brand-new authenticated
-- user could not insert their own public.users row, nor become the founding
-- ORGANIZATION_ADMIN of an organization they just created — both are
-- required by the real register -> onboarding -> dashboard flow.

-- ============================================================
-- 1. Onboarding progress columns on organizations
-- ============================================================

alter table public.organizations
  add column onboarding_step varchar(30) not null default 'PROFILE'
    check (onboarding_step in ('PROFILE', 'BUSINESS_TYPE', 'VERIFICATION', 'DONE')),
  add column onboarding_completed boolean not null default false,
  add column onboarding_completed_at timestamptz null;

-- ============================================================
-- 2. RLS bootstrap policies
-- ============================================================

-- A freshly-authenticated user has no public.users row yet (Supabase Auth
-- only creates auth.users). Allow self-insert, but never let a user grant
-- themselves a platform_role (staff roles stay staff-assigned only).
create policy users_self_insert on public.users
  for insert to authenticated
  with check (auth_id = auth.uid() and platform_role is null);

-- organization_members_all's existing USING/WITH CHECK requires
-- organization_id already in user_org_ids() — which is empty for a org
-- that has zero members yet, so the very first membership row for a
-- brand-new org could never be inserted. This policy allows exactly one
-- case: a user inserting themselves as ORGANIZATION_ADMIN into an org that
-- currently has no members at all (i.e. becoming its founder). Joining an
-- existing org goes through member_invitations, not this policy.
create policy organization_members_self_bootstrap on public.organization_members
  for insert to authenticated
  with check (
    user_id = public.current_app_user_id()
    and organization_role = 'ORGANIZATION_ADMIN'
    and not exists (
      select 1 from public.organization_members om2
      where om2.organization_id = organization_members.organization_id
    )
  );
