# Self-service profile editor — isolated Preview evidence

Date: 2026-10-22  
Preview URL: https://alexander-1b9x9vioa-zaid-alis-projects.vercel.app  
Commit: `5438472`  
Backend mode: `memory_store` (fictional ALX-C000099 / `11111111-1111-4111-8111-111111111099`)  
Production alias: unchanged at `d4a32ba` (`onboard.meetalexander.ai`)

## Isolation

| Check | Result |
|---|---|
| Preview `target` | `null` (not Production) |
| Preview aliases include `onboard.meetalexander.ai` | **No** |
| Shared Lambda/Postgres writes | **Blocked** unless memory store or approved isolated DB |
| Env flags | Preview only: `ALEXANDER_CUSTOMER_PROFILE_EDITING_ENABLED`, `ALEXANDER_PROFILE_EDITOR_MEMORY_STORE`, `ALEXANDER_PROFILE_EDITOR_PREVIEW_TOKEN` |
| Production editing flags | Unset |

## Verified interactions

See `verification-results.json`.

1. Unauthenticated → 401  
2. Load fictional profile → revision 1, `originalQuestionnaireUntouched=true`  
3. Routine Q1 edit → revision 2, `change_impact=low`, no Trillet sync  
4. Stale `expectedRevision` → 409 `revision_conflict`  
5. Other customer UUID → 404  
6. Customer session + other customerId → 403 `customer_scope_mismatch`  
7. Hours Q8 edit → revision 3, `high`, `trilletSyncRequired`, `qa_required`  
8. Emergency Q21 edit → revision 4, `high`  
9. History lists immutable revisions with superseded priors  
10. Generate AI config → instructions + KB previews, Jobber/GCal writes false  
11. Trillet dry-run → GETs only executed; PUT/POST held; Lisa agents blocked  
12. QA mark + publish → `published`, approved revision 4  
13. Edit + rollback → revision 6 `rolled_back` to approved 4  
14. Original questionnaire seed snapshot still untouched  
15. UI `/staging/profile` loads (see PNG/HTML)

## Screenshots / artifacts

- `01_editor_landing.png` — headless Chrome capture of `/staging/profile`
- `01_editor_landing.html` — HTML snapshot
- `history.json`, `generate.json`, `sync-dry-run.json`, `verification-results.json`

## Email (no SES send)

Local tests only: `account-setup-email*.test.ts` — subject, idempotent dedupe, `kind=account_setup_in_progress` discriminator so `profile_updated` cannot be confused with a future field-change notice. No outbox worker run / no email sent.