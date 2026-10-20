-- Database migration 006. Stripe payment linkage on customers.
-- Additive. Idempotent. Does not rewrite 001–005.

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS primary_email TEXT;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS primary_phone TEXT;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS stripe_product_id TEXT;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMPTZ;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS customers_stripe_customer_id_uidx
  ON customers (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS customers_stripe_subscription_id_uidx
  ON customers (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS customers_stripe_checkout_session_id_uidx
  ON customers (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS customer_lifecycle_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers (id),
  event_type TEXT NOT NULL,
  correlation_key TEXT NULL,
  payload_json JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_lifecycle_events_customer_id_idx
  ON customer_lifecycle_events (customer_id);

CREATE UNIQUE INDEX IF NOT EXISTS customer_lifecycle_events_correlation_uidx
  ON customer_lifecycle_events (event_type, correlation_key)
  WHERE correlation_key IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'alexander_app') THEN
    GRANT SELECT, INSERT, UPDATE ON TABLE customers TO alexander_app;
    GRANT SELECT, INSERT ON TABLE customer_lifecycle_events TO alexander_app;
  END IF;
END $$;

INSERT INTO schema_migrations (version)
VALUES ('006')
ON CONFLICT (version) DO NOTHING;
