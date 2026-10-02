# Persistence v2 migrations 003 and 004 — implementation

Local schema only. Not applied to production RDS. v2 submit is not enabled.

## Files

- `infra/sql/003_customer_onboarding_identity.sql`
- `infra/sql/004_questionnaire_answers_storage.sql`

The migration Lambda re-applies every file in `infra/sql` on each run, same as 001 and 002. These files are idempotent for that runner. They are not a reason to run the Lambda yet.

`DB_MIGRATION_VERSION` in `src/lib/server/persistence/types.ts` stays `"002"`. That constant is the in-memory test stand-in. Production `schemaStatus` reads `schema_migrations` from the database. Changing the constant now would make local tests claim the app requires 004 before any database has it. After a later reviewed apply, the database version becomes `004` while this constant still says `002` until a cutover release updates the memory fixture on purpose.

## Tables added

- `customers`
- `customer_onboardings`

## Columns added

`onboarding_sessions.onboarding_id` nullable, foreign key to `customer_onboardings.id`.

`onboarding_submissions`:

- `onboarding_id` nullable, foreign key to `customer_onboardings.id`
- `revision_number` nullable, check `NULL OR > 0`
- `persistence_state` NOT NULL default `committed`, check `pending | committed | failed`
- `content_hash_algorithm` NOT NULL default `fingerprint_v1`
- `questionnaire_spec_version`
- `questionnaire_answers_schema_version`
- `questionnaire_answers_json`
- `s3_answers_key`
- `answers_sha256`
- `answers_size_bytes`
- `raw_size_bytes`
- `normalized_size_bytes`
- `manifest_schema_version`
- `persistence_error_code`

`customer_onboardings.latest_submission_id` nullable.

`content_revision` and `submitted_at` are nullable after 004. Existing values are not rewritten.

## Indexes and foreign keys

- `customers.customer_number` UNIQUE
- `customer_onboardings.customer_id` → `customers.id`
- `onboarding_sessions.onboarding_id` → `customer_onboardings.id`
- `onboarding_submissions.onboarding_id` → `customer_onboardings.id`
- UNIQUE `(id, onboarding_id)` on submissions
- FOREIGN KEY `(latest_submission_id, id)` → `onboarding_submissions (id, onboarding_id)`
- Partial unique index `(onboarding_id, revision_number)` where both are not null
- Partial unique index `(onboarding_id, content_hash_algorithm, content_revision_sha256)` where onboarding id and algorithm are not null
- Existing UNIQUE `(session_id, content_revision_sha256)` is unchanged

## Customer numbers

Sequence `customer_number_seq`. Default calls `alexander_next_customer_number()`, which uses `nextval` once and left-pads to at least six digits. Values past six digits are not truncated. Gaps are allowed. The number is not the primary key.

## Hash algorithm

No CHECK list. Documented values are `fingerprint_v1` and `questionnaire_answers_v1`. A later `questionnaire_answers_v2` does not need a constraint change. The unique index already includes the algorithm, so a typo is not rejected by the database; that is the tradeoff for not requiring a migration per new contract. Persistence state remains a closed CHECK list.

## Legacy initialization

Not a customer backfill. No session or submission `onboarding_id` is filled from old rows. No customer is created from name, phone, or email.

Updates that do run:

- `persistence_state = 'committed'` where null, then NOT NULL
- `content_hash_algorithm = 'fingerprint_v1'` where null, then NOT NULL
- `manifest_schema_version = 1` where null and algorithm is `fingerprint_v1`

Current v1 INSERT omits the new columns, so it stores `committed`, `fingerprint_v1`, null onboarding, null revision, and null answers JSON.

## Grants

If role `alexander_app` already exists, 003 grants it DML on the new tables and use of the sequence. The local disposable test has no such role, so that block is skipped. The migration Lambda creates the role before SQL, so a future apply would grant it. Do not run that Lambda until this schema is reviewed for deployment.

## Disposable PostgreSQL evidence

PostgreSQL 18.4 via Postgres.app on a local socket. Database name `alexander_mig_003004_<pid>`, created for the test and dropped with `FORCE` afterward. Not production RDS.

`src/lib/server/persistence/migrations-003-004.test.ts` applies `001` through `004` to a database that already has a legacy session and submission, then checks:

- legacy row keeps its fingerprint and `submitted_at`
- `onboarding_id` and `revision_number` stay null
- metadata becomes `committed` / `fingerprint_v1` / manifest schema 1
- customer count stays 0
- a v1-shaped INSERT still succeeds
- numbers `ALX-C000001`, `ALX-C000002`, `ALX-C000123`, `ALX-C1000000`
- same display name is allowed
- one customer can have two onboardings
- cross-onboarding `latest_submission_id` is rejected
- same-onboarding pointer is accepted
- duplicate revision 1 is rejected; revision 1 on another onboarding is accepted
- same algorithm and digest collide; a different algorithm with the same digest does not
- `complete` and revision `0` are rejected
- a structural pending row may have null `content_revision` and null `submitted_at`
- re-applying 003 and 004 succeeds

## Current application

Questionnaire UI, Questionnaire Answers v1, S3 keys, and submit flow are unchanged. No v2 pending row is written by the app. Old v1 session and submission writes remain valid on this schema.

They are not valid once a pending v2 row shares a session, because of the NULL mapping in `listSubmissions` / `inspectSession`. See `docs/persistence-v2-cutover-blockers.md`.

## Production

Production RDS was not changed. Production S3 was not changed. Nothing was pushed or deployed.
