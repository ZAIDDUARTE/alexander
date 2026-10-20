-- Database migration 008. Durable transactional email outbox for SES.

CREATE TABLE IF NOT EXISTS email_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NULL REFERENCES customers (id),
  onboarding_id UUID NULL REFERENCES customer_onboardings (id),
  template_type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  dedupe_key TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'queued',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  provider_message_id TEXT NULL,
  last_error_code TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ NULL,
  delivered_at TIMESTAMPTZ NULL,
  bounced_at TIMESTAMPTZ NULL,
  complained_at TIMESTAMPTZ NULL,
  CONSTRAINT email_outbox_status_check CHECK (
    status IN (
      'queued',
      'processing',
      'sent',
      'delivered',
      'bounced',
      'complained',
      'rejected',
      'failed',
      'retry_pending',
      'blocked_test_guard'
    )
  ),
  CONSTRAINT email_outbox_template_check CHECK (
    template_type IN (
      'questionnaire_invitation',
      'dashboard_ready',
      'profile_updated'
    )
  ),
  CONSTRAINT email_outbox_attempt_check CHECK (attempt_count >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS email_outbox_dedupe_key_uidx
  ON email_outbox (dedupe_key);

CREATE INDEX IF NOT EXISTS email_outbox_claim_idx
  ON email_outbox (status, next_attempt_at)
  WHERE status IN ('queued', 'retry_pending');

CREATE INDEX IF NOT EXISTS email_outbox_customer_id_idx
  ON email_outbox (customer_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'alexander_app') THEN
    GRANT SELECT, INSERT, UPDATE ON TABLE email_outbox TO alexander_app;
  END IF;
END $$;

INSERT INTO schema_migrations (version)
VALUES ('008')
ON CONFLICT (version) DO NOTHING;
