-- Database migration 015. Durable customer provisioning state machine.
-- Additive. Idempotent. Extends customer_trillet_workspaces from 009/013.

ALTER TABLE customer_trillet_workspaces
  ADD COLUMN IF NOT EXISTS provisioning_phase TEXT;

ALTER TABLE customer_trillet_workspaces
  ADD COLUMN IF NOT EXISTS provisioning_attempt_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE customer_trillet_workspaces
  ADD COLUMN IF NOT EXISTS provisioning_last_attempt_at TIMESTAMPTZ;

ALTER TABLE customer_trillet_workspaces
  ADD COLUMN IF NOT EXISTS provisioning_last_error TEXT;

ALTER TABLE customer_trillet_workspaces
  ADD COLUMN IF NOT EXISTS provisioning_correlation_key TEXT;

ALTER TABLE customer_trillet_workspaces
  DROP CONSTRAINT IF EXISTS customer_trillet_workspaces_status_check;

ALTER TABLE customer_trillet_workspaces
  ADD CONSTRAINT customer_trillet_workspaces_status_check CHECK (
    status IN (
      'not_required',
      'provisioning_pending',
      'awaiting_internal_setup',
      'workspace_provisioning_blocked',
      'configuring',
      'testing',
      'ready',
      'invitation_created',
      'active',
      'trillet_sync_required',
      'error'
    )
  );

ALTER TABLE customer_trillet_workspaces
  DROP CONSTRAINT IF EXISTS customer_trillet_workspaces_provisioning_phase_check;

ALTER TABLE customer_trillet_workspaces
  ADD CONSTRAINT customer_trillet_workspaces_provisioning_phase_check CHECK (
    provisioning_phase IS NULL OR provisioning_phase IN (
      'gates_incomplete',
      'workspace_provisioning_blocked',
      'workspace_mapped',
      'invite_pending',
      'invite_dry_run',
      'invite_sent',
      'invite_terminal',
      'invite_failed',
      'email2_queued',
      'email2_blocked',
      'complete'
    )
  );

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'alexander_app') THEN
    GRANT SELECT, INSERT, UPDATE ON TABLE customer_trillet_workspaces TO alexander_app;
  END IF;
END $$;

INSERT INTO schema_migrations (version)
VALUES ('015')
ON CONFLICT (version) DO NOTHING;
