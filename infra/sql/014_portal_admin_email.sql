-- Database migration 014. Portal administrator email (distinct from Stripe billing email).
-- Additive. Idempotent. Does not rewrite Stripe primary_email.

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS portal_admin_email TEXT;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS portal_admin_status TEXT;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS portal_admin_source TEXT;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS portal_admin_confirmed_at TIMESTAMPTZ;

ALTER TABLE customers
  DROP CONSTRAINT IF EXISTS customers_portal_admin_status_check;

ALTER TABLE customers
  ADD CONSTRAINT customers_portal_admin_status_check CHECK (
    portal_admin_status IS NULL OR portal_admin_status IN (
      'pending_verification',
      'confirmed',
      'email_verified',
      'review_required'
    )
  );

ALTER TABLE customers
  DROP CONSTRAINT IF EXISTS customers_portal_admin_source_check;

ALTER TABLE customers
  ADD CONSTRAINT customers_portal_admin_source_check CHECK (
    portal_admin_source IS NULL OR portal_admin_source IN (
      'checkout_confirmed',
      'alternate_verified',
      'legacy_unconfirmed'
    )
  );

-- Existing paid customers: do not silently grant portal admin; require review/confirmation.
UPDATE customers
SET portal_admin_status = 'review_required',
    portal_admin_source = 'legacy_unconfirmed',
    updated_at = now()
WHERE portal_admin_status IS NULL
  AND primary_email IS NOT NULL;

CREATE TABLE IF NOT EXISTS portal_admin_email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers (id),
  previous_email TEXT NULL,
  new_email TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_ref TEXT NULL,
  verification_state TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT portal_admin_email_events_actor_check CHECK (
    actor_type IN ('onboarding_access', 'system', 'operator')
  ),
  CONSTRAINT portal_admin_email_events_state_check CHECK (
    verification_state IN (
      'pending_verification',
      'confirmed',
      'email_verified',
      'rejected',
      'review_required'
    )
  )
);

CREATE INDEX IF NOT EXISTS portal_admin_email_events_customer_id_idx
  ON portal_admin_email_events (customer_id);

CREATE TABLE IF NOT EXISTS portal_admin_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers (id),
  onboarding_id UUID NOT NULL REFERENCES customer_onboardings (id),
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS portal_admin_verifications_token_hash_uidx
  ON portal_admin_verifications (token_hash);

CREATE INDEX IF NOT EXISTS portal_admin_verifications_customer_id_idx
  ON portal_admin_verifications (customer_id);

ALTER TABLE email_outbox DROP CONSTRAINT IF EXISTS email_outbox_template_check;

ALTER TABLE email_outbox
  ADD CONSTRAINT email_outbox_template_check CHECK (
    template_type IN (
      'questionnaire_invitation',
      'questionnaire_invitation_correction',
      'dashboard_ready',
      'profile_updated',
      'portal_admin_verification'
    )
  );

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'alexander_app') THEN
    GRANT SELECT, INSERT, UPDATE ON TABLE customers TO alexander_app;
    GRANT SELECT, INSERT ON TABLE portal_admin_email_events TO alexander_app;
    GRANT SELECT, INSERT, UPDATE ON TABLE portal_admin_verifications TO alexander_app;
  END IF;
END $$;

INSERT INTO schema_migrations (version)
VALUES ('014')
ON CONFLICT (version) DO NOTHING;
