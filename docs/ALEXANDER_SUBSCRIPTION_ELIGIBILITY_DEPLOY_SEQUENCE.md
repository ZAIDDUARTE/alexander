# Alexander — Subscription eligibility + webhook safety deploy sequence

Status: **NOT APPROVED TO DEPLOY.** Source-only. Live remains `eba9c45` security revision.

No new Stripe payment. No Trillet invite / Email #2 / workspace assign. No production config changes until this sequence is explicitly approved.

---

## What this ships

1. Dashboard activation uses **persisted** `stripe_subscription_status` / `stripe_livemode` only. Caller-supplied status is rejected.
2. Historical rows with null status after migration **fail closed** (`subscription_status_required`).
3. Cancellation/status changes: WordPress webhook → HMAC `subscription-sync` → Vercel **re-fetches Stripe** → Lambda `syncStripeSubscriptionEligibility`.
4. Failed lifecycle handoffs are **not** Stripe-event-claimed; Stripe retries; WP-Cron also retries `handoff_retry`.

---

## Exact sequence (after approval)

| Step | Action | Rollback |
|---|---|---|
| 1 | Apply SQL `infra/sql/016_customer_subscription_eligibility.sql` on `alexander-onboarding` (additive). Confirm columns exist; existing rows stay NULL. | `ALTER TABLE … DROP COLUMN` only if empty/unused; prefer leave columns |
| 2 | Deploy WordPress theme changes (`lifecycle-handoff.php`, `webhook.php`, `onboarding-bridge.php`, `bootstrap.php`) to the Stripe-enabled host. | Theme rollback zip already used for prior WP deploys |
| 3 | Deploy Lambda `alexander-onboarding-persistence` with eligibility + `syncStripeSubscriptionEligibility` (same pack recipe as eba9c45: `index.js` + `global-bundle.pem` + `pg`). Keep env: `EMAIL_DELIVERY_MODE=test`, deny-list, invite flags unset. | `persistence-pre-eba9c45.zip` only if rolling back past eba9c45; otherwise keep prior zip from this deploy |
| 4 | Deploy Vercel Production with `subscription-sync` route + verify path (clean worktree). | Promote prior production deployment |
| 5 | Read-only proof: `markTrilletWorkspaceReady` for ALX-C000010 (canceled, null or canceled status) → `subscription_status_required` or `canceled_synthetic_blocked`; `paymentVerifiedHistorically=true`. No workspace write. |
| 6 | Optional approved webhook-only payment per `ALEXANDER_WEBHOOK_ONLY_SANDBOX_TEST_PLAN.md` (separate approval). |

Do **not** `cdk deploy`.

---

## Pre-deploy verification (source)

- Caller override rejected (`rejectCallerSuppliedSubscriptionOverride`)
- Stored null fails closed
- Webhook claim gated on handoff success
- Subscription sync is Stripe-authoritative on Vercel
