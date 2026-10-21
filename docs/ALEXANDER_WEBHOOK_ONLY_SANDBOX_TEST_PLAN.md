# Alexander — Webhook-only Stripe sandbox test plan (approval required)

Date: 2026-10-21  
Source revision (guard): branch tip after subscription-eligibility changes (not deployed)  
Live Production remains: `eba9c45` security deploy  

**Do not run this payment until separately approved.** Stripe test mode only. No live charges. No Trillet workspace create / invite / Email #2. No production config changes during the payment itself.

---

## Goal

Prove WordPress `checkout.session.completed` (and/or `invoice.paid`) alone initiates Alexander customer provisioning via HMAC handoff → Vercel Stripe re-verify → Lambda `provisionFromVerifiedStripe`, **without** visiting the Checkout success / return URL.

## Preconditions (already true)

| Check | Evidence |
|---|---|
| Webhook signature | `\Stripe\Webhook::constructEvent` — invalid/missing signature → HTTP 400; never processes |
| Idempotent event claim | `alexander_stripe_event_processed` → HTTP 200 `duplicate: true` without re-dispatch |
| Retryable failures | `Alexander_Stripe_Retryable_Exception` → HTTP 500 so Stripe retries; event not claimed |
| Handoff path | Webhook → authoritative verify → `alexander_stripe_maybe_trigger_onboarding_bridge` → HMAC POST `/api/internal/customer-lifecycle/stripe-handoff` |
| Customer idempotency | Unique indexes on `stripe_customer_id` / `stripe_subscription_id` / `stripe_checkout_session_id`; second handoff returns same ids, `created` not true |
| Success-page independence | Same bridge is also callable from success reconcile — this test must **block** that path |

## Exact procedure (after approval)

1. **Disable success-page handoff for one run only** (choose one; revert immediately after):
   - Temporary WP filter / short-circuit on the success reconcile that calls `alexander_stripe_maybe_trigger_onboarding_bridge`, **or**
   - Complete Checkout in a browser that never loads the return URL (close hosted Checkout after pay, or abort navigation to `meetalexander.ai` success). Prefer close-tab so no theme code change is required.
2. Create a **new** Stripe Test Checkout from WordPress public sandbox CTA (`cs_test_` only). Do **not** reuse ALX-C000010’s canceled subscription.
3. Pay with test card `4242…`. Do **not** open the success / onboarding return page.
4. Wait for Stripe to deliver `checkout.session.completed` (and optionally `invoice.paid`) to the WordPress webhook endpoint.
5. Confirm WordPress payment row: authoritatively verified; `lifecycle_handoff` → `handoff_complete`.
6. Confirm Alexander Lambda `inspectCustomerProvisioning` for the **new** synthetic customer number:
   - `paymentVerified=true`
   - Email #1 queued/delivered under `EMAIL_DELIVERY_MODE=test`
   - No workspace mapping; invite flags remain off
7. Replay: Stripe Dashboard “Resend” the same event → WordPress `duplicate: true`; handoff idempotent (same customer / onboarding ids).
8. **Revert** any temporary success-page block from step 1.
9. Cancel the new test subscription after evidence (same pattern as ALX-C000010). Leave customer rows intact.

## Pass / fail

| Result | Pass criteria |
|---|---|
| PASS | Customer + Email #1 created with **zero** success-page hits; signature + duplicate + idempotent replay confirmed |
| FAIL | No customer until success page is loaded, or duplicate creates a second customer |

## Explicitly out of scope for this payment

- `markTrilletWorkspaceReady`
- Trillet invite / Email #2
- Migration `016` / Lambda eligibility deploy (separate approval)
- SUP-475 workspace association
- Live Stripe / production config edits beyond the temporary success-page block (if used)

## Related source guard (not part of this payment)

Dashboard activation uses **persisted** current `active`/`trialing` status only (caller overrides rejected). Deploy sequence: `docs/ALEXANDER_SUBSCRIPTION_ELIGIBILITY_DEPLOY_SEQUENCE.md` (migration `016` → WP → Lambda → Vercel). Not part of this payment approval.
