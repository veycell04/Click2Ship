CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid PRIMARY KEY,
  selection_id uuid NOT NULL,
  easy_post_shipment_id text NOT NULL,
  easy_post_rate_id text NOT NULL,
  carrier text NOT NULL,
  service_code text NOT NULL,
  service_name text NOT NULL,
  ship_air_label_type_id integer NOT NULL,
  reference_price_cents integer NOT NULL CHECK (reference_price_cents > 0),
  customer_price_cents integer NOT NULL CHECK (customer_price_cents > 0),
  savings_cents integer NOT NULL CHECK (savings_cents >= 0),
  savings_percent integer NOT NULL CHECK (savings_percent >= 0 AND savings_percent < 100),
  currency text NOT NULL,
  shipment_snapshot jsonb NOT NULL,
  document jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quotes_expires_at_idx ON public.quotes (expires_at);
CREATE INDEX IF NOT EXISTS quotes_selection_id_idx ON public.quotes (selection_id);

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY,
  quote_id uuid NOT NULL REFERENCES public.quotes(id),
  selection_id uuid NOT NULL UNIQUE,
  status text NOT NULL CHECK (status IN (
    'draft', 'checkout_created', 'payment_pending', 'paid', 'label_processing',
    'label_created', 'payment_failed', 'label_failed'
  )),
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL,
  stripe_checkout_session_id text UNIQUE,
  stripe_payment_intent_id text UNIQUE,
  provider_label_id text,
  tracking_number text,
  error_message text,
  shipment_snapshot jsonb NOT NULL,
  document jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders (status);

CREATE TABLE IF NOT EXISTS public.labels (
  id uuid PRIMARY KEY,
  selection_id uuid NOT NULL UNIQUE,
  order_id uuid UNIQUE REFERENCES public.orders(id),
  provider text NOT NULL,
  provider_label_id text UNIQUE,
  tracking_number text,
  label_type_id integer,
  reference text,
  status text NOT NULL CHECK (status IN ('processing', 'completed', 'failed', 'unknown')),
  document jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
