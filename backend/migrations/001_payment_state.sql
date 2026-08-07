CREATE TABLE IF NOT EXISTS click2ship_quotes (
  quote_id text PRIMARY KEY,
  selection_id text NOT NULL UNIQUE,
  document jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS click2ship_orders (
  order_id text PRIMARY KEY,
  selection_id text NOT NULL UNIQUE,
  document jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS click2ship_labels (
  selection_id text PRIMARY KEY,
  provider_label_id text UNIQUE,
  document jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
