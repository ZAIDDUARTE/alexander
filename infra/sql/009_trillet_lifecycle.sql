-- Database migration 009. Trillet workspace lifecycle (manual hybrid first).

CREATE TABLE IF NOT EXISTS customer_trillet_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers (id),
  workspace_id TEXT NULL,
  agent_id TEXT NULL,
  invitation_url TEXT NULL,
  invitation_ref TEXT NULL,
  status TEXT NOT NULL DEFAULT 'not_required',
  workspace_ready_at TIMESTAMPTZ NULL,
  invitation_created_at TIMESTAMPTZ NULL,
  dashboard_email_queued_at TIMESTAMPTZ NULL,
  last_error TEXT NULL,
  operator_ref TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT customer_trillet_workspaces_status_check CHECK (
    status IN (
      'not_required',
      'provisioning_pending',
      'awaiting_internal_setup',
      'configuring',
      'testing',
      'ready',
      'invitation_created',
      'active',
      'trillet_sync_required',
      'error'
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS customer_trillet_workspaces_one_per_customer_uidx
  ON customer_trillet_workspaces (customer_id);

CREATE UNIQUE INDEX IF NOT EXISTS customer_trillet_workspaces_workspace_id_uidx
  ON customer_trillet_workspaces (workspace_id)
  WHERE workspace_id IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'alexander_app') THEN
    GRANT SELECT, INSERT, UPDATE ON TABLE customer_trillet_workspaces TO alexander_app;
  END IF;
END $$;

INSERT INTO schema_migrations (version)
VALUES ('009')
ON CONFLICT (version) DO NOTHING;
