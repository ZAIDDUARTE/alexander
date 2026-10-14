-- Database migration 011. Idempotent SES delivery feedback events.

CREATE TABLE IF NOT EXISTS email_feedback_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_message_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_id TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT email_feedback_event_type_check CHECK (
    event_type IN ('Delivery', 'Bounce', 'Complaint', 'Reject', 'Send', 'RenderingFailure', 'DeliveryDelay', 'Subscription', 'Open', 'Click')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS email_feedback_events_event_id_uidx
  ON email_feedback_events (event_id);

CREATE INDEX IF NOT EXISTS email_feedback_events_message_id_idx
  ON email_feedback_events (provider_message_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'alexander_app') THEN
    GRANT SELECT, INSERT, UPDATE ON TABLE email_feedback_events TO alexander_app;
  END IF;
END $$;

INSERT INTO schema_migrations (version)
VALUES ('011')
ON CONFLICT (version) DO NOTHING;
