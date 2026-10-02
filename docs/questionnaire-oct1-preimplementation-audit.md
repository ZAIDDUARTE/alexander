# Alexander Questionnaire — October 1 Pre-Implementation Audit

Analysis only. No questionnaire code was changed.

Source priority used: `changes-1oct.md`, then the current Next.js onboarding implementation, then older specs only as history. Ambiguities from the first audit pass are closed in **Confirmed decisions** below. Remaining items that do not change a control are called out as non-blocking.

Workstream in scope: questionnaire UI and behavior. Saved-answer effects are specified only as the migration rules in Confirmed decisions. Question IDs, Prompt Zero, Company Truth redesign, and a storage-architecture redesign are still out of scope. Applying those migration rules during implementation is in scope for this questionnaire change.

## Confirmed decisions

These override earlier “NEEDS CONFIRMATION” notes in this file.

1. **Condition fields stay per row.** Phillip confirmed the per-service structure. Do not collapse diagnostic or customer/property rows into one combined textarea. Put the service-specific examples on the existing condition fields as placeholders. The combined example sentences in `changes-1oct.md` are unused here, because no combined field exists.
2. **Service prices include only Section 2 rows whose policy is `offered` (“We offer this”).** Exclude `with_conditions`, `ask_team`, `not_offered`, and any unanswered row. `getPricingDiscussEligibleServices` is wider than this and must be narrowed for the new price list.
3. **Area fees:** repeatable Area + one text field, “Fee or minimum”. That text field is not a currency input. Example content such as “$100 travel fee and $250 minimum service charge” stays prose. Area continues to use the existing saved-area selector (`geographyChoices`). The two amount fields `travelFee` and `minimumCharge` are replaced by that one text field.
4. **Scheduling cancellation / no-show:** keep the policy questions, conditional state, notice-hours field, condition text, and the exceptions question. Remove only the dollar amount inputs. Pricing & Payments is the only place that stores cancellation and no-show amounts.
5. **Delete the old pricing block** from “How should Alexander handle these types of visits?” through the question immediately before “What payment methods do you accept?” That includes the visit matrix, paid-diagnostic follow-up, the old per-service pricing-specificity cards, the never-say checklist, discounts/promotions, stacking, and the old fee/discount waiver question. Do not keep them beside the new pricing questions.
6. **Financing:** keep the Financing payment-method checkbox. Delete the separate “Do you offer financing?” flow.
7. **Delete** “Who should Alexander contact when human approval is required?”
8. **Payment due:** keep the question and its Oct 1 choices, plus the helper sentence. Delete the old conditional detail fields (deposit, progress, invoice, and other “explain the rule” follow-ups).
9. **Integrations sequence:** CRM/FSM, appointment availability, phone, other software, authorization, connection notice, failure handling, final catch-all. Delete the standalone dispatch question and the capability/action checklist.
10. **Emergency migration:** keep explicit `emergency`, `urgent`, `routine`, and `human_review`. Map `recommended_default` to that row’s new Oct 1 default. Remove `recommended_default` from the selectable enum. Visible label for human review is “Human review required”; the stored id stays `human_review`.
11. **After-hours migration:** `attempt_contact` → Contact our on-call team; `confirm_or_book` and `schedule_next_available` → Schedule service. For `submit_for_review`, `arrange_callback`, `info_only`, and `no_service`, do not invent a meaning. Apply the new row default and flag that row for QA.
12. **Caller permissions:** do not convert old checkbox arrays. Replace incompatible rows with the Oct 1 defaults and flag them for Phillip’s QA.
13. **Booking migration:** `confirm_immediately` → Book an available appointment; `submit_for_approval` → Send the request to our team. `arrange_callback` has no equivalent: use Book an available appointment and flag for QA. “Different jobs follow different rules” is not a `defaultBookingMode` value. It is the separate question `hasServiceBookingRules`. That question is not in the Oct 1 change list. Do not overwrite it as part of the booking migration.
14. **Money inputs introduced or kept as structured currency by this change** use one pattern: stored digits, UI `$` prefix, no typed `$`, at most two decimal places, no negatives. “Fee or minimum” stays text. Do not convert policy sentences that mention dollars into currency fields.
15. **Placeholder vs default vs prefill** stays as in Section 8. Placeholders are not saved.

## 1. Executive Summary

- **Architecture found:** Next.js App Router questionnaire. Eight sections. Question wording, options, and defaults live in TypeScript catalogs and form components, not in one schema file. Answers autosave as a typed draft (`OnboardingDraft`) through `OnboardingContext`.
- **Sections:** 8 (`src/lib/onboarding/sections.ts`). Welcome is a separate page before Section 1.
- **Primary entry points:** `/onboarding` (welcome), `/onboarding/sections/{1–8}/form`, section intro/review/complete routes, `/onboarding/review`, `/onboarding/submitted`.
- **Atomic Oct 1 changes found:** 62 (`OCT1-001`–`OCT1-062`).
- **Highest-risk areas:** Pricing & Payments rebuild; caller authorization changing from multi-checkbox to one authority level; emergency and after-hours stored enums; shared fee records that Section 4 cancellation questions and Section 5 fees both write.
- **Config-only vs new components:** Not config-only. Catalog/option edits cover some rows. These behaviors need localized component work: per-service placeholders, per-row emergency defaults, single-select caller authority, opt-in service pricing, category fee checklist, remedy multi-select with per-remedy rule fields. Shared inputs (`TextField`, `RadioGroup`, `CheckboxGroup`, `ContactPicker`) can be reused. Do not globally restyle them.
- **Readiness:** **READY FOR SURGICAL IMPLEMENTATION.** The prior blockers (condition-field shape, pricing eligibility, area-fee control, scheduling amount scope, pricing/integration deletions, and saved-value migration) are decided below. No implementation-blocking ambiguity remains.

## 2. Current Questionnaire Architecture

Framework: Next.js (App Router) + React + TypeScript. Client forms call `useOnboarding()`. Validation, progress, and Company Truth normalization are separate modules per section. Persistence is draft autosave plus submit. This pass does not redesign that.

| Area | File | Component / Object | Purpose |
| --- | --- | --- | --- |
| Section registry | `src/lib/onboarding/sections.ts` | `ONBOARDING_SECTIONS` | 8 section ids, slugs, titles |
| Draft shape | `src/lib/onboarding/types.ts` | `Section1Data`–`Section8Data`, `createDefaultDraft` | Stored answer keys and defaults |
| Welcome | `src/app/onboarding/page.tsx` | `WelcomePage` | Copy before Section 1 |
| Section pages | `src/app/onboarding/sections/{n}/form/page.tsx` | page → `Section{n}Form` | Route per section |
| Services catalog | `src/lib/onboarding/section2Catalog.ts` | `PLUMBING_SERVICES`, `DIAGNOSTIC_SERVICES`, `CUSTOMER_PROPERTY_TYPES` | Stable service/customer ids |
| Services UI | `src/components/onboarding/Section2Form.tsx`, `ServicePolicy.tsx` | `ServicePolicyGroup`, `ServicePolicyChoice` | Four-state policy + condition textarea |
| Emergencies catalog | `src/lib/onboarding/section3Catalog.ts` | `EMERGENCY_SCENARIOS` | 15 scenario ids |
| Emergency defaults | `src/lib/onboarding/section3Defaults.ts` | `createDefaultEmergencyClassifications` | Every row starts as `recommended_default` |
| Emergency UI | `src/components/onboarding/EmergencyClassification.tsx`, `Section3Form.tsx` | `EmergencyClassificationSegmented` | Five radio states per scenario |
| After-hours UI | `src/components/onboarding/AfterHoursDispositionMatrix.tsx` | `AFTER_HOURS_DISPOSITION_OPTIONS` | Three dropdowns, seven actions, no preselect |
| Scheduling catalogs | `src/lib/onboarding/section4Catalog.ts`, `src/lib/onboarding/validation/section4.ts` | `CALLER_TYPES`, `CALLER_PERMISSION_OPTIONS`, `DEFAULT_BOOKING_OPTIONS`, `CAPACITY_POLICY_ROWS`, `FEE_CHARGE_OPTIONS` | Caller rows, permissions, booking, same-day/holiday, fee yes/no |
| Caller UI | `src/components/onboarding/CallerAuthorizationMatrix.tsx` | checkbox matrix | Multi-permission per caller |
| Scheduling form | `src/components/onboarding/Section4Form.tsx` | question cards | Booking, spending limits, cancellation/no-show money |
| Pricing catalog | `src/lib/onboarding/section5Catalog.ts` | pricing, fee, visit, remedy option lists | Section 5 enums |
| Pricing UI | `src/components/onboarding/Section5Form.tsx` | question cards | Current pricing section |
| Fee cards | `src/components/onboarding/FeeCardEditor.tsx` | `FeeCardEditor` | Open-ended fee repeater |
| Service prices | `src/components/onboarding/ServicePricingCards.tsx`, `src/lib/onboarding/pricingServices.ts` | `getPricingDiscussEligibleServices` | One required card per eligible Section 2 service |
| Visit matrix | `src/components/onboarding/VisitTypeMatrix.tsx` | visit-type radios | Block Phillip marked for deletion |
| Remedies | `src/components/onboarding/FinancialRemedyMatrix.tsx` | per-remedy authority radios | Rules field only when `within_rules` |
| Customer care | `src/lib/onboarding/section6Catalog.ts`, `NonServiceCallMatrix.tsx`, `Section6Form.tsx` | `NON_SERVICE_CALL_TYPE_ROWS`, `NON_SERVICE_DISPOSITION_OPTIONS` | 10 rows × 4 dispositions, no defaults |
| Contacts | `src/components/onboarding/ContactPicker.tsx`, `ContactCardEditor.tsx` | shared contact registry | Already used for transfer-style routing |
| Voice | `src/lib/onboarding/section7Catalog.ts`, `Section7Form.tsx` | voice questions | Not in the Oct 1 change list |
| Integrations | `src/lib/onboarding/section8Catalog.ts`, `Section8Form.tsx` | CRM, schedule, dispatch, phone, capabilities, owner, failure | Several questions already match the new copy |
| Money check | `src/lib/onboarding/validation/feeRecord.ts` `isPositiveMoney` | `/^\d+(\.\d{1,2})?$/` and `> 0` | Rejects `$`, commas, and text. Duplicated in `validation/section4.ts` and `progress/section4.ts` |
| Text input | `src/components/onboarding/ui/Fields.tsx` | `TextField`, `TextareaField` | Plain text unless `type` is set. Placeholder is not the stored value |
| Save / submit | `src/lib/onboarding/OnboardingContext.tsx`, `autosave.ts`, `src/app/api/onboarding/draft/route.ts`, `src/app/api/onboarding/submit/route.ts` | draft API | Existing answers live here. Do not redesign in this workstream |
| Normalize | `src/lib/onboarding/normalize/section{2–8}.ts` | Company Truth projection | Will reject or drop unknown enums if UI options change. Flag only |

## 3. Section / Page Map

| Section | Page/Step | Source File | Primary Component | Question Keys |
| --- | --- | --- | --- | --- |
| Welcome | `/onboarding` | `src/app/onboarding/page.tsx` | `WelcomePage` | none (static copy) |
| 1 Company | `/onboarding/sections/1/form` | `Section1Form.tsx` | `Section1Form` | company display name, legal name, phone, website, claimable facts, licenses, never-claim, office hours, appointment availability, answer-hours, recurring availability. **No Oct 1 change.** |
| 2 Services | `/onboarding/sections/2/form` | `Section2Form.tsx` + `section2Catalog.ts` | `ServicePolicyGroup`, `ServicePolicyChoice` | `plumbingServices`, `diagnosticServices`, `customerPropertyTypes`, `customerSuppliedMaterialsPolicy` / `customerSuppliedMaterialsCondition`, `correctiveWorkPolicy` / `correctiveWorkCondition`, service-area fields, `afterHoursAreaMode` |
| 3 Emergencies | `/onboarding/sections/3/form` | `Section3Form.tsx` | `EmergencyClassificationGroup`, `AfterHoursDispositionMatrix` | `emergencyClassifications`, `dispatchApproval`, `afterHoursDisposition`, `emergencyServiceMode`, contacts, retry, capacity. Oct 1 touches classification + after-hours disposition only |
| 4 Scheduling | `/onboarding/sections/4/form` | `Section4Form.tsx` | `CallerAuthorizationMatrix` | `callerPermissions`, `hasSpendingLimits`, `spendingLimits`, `defaultBookingMode`, `capacityPolicies`, `lateCancellationFeeMode` / `lateCancellationFeeId`, `noShowFeeMode` / `noShowFeeId` |
| 5 Pricing | `/onboarding/sections/5/form` | `Section5Form.tsx` | `FeeCardEditor`, `VisitTypeMatrix`, `ServicePricingCards`, `FinancialRemedyMatrix` | `pricingModels`, `materialMarkupPolicy`, `unknownPriceBehavior`, `fees` / `noSeparateFees`, `areaPricingRows`, `visitTypeByServiceId`, `servicePricingRules`, `forbiddenStatements`, promotions, `paymentMethods`, `paymentDuePolicies`, financing, `remedyAuthority` / `remedyRules` |
| 6 Customer care | `/onboarding/sections/6/form` | `Section6Form.tsx` | `NonServiceCallMatrix` | `nonServiceCallPolicies` plus earlier care questions the Oct 1 doc does not change |
| 7 Voice | `/onboarding/sections/7/form` | `Section7Form.tsx` | `Section7Form` | **No Oct 1 change.** The doc says voice was already good |
| 8 Integrations | `/onboarding/sections/8/form` | `Section8Form.tsx` + `section8Catalog.ts` | `Section8Form` | `crmFsmProvider`, scheduling provider, `dispatchProvider`, `phoneProvider`, `additionalSoftware`, `authorizedCapabilities`, `connectionOwnerMode`, notice, `failureFallback`, `finalOperatingNotes` |
| Review / submit | `/onboarding/review` | `OnboardingGlobalReview.tsx` | review + submit | Not changed by the Oct 1 document |

Storage key pattern: `draft.section{n}.{field}`. Service and scenario ids are stable strings in the catalogs, not array indexes.

## 4. Atomic Change Register

| Change ID | Section | Requested Change | Current Question | Exact Source Path | Current Behavior | Target Behavior | Change Type | Risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| OCT1-001 | Welcome | Replace welcome paragraphs with the Oct 1 opening copy | Welcome to Alexander | `src/app/onboarding/page.tsx` lines 34–65 | Shorter current welcome | The nine paragraphs in `changes-1oct.md` lines 1–9 | TEXT CHANGE | Low. Copy only |
| OCT1-002 | Services | Per-service light-gray placeholders for plumbing “With conditions” | Which plumbing services does your company provide? | `Section2Form.tsx` 89–104; `ServicePolicy.tsx` `ServicePolicyGroup` 142–189; ids in `section2Catalog.ts` `PLUMBING_SERVICES` | One condition textarea per service. `conditionPlaceholder` is not passed, so the box is empty. Text stored in `plumbingServices[id].condition` only if the user types it | Placeholder per id from the Oct 1 table. Must not be saved as the answer | PLACEHOLDER CHANGE, component-level | Low if placeholder stays out of `value`. Medium if one shared placeholder string is reused for every row |
| OCT1-003 | Services | Per-service placeholders for diagnostic/drain “With conditions” | Which of these services does your company provide? | `Section2Form.tsx` 107–125; `DIAGNOSTIC_SERVICES` | Same per-row textarea. Label is already “Tell us about any of these services that have special conditions.” No placeholder | Six service-specific placeholders | PLACEHOLDER CHANGE | Low |
| OCT1-004 | Services | Do not add a combined diagnostic condition box | Same diagnostic question | Label at `Section2Form.tsx` line 121. There is no combined textarea | Per-row fields already exist | Confirmed: keep per-row fields. The combined example is not used, because no combined field exists | NO STRUCTURAL CHANGE | Low |
| OCT1-005 | Services | Per-type placeholders for who is served | Who does your company serve? | `Section2Form.tsx` 128–143; `CUSTOMER_PROPERTY_TYPES` | Per-row condition. Label: “Are there any special conditions for the customers or properties you selected?” No placeholder | Nine placeholders focused on authorization, access, building, payment | PLACEHOLDER CHANGE | Low |
| OCT1-006 | Services | Do not add a combined customer/property condition box | Same question | Label line 139. No combined field | Per-row fields already exist | Confirmed: keep per-row fields. The combined example is not used | NO STRUCTURAL CHANGE | Low |
| OCT1-007 | Services | Replace customer-supplied condition placeholder | Will you install or work with items supplied by the customer? | `Section2Form.tsx` 146–167; key `customerSuppliedMaterialsCondition` | Placeholder already set, different text: “We can install customer-supplied faucets…” | Oct 1 example about compatibility, warranty, and extra parts | PLACEHOLDER CHANGE | Low. Existing typed answers stay |
| OCT1-008 | Services | Add previous-plumber condition placeholder | Will you repair or finish work another plumber started? | `Section2Form.tsx` 173–197; key `correctiveWorkCondition` | Condition field exists. No placeholder | Oct 1 inspection / no-warranty example | PLACEHOLDER CHANGE | Low |
| OCT1-009 | Emergencies | Remove “Use Alexander's recommended default” | How should Alexander treat each of these situations? | `EmergencyClassification.tsx` lines 8–21; type `EmergencyClassification` in `types.ts` 255–260; default `section3Defaults.ts` | Fifth option `recommended_default`, preselected on all 15 rows | Four options only. Map saved `recommended_default` to that row’s new default. Keep explicit emergency / urgent / routine / human_review | OPTION REMOVAL | Medium. Migration rule is now specified |
| OCT1-010 | Emergencies | Human-review label | Same matrix | Label map line 20: “Human review” | Label is “Human review” | Visible label “Human review required”. Stored id stays `human_review` | TEXT CHANGE | Low |
| OCT1-011 | Emergencies | Preselect the concrete classification per scenario | Same matrix, 15 rows in `EMERGENCY_SCENARIOS` | `createDefaultEmergencyClassifications` sets every row to `recommended_default`. Component has no per-row default map | UI does not store Emergency/Urgent/Routine/Human review as the default | Defaults from the Oct 1 table. Saved `recommended_default` migrates to that same per-row default | DEFAULT VALUE CHANGE | Medium. Rule is specified. Flag migrated rows for QA |
| OCT1-012 | Emergencies | Stop telling the user to pick recommended default | Help text on the question card | `Section3Form.tsx` lines 158 and tooltip `EmergencyClassification.tsx` 29–30 | Help text names the removed option | Remove that instruction. The doc does not supply replacement help text | HELPER TEXT REMOVAL | Low |
| OCT1-013 | Emergencies | After-hours actions become three choices | What should Alexander do with calls that come in after hours? | `AfterHoursDispositionMatrix.tsx` 17–25; type `AfterHoursDispositionOption` `types.ts` 270–277; storage `section3.afterHoursDisposition` | Seven options. Rows start as `""` | Three options. Map `attempt_contact` → on-call; `confirm_or_book` and `schedule_next_available` → Schedule service. Other old values take the row default and are flagged for QA | OPTION REMOVAL + ADDITION | Medium. Unmapped old values are flagged, not guessed |
| OCT1-014 | Emergencies | Urgent row label | Same matrix | Label `urgent_contained`: “Urgent but contained” (`AfterHoursDispositionMatrix.tsx` 13) | That label | “Urgent, but not an emergency” | TEXT CHANGE | Low. Key can stay |
| OCT1-015 | Emergencies | Preselect after-hours defaults | Same three rows | `createDefaultAfterHoursDisposition` returns empty strings (`types.ts` 281–283) | User must choose | Emergency → on-call; Urgent → schedule; Routine → schedule. Apply these defaults to empty rows and to old values that have no safe map | DEFAULT VALUE CHANGE | Medium. Flag non-exact migrations for QA |
| OCT1-016 | Scheduling | Caller row label | What can different types of callers authorize? | `CALLER_TYPES` `section4Catalog.ts` 21–29, id `realtor_buyer_seller` label “Realtor / buyer / seller” | Buyer and seller are in the label only. They are not separate rows | Label “Realtor”. Other rows already match the Oct 1 list | TEXT CHANGE | Medium if any UI or copy still says buyer/seller. Spending-limit dropdown uses this same list |
| OCT1-017 | Scheduling | One authority level per caller | Same question | `CallerAuthorizationMatrix.tsx`; `CALLER_PERMISSION_OPTIONS` `validation/section4.ts` 499–506; storage `section4.callerPermissions` as `CallerPermission[]` | Multi-checkbox arrays | Single select. Do not convert old arrays. Write the Oct 1 default for that caller and flag the row for QA | FIELD-TYPE CHANGE, structural | High for saved data. The replacement rule is specified |
| OCT1-018 | Scheduling | Preselected authority | Same matrix | No defaults. Empty array per caller | User must check boxes | Those seven defaults. Same defaults replace incompatible saved arrays, flagged for QA | DEFAULT VALUE CHANGE | Medium. Rule is specified |
| OCT1-019 | Scheduling | Spending-limit question follows the new caller list | Are there spending limits… Help text is already “Do any callers have a maximum amount they’re allowed to approve?” | `Section4Form.tsx` 359–474; keys `hasSpendingLimits`, `spendingLimits[].callerTypeId`, `spendingLimits[].maxAmount` | Yes/No, then repeater. Caller dropdown is `CALLER_TYPES`. Amount is a text field | Keep both existing sentences. Dropdown follows the updated caller labels. Keep caller ids, including `realtor_buyer_seller`. Amount uses the structured money pattern | TEXT CHANGE, REUSE, money | Low if ids stay |
| OCT1-020 | Scheduling | Appointment authority, two options | What is Alexander normally allowed to do when a customer wants an appointment? | `Section4Form.tsx` 503–515; `DEFAULT_BOOKING_OPTIONS` `validation/section4.ts` 517–527; key `defaultBookingMode` | Three radios: confirm immediately; submit for team approval; arrange a callback | Two options with the doc’s sentences. Map confirm → Book; submit for approval → Send to team. `arrange_callback` becomes Book and is flagged for QA. Do not touch `hasServiceBookingRules` | OPTION REMOVAL, TEXT CHANGE | Medium. Callback has a specified fallback, not a semantic map |
| OCT1-021 | Scheduling | Appointment default | Same | Default `""` in `createDefaultSection4` | Unselected | Preselect Book an available appointment. Empty drafts and `arrange_callback` use that default. `arrange_callback` is flagged for QA | DEFAULT VALUE CHANGE | Low |
| OCT1-022 | Scheduling | Same-day condition placeholder | When may Alexander offer these appointments? row Same-day service | `Section4Form.tsx` 729–760; `CAPACITY_POLICY_ROWS` id `same_day`; key `capacityPolicies.same_day.condition` | Textarea labeled “Conditions”. No placeholder. Shown only when policy is `with_conditions` | Oct 1 same-day example as placeholder | PLACEHOLDER CHANGE | Low |
| OCT1-023 | Scheduling | Holiday condition placeholder | Same matrix, row Holiday service | id `holiday`; key `capacityPolicies.holiday.condition` | Same, no placeholder | Oct 1 holiday example as placeholder | PLACEHOLDER CHANGE | Low. There is no weekend row. Do not add one |
| OCT1-024 | Scheduling | Remove only the late-cancellation dollar amount | Do you charge a late-cancellation fee? | `Section4Form.tsx` 819–866; keys `lateCancellationFeeMode`, `lateCancellationFeeId`; amount on linked `FeeRecord.amountFixed` | Yes / conditional / No, plus amount, notice, and conditional “when” | Keep mode, conditional state, notice, and condition text. Remove the amount input. Amount lives on the Pricing cancellation fee. Stop requiring `amountFixed` in `validateFeeForMode` | MOVE DATA ENTRY | Medium. Shared `FeeRecord` must not still require the Scheduling amount |
| OCT1-025 | Scheduling | Remove only the no-show dollar amount | Do you charge a no-show fee? | `Section4Form.tsx` 868–906; keys `noShowFeeMode`, `noShowFeeId` | Yes / conditional / No, plus amount and conditional “when” | Keep mode and condition text. Remove the amount input. Keep the exceptions question below these two. Amount lives on the Pricing no-show fee | MOVE DATA ENTRY | Medium |
| OCT1-026 | Pricing | Pricing-method wording | How does your company normally price plumbing work? | `Section5Form.tsx` 401–433; `PRICING_MODEL_OPTIONS` `section5Catalog.ts` 7–14; key `pricingModels` | Multi-select already matches the six choices. “Other” reveals a text field. Help text already matches the Oct 1 helper. Label difference: current “Price determined after technician diagnosis” vs doc “Price determined after the technician evaluates the job” | Align that one label. Keep select-all and Other | TEXT CHANGE | Low |
| OCT1-027 | Pricing | New permission question | Does not exist as this question | No `mayQuoteServicePrices` field. Unused stored key `generalPricingAuthority` is forced to `null` in `normalize/section5.ts` and is not rendered | Absent | “May Alexander quote prices for your services?” Yes / No. Default No. Helper text from the doc is requested here (it is in `changes-1oct.md`, not AI commentary to strip) | NEW QUESTION, DEFAULT | Medium. Gates OCT1-028 |
| OCT1-028 | Pricing | Opt-in prices only for services marked “We offer this” | Which service prices may Alexander discuss… | `ServicePricingCards.tsx`; `getPricingDiscussEligibleServices` in `pricingServices.ts`; key `servicePricingRules` | Every eligible service (offered, with conditions, or ask-team) is a required card | If quoting is Yes: list only `offered` services, each with “+ Add pricing”. Exclude with conditions, ask our team, and not offered | REPEATER CHANGE, SERVICE REUSE, structural | High. Eligibility helper must be narrowed |
| OCT1-029 | Pricing | How each added service is priced | Inside `ServicePricingRule` | `SERVICE_PRICING_INSTRUCTION_OPTIONS` and nested exact/range in `ServicePricingCards.tsx` 109–167; fields `instruction`, `approvedPriceMode`, `approvedPriceExact`, `approvedPriceMin`, `approvedPriceMax` | Five instruction radios, then exact or range only | Exact price; Starting at; Price range; Hourly; Requires an estimate / diagnosis | OPTION REPLACEMENT | High. Old instruction ids do not match |
| OCT1-030 | Pricing | Amount fields depend on that choice | Same card | Exact → one money field. Range → min and max. No starting-at, hourly, or “no amount” mode | Exact → one amount. Starting at → one amount. Range → min and max. Hourly → rate. Estimate/diagnosis → no amount | CONDITIONAL LOGIC, NEW fields | High |
| OCT1-031 | Pricing | Optional condition on a priced service | `pricingConditions` textarea, label “Pricing conditions (optional)” | Optional textarea, no placeholder, only when instruction is `quote_approved` | Optional “Any conditions or details Alexander should know?” Placeholder example about $149 drain clearing. Doc says the same example may be reused | PLACEHOLDER CHANGE | Low once the card exists |
| OCT1-032 | Pricing | Unknown price, two options, default the first | If Alexander doesn’t know the exact price… | `Section5Form.tsx` 466–498; `UNKNOWN_PRICE_OPTIONS` `section5Catalog.ts` 17–33; key `unknownPriceBehavior` | Five options including approved price/range, fee plus separate quote, and custom rule | Explain that pricing will be provided after the job is evaluated (default); Have our team provide the price | OPTION REMOVAL, DEFAULT | Medium. Values `approved_price_or_range`, `fee_plus_separate_quote`, `custom` would be orphaned |
| OCT1-033 | Pricing | Additional fees become a fixed checklist | What fees does your company charge? | `FeeCardEditor.tsx`; templates `FEE_CATEGORY_TEMPLATES`; keys `fees[]`, `noSeparateFees` | Free-form cards plus category templates. Amount can be fixed, range, percentage, or varies. Also asks quote authority and waiver | Checklist: Service/diagnostic, After-hours/emergency, Travel, Cancellation, No-show, Minimum service charge, Estimate/consultation, Other, We don't charge additional fees. Details only for selected rows | REPEATER CHANGE, structural | High. Current `FeeRecord` is richer and is shared with Section 4 |
| OCT1-034 | Pricing | For each selected fee: amount, when it applies, credited? | Inside each fee card | `FeeCardEditor.tsx` 189–277; `amountFixed` / `applicationRule` / `creditTowardWork` | Those three exist, but amount kind, quote authority, and waiver are also required | Amount, when it applies, and Always / Sometimes / Never credited. Doc does not mention percentage, varies, quote-authority, or waiver on this new card | FIELD-TYPE CHANGE | High |
| OCT1-035 | Pricing | If credited = Sometimes, ask when | `waiverRule` is a different question (when a fee may be waived) | Credit options are Yes / No / Sometimes (`FEE_CREDIT_OPTIONS`) but Sometimes does not open its own “when credited” field | “When is it credited?” with the service-fee example as placeholder | CONDITIONAL LOGIC, NEW field | Medium |
| OCT1-036 | Pricing | Per-fee “when it applies” examples | `applicationRule` has no placeholder | Empty textarea | Use the written examples for diagnostic, after-hours, cancellation, and no-show. Travel, minimum, estimate/consultation, and other have no example in the doc, so those placeholders stay empty | PLACEHOLDER CHANGE | Low |
| OCT1-037 | Pricing | Areas with different travel fees or minimums | Do any areas have a travel fee or minimum charge? | `Section5Form.tsx` 525–628; key `hasAreaTravelOrMinimum`, `areaPricingRows[]` of `{ area, travelFee, minimumCharge }` | No is not preselected. Yes shows a saved-area dropdown plus two money fields | Default No. Keep the area selector. Replace the two money fields with one text field, “Fee or minimum”. Do not parse that text as currency | FIELD-TYPE CHANGE, REUSE | Medium. Old numeric pair must be copied into text if preserved |
| OCT1-038 | Pricing | Markup customer statement is a prefilled editable value | Does your company add a markup to parts or materials? | `Section5Form.tsx` 53–57 and 435–464; keys `materialMarkupPolicy`, `materialMarkupCustomerExplanation` | Yes / Sometimes / No already. Explanation textarea starts empty and is required | If Yes or Sometimes, prefill: “Our quoted prices may include parts and materials. Do not discuss our internal costs or markup percentages.” User can edit. This is not a placeholder | PREFILL CHANGE | Medium. Prefill must not overwrite an answer already saved |
| OCT1-039 | Pricing | Delete the visit-type block | How should Alexander handle these types of visits? | `Section5Form.tsx` 631–656; `VisitTypeMatrix.tsx`; key `visitTypeByServiceId`; options `VISIT_TYPE_OPTIONS` | Required matrix for every job service: free estimate, paid diagnostic, inspection, normal service, ask team, not offered | Delete this question | SECTION DELETE / DELETE QUESTION | High. Explicit in the doc |
| OCT1-040 | Pricing | Delete the paid-diagnostic follow-up that only exists because of that matrix | What should Alexander tell customers about paid diagnostic visits? | `Section5Form.tsx` 658–710; keys `paidDiagnosticExplanation`, `paidDiagnosticFeeId` | Shown when any visit row is `paid_diagnostic` | Remove with the parent block | DELETE QUESTION | High, but only as a child of OCT1-039 |
| OCT1-041 | Pricing | Current “which prices may he discuss” cards are replaced by OCT1-028 | Same `ServicePricingCards` | Required instruction per eligible service | The new opt-in price builder replaces this card, not a second copy of it | REPLACE | High |
| OCT1-042 | Pricing | Delete the never-say pricing checklist | What should Alexander never say about pricing? | `Section5Form.tsx` 723–752; key `forbiddenStatements` | Required multi-select | DELETE. It sits in the block before payment methods and is not in the new architecture | DELETE QUESTION | Medium. Saved selections are dropped |
| OCT1-043 | Pricing | Delete discounts, stacking, and the old waiver question | Does your company currently offer discounts… plus the two follow-ups | `Section5Form.tsx` 754–871; keys `hasPromotions`, `promotions`, `promotionStacking`, `promotionModificationAuthority` | Full promotion repeater | DELETE. Not part of the replacement pricing sequence | DELETE QUESTION | Medium. Saved promotions are dropped |
| OCT1-044 | Pricing | Delete the financing-detail flow | Do you offer financing? | `Section5Form.tsx` 1010–1046; keys `offersFinancing`, `financingProviderTerms`, `financingPermissions` | Required yes/no plus provider and permission checklist | DELETE this flow. Keep Financing as a payment-method checkbox (OCT1-045) | DELETE QUESTION | Medium |
| OCT1-045 | Pricing | Payment methods stay | What payment methods do you accept? | `Section5Form.tsx` 874–902; `PAYMENT_METHOD_OPTIONS`; key `paymentMethods` | Same eight methods, including Other text field | Keep. Copy already matches | KEEP | Low |
| OCT1-046 | Pricing | Payment timing stays; delete its detail follow-ups | When is payment normally due? | `Section5Form.tsx` 904–1007; `PAYMENT_DUE_OPTIONS`; key `paymentDuePolicies` | Same six options, plus required detail fields for deposit, progress payments, invoice, and other | Keep the six choices. Add the helper sentence. Delete `depositWorkDetail`, `depositRule`, progress fields, invoice fields, and `paymentDueOtherRule` | TEXT / HELPER, DELETE follow-ups | Medium. Detail text is dropped |
| OCT1-047 | Pricing | New payment-assistance question | Does not exist | No matching key in `Section5Data` | Absent | Three radios. Default: send a secure payment link | NEW QUESTION, DEFAULT | Medium |
| OCT1-048 | Pricing | What he may collect payment for | Does not exist | Absent | Multi-select of six items. Preselect booking/service fees, deposits, completed invoices, outstanding balances. The Oct 1 sequence lists this as its own question, not an “If yes” branch, so show it after payment assistance | NEW QUESTION, DEFAULT | Low |
| OCT1-049 | Pricing | Remedies become multi-select, default None | What financial remedies may Alexander approve? | `FinancialRemedyMatrix.tsx`; `FINANCIAL_REMEDY_ROWS`; `REMEDY_AUTHORITY_OPTIONS`; keys `remedyAuthority`, `remedyRules` | Each remedy is a required radio: within rules / human approval / never. Rule textarea only for within rules | Multi-select the same five remedies, plus None. Default None, exclusive of the others. A selected remedy reveals its own rules field | FIELD-TYPE CHANGE | High. Stored authority enum will not match a checkbox |
| OCT1-050 | Pricing | Per-remedy rule examples are placeholders | Rule textarea has no placeholder | Empty required text when `within_rules` | Placeholders from the doc for fee waiver, refund, credit, discount, return visit. Show only under the selected remedy | PLACEHOLDER CHANGE | Low once OCT1-049 exists |
| OCT1-051 | Pricing | Delete the financial-approver question | Who should Alexander contact when human approval is required? | `Section5Form.tsx` 1074–1116; key `financialApproverContactId` | Shown when any remedy is `human_approval` | DELETE. The new remedy model replaces this block | DELETE QUESTION | Medium |
| OCT1-052 | Customer care | Action labels | How should Alexander handle these types of calls? | `NON_SERVICE_DISPOSITION_OPTIONS` `section6Catalog.ts` 97–102; `NonServiceCallMatrix.tsx` | Send to someone specific; Take a message / callback; Politely decline; Human review | Transfer the call; Take a message; Politely decline; Human review | TEXT CHANGE | Medium. Stored id `send_specific` can remain if only the label changes |
| OCT1-053 | Customer care | Drop two rows from this matrix | Same | Rows `service_not_offered`, `outside_service_area` in `NON_SERVICE_CALL_TYPE_ROWS` 113–116 | Those two rows are required | Remove them from this matrix. Unsupported service still exists as Section 2 `not_offered`. Out of area still exists on Section 2 service-area questions | OPTION REMOVAL | Medium. Do not delete Section 2 area/service rules |
| OCT1-054 | Customer care | Preselect recommended handling | `createDefaultNonServiceCallPolicies` `types.ts` 1078–1086 sets `disposition: ""` | No defaults | Vendor, job applicant → Take a message; Sales, wrong number → Politely decline; Current employee → Transfer; Media, attorney, government → Human review | DEFAULT VALUE CHANGE | Medium. Do not overwrite saved dispositions |
| OCT1-055 | Customer care | If Transfer, ask who receives the call | Shown when disposition is `send_specific` | `NonServiceCallMatrix.tsx` 139–151; `ContactPicker` | Prompt: “Who should receive this call type?” Picker plus add contact already exist | Prompt: “Who should Alexander transfer these calls to?” Reuse the contact registry. “+ Add another contact” already exists | TEXT CHANGE, CONTACT REUSE | Low |
| OCT1-056 | Customer care | Intro sentence above the matrix | `Section6Form.tsx` question card at line 234 has no that helper | No preselected-recommendation sentence | “We've preselected the recommended handling…” | HELPER TEXT | Low |
| OCT1-057 | Integrations | CRM, scheduling, phone, and other-software questions | Four questions in `Section8Form.tsx` 73–241 | `CRM_FSM_OPTIONS`, `SCHEDULING_OPTIONS`, `PHONE_OPTIONS`, `ADDITIONAL_SOFTWARE_CATEGORIES` | Options already match the Oct 1 lists, including Cal.com, custom-name fields, and per-category software name | Keep. Small title/help wording can be aligned. Not a rebuild | TEXT CHANGE | Low |
| OCT1-058 | Integrations | Delete the dispatch question | What system do you use for dispatching technicians? | `Section8Form.tsx` 130–159; `DISPATCH_OPTIONS`; key `dispatchProvider` | Required three-way question | DELETE. Absent from the confirmed integration sequence | DELETE QUESTION | Medium |
| OCT1-059 | Integrations | Delete the capability checklist | Which of these should Alexander be able to do… | `Section8Form.tsx` 243–291; `INTEGRATION_CAPABILITY_OPTIONS`; key `authorizedCapabilities` | Required 17-item checklist | DELETE. Absent from the confirmed integration sequence | DELETE QUESTION | Medium. Saved capability selections are dropped |
| OCT1-060 | Integrations | Who can authorize a connection | Are you an administrator or authorized person for these systems? | `Section8Form.tsx` 293–335; `CONNECTION_OWNER_OPTIONS`; validation `validation/section8.ts` 125–140 | Yes / No / Someone else. Someone else requires name, email, and phone | “I can” and “Someone else on our team” only. Remove “No”. Name and email required. Phone optional | OPTION REMOVAL, validation | Medium. Current phone validation will reject a blank phone |
| OCT1-061 | Integrations | Failure fallback | If Alexander can’t access a system… | `Section8Form.tsx` 363–390; `FAILURE_FALLBACK_OPTIONS`; key `failureFallback` | Four options, including “Arrange a callback”. No default | Three options. Drop callback. Default: collect information and send to the team. Custom rule field already exists for “Follow another rule” | OPTION REMOVAL, DEFAULT | Medium |
| OCT1-062 | Pricing, Scheduling | One money-entry pattern on structured currency fields this change introduces | See Section 7 | `TextField` plus `isPositiveMoney` | Labels say `($)` but the input is free text and `$` fails validation | Stored number, visible `$` prefix, user does not type `$`, max two decimals, no negatives. Applies to service exact, starting, range min/max, hourly, and additional-fee amounts, plus the existing spending-limit amount. Does not apply to “Fee or minimum” | INPUT VALIDATION CHANGE | Medium. Local money control only |

## 5. Detailed Section Analysis

### Services

**CURRENT**

- Route: `/onboarding/sections/2/form`. Component: `Section2Form`.
- Plumbing (`plumbingServices`), diagnostic (`diagnosticServices`), and customers (`customerPropertyTypes`) use `ServicePolicyGroup`. Each row is `offered | with_conditions | ask_team | not_offered`. “With conditions” opens a textarea on that row only (`ServicePolicy.tsx` 68–131). The value stored is `entry.condition`. A placeholder prop exists (`conditionPlaceholder`) but Section 2 does not pass one for these three matrices.
- The diagnostic and customer labels read like one combined question. The control is still one field per row.
- Customer-supplied items (`customerSuppliedMaterialsCondition`) and previous-plumber work (`correctiveWorkCondition`) are single `ServicePolicyChoice` fields. Only customer-supplied has a placeholder, and it is not the Oct 1 text.
- Section 2 service ids are the registry later pricing uses.

**REQUESTED**

- Placeholder text from the Oct 1 tables, shown in light gray, not saved.
- Per-row architecture stays. Combined example paragraphs are not implemented.

**IMPLEMENTATION LOCATION**

- Pass a placeholder map into `ServicePolicyGroup` (today it accepts one string for every row). `ServicePolicyRow` already puts that string on `TextareaField` `placeholder`, which is not `value`.
- Replace the string at `Section2Form.tsx` line 167.
- Add `conditionPlaceholder` on the corrective-work `ServicePolicyChoice` (lines 178–196).

**DEPENDENCIES**

- Pricing reuse is only `offered` services (OCT1-028), not this section’s condition text.

**RISKS**

- None if placeholders stay off `value`. Do not merge rows.

**ANSWER-PRESERVATION IMPACT**

- SAFE. Typed conditions remain.

### Emergencies

**CURRENT**

- `emergencyClassifications[scenarioId]` is one of `emergency | urgent | routine | human_review | recommended_default`.
- Fresh and blank rows become `recommended_default` (`section3Defaults.ts`). That value is a real stored choice, not a display-only hint (`normalize/section3.ts` keeps it).
- Help text tells the user to choose it.
- After-hours: `afterHoursDisposition.emergency | urgent_contained | routine`, each a seven-value enum, default empty.
- Other Section 3 questions (dispatch approval, contacts, retry, full-schedule behavior) are outside the Oct 1 list.

**REQUESTED**

- Four classifications. The Oct 1 table is the preselected value, not a fifth option.
- After-hours: three actions and the three defaults in the doc.
- Urgent row renamed. Storage key `urgent_contained` can stay.

**IMPLEMENTATION LOCATION**

- `EmergencyClassification.tsx` option order and labels.
- A new per-scenario default map next to `EMERGENCY_SCENARIOS`. Do not keep a single default for every row.
- `AfterHoursDispositionMatrix.tsx` option list and `createDefaultAfterHoursDisposition`.
- Validation in `validation/section3.ts` and normalize in `normalize/section3.ts` must accept the new enums. That is behavior support, not a storage redesign.

**DEPENDENCIES**

- Scenario ids stay. Downstream dispatch-approval still uses the same 15 scenarios. Do not remove scenarios.

**RISKS**

- `recommended_default` must be rewritten before the control only offers four values.
- Four old after-hours values have no semantic map. They take the row default and must be flagged for QA.

**ANSWER-PRESERVATION IMPACT**

- Explicit Emergency, Urgent, Routine, and Human review: SAFE. Stored ids stay.
- `recommended_default`: PARTIAL. Replace with the row default in the table below and flag for QA.
- After-hours: PARTIAL. Safe maps are `attempt_contact` → on-call team, and `confirm_or_book` / `schedule_next_available` → Schedule service. `submit_for_review`, `arrange_callback`, `info_only`, and `no_service` use the row default and are flagged. Empty rows take the new defaults without a QA flag.

**Oct 1 emergency default map (for implementation later, not applied now)**

| Scenario id | Oct 1 default |
| --- | --- |
| `uncontrolled-water-leak-inside-property` | Emergency |
| `water-leak-near-electrical-equipment` | Emergency |
| `suspected-gas-leak-or-odor` | Emergency |
| `sewage-entering-property` | Emergency |
| `multiple-fixtures-backing-up` | Urgent, not emergency |
| `toilet-overflowing-uncontrolled` | Emergency |
| `only-usable-toilet-not-working` | Urgent, not emergency |
| `major-water-heater-leak-or-rupture` | Emergency |
| `dangerous-water-heater-symptoms` | Emergency |
| `sump-pump-failure-flooding` | Emergency |
| `frozen-pipe-confirmed-leak` | Emergency |
| `complete-loss-of-water` | Urgent, not emergency |
| `major-water-service-line-leak` | Emergency |
| `serious-standing-water-unknown-source` | Emergency |
| `unclear-situation-may-be-dangerous` | Human review required |

The “Why” column in the change document is source commentary. Do not render it. The stored value for that last row remains `human_review`.

### Scheduling

**CURRENT**

- Caller matrix is multi-select. Storage is `callerPermissions[callerTypeId]: CallerPermission[]`.
- Spending limits are a repeater of `{ id, callerTypeId, maxAmount }` shown when `hasSpendingLimits === "yes"`. The caller dropdown is `CALLER_TYPES`. Amount is a text field labeled “Maximum amount ($)” and validated by `isPositiveMoney` (`validation/section4.ts` 208–210). `$` fails.
- `defaultBookingMode` has three options and no default.
- Same-day and holiday are the only capacity rows (`CAPACITY_POLICY_ROWS`). Weekend scheduling is not a questionnaire row.
- Late-cancellation and no-show each have a mode, then write a shared `FeeRecord` (`amountFixed`, and notice/application rule). `section4FeeLinks.ts` protects those fee cards from casual deletion in Section 5.

**REQUESTED**

- Single authority level and the defaults in the doc. Incompatible saved checkbox arrays are replaced by those defaults and flagged for QA. Do not infer a level from which boxes were checked.
- Spending limits stay. Caller dropdown follows the same ids and updated labels. Both the current title and help sentence stay.
- Two appointment actions. Map `confirm_immediately` → Book and `submit_for_approval` → Send to our team. `arrange_callback` becomes Book and is flagged for QA.
- Do not change `hasServiceBookingRules` (“Do any types of jobs follow different booking rules?”). That is not a booking-authority option.
- Placeholders only on same-day and holiday condition boxes.
- Keep late-cancellation and no-show policy, conditional state, notice hours, condition text, and the exceptions question. Remove only the dollar inputs.

**IMPLEMENTATION LOCATION**

- `CallerAuthorizationMatrix.tsx` must become radios (or a single-value control). Validation `validateCallerPermissionRow` currently requires a non-empty array and special-cases `not_allowed`.
- `Section4Form.tsx` spending block, booking radios, capacity textareas, fee amount fields.
- `validateFeeForMode` must stop requiring `amountFixed` once the amount input is gone.
- Do not add a weekend row.

**DEPENDENCIES**

- Spending-limit caller ids must stay inside `CALLER_TYPES`.
- Dollar amounts for cancellation and no-show are entered only on the new Pricing fee categories. Section 4 must not still require `amountFixed` on the linked fee.

**RISKS**

- Replacing every saved caller row with the default will discard Phillip’s checkbox choices. That is the confirmed rule. Flag those rows.
- Removing the amount input without updating `validateFeeForMode` (`validation/section4.ts` 102–104) will make every “yes” fee fail validation.
- `section4FeeLinks.ts` still ties Scheduling policies to fee records. Keep the link for policy identity if the fee record remains, but the amount is no longer edited in Scheduling.

**ANSWER-PRESERVATION IMPACT**

- Caller permissions: incompatible arrays are replaced by the Oct 1 defaults and flagged. Not a semantic conversion.
- Spending limits: SAFE if caller ids are unchanged.
- Booking: PARTIAL. Two values map. `arrange_callback` falls back to Book and is flagged.
- `hasServiceBookingRules`: SAFE. Out of this change.
- Capacity conditions: SAFE.
- Fee policy modes, notice, and condition text: SAFE. Amount strings move to the Pricing cancellation and no-show amount fields when those fields exist, and those copied amounts are flagged for QA.

### Pricing & Payments

See Section 6 for the old → new table. Summary:

**CURRENT** order in `Section5Form.tsx`: pricing models, markup, unknown price, open fee cards, area fees, visit matrix, paid-diagnostic copy, per-service pricing instructions, never-say list, promotions, payment methods, payment due (with extra detail fields), financing, remedy matrix, financial approver.

**REQUESTED** order: pricing method, quote permission, opt-in prices for `offered` services only, unknown price, additional-fee checklist (authoritative cancellation and no-show amounts), area rows with a text “Fee or minimum”, markup with prefill, then payment methods, payment due without detail follow-ups, payment assistance, what he may collect, remedies with per-remedy rules.

Deleted before payment methods: visit matrix, paid-diagnostic copy, old service-pricing cards, never-say list, promotions, stacking, and the old waiver question. Financing detail and the financial approver are also deleted. Financing remains a payment method.

**IMPLEMENTATION LOCATION**

- Mostly `Section5Form.tsx`, `section5Catalog.ts`, a local replacement for `ServicePricingCards.tsx`, a local replacement for `FeeCardEditor.tsx`, `FinancialRemedyMatrix.tsx`.
- Narrow eligibility to `policy === "offered"` only. Do not use today’s `getPricingDiscussEligibleServices` set as-is.
- Area selector stays `geographyChoices`. Replace `travelFee` and `minimumCharge` with one text field.

**DEPENDENCIES**

- Section 2 `offered` services → price list.
- Section 2 geography → area rows.
- Section 4 cancellation/no-show policy stays there. Amounts are only in the new fee checklist.
- Do not keep a trigger from remedy authority to `financialApproverContactId`.

**RISKS**

- Replacing `FeeRecord` in place will break Section 4 if Scheduling still validates `amountFixed`. Update that validation in the same change.
- Requiring a price for every offered service would violate “+ Add pricing”.
- The deletions above are confirmed. Do not leave the old cards on the page.

**ANSWER-PRESERVATION IMPACT**

- Pricing models: SAFE aside from one label.
- Markup yes/sometimes/no: SAFE. Explanation text: SAFE if prefill runs only when the field is empty.
- Unknown price: PARTIAL. Keep the two surviving option ids. Drop the other three.
- Fee cards and old service pricing rules: INCOMPATIBLE with the new shapes. Dropped with the delete/replace.
- Visit matrix, never-say, promotions, financing detail, approver contact, payment-due detail text: dropped. Confirmed deletes.
- Payment method and payment-due selections: SAFE.
- Area rows: PARTIAL. Keep `area`. If `travelFee` or `minimumCharge` is non-empty, concatenate them into the new text field and flag for QA. Do not parse the result back into numbers.
- Remedy authority: INCOMPATIBLE with a checkbox-plus-None model. Saved `within_rules` text can be kept as the rules string when that remedy is selected; do not invent the selection from `never` or `human_approval`. Flag remedy rows that had a non-empty old authority.

### Customer Care

**CURRENT**

- Question: “How should Alexander handle these types of calls?”
- 10 rows. Four dispositions. No defaults.
- `send_specific` opens `ContactPicker` against the shared contact list and can add a contact.
- Earlier Section 6 questions (previous work, repeat callbacks, escalation, forbidden promises, customer history, restricted info, additional services) are not in the Oct 1 list. Leave them.

**REQUESTED**

- Four labels, eight rows, defaults in the doc, transfer contact question.

**IMPLEMENTATION LOCATION**

- `section6Catalog.ts` rows and labels.
- `createDefaultNonServiceCallPolicies`.
- Prompt string in `NonServiceCallMatrix.tsx` line 142.
- Helper on the `Section6Form.tsx` question card.

**DEPENDENCIES**

- Contacts created in Section 3 and elsewhere. The picker already lists contacts with identity (`contactHasIdentity`).

**RISKS**

- Removing `service_not_offered` and `outside_service_area` from this matrix does not remove Section 2 “not offered” or excluded-area behavior. Do not touch those.
- Saved dispositions on the two removed rows would have nowhere to show.

**ANSWER-PRESERVATION IMPACT**

- Label-only disposition change: SAFE if ids stay.
- Removed rows: PARTIAL. Their saved dispositions would be unused.
- Empty rows: SAFE to default. Non-empty rows must be kept.

**Requested defaults**

| Row id | Default |
| --- | --- |
| `vendor_supplier` | Take a message |
| `sales_solicitation` | Politely decline |
| `job_applicant` | Take a message |
| `current_employee` | Transfer the call |
| `media_inquiry` | Human review |
| `attorney_legal` | Human review |
| `government_regulator` | Human review |
| `wrong_number_spam` | Politely decline |

### Voice & Conversation

No October 1 change. `Section7Form.tsx` stays as it is.

### Software & Integrations

**CURRENT**

The form already contains, in order: CRM/FSM, appointment software, dispatch, phone, other software, capability checklist, authorization, connection notice, failure fallback, final notes.

Option lists for CRM, scheduling (including Cal.com), phone, and other software match `changes-1oct.md`. Custom-name follow-ups already exist. The connection notice text in `Q111_NOTICE` (`section8Catalog.ts` 109–110) matches the Oct 1 notice. “I understand” already exists. The final optional notes question already exists.

**REQUESTED differences**

- Delete dispatch (`dispatchProvider`) and the capability checklist (`authorizedCapabilities`).
- Authorization: “I can” / “Someone else on our team”. Remove “No” (`not_authorized`). Phone optional. Today `validation/section8.ts` 136–139 requires phone.
- Failure: remove “Arrange a callback” (`callback`). Default `collect_and_send`. Custom text field already exists.

**ANSWER-PRESERVATION IMPACT**

- Provider selections for CRM, scheduling, and phone: SAFE.
- Dispatch and capability answers: dropped. Confirmed deletes.
- `connectionOwnerMode` `not_authorized`: no new option. Use no selection only if that was the stored value and flag for QA, or leave the field empty and flag. Do not map “No” to “I can” or “Someone else”. `self_authorized` relabels to “I can”. `someone_else` contact fields stay. Phone may be blank after the validation change.
- `failureFallback` `callback`: no equivalent. Apply the new default (collect and send) and flag for QA. The other three values remain.

### Final Review / Submission

`OnboardingGlobalReview.tsx` and `Q114_CONFIRMATIONS` are not in the change document. Leave them. Review screens that print old option labels will show stale text after option changes. That is a display dependency of the same labels, not a new review feature. Update label lookups only where an Oct 1 option label changed.

## 6. Pricing Rebuild — Old → New Map

| Current Question/Block | Current Path | Action | New Equivalent | Notes |
| --- | --- | --- | --- | --- |
| How does your company normally price plumbing work? | `Section5Form.tsx` 401–433; `pricingModels` | MODIFY | Same question | One option label. Helper already present |
| Does your company add a markup… | `Section5Form.tsx` 435–464; `materialMarkupPolicy` | MODIFY | Same, later in the new order | Move below area fees. Add prefill on `materialMarkupCustomerExplanation` |
| If Alexander doesn’t know the exact price… | `Section5Form.tsx` 466–498; `unknownPriceBehavior` | MODIFY | “What should Alexander do when he doesn't have an approved price?” | Keep `technician_after_evaluation` and `team_provides_pricing`. Remove the other three options. Default the first |
| What fees does your company charge? | `FeeCardEditor`; `fees`, `noSeparateFees` | REPLACE | “Which additional fees does your company charge?” | Checklist plus simpler per-fee fields. Do not globally rewrite `FeeRecord` if Section 4 still uses it |
| Do any areas have a travel fee or minimum charge? | `areaPricingRows` | MODIFY | Area + text “Fee or minimum” | Default No. Keep area selector. Drop the two money fields |
| How should Alexander handle these types of visits? | `visitTypeByServiceId`; `VisitTypeMatrix.tsx` | DELETE | none | Confirmed |
| What should Alexander tell customers about paid diagnostic visits? | `paidDiagnosticExplanation`, `paidDiagnosticFeeId` | DELETE | none | Confirmed with the visit block |
| Which service prices may Alexander discuss… | `servicePricingRules`; `ServicePricingCards.tsx` | DELETE | “What service prices may Alexander quote?” only for `offered` services, behind the new Yes | Old instruction cards are not kept. Successor is opt-in |
| What should Alexander never say about pricing? | `forbiddenStatements` | DELETE | none | Confirmed. Inside the block before payment methods |
| Discounts, coupons, promotions, stacking, modification | `hasPromotions` and follow-ups | DELETE | none | Confirmed |
| What payment methods do you accept? | `paymentMethods` | KEEP | Same, including Financing | |
| When is payment normally due? | `paymentDuePolicies` plus detail fields | MODIFY | Same six choices, no follow-up textareas | Add helper. Delete deposit, progress, invoice, and other detail fields |
| Do you offer financing? | `offersFinancing` and follow-ups | DELETE | Financing checkbox on payment methods only | Confirmed |
| What financial remedies may Alexander approve? | `remedyAuthority`, `remedyRules` | REPLACE | Multi-select + None + per-remedy rules | |
| Who should Alexander contact when human approval is required? | `financialApproverContactId` | DELETE | none | Confirmed |
| May Alexander quote prices… | not rendered | ADD | New question before service prices | Default No |
| Can Alexander help customers make a payment? | not present | ADD | New, after payment due | Default secure payment link |
| What may Alexander help collect payment for? | not present | ADD | New multi-select, always in the sequence | Four items preselected. Not an “If yes” branch |
| `generalPricingAuthority` | `types.ts` `Section5Data`; normalize writes `null` | KEEP unused | Do not revive it for the new quote question | Dead field. New question needs its own key |

## 7. Numeric / Currency Consistency Audit

`isPositiveMoney` (`validation/feeRecord.ts` lines 3–8) accepts only digits with an optional `.` and one or two decimal places, and the number must be greater than 0. It rejects `$`, commas, spaces, and negative signs. The same rule is copied in `validation/section4.ts` and `progress/section4.ts`.

`TextField` does not add a currency prefix. Labels include `($)`, so the symbol is in the label, not the control. The input `type` stays text, so the browser will let someone type `$`. Validation then fails. That is the inconsistency. It is not two different validators.

Confirmed pattern for structured currency amounts this change introduces, plus the existing spending-limit amount:

- Store a numeric string with no `$` and no commas.
- Show a `$` prefix outside the typed value.
- Allow two decimal places.
- Reject empty when the field is required, zero, negatives, `$`, and commas.
- Do not use `type="number"` for money.
- Leave days, hours, radius miles, callback counts, and retry counts alone.
- “Fee or minimum” is text. Do not run it through this pattern.

| Field | Section | Path | Current Type | Current Validation | Current UX | Oct 1 pattern |
| --- | --- | --- | --- | --- | --- | --- |
| Spending-limit maximum | 4 | `Section4Form.tsx` 433–446; `spendingLimits[].maxAmount` | `TextField` text | `isPositiveMoney` | Label “Maximum amount ($)”. `$` can be typed and then fails | Structured money pattern. Question stays |
| Late-cancellation amount | 4 | `Section4Form.tsx` 831–837 | text | `isPositiveMoney` | Label “Fee amount ($)” | Remove from Scheduling. Amount is the Pricing cancellation fee |
| No-show amount | 4 | `Section4Form.tsx` 879–885 | text | `isPositiveMoney` | Same | Remove from Scheduling. Amount is the Pricing no-show fee |
| Fee fixed / range / percent | 5 | `FeeCardEditor.tsx` | text | `isPositiveMoney` or percentage | Open fee card | Replaced by one structured amount per selected fee category |
| Area travel fee and minimum | 5 | `areaPricingRows[].travelFee`, `minimumCharge` | text | `isPositiveMoney` if non-empty | Two currency labels | Replace both with one text field, “Fee or minimum”. Not currency |
| Approved exact / min / max | 5 | `ServicePricingCards.tsx` | text | `isPositiveMoney` | Old instruction card | New exact, starting-at, range, and hourly fields use the money pattern. Estimate/diagnosis has no amount |
| Booking horizon days | 4 | `type="number"` | number | whole number | Not money | Leave unchanged |
| Service-area radius | 2 | `type="number"` | number | miles | Not money | Leave unchanged |
| Section 2 conditional-area note | 2 | `AreaConditionList.tsx` placeholder `"$75 travel fee"` | free text | none | Sentence, not an amount | Leave unchanged |

Build the new money fields on one local control. Do not change `TextField` for every input in the questionnaire.

## 8. Defaults / Placeholders / Prefills

| Field | Requested Behavior Type | Value/Example | Current Implementation | Change Needed |
| --- | --- | --- | --- | --- |
| Plumbing / diagnostic / customer “with conditions” | PLACEHOLDER | Per-row examples in `changes-1oct.md` | Empty placeholder. Value is only what the user types | Add placeholder map. Do not seed `condition` |
| Diagnostic “combined” sentence | NOT USED | Hydro-jetting / camera / commercial sentence | No combined field | Do not create one. Per-row placeholders only |
| Customer “combined” sentence | NOT USED | Tenant / HOA / multifamily sentence | No combined field | Do not create one |
| Customer-supplied conditions | PLACEHOLDER | Compatibility, warranty, extra cost | Different placeholder already | Replace placeholder string |
| Previous plumber conditions | PLACEHOLDER | Inspect first, no warranty of prior work | No placeholder | Add placeholder |
| Emergency classification | DEFAULT SELECTION | Table in Section 5 | Default is `recommended_default` for every row | Per-row enum. Migrate `recommended_default` to that default |
| Emergency “why” paragraphs | EXAMPLE ONLY IN DOCUMENT | Citations and rationale | Not shown | Do not render |
| After-hours action | DEFAULT SELECTION | On-call / schedule / schedule | Empty | Defaults for empty rows. Safe maps for three old values. Other old values use the row default and are flagged |
| Caller authority | DEFAULT SELECTION | Table in the change doc | Empty checkbox arrays | Defaults for empty rows. Incompatible saved arrays are replaced by those defaults and flagged |
| Appointment action | DEFAULT SELECTION | Book an available appointment | Empty | Preselect. Map the two safe old values. `arrange_callback` uses this default and is flagged |
| Same-day / holiday conditions | PLACEHOLDER | Two examples | No placeholder | Add |
| Quote permission | DEFAULT SELECTION | No — Alexander should not quote service prices | Question missing | New field default No |
| Quote-permission helper, pricing-method helper, payment-due helper | HELPER TEXT | Sentences in the doc | Pricing-method helper exists. Payment-due helper does not. Quote question does not exist | Add only those sentences. They are in the change document |
| Service price mode | DEFAULT SELECTION | None specified | n/a | Do not invent a default price mode |
| Service price condition | PLACEHOLDER | “$149 for a standard residential drain clearing…” | Optional textarea, no placeholder | Placeholder, not prefill |
| Unknown price | DEFAULT SELECTION | Explain after evaluation | Empty | Preselect first remaining option |
| Additional-fee “when it applies” | PLACEHOLDER | Examples for four fees | No placeholder | Placeholder |
| Credit “when” | PLACEHOLDER | Credited when the customer approves the repair | Field does not exist | New placeholder |
| Area fee | TEXT FIELD, not currency | Example “$100 travel fee and $250 minimum service charge” | Two money fields | One “Fee or minimum” text field. “Tehachapi” is example area content, not a new control |
| Material statement | PREFILLED EDITABLE VALUE | “Our quoted prices may include parts and materials…” | Empty required textarea | Set `materialMarkupCustomerExplanation` when the user first chooses Yes or Sometimes and the field is empty. Placeholder would disappear when they type and would not be stored |
| Payment assistance | DEFAULT SELECTION | Send a secure payment link | Missing | New default |
| Collect-payment checkboxes | DEFAULT SELECTION | Four of six checked | Missing | Preselect those four |
| Remedy None | DEFAULT SELECTION | None — human approval is required | Each row is an unset radio | Default None |
| Remedy rules | PLACEHOLDER | Five examples | No placeholder; field is stored text | Placeholder only |
| Customer-care rows | DEFAULT SELECTION | Table in Section 5 | Empty | Preselect |
| Customer-care intro | HELPER TEXT | “We've preselected…” | Absent | Add |
| Failure fallback | DEFAULT SELECTION | Collect information and send to the team | Empty | Preselect |
| Connection notice | HELPER TEXT already implemented | `Q111_NOTICE` | Matches | No change |
| AI “why” / commentary outside the doc’s helper lines | Do not add | n/a | Emergency help text currently pushes the removed default | Remove that help text (OCT1-012). Do not strip unrelated section help text |

## 9. Cross-Section Dependencies

| Source | Destination | Dependency | Current Support | Risk |
| --- | --- | --- | --- | --- |
| `section2.plumbingServices` / `diagnosticServices` where `policy === "offered"` only | New service price list | Price rows only for “We offer this” | `getPricingDiscussEligibleServices` also includes `with_conditions` and `ask_team` | Narrow the filter. Do not list conditional or ask-team services |
| `section2` service ids | Price object key | One offered service, one optional pricing object | `servicePricingRules[serviceId]` | Opt-in. Do not require every offered id |
| `section2` zips, cities, conditional territories, distance | Area row “Area” | Reuse saved areas | `geographyChoices` | Keep the selector. “Fee or minimum” is separate text |
| `CALLER_TYPES` | `spendingLimits[].callerTypeId` | Limits use the same caller ids | Dropdown maps `CALLER_TYPES` | Keep ids, including `realtor_buyer_seller` |
| `callerPermissions` | Spending limits | Limits do not store the old permission array | No extra permission logic inside the limit row | Replacing caller authority does not rewrite limit rows |
| Section 4 fee mode, notice, conditions | Section 5 cancellation and no-show amounts | Policy stays in Scheduling. Amounts move | Shared `FeeRecord.amountFixed` | Remove the Scheduling amount requirement. Copy existing amount strings onto the new fee amounts and flag them |
| Section 3+ contacts | Customer-care transfer | Pick an existing contact or add one | `ContactPicker` | Low |
| `visitTypeByServiceId` | Paid-diagnostic explanation | Both deleted | `Section5Form.tsx` 658 | Delete together with never-say and promotions |
| `financialApproverContactId` | none | Question deleted | `Section5Form.tsx` 1074 | Do not retarget it at the new remedy model |
| `connectionOwnerMode === someone_else` | Name, email, phone | Phone becomes optional | Phone is required today | Validation change only |
| Section 2 `not_offered` and excluded areas | Customer-care rows being removed | Those calls stay in Section 2 | Separate questions | Do not delete Section 2 behavior |

## 10. Shared Component Impact

| Component | Used By | Required Change | Risk To Unrelated Fields | Recommended Approach |
| --- | --- | --- | --- | --- |
| `ServicePolicyGroup` | Plumbing, diagnostic, customer matrices only | Per-id placeholder instead of one string | Also used only in Section 2 | Extend the prop. Do not change the four policy states |
| `ServicePolicyChoice` | Customer-supplied and previous-plumber only | Placeholder string on the second question; replace string on the first | None outside those two | Pass `conditionPlaceholder` |
| `EmergencyClassificationSegmented` | Q26 only | Remove one option; labels | Low | Edit this component. Do not build a new matrix system |
| `AfterHoursDispositionMatrix` | Q28 only | Option list and labels | Low | Edit the local option constant |
| `CallerAuthorizationMatrix` | Q43 only | Checkboxes → one radio per row | Low to other sections. High to stored arrays | Change this component and its value type together |
| `TextField` / `TextareaField` | Entire questionnaire | None for placeholders. Money prefix should not be forced inside `TextField` for every caller | Global `type` or validation changes would hit names, emails, notes | Add a small money field used only by Oct 1 amount inputs, or an optional prefix prop that defaults off |
| `FeeCardEditor` | Section 5 fees only, but `FeeRecord` is also written by Section 4 | New checklist. Scheduling no longer edits `amountFixed` | Changing validation without the Section 4 update breaks cancellation policy save | New Section 5 fee UI. Update Section 4 validation in the same change so it no longer requires the amount |
| `ServicePricingCards` | Section 5 only | Replace with opt-in cards limited to `offered` | Low | Local replacement. Do not keep the required-instruction card |
| `FinancialRemedyMatrix` | Section 5 only | Radios → checkboxes, None, placeholders | Low | Edit this component. Delete the approver question that used to follow it |
| `NonServiceCallMatrix` | Section 6 only | Labels, fewer rows, prompt text | Low | Edit catalog + prompt. Keep `ContactPicker` |
| `ContactPicker` | Transfers and other contacts | No behavior change | A new contact API would affect every picker | Reuse as-is |
| `VisitTypeMatrix` | Section 5 visit question | Remove from the form with the rest of that block | None if the component stays unused | Stop rendering it. Do not refactor it |
| `CheckboxGroup` / `RadioGroup` | Many sections | Reuse for new questions | Changing mutual-exclusion globally would break other multi-selects | None-exclusivity only on the remedy checklist and the “we don’t charge additional fees” choice |
| `isPositiveMoney` | New structured money fields and spending limits | Keep the numeric rule. Change the input chrome | Loosening the regex to allow `$` would store symbols | Do not loosen the regex. Do not use it on “Fee or minimum” |

## 11. Existing Answer Preservation

Phillip has submitted a questionnaire. Migration rules below are confirmed. They are not a storage redesign.

| Change | Existing Answers | Compatibility | Migration rule |
| --- | --- | --- | --- |
| OCT1-001 welcome copy | none | SAFE | None |
| OCT1-002, 003, 005, 007, 008, 022, 023, 031, 036, 050 placeholders | Stored condition text | SAFE | Do not write placeholders into `value` |
| OCT1-004, 006 combined fields | Per-row conditions | SAFE | Do not merge rows |
| OCT1-009–011 emergency | explicit class or `recommended_default` | PARTIAL | Keep `emergency`, `urgent`, `routine`, `human_review`. Map `recommended_default` to the row default. Flag that row for QA |
| OCT1-013–015 after-hours | seven enums or empty | PARTIAL | `attempt_contact` → on-call. `confirm_or_book` and `schedule_next_available` → Schedule service. The other four old values use the row default and are flagged. Empty uses the default with no flag |
| OCT1-016 realtor label | id `realtor_buyer_seller` | SAFE | Keep the id |
| OCT1-017–018 caller permissions | permission arrays | INCOMPATIBLE by design | Do not convert arrays. Write the Oct 1 default for that caller and flag for Phillip’s QA |
| OCT1-019 spending limits | caller id + amount | SAFE | Keep ids. Money chrome only |
| OCT1-020–021 booking | three enums or empty | PARTIAL | `confirm_immediately` → Book. `submit_for_approval` → Send to team. `arrange_callback` → Book and flag. Do not touch `hasServiceBookingRules` |
| OCT1-024–025 cancellation amounts | `amountFixed` plus policy fields | PARTIAL | Keep mode, notice, and conditions. Copy the amount string onto the new Pricing fee amount and flag it |
| OCT1-026 pricing models | selected ids | SAFE | Label-only |
| OCT1-027 quote permission | none | SAFE | Default No. Do not infer Yes from old pricing cards |
| OCT1-028–031 service prices | `servicePricingRules` | INCOMPATIBLE | Old cards are deleted. Do not auto-create “Add pricing” rows from them |
| OCT1-032 unknown price | five-value enum | PARTIAL | Keep the two surviving ids. Drop the other three and flag if one of those three was selected |
| OCT1-033–036 fee cards | old `FeeRecord` list | INCOMPATIBLE | New checklist. Do not keep amount-kind, quote authority, or waiver on the new card |
| OCT1-037 area rows | area + two amounts | PARTIAL | Keep area. Concatenate non-empty old amounts into “Fee or minimum” and flag. Do not parse |
| OCT1-038 markup prefill | explanation text | SAFE | Prefill only when the field is empty |
| OCT1-039–044, 051, 058, 059 deletes | visit, never-say, promotions, financing detail, approver, dispatch, capabilities | DROPPED | Confirmed deletes. Do not show the old answers on the new form |
| OCT1-045–046 payments | method and due ids | SAFE | Drop only the payment-due detail text |
| OCT1-047–048 new payment questions | none | SAFE | New defaults |
| OCT1-049 remedies | per-row authority | INCOMPATIBLE | Do not map `never` or `human_approval` onto a checked remedy. If `within_rules` had rule text, that text can remain available for the matching remedy and the row is flagged |
| OCT1-052–055 customer care | disposition + contactId | SAFE for kept rows | Removed rows are unused. Do not overwrite a non-empty disposition with the new default |
| OCT1-057 integration providers | provider ids | SAFE | CRM, scheduling, phone stay |
| OCT1-060 authorization | `not_authorized` | NO MAP | Do not map “No” to either remaining option. Clear it and flag. `self_authorized` relabels to “I can” |
| OCT1-061 failure `callback` | old option | NO MAP | Use collect-and-send and flag. Other failure values stay |
| OCT1-062 money chrome | numeric strings | SAFE | Display change. Regex stays |

Overall: **HIGH RISK** on caller authority, old pricing cards, fee cards, and the confirmed deletes, because those answers are replaced or dropped and must be QA’d. **LOW RISK** on placeholders, labels, and explicit emergency values. The risk is managed by the rules above. It is not an open design question.

## 12. Deletions / Removed Questions

| Current question | Source path | Storage key | Dependency risk | Confidence |
| --- | --- | --- | --- | --- |
| Emergency option “Recommended default” | `EmergencyClassification.tsx` | value `recommended_default` inside `emergencyClassifications` | Normalize treats it as a real classification | CONFIRMED |
| After-hours options other than the three new actions | `AfterHoursDispositionMatrix.tsx` 17–25 | `afterHoursDisposition.*` | Old saved values | CONFIRMED as option removal, not as a mapping |
| Caller permission checkboxes, including “Not allowed” | `CALLER_PERMISSION_OPTIONS` | `callerPermissions` | Spending limits do not store permissions, only caller id | CONFIRMED |
| Appointment option “Arrange a callback so our team can schedule it” | `DEFAULT_BOOKING_OPTIONS` | `defaultBookingMode = arrange_callback` | No other question reads this for branching in the form | CONFIRMED |
| Late-cancellation and no-show dollar inputs in Scheduling | `Section4Form.tsx` 831–885 | `FeeRecord.amountFixed` on the linked fee | Policy, notice, and conditions stay. `validateFeeForMode` must stop requiring the amount | CONFIRMED for the dollar field only |
| Unknown-price options: approved price or range; fee plus separate quote; follow another rule | `UNKNOWN_PRICE_OPTIONS` | `unknownPriceBehavior` | Custom rule textarea goes away with `custom` | CONFIRMED |
| Visit-type matrix | `VisitTypeMatrix.tsx`, `Section5Form.tsx` 631–656 | `visitTypeByServiceId` | Paid-diagnostic child | CONFIRMED |
| Paid-diagnostic explanation | `Section5Form.tsx` 658–710 | `paidDiagnosticExplanation`, `paidDiagnosticFeeId` | Part of the visit block | CONFIRMED |
| Old per-service pricing instruction cards | `ServicePricingCards.tsx` | `servicePricingRules` | Replaced by opt-in `offered`-only prices | CONFIRMED DELETE of the old cards |
| Never-say pricing | `Section5Form.tsx` 723–752 | `forbiddenStatements` | Inside the deleted block | CONFIRMED |
| Promotions, stacking, and old waiver | `Section5Form.tsx` 754–871 | `hasPromotions`, `promotions`, stacking, modification | Inside the deleted block | CONFIRMED |
| Financing detail flow | `Section5Form.tsx` 1010–1046 | `offersFinancing` and children | Financing checkbox on payment methods stays | CONFIRMED |
| Financial approver contact | `Section5Form.tsx` 1074–1116 | `financialApproverContactId` | Superseded by the new remedy model | CONFIRMED |
| Payment-due detail follow-ups | `Section5Form.tsx` 929–1004 | `depositWorkDetail`, `depositRule`, progress fields, invoice fields, `paymentDueOtherRule` | The due multi-select stays | CONFIRMED |
| Dispatch software | `Section8Form.tsx` 130–159 | `dispatchProvider` | Not in the new sequence | CONFIRMED |
| Software capability checklist | `Section8Form.tsx` 243–291 | `authorizedCapabilities` | Not in the new sequence | CONFIRMED |
| Customer-care rows “service you don’t offer” and “outside your service area” | `NON_SERVICE_CALL_TYPE_ROWS` | `nonServiceCallPolicies.service_not_offered`, `.outside_service_area` | Section 2 still covers not-offered and geography | CONFIRMED for this matrix only |
| Integration option “No” / not authorized | `CONNECTION_OWNER_OPTIONS` | `connectionOwnerMode = not_authorized` | Do not map it | CONFIRMED |
| Integration option “Arrange a callback” | `FAILURE_FALLBACK_OPTIONS` | `failureFallback = callback` | Use the new default and flag | CONFIRMED |
| Fee-card amount kinds range, percentage, varies; quote authority; waiver | `FeeCardEditor.tsx` | old `FeeRecord` fields | Not on the new fee card. Scheduling no longer edits the amount | CONFIRMED as removed from the new Pricing fee UI |

## 13. New Questions / Controls

| Control | Where it goes | Behavior the doc specifies |
| --- | --- | --- |
| Per-service placeholder map | `ServicePolicyGroup` | Not a new question. New prop |
| Same-day and holiday placeholders | Existing condition textareas | Not new questions |
| May Alexander quote prices? | Section 5, after pricing method | Yes/No, default No, helper text from the doc |
| Add-pricing list | Section 5, only if quoting is Yes | Optional price record per service whose Section 2 policy is `offered` only |
| Price mode and conditional amounts | Inside an added service | Five modes. Estimate/diagnosis has no dollar field |
| Optional price condition | Inside an added service | Placeholder, optional |
| Additional-fee checklist | Replaces open fee cards | Nine choices including “we don’t charge additional fees” |
| Per-fee amount, when, credited | Under each selected fee | Credited Sometimes opens “when credited” |
| Payment assistance | After payment due | Three options, default secure link |
| What he may collect | After payment assistance | Six checkboxes, four preselected. Shown in sequence, not hidden behind Yes |
| Area “Fee or minimum” | Area-fee repeater | One text field per area. Not a currency input |
| Remedy None and per-remedy rule reveal | Replaces remedy radios | Placeholder per remedy |
| Failure-fallback default | Existing question | Not a new question |

No new section is requested. Voice stays. Welcome copy is not a new section.

## 14. Questions Requiring Confirmation

None. The items that blocked the first pass are decided in **Confirmed decisions**.

Non-blocking notes, already resolved for implementation:

- Combined diagnostic and customer examples are not used. No combined field exists.
- Fee “when it applies” placeholders exist for four categories. The other categories get an empty placeholder.
- Spending-limit title and help text both stay. They already match the two sentences in the change notes.
- Human-review visible label is “Human review required”. Stored id stays `human_review`.
- “What may Alexander help collect payment for?” is its own question in the Oct 1 sequence, not an “If yes” branch.
- “Different jobs follow different rules” is `hasServiceBookingRules`, not a booking-authority value. Leave that question unchanged.

## 15. Recommended Implementation Order

1. Placeholders and welcome copy: OCT1-001, 002, 003, 005, 007, 008, 022, 023. Do not do OCT1-004 or 006 as structural changes.
2. Label and helper edits that keep ids: realtor label, urgent-row label, human-review label, customer-care labels and transfer prompt, payment-due helper, emergency help text.
3. Emergency option removal, per-row defaults, and the `recommended_default` migration.
4. After-hours options, defaults, and the safe / flagged migration.
5. Appointment two-option list, default, and the booking migration. Leave `hasServiceBookingRules` alone.
6. Caller single-select. Replace incompatible arrays with the defaults and flag them. Keep caller ids.
7. Pricing rebuild: quote gate, `offered`-only opt-in prices, unknown-price trim, fee checklist, text “Fee or minimum”, markup prefill, then delete the visit-through-promotions block, financing detail, payment-due detail fields, and the approver question.
8. In the same pricing change, remove Scheduling dollar inputs and stop `validateFeeForMode` from requiring `amountFixed`. Copy existing amounts onto the new cancellation and no-show fee amounts and flag them.
9. Remedy control, customer-care defaults and row removal, then integration deletes, optional phone, and failure-option trim.
10. Money prefix only on structured currency fields listed in Section 7. Re-check flagged draft rows before treating Phillip’s submitted answers as current.

Do not reorder files, rename ids for style, or rewrite unrelated sections in that sequence.

## 16. Implementation Readiness

**READY FOR SURGICAL IMPLEMENTATION**

Confirmed and no longer blocking:

- Per-row condition fields stay. Combined examples are not built.
- Price list is `offered` only.
- Area “Fee or minimum” is text.
- Scheduling keeps policy, notice, conditions, and exceptions, and loses only dollar amounts.
- The old pricing block through the question before payment methods is deleted, including never-say, promotions, and the old waiver question.
- Financing detail, financial approver, payment-due detail fields, dispatch, and the capability checklist are deleted.
- Saved-value rules exist for emergencies, after-hours, callers, and booking. Unmapped values use the new default and are flagged. Caller checkbox arrays are not converted.

No questionnaire code was modified for this audit.
