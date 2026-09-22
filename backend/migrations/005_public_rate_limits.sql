CREATE TABLE IF NOT EXISTS public_rate_limits (
  key text PRIMARY KEY,
  count integer NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS public_rate_limits_expiry_idx ON public_rate_limits (expires_at);
