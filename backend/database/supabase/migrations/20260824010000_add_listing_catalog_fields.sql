-- GLOBEX — Listing catalog fields
-- Migration: 20260824010000_add_listing_catalog_fields
--
-- CreateListingPage.tsx collects origin_port, certifications, lead_time_days,
-- minimum_order_quantity, and free-form specs, but public.listings had no
-- columns for them — the values were silently dropped between the form and
-- the database. This migration adds the missing columns so the marketplace
-- can read back what exporters actually submitted instead of relying on a
-- client-side-only, fabricated copy of the listing.
--
-- Purely additive: no existing column or row is modified.

alter table public.listings
  add column if not exists origin_port text,
  add column if not exists certifications text[] not null default '{}',
  add column if not exists lead_time_days integer,
  add column if not exists minimum_order_quantity numeric(18,4),
  add column if not exists specs jsonb not null default '{}'::jsonb;

comment on column public.listings.origin_port is 'Origin sea/air port as entered on the listing form (e.g. "Mundra Port (INMUN)").';
comment on column public.listings.certifications is 'Certification labels (ISO 22000, FSSAI, etc.) as entered on the listing form.';
comment on column public.listings.lead_time_days is 'Exporter-stated lead time in days.';
comment on column public.listings.minimum_order_quantity is 'Minimum order quantity in the same unit as public.listings.unit.';
comment on column public.listings.specs is 'Free-form spec parameter/value pairs entered on the listing form.';
