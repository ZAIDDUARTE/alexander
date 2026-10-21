# Alexander Phase C — sandbox lifecycle final

Date: 2026-10-21  
Stripe mode: **test only** (`livemode=false`). No live charges.  
Synthetic company: **Cedar & Valve Synthetic Plumbing QA**  
Checkout email: `chatg7788@gmail.com`  
Customer number: **ALX-C000010**  
WordPress: `stripe-test-integration` @ `85c30b6` (QA gate already deployed)  
Next.js: `customer-lifecycle-staging` @ `64b1a72`  
Production onboarding alias: `onboard.meetalexander.ai`  
Production deployment after the test-key fix: `dpl_HkTcf8vWtCiiB9oiHNStTtCGbSr7`

## What was executed

One Stripe test Checkout (`cs_test_`, unpaid session created by the existing WordPress QA gate, then paid with card `4242` in Stripe’s hosted Checkout). Stripe recorded **USD 50000**, price `price_1UPnnEQKy1Smykv0n8NSuxFG`, product `prod_VQf7oFN8EMgfWF`, subscription `sub_1USslFQKy1Smykv0CnPyXK69` (**active**, then **canceled** in test mode after evidence capture), customer `cus_VTqSQpWtTSOSGr`.

WordPress authoritative verify moved the local payment row to `payment_verified`. The first HMAC handoff returned **503** `stripe_secret_not_configured`, then `stripe_secret_not_test`: the Secrets Manager value Production loaded was not an `sk_test_` / `rk_test_` key. Production was given the same test key WordPress already uses (`ALEXANDER_STRIPE_SECRET_KEY`, not printed). Handoff code prefers that key when it matches `ALEXANDER_STRIPE_MODE=test`. After that deploy, the **same** session provisioned once.

## Evidence

| # | Stage | Result | Evidence |
|---|---|---|---|
| 1 | Stripe test payment | **PASS** | Hosted Checkout, Sandbox badge, card 4242. Session `cs_test_a17gcLXY…` `status=complete` `payment_status=paid` `livemode=false` `amount_total=50000` `currency=usd` |
| 2 | Stripe verification | **PASS** | Price `price_1UPnnEQKy1Smykv0n8NSuxFG` unit `50000` monthly. Customer `cus_VTqSQpWtTSOSGr` email `chatg7788@gmail.com`. Subscription was `active` before housekeeping cancel |
| 3 | Lifecycle handoff / webhook | **PASS** (handoff) | WordPress signed POST to `onboard.meetalexander.ai/.../stripe-handoff`. First attempts 503 until test key was available. Successful response HTTP 200. Stripe webhook did not verify the row before the success reconcile (`before_state=checkout_created`) |
| 4 | Lambda processing | **PASS** | `provisionFromVerifiedStripe` via the existing Vercel→Lambda path. Response `created=true` then idempotent replay kept the same ids |
| 5 | PostgreSQL customer | **PASS** (via Lambda response, not local SQL) | `customerNumber=ALX-C000010` `customerId=f9fe84aa-7ff2-4a0b-94b7-db026fd14347`. AWS SSO on this workstation was expired, so `inspectCustomerProvisioning` was not run |
| 6 | Subscription record | **PASS** (Stripe + provision response) | Stripe subscription id above linked through the verified session. Second handoff returned the same `onboardingId=e9e41757-13fe-40b1-a463-49e9c461bd95` and did not create another customer |
| 7 | Email #1 outbox | **PASS** (job created) | `emailJobId=5201e2b2-0574-4404-a7e9-6a537fb8936d` returned with the customer. Same job id on replay |
| 8 | Email #1 delivery | **NOT TESTED** | Outbox worker and SES allowlist were not inspected. Local AWS credentials were expired (`aws sso login` token refresh failed). Inbox was not opened |
| 9 | Invitation redemption | **BLOCKED** | The create response included an invitation URL. It was not stored, and the idempotent replay does not return it. The raw token is not recoverable from the hash. Delivery to `chatg7788@gmail.com` was not confirmed |
| 10 | Portal-admin confirmation | **NOT TESTED** | Depends on redeeming the invitation |
| 11 | Questionnaire draft | **NOT TESTED** | |
| 12 | Questionnaire submission | **NOT TESTED** | |
| 13 | Provisioning trigger | **NOT TESTED** | Not reached. Submit is what runs `runCustomerProvisioning` |
| 14 | Trillet workspace readiness | **BLOCKED** | Expected `workspace_provisioning_blocked` until an isolated managed-child workspace exists. Phillip / `ALX-C000002` was not touched. No workspace was assigned |
| 15 | Email #2 | **NOT TESTED** | Must stay unsent until an allowlisted dashboard URL exists. Not triggered |
| 16 | Account creation | **BLOCKED** | Trillet managed-child workspace is still a provider limitation |
| 17 | Returning Sign In | **NOT TESTED** | |
| 18 | Customer dashboard isolation | **NOT TESTED** | No dashboard was issued |

## Idempotency observed

A second signed handoff for the same `cs_test_` session, while the test subscription was still active, returned HTTP 200, `customerNumber=ALX-C000010`, the same onboarding id, the same email job id, and `created` not true. No second payment was created. After the test subscription was canceled, a further handoff returned HTTP 400 `subscription_not_active` and did not create another customer.

## Configuration change (authorized repair)

| Item | Change |
|---|---|
| Vercel Production `ALEXANDER_STRIPE_SECRET_ARN` | Set to the Preview secret ARN. That secret did **not** verify as a test key |
| Vercel Production `ALEXANDER_STRIPE_SECRET_KEY` | Set from the existing WordPress test secret (value not logged) |
| Source | `getAlexanderStripeSecretKey()` uses a direct key when it matches `ALEXANDER_STRIPE_MODE` |
| `ALEXANDER_STRIPE_MODE` | Remains `test` |
| WordPress QA gate | Still required for public Checkout |
| Lambda / schema / Phillip | Not modified |

## Housekeeping

Test subscription `sub_1USslFQKy1Smykv0CnPyXK69` was **canceled** in Stripe test mode (`livemode=false`, `status=canceled`). Customer row **ALX-C000010** was left in place. Real customers were not deleted.

## Remaining blocker

Complete AWS SSO (`aws sso login --profile AdministratorAccess-820242913027`) and confirm Email #1 in `chatg7788@gmail.com`. The invitation link in that message is the only recoverable bearer for portal-admin and the questionnaire. Do not invent a token. Do not assign Phillip’s workspace. Do not send Email #2.

## Success criteria

| Objective | Met |
|---|---|
| Genuine Stripe sandbox payment → customer + subscription records | **YES** — ALX-C000010 from the real `cs_test_` session |
| Email #1 sent and questionnaire completed | **NO** — outbox job created; delivery and redeem not verified |
| Full dashboard / account activation | **NO** — Trillet managed-child blocker remains; Email #2 not sent |
| Real payments disabled | **YES** |

## Phase C2 follow-up

Completed in `docs/ALEXANDER_PHASE_C2_ONBOARDING_COMPLETION.md`: Email #1 delivered (SES test allowlist), invitation redeemed, portal-admin confirmed, questionnaire submitted, business profile projected, provisioning stopped at `workspace_provisioning_blocked`. No Email #2. No Phillip workspace.
