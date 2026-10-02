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

# Stage 4A — Core Pricing & Fees

Local branch `questionnaire-oct1`. Not pushed. Stage 4B was not started.

## Checkpoint Commit

`328f051` — `checkpoint: questionnaire Oct 1 stages 1-3`

Stages 1–3 were committed locally before this pricing work. Unrelated untracked files (the October 1 source document, the pre-implementation audit, the data-architecture audit, the specification documents, and transcripts) were left unstaged. After the checkpoint, the working tree was clean except those unrelated files.

Baseline after that commit, before Stage 4A edits: typecheck pass, lint pass, 474 tests pass, production build pass.

## Files Modified

- `src/components/onboarding/Section4Form.tsx`
- `src/components/onboarding/Section5Form.tsx`
- `src/components/onboarding/ui/Fields.tsx`
- `src/lib/onboarding/draft-utils.ts`
- `src/lib/onboarding/normalize/section5.ts`
- `src/lib/onboarding/normalize/section5.test.ts`
- `src/lib/onboarding/pricingServices.ts`
- `src/lib/onboarding/progress/section4.ts`
- `src/lib/onboarding/progress/section4.test.ts`
- `src/lib/onboarding/progress/section5.ts`
- `src/lib/onboarding/progress/section5.test.ts`
- `src/lib/onboarding/section4FeeLinks.test.ts`
- `src/lib/onboarding/section5-test-helpers.ts`
- `src/lib/onboarding/section5Catalog.ts`
- `src/lib/onboarding/stage2Migration.ts`
- `src/lib/onboarding/types.ts`
- `src/lib/onboarding/validation/section4.ts`
- `src/lib/onboarding/validation/section4.test.ts`
- `src/lib/onboarding/validation/section5.ts`
- `src/lib/onboarding/validation/section5.test.ts`

## Files Added

- `src/components/onboarding/PricingCoreFields.tsx`
- `src/lib/onboarding/section5Pricing.ts`
- `src/lib/onboarding/stage4aMigration.ts`
- `src/lib/onboarding/stage4aMigration.test.ts`

## Files Removed From the Current Questionnaire

- `src/components/onboarding/VisitTypeMatrix.tsx`
- `src/components/onboarding/ServicePricingCards.tsx`
- `src/components/onboarding/FeeCardEditor.tsx`

Legacy type constants used to read an old draft remain in `section5Catalog.ts` and on `Section5Data`. They are not rendered.

## OCT1 IDs Completed

- OCT1-024 late-cancellation dollar amount moved to Pricing
- OCT1-025 no-show dollar amount moved to Pricing
- OCT1-026 pricing-model wording, same stored ids
- OCT1-027 quote permission
- OCT1-028 opt-in prices for “We offer this” only
- OCT1-029 service pricing modes
- OCT1-030 conditional amount fields
- OCT1-031 service-price conditions placeholder
- OCT1-032 unknown-price behavior, two choices
- OCT1-033 additional-fee checklist
- OCT1-034 amount, applicability, and crediting
- OCT1-035 “when credited” when Sometimes
- OCT1-036 applicability placeholders that the October 1 source supplied
- OCT1-037 area fee or minimum as text
- OCT1-038 markup explanation prefill, verified in the rebuilt section
- OCT1-039 visit-type matrix removed
- OCT1-040 paid-diagnostic follow-up removed
- OCT1-041 old approved-price cards replaced
- OCT1-042 never-say pricing checklist removed
- OCT1-043 discounts, stacking, and the old fee/discount waiver question removed

## New Pricing Model

Question: “How does your company normally determine what a customer pays?”

Multi-select, same stored ids. The `after_diagnosis` label is now “Price determined after the technician evaluates the job”. Other still opens the existing free-text field. No helper commentary was added.

## Quote Permission

Question: “May Alexander quote prices for your services?”

Stored as `mayQuoteServicePrices`: `allowed` or `not_allowed`.

A new questionnaire starts at `not_allowed` (“No — Alexander should not quote service prices”). A saved current value is kept. An old draft that has no such field becomes `not_allowed` and is flagged `DEFAULTED_FROM_LEGACY`. Old approved-price cards are not treated as permission to quote.

## Service Pricing

Shown only when quote permission is Yes. The question is “What service prices may Alexander quote?”

Candidates come from `getOfferedPricingServices`, which reads the canonical Section 2 catalog and keeps only policy `offered`. With conditions, ask our team first, we don’t offer this, and unanswered (“not sure”) are excluded. The label is the catalog label for that service id.

Each offered service starts as “+ Add pricing”. Adding creates one `servicePrices` record for that id. A second record for the same id is rejected. Removing the record takes it out of the active answer.

Modes: `exact`, `starting_at`, `range`, `hourly`, `estimate`. Exact, starting-at, and hourly use one `MoneyField`. Range uses minimum and maximum, both required, maximum greater than or equal to minimum. Estimate / diagnosis has no amount. Changing mode clears the amounts that no longer apply, so an inactive amount cannot block validation and is not submitted as the current price. Every active record has an optional conditions field. The October 1 drain-clearing sentence is the placeholder only.

If a service later leaves “We offer this”, its record stays on the draft but is omitted from the pricing list, from validation, from review, and from normalization. It reappears if the service is offered again. Section 2 is not cleared.

## Unknown Price

Question: “What should Alexander do when he doesn't have an approved price?”

- `technician_after_evaluation` — “Explain that pricing will be provided after the job is evaluated” (default)
- `team_provides_pricing` — “Have our team provide the price”

Those two stored values are kept. `approved_price_or_range`, `fee_plus_separate_quote`, `custom`, and any other old value become the default and are flagged `NEEDS_QA`. “Give an approved price or range when one is available” is not mapped into this question.

## Additional Fees

Question: “Which additional fees does your company charge?”

`service_diagnostic`, `after_hours`, `travel`, `cancellation`, `no_show`, `minimum_service`, `estimate_consultation`, `other`, and `none`.

`none` (“We don’t charge additional fees”) cannot be an active selection together with a real fee. The checkbox control enforces that, and validation rejects a contradictory stored selection. Unselected fee details stay on the draft and are not submitted.

Each selected fee requires an amount (`MoneyField`, digits only, greater than zero, at most two decimals), “When does it apply?”, and crediting: Always, Sometimes, or Never. Sometimes reveals “When is it credited?” The supplied October 1 examples are placeholders. Travel, minimum, estimate/consultation, and Other have no invented placeholder.

## Cancellation / No-Show Amount Migration

Scheduling still asks whether a late-cancellation fee applies, the notice window, the conditional rule, and the exceptions note. It still asks whether a no-show fee applies, the conditional rule, and the same exceptions note. The dollar inputs are gone. Scheduling validation and progress no longer require `amountFixed`.

When an old draft says the fee applies (Yes or conditional) and the new fee checklist is not already saved:

- Cancellation fee is selected in Pricing.
- A valid fixed amount is copied into that fee’s amount and then cleared from the Scheduling fee record.
- The Scheduling application rule is copied into “When does it apply?” when that text already exists. No new sentence is written.
- Notice hours, conditions, and exceptions stay on Scheduling.

The same rule moves a no-show amount. A later reload does not put the amount back onto Scheduling and does not overwrite a saved Pricing selection.

## Area Fees

Question: “Do any areas have different travel fees or minimum charges?”

Default `no`. Yes opens repeatable rows of Area and Fee or minimum. Fee or minimum is text. Example placeholder: “$100 travel fee and $250 minimum service charge”. It is not a `MoneyField` and it is not parsed into a number.

Previously entered service areas are offered as suggestions on the Area field (zip codes, cities, conditional territories, after-hours areas, and distance descriptions already collected in Section 2). This reuses the existing geography list. It is not a new cross-section selector.

An old row that stored a travel amount and a minimum amount is joined into that text field and flagged `MAPPED`. The old numeric fields are cleared.

## Markup

Question: “Does your company mark up parts or materials?”

Yes, Sometimes, or No. Yes or Sometimes shows “What may Alexander tell customers about material pricing?” The approved sentence is written only when that explanation is empty at the moment the customer selects Yes or Sometimes. A saved explanation is kept. Reload does not overwrite it. No hides the field and clears it, which was already the behavior.

## Old Questions Removed

The customer-facing block that began with “How should Alexander handle these types of visits?” and ended immediately before “What payment methods do you accept?” is gone. That includes:

- visit-type matrix
- paid-diagnostic follow-up
- old approved service-price cards
- “What should Alexander never say about pricing?”
- discounts, coupons, and promotions
- promotion stacking
- “May Alexander waive or modify a fee or discount?”
- the old free-form fee-card editor

Payment methods and every question after them are unchanged, including payment timing, financing, financial remedies, and the financial approver.

## Legacy Migration

Notes continue on `draft.stage2Migration` and are not shown to the customer. Stage 4A statuses used here: `MAPPED`, `DEFAULTED_FROM_LEGACY`, `DEFAULTED_FROM_UNKNOWN`, `DROPPED_OBSOLETE`, `NEEDS_QA`.

Flagged cases:

- quote permission defaulted for an old draft
- old service-price cards that have no explicit pricing type (`NEEDS_QA`, no guessed Exact / Starting at / Range / Hourly)
- old fee cards with no direct category, including the combined cancellation/no-show template and permit/inspection
- cancellation amount moved
- no-show amount moved
- unknown-price value that is not one of the two current choices
- the obsolete pre-payment block dropped

Direct fee maps only: Diagnostic/service-call → Service / diagnostic; Emergency or after-hours → After-hours / emergency; Travel → Travel; Minimum service charge → Minimum service charge; Other → Other. A fixed amount, the applicability text, and Yes/No/Sometimes crediting (Always/Never/Sometimes) are copied when those fields already mean the same thing. Waiver fields are ignored. Dispatch is not mapped to Service / diagnostic.

## Existing Answer Preservation

Compatible pricing-method selections, markup policy and customer wording, Scheduling policy/notice/conditions/exceptions, payment methods, payment timing, caller authorization, emergencies, and other sections are left in place. A second load does not replace a current Stage 4A answer with a default.

## Normalization Follow-Up

NORMALIZATION FOLLOW-UP REQUIRED.

`normalize/section5.ts` now passes through the new collection and emits empty visit types, old service-price rules, forbidden statements, and promotions. That pass-through is not a Company Truth redesign. These current questionnaire fields are not yet mapped onto Company Truth pricing facts:

- `mayQuoteServicePrices`
- `servicePrices` (service id, mode, exact / starting / range / hourly amounts, conditions)
- the two-choice `unknownPriceBehavior`
- `additionalFeeSelection` and `additionalFeeDetails` (amount, applicability, credit, credit explanation)
- `areaPricingRows.feeOrMinimum` as prose rather than two currency amounts
- cancellation and no-show dollar amounts, which now live on the Pricing fee details rather than Scheduling `amountFixed`

The Stage 3 caller-authority follow-up is unchanged: authority is still not translated into schedule, fee, repair, or payment facts.

## Tests

`src/lib/onboarding/stage4aMigration.test.ts` covers pricing choices, quote-permission default and preservation and legacy default, offered-only eligibility, all five pricing modes, range minimum/maximum, inactive amounts, dormant prices, unknown-price mapping, fee exclusivity and Sometimes crediting, cancellation and no-show amount moves, area text, markup prefill, and a representative old Section 5 draft.

## Stage 4A QA

- typecheck: pass
- lint: pass
- tests: 485 pass, 0 fail (baseline was 474)
- build: pass
- interactive browser check: not available

## Deferred to Stage 4B

Do not treat these as done:

- “What payment methods do you accept?” was left as it is
- “When is payment normally due?” and its follow-ups
- payment assistance (“Can Alexander help customers make a payment?”)
- what Alexander may help collect payment for
- the new financial-remedy model
- financing-detail deletion
- payment-due follow-up deletion
- financial-approver deletion
- membership / service-plan resolution

There is no membership or service-plan question inside Section 5. The only related current surfaces are the Section 6 restricted-information option that mentions memberships and the Section 8 software category `membership` (“Membership / service-plan software”). The October 1 Pricing sequence ends with the new financial-remedy model and then Customer Care, so Stage 4B has to decide whether those mentions stay. They were not deleted or edited in Stage 4A.

Also still deferred: Customer Care, Software & Integrations, and any other post-payment cleanup.

# Stage 4B — Payments & Financial Remedies

Local branch `questionnaire-oct1`. Not pushed. Stage 5 was not started.

## Checkpoint Commit

`bdce966e66c126cd768530951f26653d888f1645` — `checkpoint: questionnaire Oct 1 stage 4A`

Only the validated Stage 4A questionnaire files were staged. Unrelated untracked files stayed untracked. The commit was not pushed. After the commit, the working tree was clean except those unrelated files.

Baseline on that commit, before Stage 4B was finished: typecheck pass, lint pass, 485 tests pass, production build pass.

## Files Modified

- `src/components/onboarding/Section5Form.tsx`
- `src/components/onboarding/ui/CheckboxGroup.tsx`
- `src/lib/onboarding/draft-utils.ts`
- `src/lib/onboarding/normalize/section5.ts`
- `src/lib/onboarding/normalize/section5.test.ts`
- `src/lib/onboarding/progress/section5.ts`
- `src/lib/onboarding/section5-test-helpers.ts`
- `src/lib/onboarding/section5Catalog.ts`
- `src/lib/onboarding/stage2Migration.ts`
- `src/lib/onboarding/stage4aMigration.test.ts`
- `src/lib/onboarding/types.ts`
- `src/lib/onboarding/validation/section5.ts`
- `src/lib/onboarding/validation/section5.test.ts`
- `docs/questionnaire-oct1-implementation-log.md`

## Files Added

- `src/lib/onboarding/stage4bMigration.ts`
- `src/lib/onboarding/stage4bMigration.test.ts`

## Files Removed From the Current Questionnaire

- `src/components/onboarding/FinancialRemedyMatrix.tsx`

Legacy financing-permission and remedy-authority constants remain for decoding an old draft. They are not rendered.

## OCT1 Change IDs Completed

- OCT1-044 financing-detail flow removed
- OCT1-045 payment methods kept, including Financing
- OCT1-046 payment timing kept; detail follow-ups removed
- OCT1-047 payment-assistance authority added
- OCT1-048 payment collection scope added
- OCT1-049 financial remedies replaced with a multi-select
- OCT1-050 per-remedy rule placeholders
- OCT1-051 pricing financial-approver question removed

## Payment Methods

“What payment methods do you accept?” is unchanged. Stored key: `paymentMethods`. Choices remain credit card, debit card, cash, check, ACH / bank transfer, financing, invoice / account billing, and other. Other still uses `paymentMethodOther`. Selecting Financing does not open a financing-detail flow.

## Payment Timing

“When is payment normally due?” keeps the same six choices on `paymentDuePolicies`. The helper is “Different payment terms may apply to different types of work or customers.” Saved selections are preserved.

## Payment Assistance

“Can Alexander help customers make a payment?” is a required single select on `paymentAssistance`.

- `secure_link` — Yes — Alexander may send customers a secure payment link
- `secure_link_and_authorized_method` — Yes — Alexander may send a secure payment link and use an approved payment method already on file when authorized
- `send_to_team` — No — Alexander should send payment requests to our team

A fresh form starts on `secure_link`. A saved current value is kept. A legacy draft with no equivalent field becomes `secure_link` and is flagged `DEFAULTED_NEW_FIELD`. An unrecognized value becomes `secure_link` and is flagged `DEFAULTED_FROM_UNKNOWN`. The choice is not inferred from payment methods, financing, invoice terms, or CRM data. Enum keys are not shown.

## Payment Collection Scope

“What may Alexander help collect payment for?” is always visible. It is not hidden when the assistance answer is “send payment requests to our team.”

Stored key: `paymentCollectionScope`, plus `paymentCollectionOther` when Other is selected.

A fresh form preselects booking or service fees, deposits, completed service invoices, and outstanding balances. Progress payments and Other are not preselected. A saved current selection is kept and is not reset to those four on a later load. A legacy draft with no such field receives the four defaults and is flagged `DEFAULTED_NEW_FIELD`.

Validation requires at least one choice. Other requires the existing free-text detail.

## Financial Remedies

“What financial remedies may Alexander approve without human approval?” is a multi-select on `financialRemedies`.

Choices: refund, account credit, fee waiver, discount / goodwill adjustment, free or reduced-price return visit, and none.

A fresh form starts on None. None is mutually exclusive with every real remedy through the shared checkbox behavior (`toggleExclusiveNone`). Validation also rejects a stored combination of None plus a remedy.

## Per-Remedy Rules

Each selected remedy has its own required open-text field on the existing `remedyRules` record. The labels are “Refund — rules or limits” and the same pattern for the other four remedies. The October 1 examples are placeholders only. These fields are not money inputs. Unselected rules do not block validation. None requires no rule fields. Deselecting a remedy clears its rule in the current form so review does not show it.

## Financing Cleanup

Financing remains only as a payment-method checkbox. The standalone questions (offer financing, provider, what Alexander may do, eligibility statement, application link, begin application, transfer) are not rendered, required, counted, reviewed, or submitted as current answers. Legacy detail is cleared and flagged `DROPPED_OBSOLETE` on `section5.financingDetail`. It is not converted into payment-assistance permission.

## Financial Approver Cleanup

“Who should Alexander contact when human approval is required?” is gone from Pricing. `financialApproverContactId` is cleared when an old draft has it and flagged `DROPPED_OBSOLETE`. Section 1, Section 3 contacts, Section 4 exception authority and booking fields, and the contacts list are not modified by that cleanup.

## Payment-Due Detail Cleanup

Deposit, progress-payment, invoice, and other payment-due explanation fields are not current questions. Non-empty legacy text is cleared and flagged `DROPPED_OBSOLETE`. It is not copied into another field. The Other timing checkbox remains, without a required explanation.

## Legacy Migration

`migrateStage4bPayments` runs after the Stage 4A migration and reads the raw section so a second load does not overwrite a saved Stage 4B answer.

Remedy mapping: an old row marked “Alexander may approve within our rules” (`within_rules`) becomes a selected remedy of the same id. Human approval and never offered do not. If no remedy was independently approvable, the new answer is None. Existing rule text stays only on the remedy that was `within_rules`. Rule text left on a remedy that is not selected is flagged `NEEDS_QA` and is not copied onto the selected remedies.

Migration notes use `PRESERVED` only as an existing status type. This pass records `DEFAULTED_NEW_FIELD`, `DEFAULTED_FROM_UNKNOWN`, `MAPPED_FROM_LEGACY`, `DROPPED_OBSOLETE`, and `NEEDS_QA`. Notes stay on `stage2Migration` and are not shown to customers.

## Existing Answer Preservation

Payment-method selections, payment-timing selections, Stage 4A pricing answers, cancellation and no-show pricing data, caller authorization, emergency and after-hours data, and unrelated sections are left in place. Stage 4A is not reset.

## Membership Resolution

NO PRICING CHANGE REQUIRED

Section 5 has no membership or service-plan question. Section 6 restricted-information membership options and Section 8 “Membership / service-plan software” were not edited.

## Normalization Follow-Up

NORMALIZATION FOLLOW-UP REQUIRED

`normalizeSection5` exposes the new questionnaire values structurally and no longer emits obsolete financing detail, payment-due explanations, the old remedy-authority matrix, or the pricing approver as current facts. It does not interpret those values as Company Truth.

Exact fields still awaiting a Company Truth mapping:

- `paymentAssistance`
- `paymentCollectionScope`
- `paymentCollectionOther`
- `financialRemedies`
- `remedyRules` (emitted as `financialRemedyRules` for selected remedies that have text)

Stage 4A fields that remain unmapped are unchanged: `mayQuoteServicePrices`, `servicePrices`, the two-choice `unknownPriceBehavior`, `additionalFeeSelection`, `additionalFeeDetails`, area `feeOrMinimum` prose, and cancellation / no-show amounts now stored on Pricing fees. Stage 3 caller authority is still not translated into schedule, fee, repair, or payment facts.

## Tests

`src/lib/onboarding/stage4bMigration.test.ts` covers payment-method choices, Financing without a detail flow, preserved timing, dropped due-detail, assistance default and reload, collection defaults and edited selections, legacy defaults with migration notes, financing cleanup, the None default, None exclusivity, per-remedy rule validation, mixed old-matrix mapping, approver removal without touching other contacts, a full legacy Section 5 hydration, and a complete current Section 5 round-trip.

## Stage 4B QA

- typecheck: pass
- lint: pass
- tests: 500 pass, 0 fail (baseline was 485)
- build: pass
- interactive browser check: not available

## Deferred

Customer Care, Software & Integrations, Voice & Conversation, and Prompt Zero / Company Truth semantic mappings. Not published.
