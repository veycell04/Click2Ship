ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS benchmark_price_cents integer,
  ADD COLUMN IF NOT EXISTS carrier_rate_cents integer,
  ADD COLUMN IF NOT EXISTS gross_spread_cents integer,
  ADD COLUMN IF NOT EXISTS fulfillment_provider text,
  ADD COLUMN IF NOT EXISTS selected_rate_snapshot jsonb;

UPDATE public.quotes
SET benchmark_price_cents = reference_price_cents
WHERE benchmark_price_cents IS NULL;

UPDATE public.quotes
SET carrier_rate_cents = reference_price_cents,
    gross_spread_cents = customer_price_cents - reference_price_cents
WHERE carrier_rate_cents IS NULL;

CREATE INDEX IF NOT EXISTS quotes_carrier_service_idx
  ON public.quotes (carrier, service_code);
