# Alexander production Stripe restoration — final

Date: 2026-10-21  
Executor: production recovery run after commits `2570c63` (WordPress) and `7b4dc82` (Next.js).

## A. Original code recovery

**Source:** `ZAIDDUARTE/alexander-wordpress` branch `stripe-test-integration`, rebuilt via `scripts/build-production-pack.sh` from the recovered `inc/stripe/` module + Composer lock (`stripe-php` 16.6.0).

**Restored on production theme** (`sites/meetalexander/wp-content/themes/alexander-child/`):

| Item | Before | After |
| --- | --- | --- |
| `inc/stripe/` | Missing | Deployed (mode-aware Checkout / webhook / handoff) |
| `vendor/` | Missing | Deployed (`stripe-php` 16.6.0) |
| `alexander-get-started.js` | 794 bytes | 4352 bytes |
| `functions.php` | 5008 bytes, no Stripe | Production-safe overlay with conditional Stripe bootstrap + success-page helper |
| Navbar / homepage CSS / templates | Intact | Untouched |

**Rollback checkpoint:** `rollback-theme-20261021-094007` (pre-change `functions.php` + JS).  
**wp-config backup:** `wp-config.php.bak-stripe-20261021-044652`

**Incident during deploy:** Homepage briefly returned HTTP 500 because Stripe `bootstrap.php` called `alexander_child_is_get_started_success()` which the lean production `functions.php` lacked. Fixed immediately by adding the helper and guarding the bootstrap with `function_exists`. Homepage restored to HTTP 200 with Sign In / Create Your Account / Book a Demo visible.

**Staging / production differences remaining:** Production WordPress is running **test-mode** Stripe credentials and the test catalogue (see section B). Live catalogue IDs were not present in any authorized env file. Production onboarding still lacks `/onboarding/account` and `/api/onboarding/portal-admin` (404). Staging handoff historically pointed at a Preview Vercel host; production WordPress handoff now targets `onboard.meetalexander.ai`.

## B. Stripe product and price verification

| Check | Result |
| --- | --- |
| Authorized env files scanned for Product/Price | Found only the **test** defaults (`prod_VQf7oFN8EMgfWF`, `price_1UPnnEQKy1Smykv0n8NSuxFG`) in `alexander-wordpress/.env` and `.env.example`. **No live Product/Price IDs** in `.env.local` or elsewhere under Work |
| Stripe API (test secret) product active | PASS |
| Stripe API (test) price active, USD, recurring monthly, unit_amount `50000` | PASS |
| Price belongs to product | PASS |
| livemode on that catalogue | `false` (test) |
| Live Product/Price + live secret on production | **MISSING** — cannot activate true live Checkout |

Production was therefore configured with **`ALEXANDER_STRIPE_MODE=test`** (allowed on the production host by the recovered config) so Checkout initiation could be proven without inventing live IDs. This is not a live-mode payment environment.

**Missing for live activation (names only):**

- `ALEXANDER_STRIPE_MODE=live`
- `ALEXANDER_STRIPE_SECRET_KEY` (live) or Secrets Manager ARN
- `ALEXANDER_STRIPE_WEBHOOK_SECRET` (live endpoint)
- `ALEXANDER_STRIPE_PRODUCT_ID` (existing live product — not the test default)
- `ALEXANDER_STRIPE_PRICE_ID` (existing live $500/month price — not the test default)
- Matching live mode + catalogue on Vercel / Lambda

## C. Production deployment

| Component | Status |
| --- | --- |
| WordPress theme files | Deployed (Stripe surface only) |
| WordPress health | Homepage 200, Get Started 200, no critical error after hotfix |
| Vercel production | **Not redeployed**. Handoff route exists (`POST` → HMAC 401 without signature). Portal-admin routes 404 |
| Lambda | **Not redeployed**. Step 03.7 baseline left in place. Live-mode verify code is on Git branch only |
| Database schema | Not modified. Schema `015` assumed from prior Step 03.7; no write verification this run |
| Rollback | Theme rollback dir + wp-config bak present |

## D. End-to-end verification

| Item | Staging | Production | Notes |
| --- | --- | --- | --- |
| Checkout button | PASS (prior) | **PASS** — enabled, `$500`, `checkoutEnabled=1` | Actual browser |
| Checkout session create | PASS | **PASS** — `checkout.stripe.com`, `cs_test_`, subscription, unpaid session expired | Actual |
| Browser redirect to Stripe | PASS | **PASS** | Actual |
| Live `cs_live_` session | NOT TESTED | **BLOCKED** — no live secret/catalogue | |
| Stripe webhook delivery | NOT TESTED | **NOT TESTED** — no completed payment | |
| Lifecycle handoff after pay | NOT TESTED | **NOT TESTED** — no completed payment; route reachable | |
| PostgreSQL customer row | NOT TESTED | **NOT TESTED** — no AWS credentials locally; shared DB not written | |
| Subscription record | NOT TESTED | **NOT TESTED** | |
| Email #1 | NOT TESTED | **NOT TESTED** | |
| Invitation destination | — | **BLOCKED** for full onboard — `/onboarding/account` and portal-admin **404** on production | |
| Questionnaire entry | — | `/onboarding` **200**; account/portal-admin missing | |

Homepage navigation after restore: Sign In → `https://app.trillet.ai/`, Create Your Account → `/get-started/`, Book a Demo visible.

## E. GitHub

| Repo | Branch | Commit |
| --- | --- | --- |
| `ZAIDDUARTE/alexander-wordpress` | `stripe-test-integration` | `02cbb32e29cc8211da0b7041b05d7b026314312d` (includes production success-helper hotfix) |
| `ZAIDDUARTE/alexander` | `customer-lifecycle-staging` | `7b4dc82319d90577d18bf386f1087e07809c1bae` (live-mode verify source; **not** merged to `main`, **not** deployed to Vercel production) |

No force-push. Secrets not committed. `vendor/` generated on the server / local pack only.

## F. Remaining blockers

1. **Live Product ID and Price ID** — user stated they were added to an env file; only test defaults were found. Provide the live IDs (and confirm they are live-mode) in WP Engine `wp-config` / Secrets Manager.
2. **Live Stripe secret + live webhook secret** for production.
3. **Vercel production deploy** of the mode-aware handoff/verify commits before accepting `cs_live_` sessions.
4. **Production onboarding frontend** missing portal-admin / account routes (404) — do not send paid customers there until Preview parity is promoted carefully.
5. **Separate approval** required before completing a real charge.
6. Local AWS CLI has no credentials — cannot query RDS/Lambda logs from this workstation without login.

## G. Final outcome

1. WordPress Stripe integration restored — **YES** (code + dependencies + CTA; currently test-mode on production host).
2. Production Checkout initiation functional — **YES** (unpaid `cs_test_` session to `checkout.stripe.com`).
3. Payment-to-database integration verified using a real event — **NO**.
4. Email #1 and onboarding verified — **NO** (and production portal-admin path is 404).
5. Complete production payment workflow ready — **NO-GO** for live paid customers until live catalogue/secrets, Vercel live-mode handoff, and onboarding route parity are in place.

### Controlled live payment request (when you approve later)

Before any real charge, supply:

- Confirmation of live Product/Price IDs and that they are $500 USD/month recurring  
- Approval to switch `ALEXANDER_STRIPE_MODE=live`  
- Approved customer email for the single test subscription  
- Cancellation/refund plan  

Then stop for your explicit “charge now” approval.
