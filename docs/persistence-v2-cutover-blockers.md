# Persistence v2 — cutover 005 blockers

Migrations 003 and 004 are a schema foundation only.

MIGRATION 003/004 READY

APPLICATION CUTOVER 005 NOT READY

Do not insert a v2 `pending` row from the application until every blocker below is closed. The current v1 INSERT stays valid after 003/004 because `persistence_state` defaults to `committed` and `content_hash_algorithm` defaults to `fingerprint_v1`.

## BLOCKER 1

Customer and onboarding provisioning is an open product decision. The anonymous browser session must not mint a customer. v2 submit needs an existing `onboarding_id`.

## BLOCKER 2

`listSubmissions` in `infra/lambda/handler.ts` maps every submission for a `session_id`. `mapSubmission` does `String(row.content_revision)`. A SQL NULL becomes the JavaScript string `"null"`.

## BLOCKER 3

`inspectSession` in `src/lib/server/persistence/engine.ts` calls `sha256Hex(row.contentRevision)`. After that mapping, a missing fingerprint is hashed as the word `null`, which reports a false mismatch instead of an absent revision.

## BLOCKER 4

The same `mapSubmission` path sets `submittedAt` to `""` when `submitted_at` is NULL (`iso(...) ?? ""`). No other production reader was found that queries `onboarding_submissions.content_revision`. Session load does not read that column. `onboarding_sessions.submitted_at` was already nullable.

Cutover 005 must keep NULL as null, and v1 listing must ignore rows whose `content_hash_algorithm` is `questionnaire_answers_v1` or whose `persistence_state` is not `committed`, before any pending v2 row is written.

## BLOCKER 5

The v2 reservation, object write, and finalize path is not implemented. `submitDraft` still writes S3 first and still hashes the fingerprint string.

## BLOCKER 6

Manifest v2 and the customer/onboarding/submission S3 prefix are not implemented. Object keys are still `onboarding/<session>/submissions/<fingerprint-sha256>/`.
