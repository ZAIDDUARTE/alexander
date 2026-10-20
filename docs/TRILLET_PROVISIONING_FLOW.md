# Trillet provisioning (manual hybrid + automated invite)

## Account email ownership

Stripe checkout email is stored as `customers.primary_email` (billing/contact only).

Portal login / Trillet invitation recipient is `customers.portal_admin_email`, confirmed after payment via `/onboarding/account`:

1. Use checkout email (immediate confirm), or
2. Use a different email (SES verification link required)

Invites and SES Email #2 use the confirmed portal administrator email only. They never fall back to billing email alone. Legacy rows start as `portal_admin_status = review_required`.

## Workspace readiness

After questionnaire submission (and when portal admin is confirmed), `runCustomerProvisioning` runs idempotently:

1. Gate checks (payment, portal admin, submitted questionnaire, profile revision #1)
2. Workspace adapter: Agency parent nesting is **not** in the confirmed Create Workspace API → status `workspace_provisioning_blocked` (never auto-assign Phillip / shared staging ids)
3. When an operator maps an isolated workspace, call authenticated:

`markTrilletWorkspaceReady`

with:

- `customerId`
- `workspaceId` (trusted operator/backend mapping — never from arbitrary client input)
- optional `dashboardUrl` — must pass HTTPS allowlist (`ALEXANDER_CUSTOMER_DASHBOARD_URL` / `ALEXANDER_CUSTOMER_DASHBOARD_ALLOWED_ORIGINS`)
- optional `agentId`, `operatorRef`
- optional `sendTrilletInvite` / `liveInvite` (live requires `TRILLET_INVITE_LIVE_ENABLED=true`)

`body.invitationUrl` is ignored for Email #2. Trillet sends its own invitation links.

This persists workspace mapping (`status = ready`). SES Email #2 (`dashboard_ready`) is optional and independent of Trillet’s native invite: it queues only when portal admin is confirmed and the dashboard URL is allowlisted. Missing dashboard URL blocks Email #2 only — not workspace readiness or Trillet invite preparation.

Blocked until verified: `portal.meetalexander.ai` (custom portal domain not operational).

`invite_status=sent` means Trillet accepted the invitation request. It is not customer account activation.

## Automated invitation

Official endpoint (docs: Invite Team Member):

`POST https://api.trillet.ai/v1/api/workspaces/{workspaceId}/invite`

Headers: `x-api-key`, `x-workspace-id` (must match path), `Content-Type: application/json`  
Body: `{ "email": "...", "role": "viewer" | "editor" | "admin" }`

Default role is **`viewer`** (`TRILLET_CUSTOMER_INVITE_ROLE`). Do not use `admin` without permission testing.

Lambda operations:

| Operation | Purpose |
|---|---|
| `prepareTrilletInvite` | Eligibility + planned payload (never sends) |
| `inviteTrilletCustomer` | Dry-run (default) or live invite when `live:true` and env allows |
| `markTrilletWorkspaceReady` | Readiness gate; may trigger invite when feature-enabled |

Controls:

- `TRILLET_INVITE_ENABLED=true` — feature on
- `TRILLET_INVITE_LIVE_ENABLED=true` — required for any live API call
- `TRILLET_INVITE_ALLOWED_WORKSPACE_IDS` / `STAGING_TRILLET_WORKSPACE_ID`
- `TRILLET_INVITE_ALLOWED_CUSTOMER_NUMBERS` (use a synthetic customer, e.g. ALX-C000009)
- `TRILLET_SECRET_ARN` — preferred Secrets Manager source for the API key (Lambda); do not rely on Vercel Preview env alone
- Hard block: `ALX-C000002`
- Phillip Lew's Workspace must never be in the invite allowlist for customer automation

Credential procedure (approval required before execute): create secret `alexander/staging/trillet` with JSON `{ "TRILLET_API_KEY": "..." }` using the existing Preview-authorized key if still valid; grant persistence Lambda `secretsmanager:GetSecretValue`; set `TRILLET_SECRET_ARN` on the Lambda. Do not commit the key.

Trillet sends the invitation email with the accept link (7-day expiry). Alexander SES Email #2 must not invent invitation URLs or duplicate Trillet’s invite message. Password recovery stays in Trillet.

No invitation-acceptance webhook is assumed (none documented). Treat `invite_status=sent` as invitation request accepted by Trillet API, not as customer account activation.
