BEGIN;

CREATE TABLE IF NOT EXISTS request_poll_state (
  installation_id uuid PRIMARY KEY REFERENCES request_installations(id),
  cursor_ended_at timestamptz NOT NULL DEFAULT '1970-01-01T00:00:00Z',
  lock_until timestamptz,
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'alexander_app') THEN
    GRANT SELECT, INSERT, UPDATE ON request_poll_state TO alexander_app;
  END IF;
END $$;

INSERT INTO schema_migrations(version) VALUES ('011') ON CONFLICT DO NOTHING;
COMMIT;
