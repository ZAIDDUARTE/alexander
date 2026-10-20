# WordPress → Alexander lifecycle handoff

## Contract

`POST /api/internal/customer-lifecycle/stripe-handoff`

Headers:

- `X-Alexander-Timestamp` — unix seconds
- `X-Alexander-Idempotency-Key` — e.g. checkout session id
- `X-Alexander-Signature` — HMAC-SHA256 hex of canonical string

Canonical string:

```
POST
/api/internal/customer-lifecycle/stripe-handoff
{timestamp}
{idempotencyKey}
{sha256(rawBody)}
```

Body:

```json
{
  "checkoutSessionId": "cs_test_...",
  "correlationKey": "optional",
  "host": "alexander1stg.wpenginepowered.com"
}
```

## Secrets (Staging only)

- WordPress Staging: `ALEXANDER_LIFECYCLE_HMAC_SECRET`, `ALEXANDER_LIFECYCLE_HANDOFF_URL` (server-side only)
- Vercel Staging/Preview: prefer AWS Secrets Manager via OIDC (`alexander/staging/lifecycle-hmac`, `alexander/staging/stripe`) — store ARN/name + region only, not secret values

Never commit secrets. Never put HMAC secret in the browser.

## States (WordPress)

`handoff_pending` → `handoff_processing` → `handoff_complete` | `handoff_retry` | `handoff_failed`

Payment verification stays independent of AWS availability.
