# Alexander — Isolated Preview profile editor report

Date: 2026-10-22

## GitHub push

| Item | Value |
|---|---|
| Branch | `customer-lifecycle-staging` |
| Commits pushed | `55a9a88` → `b2b9aae` → `c3d7b71` → `6d90215` → `5438472` |
| HEAD | `5438472` |
| Remote | `origin/customer-lifecycle-staging` |

### Production deploy risk (checked before push)

- Historical `customer-lifecycle-staging` deploys with `target=production` were **CLI `--prod` / promote** (aliases include `onboard.meetalexander.ai`).
- Git pushes themselves create Preview (`target=null`) when not promoted — e.g. prior `e555236` Preview deploy.
- This run: **no `vercel --prod`**, no Production promote.
- After push + Preview CLI deploy, Production remains `d4a32ba` on `onboard.meetalexander.ai`.

## Preview deployment

| Item | Value |
|---|---|
| URL | https://alexander-1b9x9vioa-zaid-alis-projects.vercel.app |
| Commit | `5438472` |
| `target` | `null` (Preview) |
| Aliases | none (not Production) |
| Profile editing | Preview env only |
| Backend | **Isolated in-memory fictional tenant** (`ALEXANDER_PROFILE_EDITOR_MEMORY_STORE=true`) |

## Is Preview isolated from Production?

**Application/data path for this editor: yes (for this approval).**

- Editor writes do **not** go to shared Lambda/PostgreSQL when memory store is on.
- Shared Production Lambda was **not** redeployed.
- Shared Production DB was **not** written by these tests.
- Production Vercel alias unchanged.

**Caveat (architecture):** Preview still *has* `ALEXANDER_PERSISTENCE_LAMBDA_ARN` for other features. Profile APIs refuse shared-backend writes unless memory store or an approved isolated DB flag is set.

## Remaining backend changes requiring approval

1. **Isolated staging PostgreSQL** (or schema) + optional staging Lambda if durable Preview writes against real synthetic customers are required beyond memory store.
2. **Persistence Lambda deploy** of profile ops + `profile_updated` SES renderer — only after (1) or an explicit allow for shared-backend synthetic writes.
3. Account-setup email outbox processing against SES test allowlist (send) — not done here.
4. Production profile editing — blocked until tenant-scoped auth verified.

## Editor verification

Full matrix in `docs/evidence/self-service-preview/verification-results.json` and `docs/evidence/self-service-preview/README.md`.

Summary: auth, concurrency conflict, cross-customer 403/404, routine vs sensitive classification, generate, Trillet dry-run (Lisa blocked, no writes), publish, rollback, questionnaire seed untouched — all passed on isolated Preview.

## Email behavior (no send)

- Renderer subject: “We're Setting Up Your Alexander Account”
- Template type `profile_updated` + payload `kind=account_setup_in_progress`
- Idempotent dedupe key `account_setup:{customerId}:{submissionId}:v1`
- Distinct from dashboard-ready CTA/copy
- Tests: `account-setup-email.test.ts`, `account-setup-email-isolation.test.ts`

## Next (open acceptance)

Return to Lisa phone-call → Jobber → Google Calendar → customer dashboard QA. Those remain major open requirements and were not part of this Preview pack.