BEGIN;

CREATE TABLE IF NOT EXISTS request_installations (
  id uuid PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES customers(id),
  workspace_id text NOT NULL,
  flow_id text NOT NULL,
  agent_id text NOT NULL,
  timezone text NOT NULL CHECK (timezone = 'America/Los_Angeles'),
  webhook_token_hash text NOT NULL UNIQUE CHECK (length(webhook_token_hash) = 64),
  reader_token_hash text NOT NULL UNIQUE CHECK (length(reader_token_hash) = 64),
  enabled boolean NOT NULL DEFAULT false,
  activated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, flow_id),
  UNIQUE (id, customer_id)
);

CREATE TABLE IF NOT EXISTS request_call_events (
  installation_id uuid NOT NULL REFERENCES request_installations(id),
  call_id text NOT NULL,
  fingerprint text NOT NULL,
  disposition text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (installation_id, call_id)
);

CREATE TABLE IF NOT EXISTS service_requests (
  id uuid PRIMARY KEY,
  installation_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  call_id text NOT NULL,
  fields_json jsonb NOT NULL,
  status text NOT NULL CHECK (status IN ('Received', 'Pending Review', 'Synced', 'Failed', 'Needs Attention')),
  reason text NOT NULL,
  jobber_account_id text,
  jobber_request_id text,
  ended_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (installation_id, call_id),
  FOREIGN KEY (installation_id, customer_id) REFERENCES request_installations(id, customer_id),
  FOREIGN KEY (installation_id, call_id) REFERENCES request_call_events(installation_id, call_id),
  CHECK (status <> 'Synced' OR (jobber_account_id IS NOT NULL AND jobber_request_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS jobber_test_connections (
  customer_id uuid PRIMARY KEY REFERENCES customers(id),
  account_id text NOT NULL UNIQUE,
  account_name text NOT NULL,
  encrypted_tokens text,
  state text NOT NULL CHECK (state IN ('connected', 'refreshing', 'disconnected', 'needs_reauthorization')),
  api_version text NOT NULL,
  granted_scopes jsonb NOT NULL,
  test_account_verified boolean NOT NULL DEFAULT false,
  request_writes_enabled boolean NOT NULL DEFAULT false,
  revision integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'alexander_app') THEN
    GRANT SELECT, INSERT, UPDATE ON request_installations, request_call_events, service_requests, jobber_test_connections TO alexander_app;
  END IF;
END $$;
INSERT INTO schema_migrations(version) VALUES ('010') ON CONFLICT DO NOTHING;
COMMIT;
