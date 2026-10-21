# Alexander — Stripe Sandbox End-to-End QA

Date: 2026-10-21  
Branch (Next.js): `customer-lifecycle-staging` @ `216be33` (Preview build from parent `e555236`)  
Branch (WordPress): `stripe-test-integration` @ `f642caf` (production test-mode QA gate)  
Mode contract: **`ALEXANDER_STRIPE_MODE=test` only** — no live keys, no live catalogue, no real charges.

## Executive answers

| Question | Answer |
| --- | --- |
| 1. Sandbox payment workflow verified | **NO** — Checkout initiation PASS; completed `cs_test_` payment → DB **not** run (shared RDS gate) |
| 2. Production onboarding routes restored | **NO** — Preview PASS; Production `/onboarding/account` and portal-admin still **404** |
| 3. Database sync via genuine Stripe test events | **NO** — blocked pending shared-RDS write approval + AWS credentials |
| 4. Email #1 and questionnaire workflow verified | **NO** — depends on (3) and Production promote or Preview-only continue |
| 5. Safe to consider future live activation | **NO** |

## Deployed revisions (verified this run)

| Component | Revision / evidence | Notes |
| --- | --- | --- |
| WordPress production theme | Stripe module restored earlier today (test mode) | Public test Checkout currently open until QA gate is deployed |
| WordPress source (local) | QA gate + banner implemented; `theme-check` PASS | **Not deployed** — needs approval |
| Vercel Production `onboard.meetalexander.ai` | Still missing account/portal-admin (404) | Not promoted |
| Vercel Preview (prior) | `https://alexander-7qigj72vy-zaid-alis-projects.vercel.app` | account 200, portal-admin 401 |
| Vercel Preview (this run) | `dpl_4mAVamRggo4Xz9i4XV8dm74Q6De9` → `https://alexander-grxn2zqd8-zaid-alis-projects.vercel.app` | From HEAD; account 200; handoff HMAC rejects unsigned POST |
| AWS Lambda Step 03.7 | Left in place (prior report CodeSha256 `a3sEy6eM…`) | Not redeployed |
| PostgreSQL | Schema `015` assumed | Shared by Preview + Production frontends |
| Local AWS CLI | No credentials | Cannot query RDS/Lambda logs from this workstation |

## Stage results

| Stage | Result | Actual evidence |
| --- | --- | --- |
| WordPress Checkout | **PASS** (initiation) | Prior restore: CTA enabled, `cs_test_` session to `checkout.stripe.com`, $500/month test catalogue. Public visitors can still open test Checkout until QA gate deploys. |
| Stripe test payment (completed) | **NOT TESTED** | No test-card charge this run. Requires shared-RDS write approval. |
| Webhook/handoff | **BLOCKED** | Handoff route exists on Production and Preview (`POST` → HMAC `stale_timestamp` / 401 without valid signature). No paid session to hand off. |
| AWS Lambda | **NOT TESTED** | No new event. No local AWS credentials for log/query. |
| PostgreSQL customer | **NOT TESTED** | Would write shared `alexander-onboarding` RDS. Isolation: **none** (Preview and Production share persistence). |
| Subscription record | **NOT TESTED** | Same shared-DB gate. |
| Email #1 | **NOT TESTED** | SES `EMAIL_DELIVERY_MODE=test` + `ALLOWED_TEST_RECIPIENT` required; no authorized recipient confirmed this run. |
| Invitation redemption | **BLOCKED** on Production | `/i` 200 on Production, but `/onboarding/account` **404**. Preview `/i` 200 → account 200. |
| Portal administrator confirmation | **BLOCKED** on Production | `/api/onboarding/portal-admin` **404** on Production; **401** (auth required) on Preview. |
| Questionnaire access | **PASS** (page) / **BLOCKED** (paid path) | `/onboarding` 200 on Production and Preview. Full invited path needs account parity + invitation. |
| Questionnaire submission | **NOT TESTED** | No synthetic paid customer this run. |
| Provisioning trigger | **NOT TESTED** | Expect `workspace_provisioning_blocked` after submit (Trillet managed-child limitation). Do not assign Phillip workspace. |

## Production vs Preview parity

| Route | Production | New Preview (`…grxn2zqd8…`) |
| --- | --- | --- |
| `/onboarding` | 200 | 200 |
| `/onboarding/account` | **404** | **200** |
| `/onboarding/account/verify` | 404 | 200 |
| `/api/onboarding/portal-admin` | **404** | **401** (expected without cookie) |
| `/api/onboarding/invitations/redeem` | 405 GET | 405 GET (POST route present) |
| `/api/internal/customer-lifecycle/stripe-handoff` | HMAC active | HMAC active |
| `/i` | 200 | 200 |

**Recommended promote (do not execute without approval):** promote Preview deployment `dpl_4mAVamRggo4Xz9i4XV8dm74Q6De9` (commit `e555236`) to Vercel Production. This is the already-tested Preview surface (invitation, portal-admin, questionnaire, handoff), not a blind merge of unrelated Git history onto `main`.

Cherry-picking only `src/app/onboarding/account*` is **not** sufficient — portal-admin APIs, invitation redeem, access cookies, and persistence clients must ship together. The Preview deployment already contains that compatible set.

## WordPress production test-mode QA gate (implemented, not deployed)

Fail-closed when `meetalexander.ai` + `ALEXANDER_STRIPE_MODE=test`:

1. Set `ALEXANDER_STRIPE_TEST_QA_TOKEN` in WP Engine `wp-config` (server-only).
2. Authorized QA opens `/get-started/?stripe_qa=<token>` (sets HttpOnly 12h cookie).
3. Public visitors see: checkout unavailable / not accepting live payments; CTA disabled.
4. Authorized QA see an explicit **TEST MODE — not a real purchase** banner.
5. REST returns `checkout_qa_required` when gated.

Staging host remains ungated (already test-only).

## Database isolation finding

**Staging/Preview and Production share the same AWS persistence Lambda and PostgreSQL.** There is no separate staging RDS for this workflow.

Alternatives before a synthetic paid run:

1. **Preferred if infra exists:** isolated QA database/Lambda (substantial work — not available today).
2. **Approved shared-DB synthetic:** use clearly labeled `synthetic_test` customer email on the allowlist; never touch real rows / Phillip `ALX-C000002`.
3. **Reuse existing synthetic** `ALX-C000009` for portal-admin + questionnaire on Preview only (payment already verified historically) — does **not** satisfy “genuine Stripe test payment this run.”

## Automated checks run this session

| Check | Result |
| --- | --- |
| Next.js `stripe-verify` + `portal-admin` + onboarding provisioning unit tests | 22 pass |
| WordPress `scripts/theme-check.sh` (incl. new QA-gate assertions) | PASS |
| Fresh Vercel Preview deploy + route probe | PASS |
| Production route probe | Confirms account/portal-admin still missing |
| Completed Stripe test-card payment | NOT RUN |
| RDS row inspection | BLOCKED (no AWS credentials; shared DB policy) |

Failure-mode coverage already in unit tests (not re-proven against live Stripe this run): mode/session mismatch, test vs live catalogue rejection, portal-admin email rules, invitation token hashing.

## Approvals required before continuing

### A. WordPress production — deploy QA gate (recommended first)

**Impact:** Public test Checkout on `meetalexander.ai` closes unless `?stripe_qa=` / cookie. Navbar/design unchanged. Stripe remains test mode.  
**Rollback:** Restore prior theme files from `rollback-theme-20261021-094007`; or unset token and revert QA-gate files.  
**Also set:** `ALEXANDER_STRIPE_TEST_QA_TOKEN` (out of band).  
Reply: **approve WordPress QA-gate deploy** and provide/confirm the token is installed (value not in chat).

### B. Vercel Production — promote onboarding parity

**Impact:** `onboard.meetalexander.ai` gains `/onboarding/account`, portal-admin APIs, invitation continue parity with Preview. Shared Lambda/DB unchanged.  
**Target:** `dpl_4mAVamRggo4Xz9i4XV8dm74Q6De9` / commit `e555236`.  
**Production env to confirm before/with promote (names only):** `ONBOARDING_INVITATIONS_ENABLED=true`, `ONBOARDING_HOST` / `ALEXANDER_ONBOARDING_BASE_URL`, `ALEXANDER_STRIPE_MODE=test`, Stripe secret ARN/name, lifecycle HMAC, AWS OIDC → persistence Lambda.  
**Rollback:** Redeploy previous Production deployment (prior id from Vercel history; historically `dpl_EwCnTbRuKEADc1CTttyMDxqFATea` from 2026-10-15 docs — confirm in Vercel before promote).  
Reply: **approve Vercel Production promote**.

### C. Synthetic Stripe test payment writing to shared RDS

**Impact:** Creates/updates `synthetic_test` customer + subscription + Email #1 outbox in shared production PostgreSQL.  
**Need:** Authorized test recipient email matching `ALLOWED_TEST_RECIPIENT`; `aws sso login` (or equivalent) so post-payment verification can use read-only Lambda ops `inspectEmailOutbox` / `inspectCustomerProvisioning` (no forged rows); company name clearly fictional.  
**Rollback:** Do not delete blindly — mark/classify synthetic; cancel Stripe **test** subscription in Dashboard; leave real customers untouched.  
Reply: **approve shared-DB synthetic payment** + authorized recipient email.

### D. Not requested / not done

- Live Stripe mode, live keys, live product/price  
- Lambda redeploy  
- Schema changes  
- Trillet workspace assignment / Phillip touch  
- Real customer email

## Rollback summary (quick)

| Surface | Rollback |
| --- | --- |
| WordPress QA gate | Theme rollback dir + wp-config bak |
| Vercel Production promote | Previous production deployment |
| Synthetic DB rows | Cancel test sub in Stripe; leave real rows; operator review of `synthetic_test` |
| Lambda / schema | Unchanged this run |

## Final status

Sandbox → Backend → Database → Onboarding is **not** fully verified. Safe local/Preview work is done. Stopped for genuine deployment and shared-database approvals above. Real payments remain **disabled**.
