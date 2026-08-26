-- GLOBEX — Add verification audit fields
-- Migration: 20260823093000
--
-- Problem: organizations table mein yeh info missing thi:
--   1. Kisne verification ke liye submit kiya (verification_requested_by)
--   2. Kab submit kiya (verification_requested_at)
--   3. Kisne verify kiya — officer (verified_by)
--
-- verification_reviews table mein missing tha:
--   4. Kab review kiya (reviewed_at)
--   5. Officer ke notes (notes)
--
-- Ab poora flow track hoga:
--   Raj (U001) submits → Priya (U900) reviews & verifies
-- ============================================================


-- ============================================================
-- STEP 1: organizations table mein 3 fields add karo
-- ============================================================

ALTER TABLE public.organizations
  -- Kisne verification ke liye apply kiya (e.g. Raj Sharma = U001)
  ADD COLUMN verification_requested_by uuid references public.users(id),

  -- Kab apply kiya (e.g. 22 Aug 2026 10:30 AM)
  ADD COLUMN verification_requested_at timestamptz,

  -- Kisne verify/reject kiya — Verification Officer (e.g. Priya = U900)
  ADD COLUMN verified_by uuid references public.users(id);


-- ============================================================
-- STEP 2: verification_reviews table mein 2 fields add karo
-- ============================================================

ALTER TABLE public.verification_reviews
  -- Kab officer ne review kiya
  ADD COLUMN reviewed_at timestamptz,

  -- Officer ke notes / rejection reason
  ADD COLUMN notes text;


-- ============================================================
-- END OF MIGRATION
-- ============================================================
--
-- Ab organizations table ka full picture:
--
--   legal_name                  = ABC Exports Pvt Ltd
--   verification_status         = VERIFIED
--   verification_requested_by   = U001  ← Raj Sharma ne submit kiya
--   verification_requested_at   = 2026-08-22 10:30:00+05:30
--   verified_by                 = U900  ← Priya Shah ne verify kiya
--   verified_at                 = 2026-08-22 15:45:00+05:30
--
-- ============================================================
