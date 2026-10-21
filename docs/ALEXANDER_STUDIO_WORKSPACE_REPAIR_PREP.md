# Alexander — Studio workspace repair preparation

Date: 2026-10-21  
Continues: `docs/ALEXANDER_CUSTOMER_DASHBOARD_ACTIVATION_PREP.md`  
Customer: **ALX-C000010** · synthetic_test  
QA workspace (preserved, not modified): `6ad84631243624378abbcfc6`  
Master workspace (not modified): `6abab4bdf22720afb93099c6`

**Not done:** new workspace, ownership transfer, Trillet upgrade, Phillip agent edits, `markTrilletWorkspaceReady`, live invite flags, Email #2, new payment, live Stripe, Vercel or Lambda deploy.

Regression: 51/51 on adapter, deny-list, dashboard URL, invite, and provisioning tests.

---

## 1. Which API fields establish managed-client association

Read-only `GET /v1/api/workspaces/{id}` on 2026-10-21. The public Create Workspace contract still has no parent field. These response fields are the ones that would show a managed child if Trillet had associated the QA workspace with the master:

| Field | Would mean association | QA `6ad846…` | Phillip `6abab4…` |
|---|---|---|---|
| `parentWorkspaceId` | Child of a master | **null** | null |
| `saasMasterWorkspaceId` | SaaS client of a master | **null** | null |
| `studio.subscription.masterWorkspaceId` | Studio seat billed under a master | **null** | null |
| `studio.isEnabled` | Studio entitlement on this workspace | **false** | **true** |
| `studio.subscription.subscriptionId` / `status` | Active Studio subscription | null / null | null / null |
| `isMasterWorkspace` | This workspace is the master | false | **true** |
| `agencyPlus.isEnabled` | Agency Plus | false | false |
| `whiteLabel.enabled` | Portal brand on this workspace | **false** | **true** (Alexander saved on Phillip only) |
| `whiteLabel.customDomain` | Branded host | null | null |

**No field links the QA workspace to Phillip.** Switcher visibility is not association. `markTrilletWorkspaceReady` stays unexecuted until Trillet sets one of the parent/master fields above (or an equivalent they document).

---

## 2. Phillip deny (source, not yet live)

`TRILLET_WORKSPACE_HARD_BLOCKLIST` now always includes `6abab4bdf22720afb93099c6`.

`assertOperatorWorkspaceAssignment` unions that set with `TRILLET_WORKSPACE_DENY_IDS`.

| Input | Env deny list | Result |
|---|---|---|
| `6abab4bdf22720afb93099c6` | empty | **denied** (`workspace_denied` / adapter `workspace_hard_blocked`) |
| `6ad84631243624378abbcfc6` | Phillip id | **allowed** (format only — not Studio proof) |

Invite eligibility also rejects a mapped hard-blocked workspace (`workspace_not_authorized`).

Live Lambda does **not** have this code yet. Current `$LATEST` still denies Phillip only if `TRILLET_WORKSPACE_DENY_IDS` is set, and that variable is unset. Prepared env value, not applied:

`TRILLET_WORKSPACE_DENY_IDS=6abab4bdf22720afb93099c6`

---

## 3. Vercel Production revision (prepared, not deployed)

| | |
|---|---|
| Current Production | `dpl_BZCBEN9MTr4eE9suPkntfkmhyDW7` · git `cb6581a` · alias `onboard.meetalexander.ai` |
| Missing on that deploy | `856e94b` invited-submit routing (`src/lib/server/persistence/v2-request.ts`) |
| Proposed source | This branch after the deny-list commit (includes `856e94b`) |
| Rollback | Redeploy `dpl_BZCBEN9MTr4eE9suPkntfkmhyDW7` (`cb6581a`) |
| Flags | Do not set invite, dashboard URL, or live Stripe env in that deploy |

**Approval required before `vercel promote` / production deploy.** Lambda needs a separate approved zip before the Phillip hard-block is enforced in `markTrilletWorkspaceReady`.

---

## 4. Dashboard URL is not customer-specific

`https://app.trillet.ai/auth/login` passes the HTTPS origin allowlist and is still the **shared** Trillet sign-in.

- Path `/`, `/login`, and `/auth/login` are classified `isSharedTrilletAuthUrl` even with `?workspaceId=`.
- Prior live check: `workspaceId` does not change branding or select an isolated tenant (`docs/ALEXANDER_STUDIO_BRANDED_LOGIN_INVESTIGATION.md`).
- Source now refuses to queue or send Email #2 for that shared URL (`dashboard_url_not_customer_specific`). This is not deployed.

Email #2 stays off until Trillet confirms a URL that opens **only** the QA workspace after sign-in.

---

## 5. Canceled synthetic subscription

Stripe test `sub_1USslFQKy1Smykv0CnPyXK69`: **`canceled`**, `livemode=false` (rechecked).

Alexander `paymentVerified=true` only because `payment_verified_at` is set. That is not an active payer and not production dashboard access.

`canceledSyntheticMayUseProductionDashboard` returns false for `synthetic_test` + `canceled`. Live Lambda still has no Stripe status column and no NAT path to Stripe, so the live guards are: workspace unmapped, invite flags false, Email #2 not queued (`dashboard_url_missing_url`).

Dry-run `prepareTrilletInvite` for ALX-C000010: `workspace_not_mapped`, role `viewer`, invite flags false, API key unset, dashboard URL null. No Trillet call. No email.

---

## Remaining actions

### Ready for safe deployment (after approval)

- Source deny of Phillip’s master id, with QA id still assignable
- Shared-login Email #2 block
- Vercel Production update from this git SHA, rollback `dpl_BZCBEN9MTr4eE9suPkntfkmhyDW7`
- Lambda zip of the same persistence source, plus env `TRILLET_WORKSPACE_DENY_IDS=6abab4bdf22720afb93099c6`
- Invite and Email #2 remain dry-run only

### Needs explicit approval

- Deploy Vercel Production
- Deploy persistence Lambda
- Set the deny-list env var
- Any later `markTrilletWorkspaceReady`, invite flags, or Email #2

### Needs Trillet human support

- Set a supported managed-client link on `6ad84631243624378abbcfc6` (`parentWorkspaceId`, `saasMasterWorkspaceId`, or `studio.subscription.masterWorkspaceId` pointing at the Studio master — today all null, `studio.isEnabled=false`)
- Confirm the post-login URL that routes only into that workspace
- Branded Sign In remains a separate Studio limitation on the shared host
