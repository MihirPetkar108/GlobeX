-- GLOBEX — User Documents Storage Integration
-- Migration: 20260823160000
--
-- Integrates the existing private 'Documents' Storage bucket into the
-- KYB/registration flow.
--
-- What this migration does:
--   1. Creates public.user_documents table (metadata store)
--   2. Creates Storage RLS policies on the 'documents' bucket
--   3. Creates RLS policies on the user_documents table itself
--
-- Conventions followed:
--   * UUID primary key, no gen_random_uuid() default (consistent with schema)
--   * Reuses existing enums:
--       - public.verification_document_type  (PAN, GST, IEC, etc.)
--       - public.verification_document_status (PENDING, VERIFIED, REJECTED)
--   * Nullable fields match ER diagram style
--   * No blockchain/escrow references
--   * No DROP, TRUNCATE, ALTER on existing tables
-- ============================================================


-- ============================================================
-- STEP 1: Create the user_documents metadata table
-- ============================================================

create table public.user_documents (
  id                  uuid primary key,
  user_id             uuid not null references public.users(id),
  document_type       public.verification_document_type not null,
  file_name           varchar(500) not null,
  file_path           varchar(1000) not null,
  mime_type           varchar(100) not null,
  file_size           bigint not null check (file_size > 0 and file_size <= 10485760),
  verification_status public.verification_document_status not null default 'PENDING',
  uploaded_at         timestamptz not null,
  verified_at         timestamptz null,
  verified_by         uuid null references public.users(id),
  rejection_reason    text null,
  is_active           boolean not null default true
);

create index idx_user_documents_user_id
  on public.user_documents (user_id);

create index idx_user_documents_status
  on public.user_documents (verification_status);

create index idx_user_documents_user_status
  on public.user_documents (user_id, verification_status);


-- ============================================================
-- STEP 2: Enable Row-Level Security on user_documents
-- ============================================================

alter table public.user_documents enable row level security;


-- ============================================================
-- STEP 3: RLS Policies — user_documents table
-- ============================================================

-- 3a: Users read their own document records
create policy "users_select_own_documents"
  on public.user_documents
  for select
  using (
    auth.uid() = (
      select auth_id from public.users where id = user_documents.user_id
    )
  );

-- 3b: Users insert their own document records
create policy "users_insert_own_documents"
  on public.user_documents
  for insert
  with check (
    auth.uid() = (
      select auth_id from public.users where id = user_documents.user_id
    )
  );

-- 3c: Users can soft-delete (is_active = false) only their own records
--     but cannot change verification fields
create policy "users_update_own_documents"
  on public.user_documents
  for update
  using (
    auth.uid() = (
      select auth_id from public.users where id = user_documents.user_id
    )
  )
  with check (
    verification_status = (select d.verification_status from public.user_documents d where d.id = user_documents.id)
    and verified_by is not distinct from (select d.verified_by from public.user_documents d where d.id = user_documents.id)
    and verified_at is not distinct from (select d.verified_at from public.user_documents d where d.id = user_documents.id)
  );

-- 3d: Authorized internal reviewers can read ALL document records
create policy "reviewers_select_all_documents"
  on public.user_documents
  for select
  using (
    exists (
      select 1 from public.users u
      where u.auth_id = auth.uid()
        and u.account_type = 'INTERNAL'
        and u.platform_role in (
          'SUPER_ADMIN',
          'ADMIN',
          'VERIFICATION_OFFICER',
          'COMPLIANCE_OFFICER'
        )
        and u.is_active = true
    )
  );

-- 3e: Authorized internal reviewers can update verification status
create policy "reviewers_update_verification_status"
  on public.user_documents
  for update
  using (
    exists (
      select 1 from public.users u
      where u.auth_id = auth.uid()
        and u.account_type = 'INTERNAL'
        and u.platform_role in (
          'SUPER_ADMIN',
          'ADMIN',
          'VERIFICATION_OFFICER',
          'COMPLIANCE_OFFICER'
        )
        and u.is_active = true
    )
  );


-- ============================================================
-- STEP 4: Storage RLS Policies — 'Documents' bucket
-- ============================================================
-- Bucket is already PRIVATE. We add granular policies only.
-- Path pattern enforced: documents/{user_id}/{document_type}/{filename}
-- ============================================================

-- 4a: Authenticated users upload only into their own folder
create policy "users_upload_own_documents"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'Documents'
    and (storage.foldername(name))[1] = (
      select id::text from public.users
      where auth_id = auth.uid()
      limit 1
    )
  );

-- 4b: Authenticated users can read their own documents (for signed URL generation)
create policy "users_read_own_documents"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'Documents'
    and (storage.foldername(name))[1] = (
      select id::text from public.users
      where auth_id = auth.uid()
      limit 1
    )
  );

-- 4c: Authenticated users can delete their own documents
create policy "users_delete_own_documents"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'Documents'
    and (storage.foldername(name))[1] = (
      select id::text from public.users
      where auth_id = auth.uid()
      limit 1
    )
  );

-- 4d: Authorized internal reviewers can read ALL documents in the bucket
create policy "reviewers_read_all_documents"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'Documents'
    and exists (
      select 1 from public.users u
      where u.auth_id = auth.uid()
        and u.account_type = 'INTERNAL'
        and u.platform_role in (
          'SUPER_ADMIN',
          'ADMIN',
          'VERIFICATION_OFFICER',
          'COMPLIANCE_OFFICER'
        )
        and u.is_active = true
    )
  );


-- ============================================================
-- END OF MIGRATION
-- ============================================================
