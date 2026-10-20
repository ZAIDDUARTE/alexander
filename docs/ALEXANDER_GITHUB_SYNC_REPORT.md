# Alexander GitHub sync

Date: 2026-10-21. No force-push. No history rewrite. `main` was not updated.

## Repositories

| Repository | Visibility | Role |
| --- | --- | --- |
| https://github.com/ZAIDDUARTE/alexander-wordpress | Private. Created this recovery | WordPress child theme |
| https://github.com/ZAIDDUARTE/alexander | Public. Existing | Next.js onboarding, Lambda, CDK |

`ZAIDDUARTE/wpp` and `ZAIDDUARTE/wp-theme` are older unrelated projects. They were not used.

## alexander-wordpress

Remote `origin` added. Default branch `stripe-test-integration`.

| Branch | Commit | Push |
| --- | --- | --- |
| `stripe-test-integration` | `8d9e9ff2aad0410caf39c5c840e1f8e82dc9dbc8` | Pushed. Tracks `origin/stripe-test-integration` |
| `master` | `f99771ec917b0dd1a62f9b18a6a42801359c7591` | Pushed |
| `alexander-landing-figma-rebuild` | `90d26f5d92e383fc2a701daec87c0da0ae0a599b` | Pushed |

Commit `8d9e9ff` message: "Preserve the tested Stripe Checkout theme and stop production from loading it blindly."

Files in that commit:

- `.github/workflows/theme-check.yml`
- `.gitignore`
- `alexander-child/assets/css/alexander-figma-parity.css`
- `alexander-child/assets/css/alexander-get-started.css`
- `alexander-child/assets/css/alexander-landing.css`
- `alexander-child/assets/js/alexander-landing.js`
- `alexander-child/functions.php`
- `alexander-child/inc/stripe/bootstrap.php`
- `alexander-child/inc/stripe/checkout.php`
- `alexander-child/inc/stripe/config.php`
- `alexander-child/inc/stripe/tests/stripe-synthetic-open-session-regression.php`
- `alexander-child/page-templates/alexander-get-started-success.php`
- `alexander-child/template-parts/alexander-footer.php`
- `alexander-child/template-parts/alexander-header.php`
- `alexander-child/template-parts/get-started-content.php`
- `alexander-child/template-parts/landing-content.php`
- `deploy/production/functions.php`
- `docs/DEPLOYMENT.md`
- `docs/RELEASE_MANIFEST.md`
- `docs/SIGNIN_TRILLET_PRODUCTION_PUBLISH.md`
- `docs/SIGNIN_TRILLET_STAGING_APPROVAL.md`
- `docs/STRIPE_IMPLEMENTATION.md`
- `scripts/deploy-theme.sh`
- `scripts/theme-check.sh`

`vendor/` is gitignored. `wp-config.php` is gitignored. QA screenshot dumps under `qa/` were left untracked.

## alexander (Next.js / AWS)

Branch `customer-lifecycle-staging` pushed to `origin`. It is 32 commits ahead of `origin/main` and 0 behind, so it can fast-forward, but it was not merged.

| Commit | Role |
| --- | --- |
| `bf3fb29d561ca74fb3ec7a24b9e840555c917396` | This recovery. Provisioning, invite, Jobber, calendar, and portal-admin source |
| `5512cf6` | Previous local HEAD, now the parent of `bf3fb29` |

Commit `bf3fb29` message: "Record the customer provisioning and integration source already used in staging."

103 files. New and updated paths:

- `.env.example` (names and placeholders only)
- `.gitignore`
- `docs/TRILLET_PROVISIONING_FLOW.md`
- `infra/lambda/handler.ts`
- `infra/lib/alexander-persistence-stack.ts`
- `infra/sql/010_request_only.sql`
- `infra/sql/011_request_poll_state.sql`
- `infra/sql/013_trillet_invitation_state.sql`
- `infra/sql/014_portal_admin_email.sql`
- `infra/sql/015_customer_provisioning_state.sql`
- `scripts/build-ab-c000001-v12.ts`
- `scripts/build-live-lisa-phillip-v12-optimized.ts`
- `scripts/build-live-lisa-phillip-v12.ts`
- `scripts/render-trillet-demo.ts`
- `scripts/trillet-direct-invite-qa.ts`
- `src/app/api/integrations/jobber/` (callback, connect, schema, status)
- `src/app/api/integrations/trillet/post-call/route.ts`
- `src/app/api/onboarding/portal-admin/` (route and verify)
- `src/app/api/service-requests/route.ts`
- `src/app/api/staging/` (service-requests, trillet discover, import-call, poll, provision-qa, workspaces)
- `src/app/i/invitation-continue.tsx`
- `src/app/onboarding/account/page.tsx`
- `src/app/onboarding/account/verify/page.tsx`
- `src/app/onboarding/page.tsx`
- `src/app/staging/requests/page.tsx`
- `src/lib/policy-profile/` (importer, mapping, tests)
- `src/lib/server/onboarding-provisioning.test.ts`
- `src/lib/server/persistence/` (provisioning, portal admin, Trillet invite, dashboard URL, email templates, onboarding access, profile projector, v2 submit, and their tests)
- `src/lib/server/requests/` (Jobber, Google Calendar, intake, store)
- `src/lib/trillet-demo/` (prompt builders and tests)

Not pushed: `.deploy-tmp/`, `output/`, `transcripts/`, `website-images/`, root binaries, questionnaire answer JSON, and local QA notes. `.gitignore` now ignores those package and artifact paths. Tracked `.env.example` is still allowed.

## Secrets scan

Scanned the staged WordPress diff and the staged application diff for live secret-key prefixes, webhook secrets, AWS access-key ids, and private-key blocks. No credential values were in either commit.

`vendor/`, `wp-config.php`, `.env.local`, and deployment zip/rollback archives were not committed.

A Google OAuth client id was already in `.env.example` on the existing history (`925039593286-…apps.googleusercontent.com`). This recovery did not add it. No client secret was found next to it. A client id is not a Stripe or database secret. No new rotation is required from this push.

A personal inbox that had been hardcoded as the default recipient in `scripts/trillet-direct-invite-qa.ts` was removed before commit. The script now requires `INVITE_EMAIL` and `ALLOWED_INVITE_EMAILS`. That address remains only in the untracked local note `docs/STEP_03_8_FRESH_AUTHENTICATION_QA.md`, which was not pushed.

## Awaiting review

Pull request: https://github.com/ZAIDDUARTE/alexander/pull/1

`customer-lifecycle-staging` → `main`. Not merged. Merging can deploy the Next.js app if Vercel tracks `main`.

WordPress production is also not updated. See `docs/ALEXANDER_FULL_CODE_RECOVERY_REPORT.md`.
