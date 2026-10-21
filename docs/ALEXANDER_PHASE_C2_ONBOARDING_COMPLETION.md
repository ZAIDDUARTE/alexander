# Alexander Phase C2 — ALX-C000010 Email #1 recovery and onboarding completion

Date: 2026-10-21  
Stripe mode: **test only**. No new payment. No live credentials.  
Customer: **ALX-C000010** · Cedar & Valve Synthetic Plumbing QA · `chatg7788@gmail.com`  
Onboarding: `e9e41757-13fe-40b1-a463-49e9c461bd95`  
Email #1 job: `5201e2b2-0574-4404-a7e9-6a537fb8936d`  
Branch: `customer-lifecycle-staging`

## Stage results

| # | Stage | Result | Evidence |
|---|---|---|---|
| 1 | Persisted customer | **PASS** | `inspectCustomerProvisioning`: `ALX-C000010`, `synthetic_test`, `customerId=f9fe84aa-…` |
| 2 | Subscription / payment state | **PASS** | `paymentVerified=true` (uses `payment_verified_at`, not live Stripe status). Stripe test sub `sub_1USslFQKy1Smykv0CnPyXK69` remains `canceled` / `livemode=false`. Cancel does **not** block redeem, portal-admin, or questionnaire |
| 3 | Email #1 outbox | **PASS** | `inspectEmailOutbox`: status `delivered`, attemptCount 1, hasMessageId/sentAt/deliveredAt, `hasInvitationUrl=true`, feedbackEventCount 1, no lastError |
| 4 | SES delivery | **PASS** (test-guard routing) | Lambda `EMAIL_DELIVERY_MODE=test`. Secrets Manager allowlist `ALLOWED_TEST_RECIPIENT=zaidduartee@gmail.com`. Worker always sends to the allowlist, not `chatg7788@gmail.com`. SES accepted the message; configuration set `alexander-transactional-staging` |
| 5 | Invitation recoverability | **PASS** | `inspectInvitationRedeemability`: active, unexpired, `browserRedeemable=true`, host `onboard.meetalexander.ai`. Token recovered from existing outbox `payload_json.invitation_url` for `synthetic_test` only (not reconstructed from hash) |
| 6 | Invitation redemption | **PASS** | `POST /api/onboarding/invitations/redeem` on `onboard.meetalexander.ai` → HTTP 200, access cookie set, accessSessionCount 1 |
| 7 | Portal-admin verification | **PASS** | Checkout-email confirm (`mode=checkout`) → `portal_admin_status=confirmed`, `portalAdminEmail=chatg7788@gmail.com`, `verificationEmailQueued=false` |
| 8 | Questionnaire draft save/reload | **PASS** | Invited `PUT/GET /api/onboarding/draft` with fictional Cedar & Valve plumbing answers; `draftVersion` 1→2; reload returned same company name |
| 9 | Questionnaire submission | **PASS** | Linked V2 submit `submissionId=b15e33f7-…`, revision 1, `persistence_state=committed`, onboarding status `submitted`. Business profile revision 1 active (96 fields) |
| 10 | Provisioning trigger | **PASS** (blocked as designed) | `runCustomerProvisioning` after submit → `workspace_provisioning_blocked`. `email2Queued=false`, `email2BlockedReason=dashboard_url_missing_url`. No Email #2 |
| 11 | Trillet account/dashboard | **BLOCKED** | Known Agency-managed workspace contract gap. Phillip / `ALX-C000002` not assigned. No dashboard URL |
| 12 | Returning Sign In | **NOT TESTED** | Requires Trillet workspace + Email #2 |
| 13 | Customer dashboard isolation | **NOT TESTED** | No dashboard issued |

## Email #1 diagnosis

- Job was never blocked or failed; retry op `recoverBlockedQuestionnaireInvitation` was **not** needed (`status` already `delivered`).
- Delivery defect relative to the Checkout email address is the intentional test guard: SES recipient = allowlist, not customer `primary_email`.
- Supported recovery for a delivered synthetic invitation is read-only inspect of the stored outbox URL (`inspectInvitationRedeemability` returns `invitationUrl` only when `data_classification=synthetic_test`).
- Host-correction resend (`enqueueInvitationHostCorrection`) was **not** used (would duplicate mail).

## Browser submit defect (repaired)

Production had `ONBOARDING_INVITATIONS_ENABLED` but not `PERSISTENCE_V2_ENABLED`, and the pilot ID list did not include `e9e41757-…`. The first browser `POST /api/onboarding/submit` therefore fell through to an anonymous `onboarding_sessions` row (`2ea00c48`, no customer link).

Repair:

1. Completed the authoritative submit via Lambda `submitPersistenceV2` with the redeemed access-token hash (linked submission `b15e33f7-…`).
2. Source fix in `src/lib/server/persistence/v2-request.ts`: any request with `alexander_onboarding_access` uses the V2 submit path so invited browsers cannot orphan submissions.

## Lambda inspect fix

`inspectInvitationRedeemability` now returns `dataClassification` and, for `synthetic_test` only, the already-stored `invitationUrl` so sandbox recovery does not forge tokens.

## Safety checklist

| Guard | Status |
|---|---|
| Stripe TEST only | Yes |
| No new payment / customer | Yes |
| No live Stripe credentials | Yes |
| No Email #2 / Trillet reassignment | Yes |
| `ALX-C000002` untouched | Yes (inspect only) |
| No WordPress changes | Yes |

## Phase C3 follow-up

Browser V2 duplicate-submit, orphan isolation, invitation reveal hardening, and remaining Trillet blockers are recorded in `docs/ALEXANDER_PHASE_C3_FINAL_VALIDATION.md`.
