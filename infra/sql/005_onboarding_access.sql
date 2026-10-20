-- Database migration 005. Invitation and browser access.
-- This is not the Persistence v2 runtime cutover.
-- Idempotent because infra/lambda/migrate.ts re-applies every SQL file.
-- Not an application cutover. v2 submit stays off.

CREATE TABLE IF NOT EXISTS onboarding_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_id UUID NOT NULL REFERENCES customer_onboardings (id),
  token_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NULL,
  revoked_at TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS onboarding_invitations_one_unrevoked_uidx
  ON onboarding_invitations (onboarding_id)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS onboarding_access_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_id UUID NOT NULL REFERENCES customer_onboardings (id),
  access_token_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NULL,
  revoked_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS onboarding_access_sessions_onboarding_id_idx
  ON onboarding_access_sessions (onboarding_id);

-- One authoritative draft row per onboarding.
-- NULL onboarding_id stays legal for legacy anonymous cookies.
CREATE UNIQUE INDEX IF NOT EXISTS onboarding_sessions_one_draft_per_onboarding_uidx
  ON onboarding_sessions (onboarding_id)
  WHERE onboarding_id IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'alexander_app') THEN
    GRANT SELECT, INSERT, UPDATE ON TABLE onboarding_invitations TO alexander_app;
    GRANT SELECT, INSERT, UPDATE ON TABLE onboarding_access_sessions TO alexander_app;
  END IF;
END $$;

INSERT INTO schema_migrations (version)
VALUES ('005')
ON CONFLICT (version) DO NOTHING;
