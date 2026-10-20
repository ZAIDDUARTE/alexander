-- Allow corrected questionnaire invitation emails (same invitation token, fixed host).

ALTER TABLE email_outbox DROP CONSTRAINT IF EXISTS email_outbox_template_check;

ALTER TABLE email_outbox
  ADD CONSTRAINT email_outbox_template_check CHECK (
    template_type IN (
      'questionnaire_invitation',
      'questionnaire_invitation_correction',
      'dashboard_ready',
      'profile_updated'
    )
  );

INSERT INTO schema_migrations (version)
VALUES ('012')
ON CONFLICT (version) DO NOTHING;
