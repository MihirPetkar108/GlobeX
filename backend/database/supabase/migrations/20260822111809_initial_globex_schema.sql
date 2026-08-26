-- GLOBEX — Initial Supabase schema
-- Source: supplied GLOBEX ER diagram + the five clarified table screenshots.
-- Important:
--   * auth.users is Supabase-managed; this migration does NOT create it.
--   * No RLS policies, triggers, indexes, or extra constraints have been invented
--     where the ER diagram did not specify them.
--   * Fields explicitly marked "null" in the ER are nullable.
--   * UUID defaults are not added unless the ER explicitly showed a default.

-- ============================================================
-- ENUM TYPES
-- ============================================================

create type public.user_account_type as enum (
  'EXTERNAL',
  'INTERNAL'
);

create type public.platform_role as enum (
  'SUPER_ADMIN',
  'VERIFICATION_OFFICER',
  'COMPLIANCE_OFFICER',
  'ARBITRATOR',
  'OPERATIONS'
);

create type public.business_type as enum (
  'EXPORTER',
  'IMPORTER',
  'BOTH'
);

create type public.verification_status as enum (
  'PENDING',
  'UNDER_REVIEW',
  'VERIFIED',
  'REJECTED',
  'SUSPENDED'
);

create type public.organization_role as enum (
  'ORGANIZATION_ADMIN',
  'SALES',
  'COMPLIANCE',
  'LOGISTICS',
  'DELIVERY_STAFF'
);

create type public.member_invitation_status as enum (
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'EXPIRED'
);

create type public.verification_document_type as enum (
  'COMPANY_REGISTRATION',
  'GST_CERTIFICATE',
  'PAN',
  'ADDRESS_PROOF',
  'IEC_EXPORT_LICENSE',
  'IMPORT_LICENSE',
  'PRODUCT_LICENSE',
  'CERTIFICATION',
  'OTHER'
);

create type public.verification_document_status as enum (
  'PENDING',
  'VERIFIED',
  'REJECTED'
);

create type public.verification_review_decision as enum (
  'APPROVED',
  'UNDER_REVIEW',
  'VERIFIED',
  'REJECTED'
);

create type public.listing_status as enum (
  'ACTIVE',
  'SOLD_OUT'
);

create type public.trade_status as enum (
  'CREATED',
  'OFFERED',
  'ACCEPTED',
  'REJECTED',
  'COUNTER_OFFERED',
  'AGREED',
  'IN_PROGRESS',
  'SHIPPED',
  'DELIVERED',
  'DISPUTED',
  'COMPLETED',
  'CANCELLED'
);

create type public.trade_document_type as enum (
  'COMMERCIAL_INVOICE',
  'PACKING_LIST',
  'CERTIFICATE_OF_ORIGIN',
  'INSURANCE',
  'INSPECTION',
  'OTHER'
);

create type public.trade_document_verification_result as enum (
  'UPLOADED',
  'UNDER_REVIEW',
  'VERIFIED',
  'REJECTED'
);

create type public.trade_offer_status as enum (
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'COUNTERED',
  'EXPIRED'
);

create type public.shipment_status as enum (
  'CREATED',
  'DISPATCHED',
  'IN_TRANSIT',
  'ARRIVING',
  'DELIVERED'
);

create type public.inspection_status as enum (
  'ACCEPTED',
  'REJECTED',
  'PARTIAL'
);

create type public.dispute_status as enum (
  'OPEN',
  'UNDER_REVIEW',
  'ARBITRATION',
  'RESOLVED',
  'CLOSED'
);

create type public.escrow_status as enum (
  'PENDING',
  'FUNDED',
  'HELD',
  'RELEASED',
  'REFUNDED',
  'DISPUTED'
);

-- ============================================================
-- 1. USERS
-- Supabase owns auth.users. We only create the application users
-- table and reference auth.users(id).
-- ============================================================

create table public.users (
  id uuid primary key,
  auth_id uuid references auth.users(id),
  first_name varchar(100),
  last_name varchar(100),
  email varchar(255) unique,
  phone varchar(20),
  account_type public.user_account_type,
  platform_role public.platform_role,
  is_active boolean default true,
  created_at timestamptz,
  updated_at timestamptz
);

-- ============================================================
-- 2. ORGANIZATIONS
-- ============================================================

create table public.organizations (
  id uuid primary key,
  legal_name varchar(255),
  trade_name varchar(255),
  business_type public.business_type,
  registered_address text,
  country varchar(100),
  state varchar(100),
  city varchar(100),
  postal_code varchar(20),
  gst_number varchar(50) unique,
  pan_number varchar(50) unique,
  registration_number varchar(100) unique,
  iec_number varchar(50) unique,
  verification_status public.verification_status,
  verified_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
);

-- ============================================================
-- 3. AUDIT LOG
-- ============================================================

create table public.audit_log (
  id uuid primary key,
  user_id uuid references public.users(id),
  action varchar(100),
  entity_type varchar(100),
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  created_at timestamptz
);

-- ============================================================
-- 4. NOTIFICATIONS
-- ============================================================

create table public.notifications (
  id uuid primary key,
  user_id uuid references public.users(id),
  type varchar(50),
  title varchar(255),
  message text,
  is_read boolean default false,
  created_at timestamptz
);

-- ============================================================
-- 5. MEMBER INVITATIONS
-- ============================================================

create table public.member_invitations (
  id uuid primary key,
  organization_id uuid references public.organizations(id),
  email varchar(255),
  invited_role public.organization_role,
  invited_by uuid references public.users(id),
  status public.member_invitation_status,
  token varchar(255),
  expires_at timestamptz,
  created_at timestamptz
);

-- ============================================================
-- 6. VERIFICATION DOCUMENTS
-- ============================================================

create table public.verification_documents (
  id uuid primary key,
  organization_id uuid references public.organizations(id),
  document_type public.verification_document_type,
  file_path varchar(255),
  file_name varchar(255),
  document_number varchar(255),
  status public.verification_document_status,
  uploaded_by uuid references public.users(id),
  verified_at timestamptz null,
  rejection_reason text null,
  expires_at timestamptz null,
  document_hash varchar(64) null,
  created_at timestamptz
);

-- ============================================================
-- 7. VERIFICATION REVIEWS
-- ============================================================

create table public.verification_reviews (
  id uuid primary key,
  organization_id uuid references public.organizations(id),
  reviewer_id uuid references public.users(id),
  decision public.verification_review_decision
);

-- ============================================================
-- 8. LISTINGS
-- ============================================================

create table public.listings (
  id uuid primary key,
  organization_id uuid references public.organizations(id),
  created_by uuid references public.users(id),
  product_name varchar(255),
  product_category varchar(100),
  hs_code varchar(20),
  description text,
  quantity_available numeric(18,4),
  unit varchar(50),
  price numeric(18,2),
  currency varchar(10),
  incoterms varchar(20),
  status public.listing_status,
  created_at timestamptz,
  updated_at timestamptz
);

-- ============================================================
-- 9. ORGANIZATION MEMBERS
-- ============================================================

create table public.organization_members (
  id uuid primary key,
  organization_id uuid references public.organizations(id),
  user_id uuid references public.users(id),
  organization_role public.organization_role,
  is_active boolean default true,
  joined_at timestamptz,
  created_at timestamptz
);

-- ============================================================
-- 10. TRADES
-- ============================================================

create table public.trades (
  id uuid primary key,
  listing_id uuid references public.listings(id),
  exporter_id uuid references public.organizations(id),
  importer_id uuid references public.organizations(id),
  status public.trade_status,
  total_amount numeric(18,2),
  currency varchar(10),
  quantity numeric(18,4),
  agreed_price numeric(18,2),
  created_at timestamptz,
  updated_at timestamptz
);

-- ============================================================
-- 11. TRADE DOCUMENTS
-- ============================================================

create table public.trade_documents (
  id uuid primary key,
  trade_id uuid references public.trades(id),
  uploaded_by uuid references public.users(id),
  document_type public.trade_document_type,
  file_path varchar(255),
  document_hash varchar(64),
  verification_result public.trade_document_verification_result,
  created_at timestamptz
);

-- ============================================================
-- 12. TRADE OFFERS
-- ============================================================

create table public.trade_offers (
  id uuid primary key,
  trade_id uuid references public.trades(id),
  created_by uuid references public.users(id),
  amount numeric(18,2),
  quantity numeric(18,4),
  message text,
  status public.trade_offer_status,
  created_at timestamptz
);

-- ============================================================
-- 13. TRUST SCORES
-- ============================================================

create table public.trust_scores (
  id uuid primary key,
  organization_id uuid references public.organizations(id) unique,
  overall_score numeric(5,2) default 0,
  delivery_score numeric(5,2) default 0,
  compliance_score numeric(5,2) default 0,
  fraud_score numeric(5,2) default 0,
  calculated_at timestamptz
);

-- ============================================================
-- 14. SHIPMENTS
-- ============================================================

create table public.shipments (
  id uuid primary key,
  trade_id uuid references public.trades(id) unique,
  tracking_number varchar(100),
  carrier varchar(100),
  origin_country varchar(100),
  destination_country varchar(100),
  status public.shipment_status,
  estimated_delivery date,
  actual_delivery date,
  created_at timestamptz,
  updated_at timestamptz
);

-- ============================================================
-- 15. DELIVERY CONFIRMATIONS
-- ============================================================

create table public.delivery_confirmations (
  id uuid primary key,
  shipment_id uuid references public.shipments(id),
  otp_hash varchar(255),
  confirmed_by uuid references public.users(id),
  verified_at timestamptz,
  inspection_status public.inspection_status,
  notes text
);

-- ============================================================
-- 16. DISPUTES
-- ============================================================

create table public.disputes (
  id uuid primary key,
  trade_id uuid references public.trades(id) unique,
  raised_by uuid references public.users(id),
  reason text,
  status public.dispute_status,
  resolution text null,
  resolved_by uuid references public.users(id) null,
  resolved_at timestamptz null,
  created_at timestamptz
);

-- ============================================================
-- 17. BLOCKCHAIN RECORDS
-- ============================================================

create table public.blockchain_records (
  id uuid primary key,
  trade_id uuid references public.trades(id),
  document_id uuid references public.trade_documents(id) null,
  record_type varchar(50),
  hash varchar(64),
  blockchain_tx_hash varchar(255),
  network varchar(100),
  created_at timestamptz
);

-- ============================================================
-- 18. ESCROW ACCOUNTS
-- ============================================================

create table public.escrow_accounts (
  id uuid primary key,
  trade_id uuid references public.trades(id) unique,
  buyer_id uuid references public.organizations(id),
  seller_id uuid references public.organizations(id),
  amount numeric(18,2),
  currency varchar(10),
  status public.escrow_status,
  created_at timestamptz,
  updated_at timestamptz
);

-- ============================================================
-- END OF INITIAL SCHEMA
-- ============================================================
