-- Database migration 004. This is not the questionnaire schemaVersion.
-- Additive questionnaire-answers storage columns. Does not enable v2 submit.
-- Idempotent because infra/lambda/migrate.ts re-applies every SQL file.

ALTER TABLE onboarding_submissions
  ADD COLUMN IF NOT EXISTS questionnaire_spec_version TEXT;

ALTER TABLE onboarding_submissions
  ADD COLUMN IF NOT EXISTS questionnaire_answers_schema_version INTEGER;

ALTER TABLE onboarding_submissions
  ADD COLUMN IF NOT EXISTS questionnaire_answers_json JSONB;

ALTER TABLE onboarding_submissions
  ADD COLUMN IF NOT EXISTS s3_answers_key TEXT;

ALTER TABLE onboarding_submissions
  ADD COLUMN IF NOT EXISTS answers_sha256 TEXT;

ALTER TABLE onboarding_submissions
  ADD COLUMN IF NOT EXISTS answers_size_bytes BIGINT;

ALTER TABLE onboarding_submissions
  ADD COLUMN IF NOT EXISTS raw_size_bytes BIGINT;

ALTER TABLE onboarding_submissions
  ADD COLUMN IF NOT EXISTS normalized_size_bytes BIGINT;

ALTER TABLE onboarding_submissions
  ADD COLUMN IF NOT EXISTS manifest_schema_version INTEGER;

ALTER TABLE onboarding_submissions
  ADD COLUMN IF NOT EXISTS persistence_error_code TEXT;

-- Legacy compatibility metadata. Not a customer or onboarding link.
UPDATE onboarding_submissions
SET manifest_schema_version = 1
WHERE manifest_schema_version IS NULL
  AND content_hash_algorithm = 'fingerprint_v1';

ALTER TABLE onboarding_submissions
  ALTER COLUMN content_revision DROP NOT NULL;

ALTER TABLE onboarding_submissions
  ALTER COLUMN submitted_at DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS onboarding_submissions_onboarding_revision_uidx
  ON onboarding_submissions (onboarding_id, revision_number)
  WHERE onboarding_id IS NOT NULL AND revision_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS onboarding_submissions_onboarding_hash_uidx
  ON onboarding_submissions (onboarding_id, content_hash_algorithm, content_revision_sha256)
  WHERE onboarding_id IS NOT NULL
    AND content_hash_algorithm IS NOT NULL;

INSERT INTO schema_migrations (version)
VALUES ('004')
ON CONFLICT (version) DO NOTHING;
