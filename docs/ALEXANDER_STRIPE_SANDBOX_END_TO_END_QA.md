# Alexander — Stripe Sandbox End-to-End QA

Date: 2026-10-21 (Phases A+B executed)  
Branch (Next.js): `customer-lifecycle-staging` @ `a942893` (promote source parent `e555236` / Preview `dpl_4mAVamRggo4Xz9i4XV8dm74Q6De9`)  
Branch (WordPress): `stripe-test-integration` @ `85c30b6`  
Mode contract: **`ALEXANDER_STRIPE_MODE=test` only** — no live keys, no live catalogue, no real charges.

## Executive answers

| Question | Answer |
| --- | --- |
| 1. Sandbox payment workflow verified | **NO** — unpaid `cs_test_` create PASS (QA-gated); completed payment → DB **not** run (Phase C not approved) |
| 2. Production onboarding routes restored | **YES** — `/onboarding/account` 200; portal-admin 401; invitation + handoff present |
| 3. Database sync via genuine Stripe test events | **NO** — Phase C not approved |
| 4. Email #1 and questionnaire workflow verified | **NO** — blocked on Phase C |
| 5. Safe to consider future live activation | **NO** |

## Phase A — WordPress QA-gate (APPROVED — executed)

| Item | Result |
| --- | --- |
| Rollback checkpoint | `rollback-theme-20261021-102126` (+ later `rollback-theme-qa-nocache-*`, `rollback-theme-qa-js-*`) |
| `ALEXANDER_STRIPE_MODE` | `test` (unchanged) |
| `ALEXANDER_STRIPE_TEST_QA_TOKEN` | Installed in WP Engine `wp-config` on the server only — **never printed/committed** |
| Token URL hygiene | `?stripe_qa=` redeem redirects and strips query; cookie stores HMAC only; `Referrer-Policy: no-referrer` on Get Started |
| Edge note | Cloudflare strips custom cookies on **GET** document/API; **POST** preserves them. CTA unlock probes `POST /wp-json/alexander/v1/stripe/qa-status` |
| Public Checkout | **PASS** — `503` `checkout_qa_required` without QA cookie |
| Authorized Checkout | **PASS** — unpaid `cs_test_` session create with QA cookie (POST) |
| Homepage / nav | **PASS** — 200; Sign In → `https://app.trillet.ai/`; Create Your Account → `/get-started/`; Book a Demo present; no critical error |
| Design | Navbar/login buttons preserved |

QA unlock (authorized operators only; token never in chat/logs):

1. `POST /wp-json/alexander/v1/stripe/qa-unlock` with JSON `{"token":"<wp-config value>"}` (sets HttpOnly cookie).  
2. Open `/get-started/` — JS probes QA status over POST and enables CTA when authorized.  
3. Prefer unlock body over long-lived `?stripe_qa=` URLs.

## Phase B — Vercel Production onboarding parity (APPROVED — executed)

| Item | Value |
| --- | --- |
| Prior Production (rollback) | `dpl_EwCnTbRuKEADc1CTttyMDxqFATea` (2026-10-15) |
| Release candidate Preview | `dpl_4mAVamRggo4Xz9i4XV8dm74Q6De9` |
| Production after promote | `dpl_G9oCFYKLd4Qa14gy2U4B7U5TvDkD` (alias `onboard.meetalexander.ai`; sibling promote `dpl_CP3A1ybXzSFTqnGATxthMkfsYxRj` also built from the same candidate) |
| Lambda / RDS / schema | **Unchanged** |
| Stripe mode on Vercel Production | `ALEXANDER_STRIPE_MODE=test` added |
| Invitations | `ONBOARDING_INVITATIONS_ENABLED=true` added to Production |
| Onboarding base URL | `ALEXANDER_ONBOARDING_BASE_URL=https://onboard.meetalexander.ai` added |
| Email delivery | `EMAIL_DELIVERY_MODE=test` added to Production env (SES allowlist remains on Lambda/`ALLOWED_TEST_RECIPIENT`) |

### Production verification (after promote)

| Check | Result |
| --- | --- |
| `/onboarding/account` | **200** |
| `/onboarding/account/verify` | **200** |
| `/api/onboarding/portal-admin` | **401** `{"ok":false,"reason":"rejected"}` (auth enforced) |
| `/api/onboarding/invitations/redeem` | **405** on GET (route exists; POST expected) |
| `/onboarding` questionnaire | **200** |
| `/i` invitation continue | **200** |
| Stripe handoff invalid HMAC | **401** `stale_timestamp` |
| Marketing site | Unchanged (WP homepage 200) |

Rollback B: `npx vercel promote dpl_EwCnTbRuKEADc1CTttyMDxqFATea --yes` (confirm in Vercel UI first).

## Stage results (updated)

| Stage | Result | Actual evidence |
| --- | --- | --- |
| WordPress Checkout | **PASS** (QA-gated) | Public 503 `checkout_qa_required`; authorized unpaid `cs_test_` create |
| Stripe test payment (completed) | **NOT TESTED** | Phase C not approved |
| Webhook/handoff | **PASS** (reject path) | Invalid signature → 401; no paid session this run |
| AWS Lambda | **NOT TESTED** | No new paid event; no local AWS credentials |
| PostgreSQL customer | **NOT TESTED** | Shared RDS — Phase C gate |
| Subscription record | **NOT TESTED** | Phase C |
| Email #1 | **NOT TESTED** | Phase C |
| Invitation redemption | **PASS** (route) | `/i` 200; redeem route present — full redeem needs invitation from paid flow |
| Portal administrator confirmation | **PASS** (route/auth) | UI 200; API 401 without access cookie |
| Questionnaire access | **PASS** | `/onboarding` 200 |
| Questionnaire submission | **NOT TESTED** | Phase C |
| Provisioning trigger | **NOT TESTED** | Expect `workspace_provisioning_blocked` after submit |

## Phase C — prepared, **NOT APPROVED**

Do **not** complete a Stripe test payment that writes shared RDS until explicit C approval.

### Isolation

Preview and Production share `alexander-onboarding-persistence` + PostgreSQL. No separate staging DB.

### Prerequisites before C

1. Authorized synthetic customer email that exactly matches Lambda `ALLOWED_TEST_RECIPIENT` (or Secrets Manager email-guard).  
2. Local AWS auth (`aws sso login` / `aws login`) for read-only inspect.  
3. Clearly fictional company name (e.g. “Cedar & Valve Synthetic Plumbing QA”).  
4. Confirm `EMAIL_DELIVERY_MODE=test` on Lambda (unchanged this run).  
5. Operator holds QA unlock for WordPress test Checkout.

### Exact steps for C (when approved)

1. Unlock WP QA Checkout (POST `qa-unlock`; do not paste token into tickets).  
2. Open Stripe Checkout; pay with Stripe test card `4242…`; confirm **test** mode in Dashboard.  
3. Do **not** trust success-page params alone — confirm Stripe Dashboard `cs_test_` paid + subscription active.  
4. Confirm WordPress → HMAC handoff → Vercel verify → Lambda `provisionFromVerifiedStripe`.  
5. Read-only Lambda inspect (no forged rows):

```bash
aws lambda invoke --function-name alexander-onboarding-persistence \
  --payload '{"operation":"inspectCustomerProvisioning","customerNumber":"ALX-C######"}' /tmp/cust.json
aws lambda invoke --function-name alexander-onboarding-persistence \
  --payload '{"operation":"inspectEmailOutbox","customerNumber":"ALX-C######"}' /tmp/outbox.json
```

6. Expected: new/updated `synthetic_test` customer; subscription linked; Email #1 outbox `questionnaire_invitation`; no change to Phillip `ALX-C000002`.  
7. Redeem invitation on `onboard.meetalexander.ai` (or Preview `/i` if needed); confirm portal admin; draft + submit fictional questionnaire.  
8. Accept `workspace_provisioning_blocked` — do **not** assign Phillip workspace.

### Rollback C

Cancel the Stripe **test** subscription in Dashboard; leave real rows untouched; operator review of `synthetic_test` only.

## GitHub synchronization

| Repo | Branch | Commit |
| --- | --- | --- |
| `ZAIDDUARTE/alexander-wordpress` | `stripe-test-integration` | `85c30b6` |
| `ZAIDDUARTE/alexander` | `customer-lifecycle-staging` | report update after A/B (this file) |

## Final status

Phases **A** and **B** complete. Real payments remain **disabled**. Stopped before Phase **C** (shared-RDS synthetic payment).
