-- Database migration 016. Persist current Stripe subscription eligibility.
-- Additive. Idempotent. Does not rewrite earlier migrations.
-- Required before deploying Lambda code that reads/writes these columns.

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS stripe_subscription_status TEXT;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS stripe_livemode BOOLEAN;

COMMENT ON COLUMN customers.stripe_subscription_status IS
  'Last known Stripe subscription.status (active/trialing/canceled/…). Dashboard activation must not rely on payment_verified_at alone.';

COMMENT ON COLUMN customers.stripe_livemode IS
  'Last known Stripe livemode for the linked subscription/checkout (false = test).';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'alexander_app') THEN
    GRANT SELECT, INSERT, UPDATE ON TABLE customers TO alexander_app;
  END IF;
END $$;

INSERT INTO schema_migrations (version)
VALUES ('016')
ON CONFLICT (version) DO NOTHING;
