# Customer lifecycle architecture (Staging)

## Flow

```
WordPress payment verified
  → HMAC POST /api/internal/customer-lifecycle/stripe-handoff (Vercel)
  → Stripe Test API re-verification (Vercel; internet)
  → IAM invoke alexander-onboarding-persistence
  → PostgreSQL: customer + onboarding + invitation + email_outbox
  → SES Email #1 (worker; test allowlist)
  → questionnaire submit
  → immutable submission + business profile revision #1
  → Trillet awaiting_internal_setup (manual hybrid)
  → markTrilletWorkspaceReady (internal)
  → SES Email #2
  → Trillet dashboard
```

## Why Stripe verification is on Vercel

`alexander-onboarding-persistence` runs in a private VPC **without NAT**. It can reach RDS Proxy, Secrets Manager, KMS, Logs, and S3 — not the public Stripe API.

Authoritative Stripe checks therefore run on the Next.js/Vercel server (Test secret), then the Lambda persists via IAM-authenticated `provisionFromVerifiedStripe`.

## Database

- RDS: `alexander-onboarding` (PostgreSQL 16.15), private
- Proxy: `alexander-onboarding-proxy`
- Schema through **009** (006 payment identity, 007 profiles, 008 email outbox, 009 Trillet)

## Idempotency

Unique indexes on `customers.stripe_customer_id`, `stripe_subscription_id`, `stripe_checkout_session_id`, and `email_outbox.dedupe_key`.

## Production

Not enabled. No Live Stripe. No real customer email. `EMAIL_DELIVERY_MODE=test` requires `ALLOWED_TEST_RECIPIENT`.
