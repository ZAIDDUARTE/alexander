# Alexander Frozen Questionnaire — Evidence Bundle

**Extraction type:** Forensic / read-only  
**Freeze commit:** `f6feb475ddb8d3f8d2ff03d3b8af280eee6713f1`  
**Branch:** `questionnaire-oct1`  
**Verified HEAD:** `f6feb475ddb8d3f8d2ff03d3b8af280eee6713f1`  
**CURRENT_FROZEN_QUESTIONNAIRE_SCHEMA_VERSION:** `10` (`SCHEMA_VERSION` in `src/lib/onboarding/types.ts`)  
**Extraction date:** 2026-10-02  

**Application code changed:** NO  
**Database changed:** NO  
**AWS changed:** NO  
**Pushed:** NO  

**Companion artifacts:**

| File | Purpose |
| --- | --- |
| [docs/evidence/questionnaire-v1/raw-minimal.json](./evidence/questionnaire-v1/raw-minimal.json) | Fresh `createDefaultDraft()` |
| [docs/evidence/questionnaire-v1/raw-complete.json](./evidence/questionnaire-v1/raw-complete.json) | `buildSubmittableDraft()` synthetic complete envelope |
| [docs/evidence/questionnaire-v1/raw-conditional-stale.json](./evidence/questionnaire-v1/raw-conditional-stale.json) | Complete draft with inactive parents retaining dormant child values |
| [docs/evidence/questionnaire-v1/normalized-complete.json](./evidence/questionnaire-v1/normalized-complete.json) | `normalizeOnboardingDraft(complete)` |
| [docs/evidence/questionnaire-v1/normalized-conditional-stale.json](./evidence/questionnaire-v1/normalized-conditional-stale.json) | `normalizeOnboardingDraft(stale)` |
| [docs/evidence/questionnaire-v1/catalog-snapshot.json](./evidence/questionnaire-v1/catalog-snapshot.json) | Frozen option catalogs + key defaults dump |

**Fixture generation command:**

```bash
npx tsx -e 'import { createDefaultDraft } from "./src/lib/onboarding/types.ts";
import { buildSubmittableDraft } from "./src/lib/onboarding/submission-test-helpers.ts";
import { normalizeOnboardingDraft } from "./src/lib/onboarding/normalizeOnboarding.ts";
import { mergeWithDefaults } from "./src/lib/onboarding/draft-utils.ts";
/* write raw-minimal, raw-complete, mutate stale, write normalized */'
```

No final Q1…Qn IDs are assigned in this document. Temporary extraction indices use `E-S{section}-{nn}` for top-level `QuestionCard`s and `E-S{section}-{nn}.{sub}` for nested/conditional/matrix cells.

---

## 1. Frozen source verification

```text
git rev-parse HEAD
→ f6feb475ddb8d3f8d2ff03d3b8af280eee6713f1

git branch --show-current
→ questionnaire-oct1

git log -1 --oneline
→ f6feb47 freeze: Alexander Oct 1 questionnaire
```

Working tree at extraction time had only unrelated untracked files (`changes-1oct.md`, transcripts, docx, `docs/data-architecture-audit.md`, `docs/final-design-inputs-checklist.md`). No uncommitted questionnaire application changes.

---

## 2. Source inventory (frozen)

### Section registry

- `src/lib/onboarding/sections.ts` — eight section titles/slugs/order
- `src/lib/onboarding/types.ts` — draft envelope, `SCHEMA_VERSION = 10`, defaults
- `src/lib/onboarding/draft-utils.ts` — merge/hydrate, `hasDraftContent`, stage migrations wiring
- `src/lib/onboarding/migrate.ts` — schemaVersion upgrades
- `src/lib/onboarding/normalizeOnboarding.ts` — full normalizer entry
- `src/lib/onboarding/validateOnboarding.ts` — cross-section submit gate + Q114
- `src/lib/onboarding/submission.ts` / `submissionIntegrity.ts` — submit + fingerprint
- `src/lib/onboarding/OnboardingContext.tsx` — client draft, autosave, hydration
- `src/lib/onboarding/persistence.ts` — localStorage key `alexander_onboarding_draft_v1`
- `src/lib/onboarding/autosave.ts` — server save controller + fingerprint excluding `updatedAt`
- `src/lib/onboarding/server-api.ts` — client→server draft PUT/GET
- Stage migrations: `stage2Migration.ts` … `stage6Migration.ts`

### Per-section UI / logic

| Sec | Form | Review | Catalog / defaults | Validation | Progress | Normalize |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `Section1Form.tsx` | review page embeds form mode | `schedule.ts` | `validation/section1.ts` | `progress/section1.ts` | `normalize/section1.ts` |
| 2 | `Section2Form.tsx` + `ServicePolicy.tsx` | review page | `section2Catalog.ts`, `section2Placeholders.ts` | `validation/section2.ts` | `progress/section2.ts` | `normalize/section2.ts` |
| 3 | `Section3Form.tsx` + `EmergencyClassification.tsx` + `AfterHoursDispositionMatrix.tsx` + `ContactCardEditor.tsx` | review page | `section3Catalog.ts`, `section3Defaults.ts` | `validation/section3.ts` | `progress/section3.ts` | `normalize/section3.ts` |
| 4 | `Section4Form.tsx` + `CallerAuthorizationMatrix.tsx` + `ExceptionAuthorityMatrix.tsx` + `AppointmentWindowEditor.tsx` + `ContactPicker.tsx` | review page | `section4Catalog.ts`, `section4Placeholders.ts`, `section4FeeLinks.ts` | `validation/section4.ts` | `progress/section4.ts` | `normalize/section4.ts` |
| 5 | `Section5Form.tsx` + `PricingCoreFields.tsx` | review page | `section5Catalog.ts`, `section5Pricing.ts`, `pricingServices.ts` | `validation/section5.ts`, `validation/feeRecord.ts` | `progress/section5.ts` | `normalize/section5.ts` |
| 6 | `Section6Form.tsx` + `NonServiceCallMatrix.tsx` | `Section6ReviewSummary.tsx` | `section6Catalog.ts` | `validation/section6.ts` | `progress/section6.ts` | `normalize/section6.ts` |
| 7 | `Section7Form.tsx` + `VoicePreviewCard.tsx` + `PronunciationCardEditor.tsx` | `Section7ReviewSummary.tsx` | `section7Catalog.ts`, `approvedVoiceCatalog.ts`, `voiceSelection.ts` | `validation/section7.ts` | `progress/section7.ts` | `normalize/section7.ts` |
| 8 | `Section8Form.tsx` + `AdditionalSoftwareCardEditor.tsx` | `Section8ReviewSummary.tsx` | `section8Catalog.ts`, `section8FormLogic.ts`, `softwareRegistry.ts` | `validation/section8.ts` | `progress/section8.ts` | `normalize/section8.ts` |

### Final review / submit

- `src/app/onboarding/review/page.tsx`
- `src/components/onboarding/OnboardingGlobalReview.tsx` — Q114 confirmations + Submit
- `src/lib/onboarding/globalReviewSummaries.ts`
- `src/app/api/onboarding/submit/route.ts`
- `src/lib/server/draft-service.ts`, `draft-store.ts`, `session.ts`
- `src/lib/server/persistence/*` — engine, keys, types, memory, submit-ack
- `infra/sql/001_onboarding_storage.sql`, `infra/sql/002_submission_revision_hash.sql`

---

## 3. Exact section inventory

Source: `ONBOARDING_SECTIONS` in `sections.ts`. Form H1 / intro copy may shorten wording; **registry title is authoritative for section naming**.

| Order | Displayed section name (registry) | Slug | Form component | Draft root |
| --- | --- | --- | --- | --- |
| 1 | Your Company | `company` | `Section1Form` | `draft.section1` |
| 2 | Your Services | `services` | `Section2Form` | `draft.section2` |
| 3 | Emergencies | `emergencies` | `Section3Form` | `draft.section3` (+ `draft.contacts`) |
| 4 | Scheduling | `scheduling` | `Section4Form` | `draft.section4` (+ `contacts`, `fees`) |
| 5 | Pricing and Payments | `pricing` | `Section5Form` / `PricingCoreFields` | `draft.section5` (+ `fees`) |
| 6 | Customer Care | `customer-care` | `Section6Form` | `draft.section6` (+ `contacts`) |
| 7 | Voice and Conversation | `voice` | `Section7Form` | `draft.section7` |
| 8 | Integration Systems and Final Setup | `integration` | `Section8Form` | `draft.section8` (+ `systems`) |

Shared envelope roots: `draft.contacts`, `draft.fees`, `draft.systems`, `draft.submission`, `draft.navigation`, `draft.schemaVersion`, `draft.updatedAt`, `draft.currentRoute`.

---

## 4. Exact question inventory (top-level QuestionCards)

**Count of top-level `QuestionCard` titles found in frozen forms: 96**  
(S1:11, S2:9, S3:9, S4:26, S5 form:5 + PricingCore:7 = 12, S6:9, S7:12, S8:8).

Nested fields (Other text, matrix cells, per-fee amount, contact editors, software name cards, schedule grids, etc.) are **additional customer-answerable controls** documented in §§6–8 and in catalogs. They are not given final Q IDs here.

### Section 1 — Your Company (`Section1Form.tsx`)

| Idx | Question text | Lines | Raw path | Type | Req | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| E-S1-01 | What name do your customers know your company by? | ~98 | `section1.customerFacingName` | text | REQ | |
| E-S1-02 | What is your legal business name? | ~109 | `section1.legalName` | text | OPT | |
| E-S1-03 | What is your main business phone number? | ~119 | `section1.mainPhone` | phone E.164 | REQ | |
| E-S1-04 | What is your website? | ~129 | `section1.website` | url | OPT | |
| E-S1-05 | Which of these may Alexander tell customers? | ~140 | `section1.approvedClaims[]` | multi | REQ | Conditional Other → `otherApprovedClaim` |
| E-S1-06 | Are there any license numbers or credential details Alexander may give customers? | ~168 | `section1.licensingDetails` | text | OPT | |
| E-S1-07 | Is there anything Alexander should never claim about your company? | ~181 | `section1.forbiddenClaims` | text | OPT | |
| E-S1-08 | What are your normal office hours? | ~195 | `section1.officeHours` | weekly schedule | REQ | |
| E-S1-09 | When are service appointments normally available? | ~208 | `section1.serviceHours` | weekly schedule | REQ | |
| E-S1-10 | When should Alexander answer your calls? | ~221 | `section1.answeringMode` | single | REQ | Conditional schedule when not 24/7 |
| E-S1-11 | Is there any recurring availability rule Alexander should know? | ~253 | `section1.recurringAvailabilityNotes` | text | OPT | |

### Section 2 — Your Services (`Section2Form.tsx`)

| Idx | Question text | Raw path | Type | Req | Repeatable |
| --- | --- | --- | --- | --- | --- |
| E-S2-01 | Which plumbing services does your company provide? | `section2.plumbingServices[id]` | matrix policy | REQ | 22 catalog ids |
| E-S2-02 | Which of these services does your company provide? | `section2.diagnosticServices[id]` | matrix policy | REQ | 6 catalog ids |
| E-S2-03 | Who does your company serve? | `section2.customerPropertyTypes[id]` | matrix policy | REQ | 9 catalog ids |
| E-S2-04 | Will you install or work with items supplied by the customer? | `section2.customerSuppliedMaterialsPolicy` (+ condition) | single + cond text | REQ | |
| E-S2-05 | Will you repair or finish work another plumber started? | `section2.correctiveWorkPolicy` (+ condition) | single + cond text | REQ | |
| E-S2-06 | How would you like to define your normal service area? | `section2.serviceAreaDefinitionMode` + zip/city/distance fields | single + branches | REQ | |
| E-S2-07 | Are there any areas inside or near your service area that you do not serve? | `section2.excludedAreas` (and related) | multi/token | OPT | |
| E-S2-08 | Are there areas you serve only under certain conditions? | `section2.hasConditionalTerritory` + `conditionalTerritories[]` | yes/no + cards | REQ | generated card ids |
| E-S2-09 | Is your after-hours service area different? | `section2.afterHoursAreaMode` + after-hours geo fields | single + branches | REQ | |

Policy options per service/property row (stored): `offered` / `with_conditions` / `ask_team` / `not_offered`. Labels: “We offer this”, “With conditions”, “Ask our team first”, “We don’t offer this” (`validation/section2.ts`).

### Section 3 — Emergencies (`Section3Form.tsx`)

| Idx | Question text | Raw path | Type | Req |
| --- | --- | --- | --- | --- |
| E-S3-01 | How should Alexander treat each of these situations? | `section3.emergencyClassifications[scenarioId]` | matrix 15×4 | REQ |
| E-S3-02 | Are there any emergencies where Alexander must get human approval before arranging emergency dispatch? | `section3.dispatchApproval[]` (+ other detail) | multi | REQ |
| E-S3-03 | What should Alexander do with calls that come in after hours? | `section3.afterHoursDisposition.{emergency,urgent_contained,routine}` | 3 dropdowns | REQ |
| E-S3-04 | When is after-hours emergency field service available? | `section3.emergencyServiceMode` (+ hours) | single + cond | REQ |
| E-S3-05 | Who should Alexander contact first? | `section3.primaryContactId` → `contacts[]` | contact | REQ |
| E-S3-06 | Is there a backup person Alexander should contact? | `section3.hasBackupContact` + `backupContactId` | yes/no + contact | REQ |
| E-S3-07 | What should Alexander do if nobody on your team answers? | `section3.nobodyRespondsFallback` (+ custom) | single | REQ |
| E-S3-08 | How should Alexander retry an unanswered contact? | `section3.retryPolicy` (+ custom) | single | REQ |
| E-S3-09 | What should Alexander do if an emergency comes in and your schedule is already full? | `section3.capacityMode` (+ notes/approver) | single + branches | REQ |

Classification options (stored → label): `emergency`→Emergency; `urgent`→Urgent, not emergency; `routine`→Routine; `human_review`→Human review required.  
After-hours options: `contact_on_call`, `schedule_service`, `take_message`.

### Section 4 — Scheduling (`Section4Form.tsx`) — 25 top-level QuestionCards

**SECTION 4 RECONCILIATION:**
- Actual top-level question count: **25** (`<QuestionCard>` elements in `Section4Form.tsx`; child components under Section 4 contain 0 QuestionCards)
- Cause: earlier evidence-bundle prose said “26”; that was a factual extraction error
- Correction: count is **25**; table E-S4-01 through E-S4-25 was already correct and complete
- Note: E-S4-21 and E-S4-22 render only when `mayArrangeCallback === "yes"` (conditional QuestionCards within the 25)

| Idx | Question text | Raw path (primary) |
| --- | --- | --- |
| E-S4-01 | What should Alexander do if a caller asks to speak with a person? | `humanRequestPolicy` (+ custom) |
| E-S4-02 | What should Alexander do if a caller doesn’t want to speak with AI? | `aiRefusalPolicy` (+ custom) |
| E-S4-03 | Who can approve these types of exceptions? | `exceptionAuthority[exceptionTypeId]` |
| E-S4-04 | What should Alexander do if the person who must approve an exception isn’t available? | `approverUnavailablePolicy` (+ other) |
| E-S4-05 | What can different types of callers authorize? | `callerPermissions[callerTypeId]` |
| E-S4-06 | Are there spending limits for any of these callers? | `hasSpendingLimits` + `spendingLimits[]` |
| E-S4-07 | Do emergency situations change any of these authorization rules? | `emergencyAuthorizationMode` (+ rules) |
| E-S4-08 | When an eligible customer wants service, what may Alexander normally do? | `defaultBookingMode` |
| E-S4-09 | How far in advance may Alexander schedule appointments? | `bookingHorizon*` fields |
| E-S4-10 | What appointment windows do you offer? | `appointmentWindows[]` |
| E-S4-11 | When an appointment is successfully confirmed, what information may Alexander repeat…? | `confirmationInfo[]` |
| E-S4-12 | Do any types of jobs follow different booking rules? | `hasServiceBookingRules` + `serviceBookingRules[]` |
| E-S4-13 | When may Alexander offer these appointments? | `capacityPolicies.{same_day,holiday}` |
| E-S4-14 | What may Alexander do when a customer wants to reschedule? | `rescheduleAuthority` (+ conditions) |
| E-S4-15 | What may Alexander do when a customer wants to cancel? | `cancellationAuthority` (+ conditions) |
| E-S4-16 | Do you charge a late-cancellation fee? | `lateCancellationFeeMode` (+ linked fee / notice / when) — **no dollar amount in Scheduling** |
| E-S4-17 | Do you charge a no-show fee? | `noShowFeeMode` (+ linked fee / when) — **no dollar amount in Scheduling** |
| E-S4-18 | Are there exceptions to your cancellation or no-show rules? | `cancellationNoShowExceptions` OPT |
| E-S4-19 | What should Alexander do if … no appropriate appointments available? | `noAvailabilityFallbackOrder[]` |
| E-S4-20 | May Alexander arrange a callback when no appointment is available? | `mayArrangeCallback` |
| E-S4-21 | What phone number should Alexander use for the callback? | `callbackNumberPolicy` (cond) |
| E-S4-22 | Who should receive or handle scheduling callbacks? | `callbackOwnerContactId` (cond) |
| E-S4-23 | Are there any jobs that require a particular technician? | technician requirement fields |
| E-S4-24 | What should Alexander do if a customer asks for a specific technician? | `specificTechnicianPolicy` |
| E-S4-25 | What should Alexander do when a customer has several plumbing issues? | `multiIssuePolicy` |

Exact option lists: `validation/section4.ts` exports (`HUMAN_REQUEST_OPTIONS`, `DEFAULT_BOOKING_OPTIONS`, `CALLER_AUTHORITY_OPTIONS` in `stage3Migration.ts`, etc.) and `catalog-snapshot.json`.

### Section 5 — Pricing and Payments

**PricingCoreFields.tsx**

| Idx | Question text | Raw path |
| --- | --- | --- |
| E-S5-01 | How does your company normally determine what a customer pays? | `pricingModels[]` (+ other) |
| E-S5-02 | May Alexander quote prices for your services? | `mayQuoteServicePrices` |
| E-S5-03 | What service prices may Alexander quote? | `servicePrices[]` (OPT when Yes) |
| E-S5-04 | What should Alexander do when he doesn't have an approved price? | `unknownPriceBehavior` |
| E-S5-05 | Which additional fees does your company charge? | `additionalFeeSelection[]` + `additionalFeeDetails[category]` |
| E-S5-06 | Do any areas have different travel fees or minimum charges? | `hasAreaTravelOrMinimum` + `areaPricingRows[]` |
| E-S5-07 | Does your company mark up parts or materials? | `materialMarkupPolicy` (+ explanation) |

**Section5Form.tsx (payments / remedies)**

| Idx | Question text | Raw path |
| --- | --- | --- |
| E-S5-08 | What payment methods do you accept? | `paymentMethods[]` (+ other) |
| E-S5-09 | When is payment normally due? | `paymentDuePolicies[]` — **no AI helper text under this card** |
| E-S5-10 | Can Alexander help customers make a payment? | `paymentAssistance` |
| E-S5-11 | What may Alexander help collect payment for? | `paymentCollectionScope[]` (+ other) |
| E-S5-12 | What financial remedies may Alexander approve without human approval? | `financialRemedies[]` + `remedyRules[remedyId]` |

### Section 6 — Customer Care

| Idx | Question text | Raw path |
| --- | --- | --- |
| E-S6-01 | …problem with work your company already performed? | previous-work fields |
| E-S6-02 | …already called back about the same problem? | callback/escalation fields |
| E-S6-03 | When should Alexander involve someone … unhappy? | escalation triggers |
| E-S6-04 | What should Alexander never promise an unhappy customer? | forbidden promises |
| E-S6-05 | How should Alexander handle other types of calls? | `nonServiceCallPolicies[]` (8 rows) |
| E-S6-06 | What customer information may Alexander use…? | customer history policy |
| E-S6-07 | Are there customer records … never disclose? | privacy restrictions |
| E-S6-08 | How proactive … additional services? | additional service policy |
| E-S6-09 | Are there any other rules … unusual calls? | unusual call notes OPT |

### Section 7 — Voice and Conversation (`Section7Form.tsx`) — 12 top-level QuestionCards

Exact extraction from frozen source (schemaVersion 10). Storage under `section7.*`. Unchanged in Oct 1 freeze per Phillip (still part of the frozen questionnaire).

| Idx | Exact question | Input | Required | Choices / structure | Condition | Raw path |
| --- | --- | --- | --- | --- | --- | --- |
| E-S7-01 | Which language or languages should Alexander support with callers? | Multi-select / checkboxes | Required | English (`english`); Spanish (`spanish`); Other supported language (`other`); English only (`english_only`). English only clears other language selections. | Always | `englishOnly` + `callerLanguages[]` |
| E-S7-01a | Other supported language | Short text | Required when displayed | free text | `callerLanguages` includes `other` AND not `englishOnly` | `otherSupportedLanguage` |
| E-S7-02 | Which voice should Alexander use? | Single select (radio + VoicePreviewCard) | Required | Voice A — Warm, calm, professional (`voice_a`); Voice B — Friendly, energetic, approachable (`voice_b`); Voice C — Direct, steady, highly efficient (`voice_c`); Another approved voice (`another_approved`, disabled while `ADDITIONAL_APPROVED_VOICES` empty) | Always | `voiceSelection` (+ `anotherApprovedVoiceId`) |
| E-S7-02a | Another approved voice selection | Single select | Required when displayed | from `ADDITIONAL_APPROVED_VOICES` (currently empty) | `voiceSelection = another_approved` AND additional catalog non-empty | `anotherApprovedVoiceId` |
| E-S7-03 | How should Alexander’s communication style feel? | Single select | Required | Warm and professional (`warm_professional`); Friendly and relaxed (`friendly_relaxed`); Direct and efficient (`direct_efficient`); Calm and reassuring (`calm_reassuring`) | Always | `communicationStyle` |
| E-S7-04 | What name should Alexander use when introducing himself? | Single select | Required | Alexander (`alexander`); A company-specific name (`company_specific`); Another approved name (`another_approved`) | Always | `spokenNameMode` |
| E-S7-04a | Spoken receptionist name | Short text | Required when displayed | free text | `spokenNameMode` = `company_specific` OR `another_approved` | `spokenDisplayName` |
| E-S7-05 | How should Alexander identify himself as an AI? | Single select | Required | Say he is the company’s AI receptionist in the opening (`opening_ai_receptionist`); Say he is an AI receptionist only if the caller asks (`only_if_asked`); Use another approved disclosure (`custom`) | Always | `aiDisclosureStyle` |
| E-S7-05a | Approved disclosure wording | Long/open text | Optional when displayed (no required validation in frozen `validateSection7`) | free text | `aiDisclosureStyle = custom` | `aiDisclosureCustom` |
| E-S7-06 | Are there any company, people, city, neighborhood, or brand names that Alexander must pronounce correctly? | Single select | Required | None (`none`); Yes — enter the pronunciation details below (`yes`) | Always | `pronunciationMode` |
| E-S7-06a | Pronunciation entries | Repeatable structured rows | Required when displayed (≥1 complete entry) | Fields per entry: term, pronunciation, optional audioSampleReference; generated entry `id` | `pronunciationMode = yes` | `pronunciationEntries[]` |
| E-S7-07 | If a caller speaks a supported second language, what should Alexander normally do? | Single select | Required | Continue in the caller’s language (`continue_caller_language`); Ask whether the caller prefers English or the supported second language (`ask_preference`); Continue in English and offer a human who speaks the other language (`english_offer_human`); Follow another rule (`custom`) | Always | `languageSwitchingPolicy` |
| E-S7-07a | Language-switching rule | Long/open text | Optional when displayed (no required validation in frozen `validateSection7`) | free text | `languageSwitchingPolicy = custom` | `languageSwitchingCustomRule` |
| E-S7-08 | Do you have a preference for the perceived voice presentation? | Single select | Optional | No preference (`no_preference`); Masculine-presenting (`masculine_presenting`); Feminine-presenting (`feminine_presenting`); Neutral or androgynous (`neutral_androgynous`) | Always | `perceivedVoicePreference` |
| E-S7-09 | Do you have a preferred accent or regional character? | Single select | Optional | Neutral American (`neutral_american`, available); Regional American, if available (`regional_american`, catalogAvailable=false); Spanish-influenced English, if available (`spanish_influenced_english`, catalogAvailable=false); Other approved option (`other_approved`, catalogAvailable=false); No preference (`no_preference`, available). Unavailable options are disabled. | Always | `accentPreference` |
| E-S7-09a | Other approved accent | Short text | Required when displayed | free text | `accentPreference = other_approved` | `accentOtherApproved` |
| E-S7-10 | How formal should Alexander sound? | Single select | Optional | Conversational and natural (`conversational`); Balanced professional (`balanced_professional`); More formal and traditional (`formal_traditional`) | Always | `formalityPreference` |
| E-S7-11 | Are there any phrases Alexander should use or avoid because of your company’s brand? | Long/open text | Optional | free text | Always | `brandPhrasesAndAvoidances` |
| E-S7-12 | Is there anything else about Alexander’s voice or identity that we should review with you? | Long/open text | Optional | free text | Always | `additionalReviewNotes` |

Supporting files: `VoicePreviewCard.tsx`, `PronunciationCardEditor.tsx`, `section7Catalog.ts`, `approvedVoiceCatalog.ts`, `voiceSelection.ts`, `validation/section7.ts`, `progress/section7.ts`, `normalize/section7.ts`, `Section7ReviewSummary.tsx`.

### Section 8 — Integration Systems and Final Setup

| Idx | Question text | Raw path |
| --- | --- | --- |
| E-S8-01 | What system does your team primarily use for customer records and service jobs? | `crmFsmProvider` (+ `crmFsmCustomName`) |
| E-S8-02 | Where does your team look to see when customers can be scheduled? | `schedulingProvider` (+ custom) |
| E-S8-03 | What phone system do you currently use? | `phoneProvider` (+ custom) |
| E-S8-04 | Do you use any other software Alexander may need to work with? | `additionalSoftwareCategories[]` + `additionalSoftwareCards[]` |
| E-S8-05 | Who can authorize Alexander to connect to these systems? | `connectionOwnerMode` (+ contact fields) |
| E-S8-06 | Software connection notice | `connectionNoticeAcknowledged` (“I understand”) |
| E-S8-07 | If Alexander can’t access a system or complete an action… | `failureFallback` (+ custom rule) |
| E-S8-08 | Is there anything important about your company that we haven’t asked? | `finalOperatingNotes` OPT |

**Absent from current UI (legacy only):** standalone dispatch question; software capability checklist.

---

## 5. Final confirmation controls

Source: `Q114_CONFIRMATIONS` in `section8Catalog.ts`; rendered in `OnboardingGlobalReview.tsx` on `/onboarding/review`.

| Key | Exact wording | Storage |
| --- | --- | --- |
| `answersAccurate` | I confirm that these answers accurately describe how I want Alexander to represent and operate for my company. | `draft.submission.confirmations.answersAccurate` |
| `capabilitiesDependOnIntegrations` | I understand that some capabilities depend on the software and integrations my company uses. | `draft.submission.confirmations.capabilitiesDependOnIntegrations` |
| `actionsRequireSupportAuthorizationConfirmation` | I understand that Alexander will only perform actions that are supported, authorized, and successfully confirmed. | `draft.submission.confirmations.actionsRequireSupportAuthorizationConfirmation` |

- Validation: all three must be true (`validateOnboarding.q114ConfirmationsComplete` / `canSubmitQuestionnaire`).
- Structural placement: stored on **`draft.submission`**, not `draft.section8`. Catalog lives next to Section 8 constants for historical “Q114” naming only.
- **NEEDS SPEC DECISION:** whether Final Questionnaire Specification treats these as Section 8 questions, a separate Submission section, or non-numbered gate controls.

---

## 6. Conditional tree (representative; code-traced)

Pattern across sections: **raw draft may retain inactive child values; validation/progress ignore inactive branches; normalization nulls or omits them.**

| Parent | Condition | Child | Required when active? | Inactive child fate |
| --- | --- | --- | --- | --- |
| `approvedClaims` includes other | Other checked | `otherApprovedClaim` | yes | ignored in validation/normalize when Other off |
| `answeringMode` ≠ `24_7` | mode | answering schedule fields | yes when applicable | normalize nulls inactive schedule |
| service/property `policy` | `with_conditions` | `.condition` | yes | normalize → `condition: null` when not `with_conditions` (verified in stale fixture) |
| `customerSuppliedMaterialsPolicy` / `correctiveWorkPolicy` | `with_conditions` | condition strings | yes | same |
| `serviceAreaDefinitionMode` | zip/cities/distance | corresponding geo fields | yes for active mode | only active branch normalized |
| `hasConditionalTerritory` | yes | `conditionalTerritories[]` | yes | incomplete/inactive omitted |
| `afterHoursAreaMode` | not `same` | after-hours geo | yes | only active branch |
| `hasBackupContact` | yes | `backupContactId` | yes | normalize nulls when no |
| `nobodyRespondsFallback` / `retryPolicy` / `capacityMode` | custom / reserved / override / approval | custom text / notes / approver | yes when that branch | inactive custom text nulled |
| `hasSpendingLimits` | yes | `spendingLimits[]` | yes | UNKNOWN — NEEDS CONFIRMATION whether rows remain in normalize when no |
| `mayQuoteServicePrices` | `allowed` | `servicePrices[]` | optional add-per-service | quoting off: prices not required; normalize omits quote list when not allowed |
| fee category selected | not `none` | amount / applicability / credit | yes | unselected categories not required |
| fee `credit` | `sometimes` | `creditWhen` | yes | |
| `hasAreaTravelOrMinimum` | yes | `areaPricingRows[]` | yes | normalize drops area rows when no (stale fixture: markup explanation → null) |
| `materialMarkupPolicy` | yes/sometimes | `materialMarkupCustomerExplanation` | yes | normalize `customerExplanation: null` when `no` |
| `paymentMethods` / collection includes other | Other | other text | yes | |
| `financialRemedies` | not none + selected | `remedyRules[id]` | yes per selected | |
| non-service `disposition` | `send_specific` | `contactId` | yes | contact id may remain on draft when disposition changes; normalize only emits for Transfer |
| `connectionOwnerMode` | `someone_else` | name/email/(optional phone) | name+email | contact fields may remain when mode is self; review shows only for someone_else |
| `failureFallback` | `custom` | `failureFallbackCustom` | yes | custom text ignored when not custom |
| CRM/scheduling/phone | `custom` | `*CustomName` | yes | |
| additional software category | selected (not none) | card `systemName` | yes | cards may linger when category cleared — toggle logic clears none exclusivity |

**Stale-answer evidence:** `raw-conditional-stale.json` keeps dormant strings; `normalized-conditional-stale.json` shows plumbing `condition: null` under `offered`, markup explanation null under policy `no`.

---

## 7. Repeatable / matrix shapes

| Structure | Item key source | Stable? | Generator |
| --- | --- | --- | --- |
| Plumbing services | `section2Catalog.PLUMBING_SERVICES[].id` | catalog-stable | n/a |
| Diagnostic services | `DIAGNOSTIC_SERVICES[].id` | catalog-stable | n/a |
| Customer/property types | `CUSTOMER_PROPERTY_TYPES[].id` | catalog-stable | n/a |
| Emergency scenarios | `EMERGENCY_SCENARIOS[].id` (15) | catalog-stable | n/a |
| After-hours rows | fixed keys `emergency`, `urgent_contained`, `routine` | fixed | n/a |
| Exception authority rows | `EXCEPTION_TYPES[].id` | catalog-stable | n/a |
| Caller authorization | `CALLER_TYPES[].id` (7) | catalog-stable | n/a |
| Spending limit rows | `spendingLimits[].id` | generated | `UNKNOWN — NEEDS CONFIRMATION` exact prefix (row objects use string ids) |
| Appointment windows | template ids (`morning`, …) | catalog-stable shells | times user-entered |
| Service booking rules | rule row ids | generated | |
| Capacity policies | `same_day`, `holiday` | fixed | n/a |
| Service prices | `serviceId` = Section 2 offered service id | catalog-stable service id | |
| Additional fee details | category id from `ADDITIONAL_FEE_OPTIONS` | catalog-stable | amounts on Section 5 / fee records |
| Area pricing rows | `areaPricingRows[].id` | generated | |
| Financial remedy rules | remedy id keys | catalog-stable | |
| Non-service call routing | `callTypeId` from 8 rows | catalog-stable | `contactId` → `contacts[].id` |
| Contacts | `contacts[].id` | generated | `contact-${random}${Date.now base36}` (`createContactId`) |
| Fees | `fees[].id` | generated | `fee-${random}${Date.now base36}` |
| Software systems | `systems[].id` | generated via `softwareRegistry` upsert | |
| Additional software cards | `categoryId` | category-stable | one card per selected category |
| Pronunciation entries (S7) | entry ids | generated | |

Cross-references: Section 3/4/6 contact pickers → `contacts[]`; Section 4 late-cancel/no-show → `fees[]` linked by feeKey; Section 5 cancellation/no-show amounts live on Pricing fee details; Section 8 software ids → `systems[]`.

---

## 8. Option-ID inventory

Full frozen dumps: **[catalog-snapshot.json](./evidence/questionnaire-v1/catalog-snapshot.json)**.

Critical current option sets (label ← stored id):

**Caller authority:** Schedule only ← `schedule_only`; Schedule + diagnostic fee ← `schedule_diagnostic`; Full authorization ← `full_authorization`; Human approval required ← `human_approval_required`.

**Defaults (`CALLER_AUTHORITY_DEFAULTS`):** homeowner/landlord/spouse/remote → `full_authorization`; tenant/realtor → `schedule_only`; other_third_party → `human_approval_required`.

**Booking:** Book an available appointment ← `book_appointment` (default); Send the request to our team ← `send_to_team`.

**Quote permission:** Yes… ← `allowed`; No… ← `not_allowed` (default).

**Unknown price:** technician_after_evaluation (default); team_provides_pricing.

**Payment assistance default:** `secure_link`.  
**Payment collection default:** booking_or_service_fees, deposits, completed_invoices, outstanding_balances.  
**Financial remedies default:** `["none"]`.  
**Area travel default:** `hasAreaTravelOrMinimum = "no"`.  
**Failure fallback default:** `collect_and_send`.  
**Connection owner options:** `self_authorized` (“I can”), `someone_else`.

CRM / scheduling / phone / additional software / non-service dispositions: see catalog snapshot.

---

## 9–10. Fixtures

| Fixture | How produced |
| --- | --- |
| raw-minimal.json | `createDefaultDraft()` |
| raw-complete.json | `buildSubmittableDraft()` (synthetic Acme Plumbing, etc.) |
| raw-conditional-stale.json | clone complete → set inactive parents while leaving child strings → `mergeWithDefaults` |
| normalized-complete.json | `normalizeOnboardingDraft(complete)` |
| normalized-conditional-stale.json | `normalizeOnboardingDraft(stale)` |

Normalized top-level keys: `schema_version`, `company`, `services`, `emergencies`, `scheduling`, `pricing`, `customer_care`, `voice_profile`, `integration_profile`, `submission`.

---

## 11. Current save / submit path (frozen)

### Session creation

| Step | File / function | Effect |
| --- | --- | --- |
| Cookie UUID | `src/lib/server/session.ts` → `getOrCreateOnboardingSessionId` | Sets httpOnly cookie `alexander_onboarding_session` (UUID v4), 365d |
| No customer entity | — | Session id is only identity |

### Draft autosave

| Step | File / function | Effect |
| --- | --- | --- |
| Local write | `persistence.saveLocalDraft` | `localStorage["alexander_onboarding_draft_v1"]` |
| Dirty detect | `OnboardingContext` + `draftAutosaveFingerprint` | Omits `updatedAt` so timestamp writeback does not re-save |
| Debounced PUT | `autosave.createDraftAutosaveController` → `server-api.putServerDraft` | Server draft upsert |
| Server upsert | `draft-service` / `draft-store` / persistence engine `upsertDraft` | DB `onboarding_sessions.draft_json` (+ route/section/version/`updated_at`) |
| Conflict | stale `updatedAt` → 409; bump `updatedAt` and retry | |

### Submission

| Step | File / function | Effect |
| --- | --- | --- |
| Gate | `canSubmitQuestionnaire` / `prepareSubmission` | All sections valid + Q114 |
| Fingerprint | `questionnaireContentFingerprint` | Stable JSON of sections+contacts+fees+systems (excludes navigation/submission/timestamps) |
| Client submit | `OnboardingGlobalReview` → API submit | |
| Server | `api/onboarding/submit` → `draft-service` submit | |
| Normalize | `normalizeOnboardingDraft` | Builds normalized config |
| S3 order | `persistence/engine.ts` | put `raw-draft.json` → `normalized-config.json` → `manifest.json` (manifest last) |
| DB commit | `commitSubmission` | Insert `onboarding_submissions` unique on `(session_id, content_revision_sha256)`; update session status |
| Idempotency | same content revision | Reuses existing submission; does not rewrite S3 if manifest present |
| Ack rule | `submit-ack.ts` | Acknowledged only after durable store commit |

Hash: SHA-256 of canonical JSON bytes for raw/normalized objects; content revision string is the fingerprint; S3 path uses `sha256Hex(contentRevision)`.

---

## 12. Current database contract

From frozen `infra/sql/001_onboarding_storage.sql` + `002_submission_revision_hash.sql` (confirmed by persistence memory ports / tests):

**Tables:** `schema_migrations`, `onboarding_sessions`, `onboarding_submissions`.

**onboarding_sessions:** PK `id`; UNIQUE `session_id`; CHECK `submission_status IN ('draft','submitted')`; indexes on `updated_at`, `submission_status`; columns include `questionnaire_schema_version`, `draft_json`, `normalized_json`, route/section/completed_sections, submission fields, `version`, timestamps.

**onboarding_submissions:** PK `id`; FK `session_id` → sessions; UNIQUE `(session_id, content_revision_sha256)` after migration 002; stores full `content_revision` text, both JSON payloads, S3 keys, sha256s, `submitted_at`.

No customer table. No DELETE CASCADE in SQL.

---

## 13. Current S3 contract

From `src/lib/server/persistence/keys.ts` + engine manifest:

```text
onboarding/<sessionUuid>/submissions/<sha256(contentRevision)>/
  raw-draft.json
  normalized-config.json
  manifest.json
```

Manifest `formatVersion: 1` fields: `sessionId`, `contentRevision`, `questionnaireSchemaVersion`, `submittedAt`, `rawKey`, `normalizedKey`, `rawSha256`, `normalizedSha256`.

**Encryption / versioning / object lock:** not configured in application TypeScript. Live AWS facts (KMS, versioning) are documented in the Sep 28 audit (`docs/data-architecture-audit.md`) for production account — **treat as infrastructure evidence, not as code-enforced contract**. Repo: `UNKNOWN — NEEDS CONFIRMATION` for encryption defaults applied by Lambda/S3 SDK outside this tree.

---

## 14. Questionnaire schema version

**CURRENT_FROZEN_QUESTIONNAIRE_SCHEMA_VERSION: 10**

Matches Sep 28 audit’s questionnaire schemaVersion 10. Database migrations remain `001`/`002` (separate from questionnaire schema).

---

## 15. Default provenance

**DEFAULT_PROVENANCE: NOT AVAILABLE**

The frozen app stores only the current field values. There is no per-field flag distinguishing:

- default never touched,
- explicit selection equal to default,
- change-away-and-back to default.

`hasDraftContent` treats some defaults as non-content for dirty detection, but that is not persisted provenance.

---

## 16. Extraction QA / contradictions

| Observation | Status |
| --- | --- |
| Section titles in `sections.ts` vs form H1 (“Your Company”, “Pricing and Payments”, …) | Aligned for naming; use registry |
| Q114 catalog in `section8Catalog` but storage on `submission` | Documented; NEEDS SPEC DECISION for numbering shelf |
| Dispatch / capabilities removed from UI but fields remain on type for migration | Current model clears via `stage6Migration`; normalize forces `dispatch_system: null`, empty capabilities |
| Sep 28 audit schemaVersion 10 vs freeze | **No difference** on questionnaire version |
| Sep 28 audit DB/S3 shape vs freeze SQL/keys | **No material difference** found in frozen SQL/keys/engine |
| Progress unit ids (q104…) vs displayed questions | Historical numbering in progress code ≠ customer-facing Q IDs |
| Matrix cells vs QuestionCard count | 96 cards ≠ total atomic inputs; registry must expand repeats |
| Interactive browser QA earlier marked Stage 6 “not available” in log, later desktop QA PASS | Log historical; freeze section records final QA PASS |

---

## 17. Ambiguities

1. **Final confirmations shelf** — Section 8 vs submission object for Final Spec (NEEDS SPEC DECISION).
2. **Spending-limit / area-row / software-card dormant retention** when parent toggled off — raw may keep rows; exact normalize omission per field: partially verified; remaining edges UNKNOWN — NEEDS CONFIRMATION with targeted unit reads.
3. **S3 encryption / versioning** — not in app code; rely on infra/audit.
4. **Customer identity** — none in freeze (session cookie only); product decision still open (checklist item 11).
5. **Exact count of atomic customer-answerable controls including every matrix cell and nested money field** — requires Final Spec numbering pass; this bundle inventories cards + shapes, not a frozen Qn count.

---

## Summary counts (extraction)

| Metric | Value |
| --- | --- |
| Sections | 8 |
| Top-level QuestionCards | 96 |
| Final confirmation checkboxes | 3 (on `submission`) |
| Emergency scenario rows | 15 |
| Caller types | 7 |
| Non-service care rows | 8 |
| Plumbing / diagnostic / property catalog rows | 22 / 6 / 9 |
| Conditional families | see §6 (dozens of parent→child links) |
| Repeatable/matrix structures | ≥16 families (§7) |
