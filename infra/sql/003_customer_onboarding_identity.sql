-- Database migration 003. This is not the questionnaire schemaVersion.
-- Additive identity foundation. No customer/onboarding backfill.
-- Idempotent because infra/lambda/migrate.ts re-applies every SQL file.
-- Not an application cutover. v2 submit stays off.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SEQUENCE IF NOT EXISTS customer_number_seq START WITH 1;

-- Pads to at least 6 digits. Longer sequence values are not truncated
-- (PostgreSQL lpad truncates when the string is already longer than the width).
CREATE OR REPLACE FUNCTION alexander_next_customer_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  n bigint;
  text_n text;
BEGIN
  n := nextval('customer_number_seq');
  text_n := n::text;
  IF length(text_n) < 6 THEN
    text_n := lpad(text_n, 6, '0');
  END IF;
  RETURN 'ALX-C' || text_n;
END;
$$;

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_number TEXT NOT NULL UNIQUE DEFAULT alexander_next_customer_number(),
  status TEXT NOT NULL DEFAULT 'active',
  data_classification TEXT NOT NULL DEFAULT 'real_customer',
  customer_facing_name TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT customers_status_check CHECK (status IN ('active', 'inactive')),
  CONSTRAINT customers_classification_check CHECK (
    data_classification IN ('real_customer', 'synthetic_test')
  )
);

CREATE TABLE IF NOT EXISTS customer_onboardings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers (id),
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT customer_onboardings_status_check CHECK (status IN ('draft', 'submitted'))
);

CREATE INDEX IF NOT EXISTS customer_onboardings_customer_id_idx
  ON customer_onboardings (customer_id);

ALTER TABLE onboarding_sessions
  ADD COLUMN IF NOT EXISTS onboarding_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'onboarding_sessions_onboarding_id_fkey'
  ) THEN
    ALTER TABLE onboarding_sessions
      ADD CONSTRAINT onboarding_sessions_onboarding_id_fkey
      FOREIGN KEY (onboarding_id) REFERENCES customer_onboardings (id);
  END IF;
END $$;

ALTER TABLE onboarding_submissions
  ADD COLUMN IF NOT EXISTS onboarding_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'onboarding_submissions_onboarding_id_fkey'
  ) THEN
    ALTER TABLE onboarding_submissions
      ADD CONSTRAINT onboarding_submissions_onboarding_id_fkey
      FOREIGN KEY (onboarding_id) REFERENCES customer_onboardings (id);
  END IF;
END $$;

ALTER TABLE onboarding_submissions
  ADD COLUMN IF NOT EXISTS revision_number INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'onboarding_submissions_revision_number_check'
  ) THEN
    ALTER TABLE onboarding_submissions
      ADD CONSTRAINT onboarding_submissions_revision_number_check
      CHECK (revision_number IS NULL OR revision_number > 0);
  END IF;
END $$;

ALTER TABLE onboarding_submissions
  ADD COLUMN IF NOT EXISTS persistence_state TEXT;

-- Legacy metadata only. Does not attach a customer or onboarding.
UPDATE onboarding_submissions
SET persistence_state = 'committed'
WHERE persistence_state IS NULL;

ALTER TABLE onboarding_submissions
  ALTER COLUMN persistence_state SET DEFAULT 'committed';

ALTER TABLE onboarding_submissions
  ALTER COLUMN persistence_state SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'onboarding_submissions_persistence_state_check'
  ) THEN
    ALTER TABLE onboarding_submissions
      ADD CONSTRAINT onboarding_submissions_persistence_state_check
      CHECK (persistence_state IN ('pending', 'committed', 'failed'));
  END IF;
END $$;

ALTER TABLE onboarding_submissions
  ADD COLUMN IF NOT EXISTS content_hash_algorithm TEXT;

-- Legacy metadata only. Supported values are documented, not CHECK-listed,
-- so a future questionnaire_answers_v2 does not need a constraint migration.
-- Current writers: fingerprint_v1 (default), questionnaire_answers_v1 (v2, not enabled).
UPDATE onboarding_submissions
SET content_hash_algorithm = 'fingerprint_v1'
WHERE content_hash_algorithm IS NULL;

ALTER TABLE onboarding_submissions
  ALTER COLUMN content_hash_algorithm SET DEFAULT 'fingerprint_v1';

ALTER TABLE onboarding_submissions
  ALTER COLUMN content_hash_algorithm SET NOT NULL;

ALTER TABLE customer_onboardings
  ADD COLUMN IF NOT EXISTS latest_submission_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'onboarding_submissions_id_onboarding_key'
  ) THEN
    ALTER TABLE onboarding_submissions
      ADD CONSTRAINT onboarding_submissions_id_onboarding_key
      UNIQUE (id, onboarding_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'customer_onboardings_latest_submission_fkey'
  ) THEN
    ALTER TABLE customer_onboardings
      ADD CONSTRAINT customer_onboardings_latest_submission_fkey
      FOREIGN KEY (latest_submission_id, id)
      REFERENCES onboarding_submissions (id, onboarding_id);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'alexander_app') THEN
    GRANT SELECT, INSERT, UPDATE ON TABLE customers TO alexander_app;
    GRANT SELECT, INSERT, UPDATE ON TABLE customer_onboardings TO alexander_app;
    GRANT USAGE, SELECT ON SEQUENCE customer_number_seq TO alexander_app;
  END IF;
END $$;

INSERT INTO schema_migrations (version)
VALUES ('003')
ON CONFLICT (version) DO NOTHING;
