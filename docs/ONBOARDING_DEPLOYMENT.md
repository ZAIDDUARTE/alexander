# Onboarding deployment

This Next.js app is the Alexander customer questionnaire. It is not the marketing site.

| Host | Owner |
| --- | --- |
| `meetalexander.ai` and `www.meetalexander.ai` | WordPress, outside this repository |
| `onboard.meetalexander.ai` | This Vercel project |
| `*.vercel.app` | This app, for testing and preview deployments |

The questionnaire stays at `/onboarding`. Visiting `/` on the onboarding host redirects there. Preview and `*.vercel.app` hosts do the same from the root page, so they keep working when `ONBOARDING_HOST` is unset or set only for production.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. It redirects to `/onboarding`.

Do not put real AWS keys, database passwords, or Vercel tokens in `.env.local`.

## Build and production start

```bash
npm run build
npm start
```

Vercel runs `npm run build`. Production assumes HTTPS. Session cookies are marked secure when `NODE_ENV` is `production`.

## Vercel

Use the existing Alexander project. Do not create a second project.

Production environment names:

| Name | Required | Notes |
| --- | --- | --- |
| `ONBOARDING_HOST` | Yes, for the custom domain | Value `onboard.meetalexander.ai`. Server-only. |
| `AWS_REGION` | Yes | Existing production region. |
| `AWS_ROLE_ARN` | Yes | Existing Vercel OIDC role. Invoke-only. |
| `ALEXANDER_PERSISTENCE_LAMBDA_ARN` | Yes | Existing persistence Lambda. |

Do not add `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, or a database password.

`REDIS_URL` is optional. Durable drafts and submissions use PostgreSQL through the persistence Lambda. `ALLOW_LOCAL_ONLY_PERSISTENCE` is ignored in production.

After changing production environment variables, redeploy the existing project so the new values are included. This repository does not deploy itself.

## Custom domain

In the existing Vercel project, add `onboard.meetalexander.ai`. Vercel will show the DNS record to create. Copy that target exactly. Do not invent a CNAME target.

Leave the apex domain and `www` on WordPress.

Set production `ONBOARDING_HOST` to `onboard.meetalexander.ai`.

## GoDaddy DNS

In the GoDaddy DNS zone for `meetalexander.ai`, add the record Vercel displays for `onboard`. Copy the type, host, and target from the Vercel domain screen. Do not guess the target.

Do not change the apex or `www` records that WordPress uses.

## Verify health

```bash
curl -sS https://onboard.meetalexander.ai/api/health
```

Expected body:

```json
{"status":"ok","service":"alexander-onboarding"}
```

That endpoint does not check the database and does not return secrets.

Durable persistence is a separate check:

```bash
curl -sS https://onboard.meetalexander.ai/api/onboarding/health
```

Expected when production AWS settings are present: `durablePersistence` true, `database` `ok`, and `snapshotStorage` `ok`. It does not return hostnames, secret names, or questionnaire contents.

## Verify persistence

1. Open `https://onboard.meetalexander.ai/`.
2. Confirm the welcome questionnaire loads without typing `/onboarding`.
3. Enter a clearly fake company name and continue far enough for autosave.
4. Refresh. The same draft should return.
5. The browser may also keep a local copy. A successful server save is the authoritative copy. Production does not accept a local-only submission.

## Full test submission

Use a synthetic company, not a real customer. Complete the required answers through review and submit. The confirmation page appears only after the server accepts the submission. If storage fails, the questionnaire stays in place and does not show the confirmation page.

## Rollback

In Vercel, promote the previous production deployment of this same project. Do not delete the custom domain as the first rollback step. DNS can stay pointed at Vercel while an older deployment is promoted.

Do not roll back by making the database public or by adding long-lived AWS keys.

## Caveats

- Marketing pages are not in this app.
- `ONBOARDING_HOST` is read on the server. Changing it requires a redeploy.
- Preview deployments keep their own URLs. Do not set their `ONBOARDING_HOST` to the production hostname.
- Git push does not deploy by itself unless this project’s Vercel Git integration is connected.
- Questionnaire schema version stays independent of database migrations. This domain change does not bump it.
