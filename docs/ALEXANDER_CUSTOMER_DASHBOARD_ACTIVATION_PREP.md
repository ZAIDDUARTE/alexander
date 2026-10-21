# Alexander — Customer dashboard activation preparation

Date: 2026-10-21  
Continues: `docs/ALEXANDER_PHASE_C3_FINAL_VALIDATION.md`  
Customer: **ALX-C000010** · `f9fe84aa-7ff2-4a0b-94b7-db026fd14347` · synthetic_test  
Stripe test subscription: `sub_1USslFQKy1Smykv0CnPyXK69` · **canceled** · `livemode=false`  
Candidate QA workspace: **`6ad84631243624378abbcfc6`** (“Alexander QA Plumbing—StudioTest”)

**No invite sent. No Email #2. No `markTrilletWorkspaceReady` executed. No new workspace created. Phillip / ALX-C000002 untouched.**

---

## 1. Deploy reconciliation (GitHub vs live)

| Layer | Reported / expected | Actual live | Match? |
|---|---|---|---|
| Git branch tip | `customer-lifecycle-staging` @ `856e94b` (C3 doc) / HEAD `e210d86` | Local + origin at `e210d86` | Docs tip is ahead of Production frontend |
| Vercel Production (`onboard.meetalexander.ai`) | C3 listed `dpl_BZCBEN9MTr4eE9suPkntfkmhyDW7` | **Same id** — current alias | ID match |
| Vercel git SHA for that deploy | Implied `856e94b` | **`cb6581a`** (“Complete ALX-C000010 onboarding recovery…”) · `meta.gitDirty=1` | **Mismatch** — Production is **one code commit behind** `856e94b` |
| Persistence Lambda | C3: inspect harden deployed | `alexander-onboarding-persistence` `$LATEST` · CodeSha256 `KMpbBCy39IFi4haTPusY/Z/by/79HYh+BrxVTCvzSOE=` · LastModified `2026-10-21T07:12:58Z` · `inspectUnlinkedSubmissionIsolation` **live** | Lambda has C3 inspect ops |
| Stripe mode | test | WordPress + Stripe API confirm test; sub canceled | OK |

**Gap to close before activation (Alexander-owned, approval):** redeploy Vercel Production from `856e94b`+ (clean tree) so onboard matches Lambda invitation/V2 hardening. Do **not** enable invite/dashboard flags in that redeploy.

---

## 2. QA workspace inspection (`6ad84631243624378abbcfc6`)

Read-only `GET /v1/api/workspaces/{id}` (supported API). Appearing in the workspace switcher is **not** treated as Studio proof.

| Check | Result |
|---|---|
| Name | Alexander QA Plumbing—StudioTest |
| `studio.isEnabled` | **false** |
| `studio.subscription.subscriptionId` / status | null / null |
| `agencyPlus.isEnabled` | false |
| `whiteLabel.enabled` | **false** (no logo/login title) |
| `parentWorkspaceId` / `saasMasterWorkspaceId` | **null** / **null** (not nested under Phillip) |
| `isMasterWorkspace` | false (Phillip is `true`) |
| Team | 1× **owner** only — no customer `viewer` membership yet |
| Call flows / agents | **0 / 0** (Phillip still has Marina demo flows — isolation OK for content) |
| Owner `userId` | Distinct from Phillip; same prefix family as “Alexander Sandbox” (`6abd3573…`) |
| Format for `markTrilletWorkspaceReady` | Valid (`[A-Za-z0-9_-]{8,128}`) |

**Verdict:** Workspace is a usable **isolated empty shell** for QA mapping, but it is **not** proven Studio-managed. Trillet must confirm Studio association / entitlement before we treat it as the production-shaped customer tenant.

Phillip (`6abab4bdf22720afb93099c6`): `studio.isEnabled=true`, Alexander white-label saved — remains the Studio branding host, **never** assign to ALX-C000010.

---

## 3. ALX-C000010 readiness (Lambda inspect — live)

| Gate | Status |
|---|---|
| paymentVerified | true (uses `payment_verified_at`; **not** live Stripe status) |
| portalAdminConfirmed | true |
| questionnaireSubmitted | true |
| profileReady | true |
| trilletStatus | `workspace_provisioning_blocked` · `workspaceId=null` |
| email2Queued | false · `dashboard_url_missing_url` |
| inviteStatus / accountReadiness | null / `not_invited` |
| invite flags on Lambda | `TRILLET_INVITE_*=unset` · `ALEXANDER_CUSTOMER_DASHBOARD_URL=unset` · `TRILLET_API_KEY`/`SECRET_ARN=unset` |
| `prepareTrilletInvite` | `workspace_not_mapped` · plannedRole `viewer` · dry-run only |
| ALX-C000002 | `workspaceId=null` · `awaiting_internal_setup` · not assigned |

Canceled Stripe test sub remains `canceled` / `livemode=false`. It must **not** be read as an active payer; onboarding evidence stays via `payment_verified_at` only.

---

## 4. Prepared `markTrilletWorkspaceReady` (do **not** run yet)

```json
{
  "operation": "markTrilletWorkspaceReady",
  "customerId": "f9fe84aa-7ff2-4a0b-94b7-db026fd14347",
  "workspaceId": "6ad84631243624378abbcfc6",
  "dashboardUrl": "https://app.trillet.ai/auth/login",
  "operatorRef": "alx-c000010-dashboard-activation-prep",
  "sendTrilletInvite": false,
  "liveInvite": false
}
```

**Hard prerequisites before invoke:**

1. Trillet written confirmation that `6ad84631243624378abbcfc6` is the correct isolated Studio-associated customer QA workspace (today `studio.isEnabled=false`).
2. Lambda env (approval):  
   - `TRILLET_WORKSPACE_DENY_IDS=6abab4bdf22720afb93099c6` (Phillip deny — currently **unset**, so deny is not enforced live)  
   - `ALEXANDER_CUSTOMER_DASHBOARD_URL=https://app.trillet.ai/auth/login`  
   - `ALEXANDER_CUSTOMER_DASHBOARD_ALLOWED_ORIGINS=https://app.trillet.ai`  
   - Keep `TRILLET_INVITE_ENABLED` / `TRILLET_INVITE_LIVE_ENABLED` **unset/false** on this first mark  
3. Optional later: `TRILLET_SECRET_ARN` + allowlists before any live invite.

Without (2) dashboard URL env, mark-ready can still map the workspace; Email #2 stays blocked (`dashboard_url_*`) by design.

---

## 5. Invite + Email #2 workflow (prepared, not enabled)

| Step | Safe action | Gate |
|---|---|---|
| A | `prepareTrilletInvite` for ALX-C000010 | After workspace mapped |
| B | Set `TRILLET_INVITE_ALLOWED_CUSTOMER_NUMBERS=ALX-C000010` and `TRILLET_INVITE_ALLOWED_WORKSPACE_IDS=6ad84631243624378abbcfc6` | Approval |
| C | `TRILLET_INVITE_ENABLED=true`, dry-run `inviteTrilletCustomer` (`live` omitted/false) | Approval |
| D | `TRILLET_INVITE_LIVE_ENABLED=true` + `live:true` only after recipient approval | Approval |
| E | SES Email #2 (`dashboard_ready`) under `EMAIL_DELIVERY_MODE=test` allowlist | Requires allowlisted dashboard URL + confirmed portal admin |

Default invite role: **`viewer`**. Hard block: `ALX-C000002`. Do not put Phillip’s workspace on invite allowlists.

---

## 6. HTTPS customer dashboard destination (Email #2)

Allowlist validator accepts origin `https://app.trillet.ai` when configured.

| Candidate | Allowlist | Notes |
|---|---|---|
| **`https://app.trillet.ai/auth/login`** | PASS (with env set) | Preferred functional Sign In path from Studio branded-login investigation |
| `https://app.trillet.ai/login` | PASS | Alternate path used in unit fixtures |
| `https://portal.meetalexander.ai/` | **FAIL** (hard-blocked) | Not verified customer hosting |
| Jobber / vendor admin hosts | **FAIL** | Blocked |

**Branding:** shared Trillet host still shows Trillet chrome for anonymous login. Alexander Studio branding is saved on **Phillip’s** workspace only; QA workspace has `whiteLabel.enabled=false`. Keep WordPress Sign In on Trillet host until Trillet publishes a branded entry URL (`docs/ALEXANDER_STUDIO_BRANDED_LOGIN_INVESTIGATION.md`).

---

## 7. Post-activation QA script (prepared — not run)

1. **Canceled sub sanity:** Stripe `sub_1USslFQ…` still `canceled`; Alexander `paymentVerified` still true; no live Checkout.  
2. **Customer login:** accept Trillet invite as portal admin (`chatg7788@gmail.com` path / SES allowlist recipient as configured); complete account create on Trillet.  
3. **Restricted dashboard:** signed-in user sees only QA workspace resources (0 flows today → still empty isolation).  
4. **Returning Sign In:** logout → `https://app.trillet.ai/auth/login` → land in QA workspace only.  
5. **Tenant isolation:** must not see Phillip Marina flows/agents or ALX-C000002 data; WordPress admin Checkout path unchanged.  
6. **Negative:** unauthenticated visitor cannot open customer dashboard; invite flags off ⇒ no public provisioning.

---

## Final checklist

### READY (Alexander-owned)

- [x] ALX-C000010 questionnaire → profile → provisioning blocked as designed  
- [x] Orphan submission isolation inspect live on Lambda  
- [x] Canceled test subscription preserved; not treated as active payer  
- [x] Exact mark-ready payload prepared for QA workspace id only  
- [x] Invite dry-run path + flag matrix documented; all live invite flags **off**  
- [x] Email #2 destination validated: `https://app.trillet.ai/auth/login` (env not set yet)  
- [x] Login / isolation test plan written  
- [x] Phillip / ALX-C000002 not assigned; deny-list value identified  
- [x] Infrastructure, source, and customer records preserved (no destructive ops)

### REQUIRES TRILLET SUPPORT

- [ ] Confirm `6ad84631243624378abbcfc6` is Studio-associated / correct managed-child (API today: `studio.isEnabled=false`, no parent link)  
- [ ] Confirm how Studio branding applies to customer login for a non-master workspace  
- [ ] Publish branded Sign In URL if WordPress should leave shared `app.trillet.ai`

### REQUIRES EXPLICIT APPROVAL (do not do now)

- [ ] Redeploy Vercel Production to `856e94b`+ (close git SHA gap)  
- [ ] Set Lambda dashboard URL + Phillip `TRILLET_WORKSPACE_DENY_IDS`  
- [ ] Execute `markTrilletWorkspaceReady` for ALX-C000010  
- [ ] Enable invite flags / send Trillet invite / process Email #2  
- [ ] Any live Stripe or new provisioning automation flags
