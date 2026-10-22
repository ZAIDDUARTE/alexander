# Customer business profiles and revisions

## Separation

- `onboarding_submissions` — immutable questionnaire history
- `customer_business_profiles` — current operational profile
- `customer_profile_revisions` — immutable revision trail

## Initial projection

On final questionnaire submit → profile revision 1, source `initial_questionnaire`.

Also queues SES template `profile_updated` with payload `kind=account_setup_in_progress` (“We're Setting Up Your Alexander Account”), idempotent on `account_setup:{customerId}:{submissionId}:v1`. Staging delivery still requires `EMAIL_DELIVERY_MODE=test` + `ALLOWED_TEST_RECIPIENT`.

## Later edits (implemented, staging-gated)

1. Feature flag `ALEXANDER_CUSTOMER_PROFILE_EDITING_ENABLED=true` (preview/staging).
2. `ALEXANDER_CUSTOMER_PROFILE_PRODUCTION_EDITING_ENABLED` stays unset/false until tenant-scoped auth is verified.
3. Auth: staging Jobber admin bearer/cookie **or** short-lived `customer_profile_update_sessions` token (customer-scoped).
4. `PATCH /api/staging/profile` with `expectedRevision` → field validation → immutable revision → supersede priors → optional `trillet_sync_required`.
5. Field-level change detection classifies **routine** vs **operationally sensitive** and sets `change_impact` `low`/`high`/`unknown`.
6. Publication state lives in `profile_data._publication` (no new migration): draft → config_generated → qa_required → qa_passed → published | sync_failed | rolled_back.
7. `POST /api/staging/profile/generate` builds reusable runtime config (KB, instructions, policies, call-flow hints) from the 137-question contract via policy-profile + trillet-demo generators.
8. `POST /api/staging/profile/sync-dry-run` plans documented Trillet GET/PUT/POST ops without writes; refuses Phillip/Lisa/Marina targets.
9. Rollback restores fields from `approvedProfileRevision` as a new revision and re-marks sync required.

Permanent login remains Trillet. Staged UI: `/staging/profile`.

## API contract (staging)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/staging/profile?customerId=` | admin or session | Current profile + editable catalog |
| PATCH | `/api/staging/profile` | admin or session | Apply patch with optimistic concurrency |
| GET | `/api/staging/profile/history?customerId=` | admin or session | Revision history |
| POST | `/api/staging/profile/session` | admin | Issue customer edit session |
| POST | `/api/staging/profile/generate` | admin or session | Generate runtime config |
| POST | `/api/staging/profile/sync-dry-run` | admin | Dry-run Trillet sync plan |
| POST | `/api/staging/profile/publish` | admin | QA marks + publish |
| POST | `/api/staging/profile/rollback` | admin | Roll back to last approved config |
