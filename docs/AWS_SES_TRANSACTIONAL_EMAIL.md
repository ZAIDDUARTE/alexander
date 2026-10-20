# AWS SES transactional email (Staging)

## Account

- Region: `us-east-1`
- Production access: **yes** (not sandbox)
- Quota: 50k/day, 14/sec

## Identities

| Identity | Status |
| --- | --- |
| `beyondintelligence.ai` | Verified, DKIM SUCCESS |
| `support@beyondintelligence.ai` | Verified |
| `meetalexander.ai` | **Created**, DKIM **PENDING** (DNS required) |

### Staging From

`Alexander <support@beyondintelligence.ai>`

### Future From (after DNS)

`Alexander <onboarding@meetalexander.ai>`

## Configuration set

`alexander-transactional-staging`

Event destination `alexander-sns-feedback` → SNS `alexander-ses-feedback-staging` → Lambda `alexander-email-feedback` (idempotent by `event_id`).

Worker: persistence operation `processEmailOutbox` (EventBridge `alexander-email-outbox-staging`, every 5 minutes). Staging guard loads `ALLOWED_TEST_RECIPIENT` from Secrets Manager `alexander/staging/email-guard` when set.

## Outbox

Table `email_outbox` with unique `dedupe_key`. Worker claims with `FOR UPDATE SKIP LOCKED`.

## Staging guard

- `EMAIL_DELIVERY_MODE=test`
- `ALLOWED_TEST_RECIPIENT` must match exactly or send is blocked (`TEST_RECIPIENT_REQUIRED`)

## meetalexander.ai DKIM CNAMEs (add at DNS host)

Tokens (public; not secrets):

1. `3soyejchnpczw6v4bu5hcygrrgvjh3ud._domainkey.meetalexander.ai` → `3soyejchnpczw6v4bu5hcygrrgvjh3ud.dkim.amazonses.com`
2. `yd5jpysaorrtxjwpwssenrezyi242rvr._domainkey.meetalexander.ai` → `yd5jpysaorrtxjwpwssenrezyi242rvr.dkim.amazonses.com`
3. `ct6xwfkze5l3z5jdgkxaxuilz7lwvlao._domainkey.meetalexander.ai` → `ct6xwfkze5l3z5jdgkxaxuilz7lwvlao.dkim.amazonses.com`
