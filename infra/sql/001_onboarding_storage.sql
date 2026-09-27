-- Alexander onboarding durable storage.
-- Database migration 001. This is not the questionnaire schemaVersion.
-- Idempotent. No DROP statements.

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS onboarding_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  questionnaire_schema_version INTEGER NOT NULL,
  draft_json JSONB NOT NULL,
  normalized_json JSONB NULL,
  current_route TEXT NULL,
  current_section INTEGER NULL,
  completed_sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  submission_status TEXT NOT NULL DEFAULT 'draft',
  last_submitted_content_revision TEXT NULL,
  submitted_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  version BIGINT NOT NULL DEFAULT 1,
  CONSTRAINT onboarding_sessions_session_id_key UNIQUE (session_id),
  CONSTRAINT onboarding_sessions_status_check CHECK (submission_status IN ('draft', 'submitted'))
);

CREATE INDEX IF NOT EXISTS onboarding_sessions_updated_at_idx
  ON onboarding_sessions (updated_at);

CREATE INDEX IF NOT EXISTS onboarding_sessions_submission_status_idx
  ON onboarding_sessions (submission_status);

CREATE TABLE IF NOT EXISTS onboarding_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  content_revision TEXT NOT NULL,
  questionnaire_schema_version INTEGER NOT NULL,
  raw_draft_json JSONB NOT NULL,
  normalized_config_json JSONB NOT NULL,
  s3_prefix TEXT NOT NULL,
  s3_raw_key TEXT NOT NULL,
  s3_normalized_key TEXT NOT NULL,
  s3_manifest_key TEXT NOT NULL,
  raw_sha256 TEXT NOT NULL,
  normalized_sha256 TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT onboarding_submissions_session_revision_key UNIQUE (session_id, content_revision),
  CONSTRAINT onboarding_submissions_session_id_fkey
    FOREIGN KEY (session_id) REFERENCES onboarding_sessions (session_id)
);

INSERT INTO schema_migrations (version)
VALUES ('001')
ON CONFLICT (version) DO NOTHING;
