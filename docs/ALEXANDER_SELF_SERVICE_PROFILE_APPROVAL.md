# Alexander — Customer self-service + automated configuration (deployment approval)

Date: 2026-10-22  
Branch: `customer-lifecycle-staging`  
Base revision before this sprint: `d4a32ba`  
Implementation commits pushed through `5438472`. Preview report: `docs/ALEXANDER_SELF_SERVICE_PREVIEW_REPORT.md`.  

## Webhook-only sandbox payment status

**Not completed. Do not repeat.**

`docs/ALEXANDER_WEBHOOK_ONLY_SANDBOX_TEST_PLAN.md` still requires separate payment authorization. No evidence of a webhook-only new Checkout run after the ALX-C000010 subscription-sync verification. This sprint did **not** create a Stripe Checkout, charge, invite, Email #2, or dashboard activation.

## What was implemented (code only — not auto-deployed)

1. Post-questionnaire SES email “We're Setting Up Your Alexander Account”
   - Template render + outbox enqueue on V2 submit (idempotent)
   - Uses existing CHECK-allowed `profile_updated` + payload `kind=account_setup_in_progress` (**no DB migration**)
2. Staging business-profile editor APIs + `/staging/profile` UI
3. Immutable revisions, validation, customer scope, change history, optimistic concurrency
4. Field-level routine vs operationally sensitive classification
5. Reusable runtime config generator (KB / instructions / policies / call-flow hints)
6. Dry-run Trillet sync adapter (documented GET + planned PUT/POST; no writes; blocks Phillip/Lisa/Marina)
7. Publication status + QA requirements + rollback to last approved configuration (stored in `profile_data._publication`)
8. Automated tests for QA call → request classification and Jobber/GCal safe fictional workflows

## Explicitly not done / still blocked

| Item | Status |
|---|---|
| Webhook-only new payment | Not run (awaits approval) |
| SUP-475 Studio workspace association | Out of scope; Trillet engineering |
| New Trillet workspace / ownership transfer / Agency upgrade | Not done |
| Live invite / Email #2 / customer dashboard activation | Not done |
| Production customer editing | **Disabled** until `ALEXANDER_CUSTOMER_PROFILE_PRODUCTION_EDITING_ENABLED=true` after tenant auth verification |
| New database migrations | None applied; none required for this pack |
| Live Trillet config writes | Dry-run only |
| Jobber CRM writes / GCal booking | Still blocked / read-only |
| Phillip agent mutation | Hard-refused in sync adapter |

## Env flags (staging Preview)

```
ALEXANDER_CUSTOMER_PROFILE_EDITING_ENABLED=true
ALEXANDER_CUSTOMER_PROFILE_PRODUCTION_EDITING_ENABLED=   # keep unset/false
EMAIL_DELIVERY_MODE=test
ALLOWED_TEST_RECIPIENT=<existing allowlist>
# existing staging admin token still gates /api/staging/profile*
JOBBER_OAUTH_ADMIN_TOKEN=<existing>
# optional for dry-run against Alexander Sandbox QA agent only
TRILLET_API_KEY=<existing staging>
STAGING_TRILLET_WORKSPACE_ID=<Alexander Sandbox>
STAGING_TRILLET_AGENT_ID=<QA agent, never Lisa>
STAGING_TRILLET_FLOW_ID=<QA flow, never Lisa>
```

## API contract

See `docs/CUSTOMER_PROFILE_AND_REVISIONS.md`.

### PATCH `/api/staging/profile`

```json
{
  "customerId": "<uuid>",
  "expectedRevision": 1,
  "patch": {
    "Q1": { "question_id": "Q1", "answer_kind": "scalar_text", "value": "Acme Plumbing" }
  }
}
```

Success → new revision, field diff, publication reset, optional `trillet_sync_required`.  
`409` on revision conflict.

### Publish / rollback

- `POST /api/staging/profile/publish` `{ customerId, action: "mark_qa"|"publish"|"mark_failed", requirementId? }`
- `POST /api/staging/profile/rollback` `{ customerId, expectedRevision }`

## Staged UI evidence checklist (after Preview deploy)

1. Open `/staging/profile` on Preview with `ALEXANDER_CUSTOMER_PROFILE_EDITING_ENABLED=true`.
2. Authenticate with staging admin bearer.
3. Load a synthetic customer that already has questionnaire projection (e.g. ALX-C000010 / ALX-C000007 UUID).
4. Edit a routine field (Q1) → save → history shows `change_impact=low`.
5. Edit hours/emergency (Q8/Q21) → save → `high` + Trillet status `trillet_sync_required`.
6. Generate config → confirm instruction/KB previews.
7. Dry-run sync → plan contains GET ops executed + PUT/POST held; Lisa/Phillip blocked if present.
8. Mark QA + publish → `approvedProfileRevision` set.
9. Make another edit → rollback → fields restored from approved revision.
10. Confirm no Email #2, no invite, no Phillip agent changes.

## Lambda / Vercel deploy package (approval required)

| Step | Action | Risk |
|---|---|---|
| 1 | Deploy Vercel Preview from this commit with profile editing flag **true** on Preview only | Low — production editing remains false |
| 2 | Deploy persistence Lambda including email renderer branch for `profile_updated` + profile ops | Medium — touch SES worker path; keep `EMAIL_DELIVERY_MODE=test` |
| 3 | Process outbox once for a synthetic customer after questionnaire submit (or replay submit) | Low — allowlisted recipient only |
| 4 | Production Vercel | **Do not** set profile editing flags |
| 5 | Production APIs / migrations | **Not requested** |

Rollback: redeploy prior Lambda zip / prior Vercel deployment; flags default off so editor returns 503.

## Tests run locally

```
npm test -- src/lib/server/persistence/account-setup-email.test.ts \
  src/lib/server/persistence/profile-change-detection.test.ts \
  src/lib/server/persistence/business-profile-editor.test.ts \
  src/lib/server/persistence/trillet-config-sync.test.ts \
  src/lib/runtime-config/generator.test.ts \
  src/lib/server/requests/qa-call-workflow.test.ts
```

## Remaining limitations

- Editable UI is staging-only; no permanent customer login.
- Runtime config generator quality depends on questionnaire completeness / policy review state.
- Trillet dry-run does not attach KB text via live API (planned only); live publish still operator-supervised.
- Account-setup email reuses `profile_updated` template type; rename would need a future approved migration.
- End-to-end live QA phone call against Trillet still requires sandbox credentials and is not executed in this pack.
