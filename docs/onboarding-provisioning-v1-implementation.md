# Onboarding provisioning v1 — implementation

Minimal access layer. Persistence v2 submission is not enabled. The flag defaults off, so the anonymous cookie flow is unchanged.

## What landed

`infra/sql/005_onboarding_access.sql` adds `onboarding_invitations`, `onboarding_access_sessions`, and one draft row per onboarding (`UNIQUE (onboarding_id) WHERE onboarding_id IS NOT NULL`). Raw tokens are not columns. Stored values are SHA-256 hex of `crypto.randomBytes(32)` base64url tokens.

Invitation URL: `https://<ONBOARDING_HOST>/i#<token>`. `GET /i` only shows Continue. Continue `POST /api/onboarding/invitations/redeem` with `{ token }`. That mints a different access token and sets HttpOnly cookie `alexander_onboarding_access`.

`resolveOnboardingAccess()` hashes that cookie and loads the one draft row. Invited `GET` returns `draftVersion`. Invited `PUT` requires `expectedVersion` and updates only when `version` matches, then increments it. A mismatch is `409 stale_draft`. The client reloads that draft and does not PUT the rejected body again. `updatedAt` is not the invited lock.

`scripts/provision-onboarding.ts` creates a customer, an onboarding, and one invitation, and prints the URL once. It is not an HTTP route. Names are not deduped.

```bash
ONBOARDING_DATABASE_URL=postgres://localhost/alexander \
  npx tsx scripts/provision-onboarding.ts --name "North Plumbing" --classification synthetic_test
```

## Flag

`ONBOARDING_INVITATIONS_ENABLED=true` turns invited draft GET/PUT on. Any other value, including unset, keeps `alexander_onboarding_session` and the existing autosave. Submit is still the legacy session path. It does not write a v2 revision.

Direct SQL uses `ONBOARDING_DATABASE_URL` when set. Otherwise redeem and invited draft calls go through the persistence Lambda. Neither path is used while the flag is off.

## Null readers

`mapSubmissionRow` leaves SQL NULL `content_revision` and `submitted_at` as null. `listSubmissions` hides null revisions, `questionnaire_answers_v1` rows, and rows whose `persistence_state` is not `committed`. `inspectSession` does not hash a null revision. Legacy `fingerprint_v1` rows still hash the fingerprint text.
