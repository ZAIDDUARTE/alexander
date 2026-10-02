# Persistence v2 — cutover blockers

Migrations 003, 004, and 005 and the v2 submit runtime are local only. Production is unchanged. Both feature flags default off.

## Closed

Provisioning creates a customer, an onboarding, and an invitation. The anonymous browser does not mint a customer.

NULL `content_revision` stays null. Legacy `fingerprint_v1` rows still list. Pending and `questionnaire_answers_v1` rows stay out of that list.

`PERSISTENCE_V2_ENABLED=true` submits through an invited access session: reserve a pending revision, write the four v2 objects, then commit. The flag is off unless that exact value is set, and the legacy submit path is unchanged.

## Still blocked

This has not been run against staging RDS or the production bucket. Do not enable the flag there until that end-to-end check is done.

Legacy objects under `onboarding/<session>/submissions/<fingerprint-sha256>/` stay where they are.
