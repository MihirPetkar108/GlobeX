-- Restore the fields required by marketplace trade requests.
-- Safe for projects where some or all fields already exist.

ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS currency VARCHAR(10),
  ADD COLUMN IF NOT EXISTS quantity NUMERIC(18,4),
  ADD COLUMN IF NOT EXISTS agreed_price NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

NOTIFY pgrst, 'reload schema';
