-- Database migration 007. Canonical mutable profile + immutable revisions.
-- Separate from questionnaire submissions (historical source records).

CREATE TABLE IF NOT EXISTS customer_business_profiles (
  customer_id UUID PRIMARY KEY REFERENCES customers (id),
  current_revision INTEGER NOT NULL DEFAULT 0,
  profile_schema_version INTEGER NOT NULL DEFAULT 1,
  profile_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_submission_id UUID NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT customer_business_profiles_status_check CHECK (
    status IN ('active', 'pending_review', 'inactive')
  ),
  CONSTRAINT customer_business_profiles_revision_check CHECK (current_revision >= 0)
);

CREATE TABLE IF NOT EXISTS customer_profile_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers (id),
  revision_number INTEGER NOT NULL,
  profile_schema_version INTEGER NOT NULL DEFAULT 1,
  profile_data JSONB NOT NULL,
  change_source TEXT NOT NULL,
  source_submission_id UUID NULL,
  actor_type TEXT NOT NULL DEFAULT 'system',
  actor_ref TEXT NULL,
  change_impact TEXT NOT NULL DEFAULT 'unknown',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT customer_profile_revisions_revision_check CHECK (revision_number > 0),
  CONSTRAINT customer_profile_revisions_source_check CHECK (
    change_source IN (
      'initial_questionnaire',
      'customer_self_service',
      'internal_admin',
      'trillet_sync',
      'support_request'
    )
  ),
  CONSTRAINT customer_profile_revisions_impact_check CHECK (
    change_impact IN ('low', 'high', 'unknown')
  ),
  CONSTRAINT customer_profile_revisions_status_check CHECK (
    status IN ('active', 'superseded', 'rejected')
  ),
  CONSTRAINT customer_profile_revisions_customer_revision_uidx
    UNIQUE (customer_id, revision_number)
);

CREATE INDEX IF NOT EXISTS customer_profile_revisions_customer_id_idx
  ON customer_profile_revisions (customer_id);

CREATE TABLE IF NOT EXISTS customer_profile_update_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers (id),
  token_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ NULL,
  consumed_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS customer_profile_update_sessions_customer_id_idx
  ON customer_profile_update_sessions (customer_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'alexander_app') THEN
    GRANT SELECT, INSERT, UPDATE ON TABLE customer_business_profiles TO alexander_app;
    GRANT SELECT, INSERT, UPDATE ON TABLE customer_profile_revisions TO alexander_app;
    GRANT SELECT, INSERT, UPDATE ON TABLE customer_profile_update_sessions TO alexander_app;
  END IF;
END $$;

INSERT INTO schema_migrations (version)
VALUES ('007')
ON CONFLICT (version) DO NOTHING;
