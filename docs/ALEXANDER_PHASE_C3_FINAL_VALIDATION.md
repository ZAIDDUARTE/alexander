# Alexander Phase C3 — Final onboarding validation & dashboard readiness

Date: 2026-10-21  
Customer: **ALX-C000010** · synthetic_test · Cedar & Valve Synthetic Plumbing QA  
Onboarding: `e9e41757-13fe-40b1-a463-49e9c461bd95`  
Linked submission: `b15e33f7-115f-4423-9a32-cafdd519fec9` (revision 1)  
Orphan session from C2 defect: `2ea00c48` / submission `a2318927-…` (unlinked; retained for audit)  
Branch: `customer-lifecycle-staging`  
Stripe: **test only** — subscription `sub_1USslFQKy1Smykv0CnPyXK69` remains `canceled`, `livemode=false`

## Validation results

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Browser V2 submit path | **PASS** | Redeem + `POST /api/onboarding/submit` on `onboard.meetalexander.ai` returned `ok=true`, `duplicate=true`, `submittedAt=2026-10-21T06:54:31.026Z`. No second linked revision |
| 2 | Unlinked orphan isolation | **PASS** | `inspectUnlinkedSubmissionIsolation`: orphan `a2318927` / session `2ea00c48` have `onboarding_id=NULL`; `canTriggerCustomerProvisioning=false`; `canAttachToCustomerWithoutOnboardingId=false`; `impossibleCustomerJoinCount=0`. Not deleted |
| 3 | Full record reconcile | **PASS** | paymentVerified, portalAdminConfirmed, questionnaireSubmitted, profileReady (96 fields), Email #1 delivered, Email #2 not queued, `workspace_provisioning_blocked` |
| 4 | Invitation URL inspection | **PASS** | Default inspect omits bearer URL. Reveal requires `revealInvitationUrl=true` **and** `synthetic_test`. `ALX-C000002` never reveals. IAM-only Lambda invoke; not exposed on public Next routes |
| 5 | Canceled subscription | **PASS** (sandbox policy) | Stripe status `canceled` / test mode. Onboarding evidence preserved via `payment_verified_at`. No dashboard / Email #2 / Trillet invite issued, so canceled state does not grant production access |
| 6 | Trillet adapter / Email #2 | **BLOCKED** (provider) | Auto-create remains `workspace_provisioning_blocked`. Email #2 blocked `dashboard_url_missing_url`. Invite flags false |
| 7 | Phillip / ALX-C000002 | **PASS** | Inspect only; workspace not assigned to ALX-C000010 |
| 8 | Studio branded Sign In | **BLOCKED** (separate) | See `docs/ALEXANDER_STUDIO_BRANDED_LOGIN_INVESTIGATION.md` — keep `app.trillet.ai` until Trillet confirms branded entry URL |
| 9 | Regression tests | **PASS** | 15/15 on provisioning, invite/Email #2 separation, workspace adapter, V2 invited routing |

## Remaining path to customer dashboard

### Can complete now (Alexander-owned)

1. Keep Stripe `ALEXANDER_STRIPE_MODE=test` until go-live approval.
2. Keep Email #2 / Trillet invite flags off (`TRILLET_INVITE_ENABLED`, `TRILLET_INVITE_LIVE_ENABLED`, `ALEXANDER_CUSTOMER_DASHBOARD_URL` unset).
3. When Trillet provides an **isolated** customer workspace id (never Phillip / `ALX-C000002`):
   - Call `markTrilletWorkspaceReady` with that workspace id only.
   - Set an allowlisted HTTPS `ALEXANDER_CUSTOMER_DASHBOARD_URL` (or per-call `dashboardUrl`) before Email #2 can queue.
4. With invite feature flags explicitly approved, run dry-run `prepareTrilletInvite`, then live invite only after recipient approval.
5. Process Email #2 outbox (`dashboard_ready`) under SES test allowlist first.
6. Document Sign In destination once Studio branded login URL is confirmed; until then WordPress Sign In stays on Trillet host.

### Blocked on Trillet support

| Item | Why blocked |
|---|---|
| Isolated Agency-managed workspace create | Public Create Workspace API has no parent/agency nesting field; adapter correctly returns `workspace_provisioning_blocked` |
| Safe customer invitation into a dedicated workspace | Requires the isolated workspace id above |
| Email #2 with customer dashboard URL | Requires approved allowlisted dashboard destination after workspace mapping |
| Account creation / returning Sign In with Alexander branding | Studio branded login URL not published; shared `app.trillet.ai/auth/login` shows Trillet chrome |
| Customer dashboard isolation proof | No dashboard issued yet |

## Exact sequence (target)

**Questionnaire (done)** → **isolated Trillet workspace (blocked)** → **safe customer invitation (blocked)** → **Email #2 (blocked on URL + workspace)** → **Account creation (blocked)** → **Sign In (branding blocked; functional Trillet login exists)** → **Customer dashboard (blocked)**

## Source / deploy notes

- Invitation reveal opt-in + `inspectUnlinkedSubmissionIsolation` deployed to `alexander-onboarding-persistence`.
- Invited browser submit routing helper covered by unit tests; Production onboard redeployed with this branch.
- No new Stripe payment, no Email #2 send, no workspace assignment, no live mode.
