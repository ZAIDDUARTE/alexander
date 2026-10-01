# Stage 1 — Low-Risk Implementation

Local branch `questionnaire-oct1`, created from `003ddcc` (`Fix onboarding autosave concurrency`). Not pushed. Unrelated untracked files were left in place.

Baseline before edits, on this branch: typecheck pass, lint pass, tests 451 pass / 0 fail, production build pass. No pre-existing failures.

## Files Modified

- `src/app/onboarding/page.tsx`
- `src/components/onboarding/ServicePolicy.tsx`
- `src/components/onboarding/Section2Form.tsx`
- `src/components/onboarding/Section4Form.tsx`
- `src/components/onboarding/Section5Form.tsx`
- `src/components/onboarding/FeeCardEditor.tsx`
- `src/components/onboarding/ServicePricingCards.tsx`
- `src/lib/onboarding/validation/feeRecord.ts`
- `src/lib/onboarding/validation/section4.ts`
- `src/lib/onboarding/progress/section4.ts`

## Files Added

- `src/lib/onboarding/money.ts`
- `src/lib/onboarding/money.test.ts`
- `src/lib/onboarding/section2Placeholders.ts`
- `src/lib/onboarding/section2Placeholders.test.ts`
- `src/lib/onboarding/section4Placeholders.ts`
- `src/components/onboarding/ui/MoneyField.tsx`
- `docs/questionnaire-oct1-implementation-log.md`

## OCT1 Change IDs Completed

- OCT1-001 welcome copy
- OCT1-002 plumbing condition placeholders
- OCT1-003 diagnostic/drain condition placeholders
- OCT1-004 diagnostic architecture kept per row (combined example not added)
- OCT1-005 customer/property condition placeholders
- OCT1-006 customer/property architecture kept per row (combined example not added)
- OCT1-007 customer-supplied condition placeholder
- OCT1-008 previous-plumber condition placeholder
- OCT1-022 same-day condition placeholder
- OCT1-023 holiday condition placeholder
- OCT1-038 material-pricing sentence as an editable prefill, only when the explanation is empty at the moment Yes or Sometimes is selected
- OCT1-062 money-input foundation only (shared validator and `MoneyField`). Pricing section was not rebuilt

The leading `Example:` label in `changes-1oct.md` was treated as document labeling. The gray placeholder text is the sentence after that label. Same-day and holiday use the sentences quoted in the Stage 1 prompt.

## Placeholder Changes

Placeholders are the HTML `placeholder` attribute. They are not written into form state, defaults, or saved drafts.

| Surface | Storage key | Behavior |
| --- | --- | --- |
| 22 plumbing services | `section2.plumbingServices[id].condition` | Per-id placeholder |
| 6 diagnostic/drain services | `section2.diagnosticServices[id].condition` | Per-id placeholder. No combined box |
| 9 customer/property rows | `section2.customerPropertyTypes[id].condition` | Per-id placeholder. No combined box |
| Customer-supplied items | `section2.customerSuppliedMaterialsCondition` | Placeholder replaced |
| Previous-plumber work | `section2.correctiveWorkCondition` | Placeholder added |
| Same-day service | `section4.capacityPolicies.same_day.condition` | Placeholder only when policy is `with_conditions` |
| Holiday service | `section4.capacityPolicies.holiday.condition` | Placeholder only when policy is `with_conditions` |

Default drafts still store `""` for every one of those condition fields. A saved non-empty condition remains the field value.

## Money Input Foundation

`MoneyField` is questionnaire-local. It was applied to existing structured currency strings:

- spending-limit `maxAmount`
- late-cancellation `amountFixed`
- no-show `amountFixed`
- fee-card `amountFixed`, `amountMin`, `amountMax`
- service-pricing `approvedPriceExact`, `approvedPriceMin`, `approvedPriceMax`

Percentage fields, day counts, hours, service radius, and issue/callback counts still use their existing inputs. Area travel fee and minimum charge were not converted.

`isPositiveMoney` now lives in `src/lib/onboarding/money.ts`. `feeRecord.ts` re-exports it. The private copies in section 4 validation and section 4 progress import that function. Section 5 already used the fee-record export.

### Money convention

For structured monetary inputs:

- UI prefix: `$`, rendered beside the input. The customer does not type it.
- accepted typed value: `123` or `123.45`. `$`, commas, letters, and a leading minus are stripped as the customer types. Extra decimal places are truncated to two. A trailing dot is removed when the field blurs.
- stored representation: a string of digits with an optional decimal, no `$` character. Same string keys as before (`maxAmount`, `amountFixed`, `amountMin`, `amountMax`, `approvedPriceExact`, `approvedPriceMin`, `approvedPriceMax`).
- decimal policy: at most two decimal places.
- negative-value policy: a minus sign is not stored. `isPositiveMoney` still requires a value greater than zero, which is the existing required-fee rule. `isStructuredMoney` accepts zero as a well-formed amount, so typing `0` is possible, but required fee and price checks still reject `0`. Stage 1 does not loosen those checks.

### Exceptions

Area pricing still has separate `travelFee` and `minimumCharge` text fields. Those stay as they are in Stage 1. The October 1 “Fee or minimum” prose field, which must accept values such as “$100 travel fee and $250 minimum service charge”, belongs to Pricing Stage 4.

## Existing Answer Compatibility

No answer key, object path, option value, or enum was renamed or removed. Placeholders are not restored as answers. The material-pricing sentence is written only when the customer selects Yes or Sometimes and `materialMarkupCustomerExplanation` is empty. Loading a draft does not backfill that sentence, so an existing empty explanation stays empty until the customer changes the selection.

## Deferred Items

- OCT1-009 through OCT1-021 structural scheduling, caller, emergency, and after-hours work
- OCT1-024 and OCT1-025 removal of scheduling dollar-amount fields
- OCT1-026 through OCT1-037 and OCT1-039 through OCT1-061 pricing, customer-care, and integration rebuilds
- Area “Fee or minimum” text field
- Saved-answer migrations
- Questionnaire-wide helper-text purge
- Publish

High-risk files left unchanged: `EmergencyClassification.tsx`, `AfterHoursDispositionMatrix.tsx`, `CallerAuthorizationMatrix.tsx`, booking enums, `FeeRecord` schema, `FinancialRemedy` schema, `NonServiceCallMatrix` storage, and Section 8 integration storage.

## Tests Run

After implementation:

- `npm run typecheck` — pass
- `npm run lint` — pass
- `npm test` — 456 pass, 0 fail (includes the new money and placeholder-default tests)
- `npm run build` — pass

Placeholder and money checks:

- Default section 2 conditions are empty and do not contain the October 1 example sentences.
- Default same-day and holiday conditions are empty and do not contain those sentences.
- A new section 5 draft does not contain the material-pricing sentence.
- `sanitizeMoneyInput` / `isPositiveMoney` accept `123` and `123.45`, keep `75.00`, drop `$` and letters, and reject a stored `$` or more than two decimals.

## Failures / Warnings

No typecheck, lint, test, or build failures.

Interactive browser verification was not available in this session, so the welcome page and the condition textareas were not clicked in a running browser. The automated checks cover stored defaults and the sanitizer. The placeholder strings are passed only to the `placeholder` prop.

## Stage 1 QA Result

PASS

# Stage 2 — Emergency / After-Hours / Booking Migration

HEAD at the start of Stage 2 remained `003ddcc`. Stage 2 is uncommitted on `questionnaire-oct1`. Baseline before these edits: typecheck pass, lint pass, 456 tests pass.

Stored values before this stage, which are not the same as the display labels:

- Emergency classification: `emergency`, `urgent`, `routine`, `human_review`, `recommended_default`
- After-hours disposition: `attempt_contact`, `confirm_or_book`, `submit_for_review`, `schedule_next_available`, `arrange_callback`, `info_only`, `no_service`
- Booking authority: `confirm_immediately`, `submit_for_approval`, `arrange_callback` on `section4.defaultBookingMode`

## Files Modified

- `src/components/onboarding/EmergencyClassification.tsx`
- `src/components/onboarding/AfterHoursDispositionMatrix.tsx`
- `src/components/onboarding/Section3Form.tsx`
- `src/components/onboarding/Section4Form.tsx`
- `src/components/onboarding/ui/RadioGroup.tsx`
- `src/lib/onboarding/section3Defaults.ts`
- `src/lib/onboarding/types.ts`
- `src/lib/onboarding/draft-utils.ts`
- `src/lib/onboarding/validation/section3.ts`
- `src/lib/onboarding/validation/section4.ts`
- `src/lib/onboarding/progress/section3.ts`
- `src/lib/onboarding/progress/section4.ts`
- `src/lib/onboarding/stage2Migration.ts`
- `src/lib/onboarding/stage2Migration.test.ts`
- `src/lib/onboarding/section3Defaults.test.ts`
- `src/lib/onboarding/draft-utils.test.ts`
- `src/lib/onboarding/migrate.test.ts`
- `src/lib/onboarding/normalize/section3.test.ts`
- `src/lib/onboarding/progress/section3.test.ts`
- `src/lib/onboarding/validation/section3.test.ts`
- `src/lib/onboarding/section4-test-helpers.ts`
- `src/lib/onboarding/submission-test-helpers.ts`

`CallerAuthorizationMatrix.tsx` was not modified.

## OCT1 Change IDs Completed

- OCT1-009 remove recommended-default as a selectable emergency option
- OCT1-010 human-review label is “Human review required”; stored id stays `human_review`
- OCT1-011 per-scenario emergency defaults, with `recommended_default` rewritten on load
- OCT1-012 remove the help text that told the customer to choose recommended default
- OCT1-013 after-hours actions reduced to three stored choices
- OCT1-014 urgent row label is “Urgent, but not an emergency”; key stays `urgent_contained`
- OCT1-015 after-hours defaults
- OCT1-020 booking authority reduced to two options
- OCT1-021 booking default is Book an available appointment

OCT1-016 through OCT1-019 stay deferred. Those are caller authorization.

## Emergency Changes

Current selectable values: `emergency`, `urgent`, `routine`, `human_review`.

Labels: Emergency; Urgent, not emergency; Routine; Human review required.

Fresh rows use the October 1 scenario default. A saved `emergency`, `urgent`, `routine`, or `human_review` is kept. `recommended_default` becomes that row’s default and is recorded as `DEFAULTED_FROM_LEGACY`. An unknown value becomes that row’s default and is recorded as `DEFAULTED_FROM_UNKNOWN`.

## After-Hours Changes

Current selectable values: `contact_on_call`, `schedule_service`, `take_message`.

Labels: Contact our on-call team; Schedule service; Take a message for follow-up.

Defaults: Emergency → `contact_on_call`; Urgent → `schedule_service`; Routine → `schedule_service`.

## Booking Changes

Question title: “When an eligible customer wants service, what may Alexander normally do?”

Current selectable values: `book_appointment`, `send_to_team`.

Labels: Book an available appointment; Send the request to our team. Each option includes the October 1 explanatory sentence. The “recommended default” arrow in the source document is not shown.

Fresh drafts start on `book_appointment`.

“Do any types of jobs follow different booking rules?” remains `hasServiceBookingRules`. That is a separate question, not a `defaultBookingMode` value, so Stage 2 does not delete it or rewrite it.

## Legacy Mapping Rules

| Old stored value | New stored value | Status |
| --- | --- | --- |
| `attempt_contact` | `contact_on_call` | MAPPED |
| `confirm_or_book` | `schedule_service` | MAPPED |
| `schedule_next_available` | `schedule_service` | MAPPED |
| `confirm_immediately` | `book_appointment` | MAPPED |
| `submit_for_approval` | `send_to_team` | MAPPED |

## Fallback Migration Rules

| Old stored value | Replacement | Status |
| --- | --- | --- |
| `recommended_default` | that emergency row’s default | DEFAULTED_FROM_LEGACY |
| `submit_for_review`, `arrange_callback`, `info_only`, `no_service` on an after-hours row | that row’s default | DEFAULTED_FROM_LEGACY |
| `arrange_callback` on `defaultBookingMode` | `book_appointment` | DEFAULTED_FROM_LEGACY |
| any other unrecognized value | the same row or booking default | DEFAULTED_FROM_UNKNOWN |

Empty or missing values receive the new default and are not flagged. Notes are stored on `stage2Migration` and are not rendered in the questionnaire. A second load keeps a valid current answer and does not apply the default again.

## Existing Answer Preservation

`migrateStage2Answers` runs from `mergeWithDefaults`, which is the load path for local drafts, Redis drafts, and `migrateDraft`. Current values are marked `PRESERVED`. Defaults initialize a fresh draft and fill blanks. They do not run again on each render.

## Tests Added

`src/lib/onboarding/stage2Migration.test.ts` covers all 15 emergency defaults, preserved classifications, `recommended_default`, unknown emergency values, the three after-hours defaults, the three approved after-hours maps, all four unmapped after-hours actions, booking default and both approved maps, callback fallback, an unknown booking value, preservation of `hasServiceBookingRules`, and two hydrated legacy drafts.

## Stage 2 QA

- typecheck: pass
- lint: pass
- tests: 468 pass, 0 fail
- build: pass

## Deferred Items

Caller authorization (OCT1-016–OCT1-019), pricing rebuild, customer care, software and integrations, and the remaining October 1 structural deletions. Not published.

# Stage 3 — Caller Authorization Restructure

HEAD remained `003ddcc`. Stage 3 is uncommitted on `questionnaire-oct1`. Baseline before these edits: typecheck pass, lint pass, 468 tests pass.

## Files Modified

- `src/components/onboarding/CallerAuthorizationMatrix.tsx`
- `src/components/onboarding/Section4Form.tsx`
- `src/lib/onboarding/section4Catalog.ts`
- `src/lib/onboarding/types.ts`
- `src/lib/onboarding/stage2Migration.ts`
- `src/lib/onboarding/stage3Migration.ts`
- `src/lib/onboarding/stage3Migration.test.ts`
- `src/lib/onboarding/draft-utils.ts`
- `src/lib/onboarding/validation/section4.ts`
- `src/lib/onboarding/validation/section4.test.ts`
- `src/lib/onboarding/progress/section4.ts`
- `src/lib/onboarding/normalize/section4.ts`
- `src/lib/onboarding/section4-test-helpers.ts`
- `src/lib/onboarding/stage2Migration.test.ts`

## OCT1 Change IDs Completed

- OCT1-016 Realtor label. Stored id stays `realtor_buyer_seller` so existing spending-limit rows still match.
- OCT1-017 one authority level per caller. Old permission arrays are not converted.
- OCT1-018 the seven authority defaults
- OCT1-019 spending-limit question stays a Yes/No plus caller-and-amount rows. The dropdown uses the updated Realtor label. The amount stays on the Stage 1 money field.

## Old Model

`section4.callerPermissions[callerId]` was a `CallerPermission[]`. The choices were `schedule_service`, `approve_diagnostic_fee`, `authorize_repair`, `agree_to_pay`, `human_approval_required`, and `not_allowed`. Empty arrays were the fresh state. “Not allowed” could not be combined with other boxes. Caller ids were already `homeowner`, `tenant`, `landlord_property_manager`, `spouse_family`, `remote_family`, `realtor_buyer_seller`, and `other_third_party`.

## New Model

The same `callerPermissions` object now stores one `CallerAuthority` per caller:

- `schedule_only` — Schedule only
- `schedule_diagnostic` — Schedule + diagnostic fee
- `full_authorization` — Full authorization
- `human_approval_required` — Human approval required

Each row uses the existing radio group, with the October 1 description under the label. The caller ids did not change. The visible Realtor label no longer says buyer or seller.

## Caller Defaults

| Caller | Stored id | Default |
| --- | --- | --- |
| Homeowner | `homeowner` | `full_authorization` |
| Tenant | `tenant` | `schedule_only` |
| Landlord / property manager | `landlord_property_manager` | `full_authorization` |
| Spouse / family member | `spouse_family` | `full_authorization` |
| Remote family member | `remote_family` | `full_authorization` |
| Realtor | `realtor_buyer_seller` | `schedule_only` |
| Other third party | `other_third_party` | `human_approval_required` |

A fresh draft is complete for this question because every row already has one current value. A later reload does not put the default back over a saved current value.

## Legacy Migration

If any known caller still holds an array, the whole matrix is treated as the old shape. Every caller, including Homeowner and Realtor, is set to the default above and recorded as `DEFAULTED_FROM_LEGACY`. The array contents are not inspected, so a full-looking or contradictory set of checkboxes does not become Full authorization. An unknown non-array value is `DEFAULTED_FROM_UNKNOWN` for that row only. A current authority is `PRESERVED_CURRENT`.

Notes are appended to the existing `stage2Migration` list and are not shown in the questionnaire.

## Spending-Limit Compatibility

The question remains “Are there spending limits for any of these callers?” with the help sentence “Do any callers have a maximum amount they’re allowed to approve?” Yes opens a repeater of caller id plus `MoneyField` amount (`spendingLimits[].callerTypeId` and `spendingLimits[].maxAmount`). It is not one prose field. Stage 3 does not rewrite `hasSpendingLimits` or the saved rows. The Realtor option still uses `realtor_buyer_seller`, so an existing limit for that caller still selects Realtor.

## Existing Answer Preservation

Current authority strings survive `migrateDraft` and a second pass. Unrelated Section 4 fields, including booking authority from Stage 2, horizon, service-specific booking rules, emergency authorization, and human-request handling, are not rewritten by the caller migration.

## Normalization Compatibility / Follow-Up

NORMALIZATION FOLLOW-UP REQUIRED.

`normalize/section4.ts` now emits `{ id, label, authority }` for each caller. It does not rebuild the old permission array, and it does not translate the four authority levels into schedule, fee, repair, or payment facts. That Company Truth mapping belongs to the later data-architecture phase. The questionnaire answer is the single authority value.

## Tests Added

`src/lib/onboarding/stage3Migration.test.ts` covers the 7 defaults, the 4 labels, one value per caller, ordinary and contradictory and full-looking and empty legacy arrays, unknown values, preservation of a changed Tenant and Realtor, spending-limit Yes and No, and unrelated Section 4 fields.

## Stage 3 QA

- typecheck: pass
- lint: pass
- tests: 474 pass, 0 fail
- build: pass
- interactive browser check: not available

## Deferred Items

Pricing and payments rebuild, customer care, software and integrations, and the remaining October 1 structural deletions. Not published.
