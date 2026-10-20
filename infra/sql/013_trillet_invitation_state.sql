-- Database migration 013. Automated Trillet workspace invitation state.
-- Additive. Idempotent. Extends customer_trillet_workspaces from 009.

ALTER TABLE customer_trillet_workspaces
  ADD COLUMN IF NOT EXISTS invite_email TEXT;

ALTER TABLE customer_trillet_workspaces
  ADD COLUMN IF NOT EXISTS invite_role TEXT;

ALTER TABLE customer_trillet_workspaces
  ADD COLUMN IF NOT EXISTS invite_status TEXT;

ALTER TABLE customer_trillet_workspaces
  ADD COLUMN IF NOT EXISTS invite_attempt_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE customer_trillet_workspaces
  ADD COLUMN IF NOT EXISTS invite_last_attempt_at TIMESTAMPTZ;

ALTER TABLE customer_trillet_workspaces
  ADD COLUMN IF NOT EXISTS invite_last_http_status INTEGER;

ALTER TABLE customer_trillet_workspaces
  ADD COLUMN IF NOT EXISTS invite_idempotency_key TEXT;

ALTER TABLE customer_trillet_workspaces
  ADD COLUMN IF NOT EXISTS dashboard_url TEXT;

ALTER TABLE customer_trillet_workspaces
  DROP CONSTRAINT IF EXISTS customer_trillet_workspaces_invite_status_check;

ALTER TABLE customer_trillet_workspaces
  ADD CONSTRAINT customer_trillet_workspaces_invite_status_check CHECK (
    invite_status IS NULL OR invite_status IN (
      'not_started',
      'dry_run',
      'pending',
      'sent',
      'already_member',
      'already_invited',
      'failed',
      'uncertain'
    )
  );

ALTER TABLE customer_trillet_workspaces
  DROP CONSTRAINT IF EXISTS customer_trillet_workspaces_invite_role_check;

ALTER TABLE customer_trillet_workspaces
  ADD CONSTRAINT customer_trillet_workspaces_invite_role_check CHECK (
    invite_role IS NULL OR invite_role IN ('viewer', 'editor', 'admin')
  );

CREATE UNIQUE INDEX IF NOT EXISTS customer_trillet_workspaces_invite_idempotency_uidx
  ON customer_trillet_workspaces (invite_idempotency_key)
  WHERE invite_idempotency_key IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'alexander_app') THEN
    GRANT SELECT, INSERT, UPDATE ON TABLE customer_trillet_workspaces TO alexander_app;
  END IF;
END $$;

INSERT INTO schema_migrations (version)
VALUES ('013')
ON CONFLICT (version) DO NOTHING;
