-- Database migration 002. This is not the questionnaire schemaVersion.
-- The content revision is the full questionnaire fingerprint (often >20 KB).
-- A btree unique index cannot hold that value. Store the full text and
-- enforce uniqueness on its SHA-256, which is also the S3 key segment.
-- Idempotent. Does not drop tables.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE onboarding_submissions
  ADD COLUMN IF NOT EXISTS content_revision_sha256 TEXT;

UPDATE onboarding_submissions
SET content_revision_sha256 = encode(digest(convert_to(content_revision, 'UTF8'), 'sha256'), 'hex')
WHERE content_revision_sha256 IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'onboarding_submissions'
      AND column_name = 'content_revision_sha256'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE onboarding_submissions
      ALTER COLUMN content_revision_sha256 SET NOT NULL;
  END IF;
END $$;

ALTER TABLE onboarding_submissions
  DROP CONSTRAINT IF EXISTS onboarding_submissions_session_revision_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'onboarding_submissions_session_revision_sha_key'
  ) THEN
    ALTER TABLE onboarding_submissions
      ADD CONSTRAINT onboarding_submissions_session_revision_sha_key
      UNIQUE (session_id, content_revision_sha256);
  END IF;
END $$;

INSERT INTO schema_migrations (version)
VALUES ('002')
ON CONFLICT (version) DO NOTHING;
