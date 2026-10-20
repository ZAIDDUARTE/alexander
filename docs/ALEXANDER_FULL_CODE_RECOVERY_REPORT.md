# Alexander full code recovery

Date: 2026-10-21. Production WordPress files were not modified. AWS and the database were not modified.

## 1. What broke and why

On 2026-10-20 a Sign In publish copied the staging `functions.php` onto production. That file hard-requires `inc/stripe/bootstrap.php`. Production has never had `inc/stripe/`, so WordPress hit a critical error. The live file was restored from `rollback-signin-20261020-prod/` to a production-safe `functions.php` that does not load Stripe.

What production is missing after that restore:

| Piece | Production now |
| --- | --- |
| `inc/stripe/` | Absent |
| `vendor/` (`stripe/stripe-php`) | Absent |
| `assets/js/alexander-get-started.js` | 794-byte stub from 2026-10-11 (public response size 794) |
| Stripe bootstrap in `functions.php` | Absent (5,008 bytes, sha256 `0b05abf94a08743299e9bbc82690f52c984cc0bd49e84af79136fdb35aa52b15`) |
| `ALEXANDER_STRIPE_*` in `wp-config.php` | All five names missing. No matching environment variables |

The Get Started button is on the page and `aria-disabled="true"`. Continue to Secure Payment cannot create a Checkout Session.

## 2. Source of the recovered implementation

The tested implementation is the WordPress child theme, not a new Stripe stack.

- Local repo: `/Users/zaidduartee/Work/alexander-wordpress`, branch `stripe-test-integration`
- Staging theme on `alexander1stg` matches that repo's `inc/stripe/*.php` and the 4,352-byte `alexander-get-started.js` byte for byte
- The prepared package `/tmp/alx-stripe-prod-pack/theme/` matches those same Stripe PHP files and the same JavaScript
- `DEPLOY_PROD.sh` was not executed
- Composer lockfile pins `stripe/stripe-php` v16.6.0. Staging vendor version file is `16.6.0`. `vendor/` stays uncommitted

`deploy/production/functions.php` in that repo is the current production `functions.php` plus one conditional require of `inc/stripe/bootstrap.php` (sha256 `4d10eae0d6e06e0245534e02f31d842a0d746681bc49b3f6ac36e3793259fef4`). It does not replace navigation, CSS, or templates.

## 3. Files and dependencies restored

Restored into Git, not onto the production server:

- Full `alexander-child/inc/stripe/` module (checkout, webhook, verification, persistence, portal, REST, lifecycle handoff)
- Conditional Stripe bootstrap so a missing `inc/stripe` cannot fatal the theme again
- `composer.json` and `composer.lock` (already in the theme repo)
- Theme check script and GitHub Action
- Release manifest and deployment/rollback notes

Production still needs, after approval, a copy of:

- `deploy/production/functions.php`
- `inc/stripe/`
- `assets/js/alexander-get-started.js` (4,352 bytes, sha256 `fdc772b5d0b21cb129b3c2022d6905cc7688fc3aad9534ee30343f8d4b694b54`)
- `vendor/` from `composer install --no-dev`

And these `wp-config.php` names, values supplied out of band:

- `ALEXANDER_STRIPE_MODE`
- `ALEXANDER_STRIPE_SECRET_KEY`
- `ALEXANDER_STRIPE_WEBHOOK_SECRET`
- `ALEXANDER_STRIPE_PRODUCT_ID`
- `ALEXANDER_STRIPE_PRICE_ID`

No live key, live product, or live price was found on the production install. Test-mode defaults in code are product `prod_VQf7oFN8EMgfWF` and price `price_1UPnnEQKy1Smykv0n8NSuxFG`. Those must not be copied into a live-mode production config.

## 4. Existing integrations

| Integration | Source | Connected now |
| --- | --- | --- |
| WordPress → Stripe | `inc/stripe` + REST `alexander/v1/stripe/checkout` | Staging yes. Production no |
| Stripe → AWS | WordPress `lifecycle-handoff.php` POSTs to `/api/internal/customer-lifecycle/stripe-handoff` | Code accepts only `cs_test_` sessions. Next.js route also accepts only `cs_test_`. Not redeployed |
| Stripe → customer DB | Persistence Lambda `provisionFromVerifiedStripe` and schema `015` | Left on the existing Step 03.7 deployment. No database writes in this recovery |
| Payment → Email #1 | Lambda invitation mail after verified payment | Unchanged. Not retested against a new payment |
| Email #1 → Next.js | `/i` invitation continue | Source preserved. Live mail not sent |
| Next.js → questionnaire | Onboarding draft/submit pages | Source preserved. Live questionnaire not resubmitted |
| Questionnaire → PostgreSQL | Profile projector and schema `015` | Source preserved. No rows changed |
| Portal admin confirmation | `portal-admin` routes and persistence | Source and unit tests present. Live identity check not run |
| Customer provisioning | State machine, retries, `ALX-C000002` hard block | Source and unit tests present. Not triggered |
| Trillet | Invite API adapter, workspace allowlists, live flag default off | Source present. No invite sent |
| Email #2 | Dashboard URL allowlist. `portal.meetalexander.ai` blocked until verified. Jobber hosts rejected | Unit tests pass. No email sent |
| Jobber | OAuth routes and staging pipeline flag | Source present. Staging flag was not turned on. No OAuth completed |
| Google Calendar | Free/busy check that refuses the primary calendar | Unit tests pass. No live calendar call |
| Returning Sign In | Header/footer → `https://app.trillet.ai/` | Production homepage and open mobile menu verified |

Step 03.7 (`alexander-onboarding-persistence`, schema `015`, Phillip / `ALX-C000002`) was not redeployed and no customer rows were edited.

## 5. Staging and production differences

| | Staging | Production |
| --- | --- | --- |
| Stripe module | Present, identical to Git `inc/stripe` | Absent |
| Checkout JS | 4,352 bytes | 794 bytes |
| `functions.php` | Hard-requires Stripe bootstrap | No Stripe require |
| Stripe config class | `test`, test key, webhook set, price set, product set | All missing |
| Vendor | stripe-php 16.6.0 | Absent |
| Homepage Create Your Account | Not in the staging header | Visible, links to `/get-started/` |
| Sign In | `https://app.trillet.ai/` | `https://app.trillet.ai/` |
| Payment button | Enabled (`checkoutEnabled` is `"1"`) | `aria-disabled="true"` |

Local theme CSS, header, and landing templates differ from both servers. Those edits are in Git. They were not deployed.

## 6. Tests and results

| Check | Result |
| --- | --- |
| Production homepage HTTP | PASS — 200, no critical-error text |
| Production desktop nav | PASS — Sign In, Create Your Account, and Book a Demo visible at 1440px. Sign In href is `https://app.trillet.ai/`. Create Your Account href is `/get-started/` |
| Production mobile nav | PASS — closed state shows the menu button. Opened menu shows Sign In, Create Your Account (`/get-started/`), and Book a Demo |
| Production Get Started | PASS for page health — 200, shows `$500`, button present and disabled |
| Production Checkout redirect | FAIL — button disabled, no `alexanderStripe` config, stub JavaScript, no Stripe PHP |
| Production PHP/site health | PASS — pages render. `php -l` was run on staging `functions.php` and `bootstrap.php`, and on the local production overlay |
| Staging Get Started | PASS — 200, `$500`, pay button enabled |
| Staging Checkout session | PASS — server create returned `ok`, host `checkout.stripe.com`, session prefix `cs_test_`, `livemode=no`, `mode=subscription`, `unit_amount=50000`, `currency=usd`, `interval=month` |
| Staging browser redirect | PASS — Chrome opened `checkout.stripe.com` with a `cs_test_` URL |
| Staging success/cancel URLs | PASS — retrieved from the Session: path `/get-started/success/` with `session_id`, cancel `/get-started/?checkout=cancelled`. That verification session was expired |
| Staging downstream webhook, Email #1, provisioning | NOT TESTED — would write shared customer records. No test-card charge was completed |
| Theme PHP syntax, Stripe logic test, JS syntax | PASS — `scripts/theme-check.sh` |
| Provisioning, invite, portal admin, Jobber, calendar unit tests | PASS — 82 tests, 0 failures |
| Live production charge | NOT TESTED — not approved |
| AWS webhook compatibility against a new event | NOT TESTED — no new event sent. Existing route still accepts only `cs_test_` |
| Questionnaire in the browser | NOT TESTED |
| Jobber and Google Calendar live calls | NOT TESTED |

## 7. Blockers before production checkout can take a payment

1. Approval to copy the file set in `alexander-wordpress/docs/DEPLOYMENT.md`. The copy script still refuses production even when the confirm variable is set.
2. Live `ALEXANDER_STRIPE_SECRET_KEY`, live webhook secret, and the existing live $500/month product and price IDs. They are not on the server. Do not invent them and do not reuse the test price.
3. `checkout.php` rejects every `cs_live_` id on the success page, and both the WordPress handoff and the Next.js handoff accept only `cs_test_`. Installing live keys before that guard is changed would open a live Checkout whose return path would not verify or provision. That change needs its own approval because it writes into the shared customer database.

## 8. Safeguards

- One theme repo: `https://github.com/ZAIDDUARTE/alexander-wordpress` (private), default branch `stripe-test-integration`
- `functions.php` loads Stripe only if `inc/stripe/bootstrap.php` is readable
- `docs/RELEASE_MANIFEST.md` lists files and configuration variable names
- `composer.lock` is the dependency lock. `vendor/` is gitignored
- `scripts/theme-check.sh` and `.github/workflows/theme-check.yml` run PHP syntax, the Stripe logic test, and JavaScript syntax
- `scripts/deploy-theme.sh` is a dry-run unless `ALEXANDER_DEPLOY_CONFIRM` is set, and the production branch of that script still exits before copying
- Deploy notes require a remote rollback directory before a staging copy and tell you how to copy it back
- Secrets stay in WP Engine `wp-config.php` / environment. `wp-config.php` is gitignored

## Backups taken and left in place

Read-only copies of both themes were pulled before any comparison. Production server rollback directories were not deleted:

- `rollback-signin-20261020-prod/`
- `rollback-create-account-20261020/`
- `rollback-create-visible-20261021/`

`rollback-signin-20261020/` was not on production. Staging has `rollback-stripe-prodprep-20261021/` and `rollback-ui-20261020/`.
