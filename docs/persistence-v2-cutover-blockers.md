# Persistence v2 — cutover blockers

Migrations 003, 004, and 005 are applied only in local disposable databases. Production is unchanged. Invited access defaults off.

## Closed in this pass

Provisioning can create a customer, an onboarding, and an invitation without the anonymous browser minting a customer. `onboarding_id` exists before a v2 submit would need it.

NULL `content_revision` stays null. Readers do not turn it into the string `"null"` or hash that word. Committed `fingerprint_v1` rows still list. Pending and `questionnaire_answers_v1` rows are hidden from the legacy list.

## Still blocked

The v2 reservation, object write, and finalize path is not implemented. `submitDraft` still writes S3 first and still hashes the fingerprint string. Invited browsers do not submit through that path.

Manifest v2 and the customer/onboarding/submission S3 prefix are not implemented. Object keys are still `onboarding/<session>/submissions/<fingerprint-sha256>/`.

Do not insert a v2 `pending` row until that runtime exists. The current v1 INSERT stays valid.
