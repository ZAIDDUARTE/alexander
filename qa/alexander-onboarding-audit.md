# Alexander Onboarding QA Audit

## 1. Executive Summary

| | |
| --- | --- |
| Audit date | 2026-09-26, 09:12–09:25 PKT (UTC+5) |
| Specification | `Alexander_Onboarding_Final_Implementation_Specification(1).docx` (Draft 2, “Final Implementation Specification”) |
| Branch | `main` |
| Commit | `848a712` (`feat: complete Alexander onboarding Section 8 and submission flow`) |
| Tree audited | Working tree as running on `next dev` at `http://localhost:3000`. Uncommitted onboarding changes were already present and were included. |
| Sections expected | 8 |
| Sections found | 8, in the approved order |
| Active top-level questions expected | 114 |
| Implemented top-level questions found | 114, plus extra customer-facing questions that are not in the specification |
| Total defects | 46 |
| BLOCKER | 0 |
| CRITICAL | 0 |
| HIGH | 22 |
| MEDIUM | 20 |
| LOW | 4 |
| Overall | **FAIL** |

The eight-section shell, required-asterisk pattern on Sections 1–7, per-entity service conditions, fee-card shell, and same-browser save all exist. The questionnaire still does not match the approved document. The highest-risk gaps are wrong or renamed policy options (emergency full-schedule behavior, warranty/callback authority, service and customer matrices), a missing structured after-hours geography path, an extra required pricing question, a financing action matrix the specification forbids, Section 8 required questions with no asterisk and one required question marked optional, voice previews with no audio, and a custom integration-fallback rule that is not validated.

No questionnaire source was modified during this audit. Reports and screenshots under `qa/` were added.

### Document census (from the DOCX only)

| Measure | Count |
| --- | ---: |
| Active sections | 8 |
| Active top-level questions | 114 (header figure matches a full count of Q1–Q140 active IDs) |
| Always-shown required questions | 84 |
| Always-shown optional questions | 14 |
| Conditional top-level questions | 16 |
| Repeatable components called out in the spec | 8 |
| Legacy IDs in Appendix A | 26 (7 merged, 19 deleted) |

Section names, in order: Your Company; Your Services; Emergencies; Scheduling; Pricing and Payments; Customer Care; Voice and Conversation; Integration Systems and Final Setup.

Always-shown optional questions: Q2, Q4, Q7, Q8, Q13, Q24, Q60, Q116, Q126, Q136, Q137, Q138, Q139, Q140.

Conditional top-level questions: Q6, Q12, Q23, Q26, Q28, Q33, Q39, Q40, Q41, Q63, Q64, Q70, Q78, Q84, Q85, Q91.

Repeatable units: Q26 area rows, Q47 caller spending limits, Q53 service booking rules, Q65 technician mappings, Q74 fee cards, Q83 offers, Q91 additional approver, Q134 pronunciation entries.

Deleted or merged IDs that must not appear as their own customer questions: Q15, Q17, Q19, Q55, Q67, Q69, Q77, Q80, Q81, Q90, Q92–Q96, Q98–Q100, Q104–Q108, Q110, Q111–Q112. Memberships, the warranty module, referrals, and the old communication-consent block are not customer-facing sections. That part of the reduction was honored.

## 2. Coverage Matrix

Counts are active top-level questions. “Exact match” means the rendered question, help, options, type, required state, defaults, and branches matched the DOCX. Screens are audited in Section 3 and are not included in these counts.

| Section | Spec Items | Implemented | Exact Match | Defects | Status |
| ------- | ---------: | ----------: | ----------: | ------: | ------ |
| 1 Your Company | 13 | 13 | 5 | 8 | FAIL |
| 2 Your Services | 12 | 12 | 3 | 9 | FAIL |
| 3 Emergencies | 13 | 13 | 1 | 12 | FAIL |
| 4 Scheduling | 26 | 26 | 5 | 21 | FAIL |
| 5 Pricing and Payments | 17 | 17 | 3 | 14 | FAIL |
| 6 Customer Care | 9 | 9 | 3 | 6 | FAIL |
| 7 Voice and Conversation | 12 | 12 | 1 | 11 | FAIL |
| 8 Integration Systems and Final Setup | 12 | 12 | 1 | 11 | FAIL |
| **Total** | **114** | **114** | **22** | | **FAIL** |

Extra customer-facing units with no active spec question: general pricing-authority question in Section 5; financing permission checklist and eligibility statement; per-software “what should Alexander be able to access?” field in Section 8.

## 3. Section-by-Section Audit

Status key: PASS, FAIL, NOT IMPLEMENTED, EXTRA/OBSOLETE, SPEC UNCLEAR.

### Welcome and global chrome

| Screen | Status | Notes |
| --- | --- | --- |
| Welcome heading “Welcome to Alexander” | PASS | |
| Welcome body | FAIL | Extra word “voice”; em dash rendered as a spaced hyphen. QA-001 |
| Required vs optional explanation | PASS | |
| Save-progress sentence | PASS | Same sentence as the DOCX |
| “8 sections” / progress “0 of 8 sections complete” | PASS | Rendered as “0 of 8 sections complete” on a fresh draft |
| CTA “Begin Section 1 →” | PASS | |
| Eight-section order and titles | PASS | `src/lib/onboarding/sections.ts` |
| Progress survives refresh | PASS | Company name survived reload via `localStorage` key `alexander_onboarding_draft_v1` |
| Save indicator when Redis is absent | FAIL | UI says “Saved just now” after a local-only write. QA-040 |
| Horizontal page scroll at 1440, 1280, 768, and 390 | PASS | No document-level overflow on Sections 2–5. Mobile service choices wrap inside a 2×2 grid. Screenshot: `qa/screenshots/s2-form-390.png` |

### Section 1 — Your Company

Intro copy, time “5–10 minutes”, and “Begin Your Company →” match. Completion screen does not. QA-002, QA-003.

| ID | Question | Status |
| --- | --- | --- |
| Q1 | What name do your customers know your company by? | PASS |
| Q2 | What is your legal business name? | FAIL |
| Q3 | What is your main business phone number? | PASS |
| Q4 | What is your website? | PASS |
| Q5 | Which of these may Alexander tell customers? | FAIL |
| Q6 | What other credential or trust claim may Alexander tell customers? | FAIL |
| Q7 | License numbers or credential details | FAIL |
| Q8 | Anything Alexander should never claim | FAIL |
| Q9 | What are your normal office hours? | PASS |
| Q10 | When are service appointments normally available? | FAIL |
| Q11 | When should Alexander answer your calls? | PASS |
| Q12 | What hours should Alexander answer? | FAIL |
| Q13 | Recurring availability rule | FAIL |
| — | Section 1 complete screen | FAIL |

Q9 default is Monday–Friday 8:00 AM–5:00 PM, Saturday and Sunday closed. Q10 default is Monday–Saturday 8:00 AM–6:00 PM, Sunday “No service”. Closed and 24-hour service hide the time controls. Those two schedules do not overwrite each other. Q11 options match. Q6 appears only when Other is selected (`qa/screenshots/s1-q6-other.png`) and is required while visible.

### Section 2 — Your Services

Intro copy, time, and “Begin Your Services →” match.

| ID | Question | Status |
| --- | --- | --- |
| Q14 | Plumbing service matrix | FAIL |
| Q16 | Diagnostic / drain / inspection matrix | FAIL |
| Q18 | Who does your company serve? | FAIL |
| Q20 | Customer-supplied items | FAIL |
| Q21 | Another plumber’s work | PASS |
| Q22 | How the service area is defined | PASS |
| Q23 | ZIP / city / radius path | FAIL |
| Q24 | Areas always declined | PASS |
| Q25 | Conditional service areas | FAIL |
| Q26 | Those conditional areas | FAIL |
| Q27 | After-hours service area | FAIL |
| Q28 | After-hours geography | FAIL |
| — | Section 2 complete screen | FAIL |

“Not sure” is absent. “Ask our team first” does not open a condition field. Two different services kept two different condition strings in the browser (`qa/screenshots/s2-conditions-two-services.png`). Normalized output nulls a condition unless the policy is `with_conditions`. The raw draft still keeps the old text. QA-041.

### Section 3 — Emergencies

Intro body matches except the em dash around “has—and has not” is a spaced hyphen. QA-043. Button “Begin Emergency Setup →” matches. Recommended default is preselected on every Q29 row.

| ID | Question | Status |
| --- | --- | --- |
| Q29 | Situation classification | FAIL |
| Q30 | Human approval before emergency dispatch | FAIL |
| Q31 | After-hours call handling | FAIL |
| Q32 | After-hours emergency field service | FAIL |
| Q33 | After-hours emergency schedule | FAIL |
| Q34 | First escalation contact | FAIL |
| Q35 | Backup contact | FAIL |
| Q36 | Nobody answers | FAIL |
| Q37 | Retry rule | FAIL |
| Q38 | Schedule already full | FAIL |
| Q39 | Reserved emergency capacity | FAIL |
| Q40 | When an override is allowed | FAIL |
| Q41 | Who approves an emergency scheduling exception | PASS |
| — | Section 3 complete screen | FAIL |

Q31 is three dropdowns, not a horizontal radio matrix. Options match the approved action list. Q32 does not reuse the office-hours schedule. Answering 24/7 and technician dispatch 24/7 are separate fields.

### Section 4 — Scheduling

Intro is rewritten. QA-048. Button “Begin Scheduling →” matches.

| ID | Question | Status |
| --- | --- | --- |
| Q42 | Caller asks for a person | FAIL |
| Q43 | Caller refuses AI | FAIL |
| Q44 | Exception authority | FAIL |
| Q45 | Approver unavailable | FAIL |
| Q46 | Caller authorization matrix | FAIL |
| Q47 | Spending limits | PASS |
| Q48 | Emergency authorization | FAIL |
| Q49 | Normal booking authority | FAIL |
| Q50 | Booking horizon | FAIL |
| Q51 | Appointment windows | SPEC UNCLEAR / FAIL |
| Q52 | Confirmation information | FAIL |
| Q53 | Service-specific booking rules | PASS |
| Q54 | Same-day and holiday | FAIL |
| Q56 | Reschedule | FAIL |
| Q57 | Cancel | FAIL |
| Q58 | Late-cancellation fee | FAIL |
| Q59 | No-show fee | FAIL |
| Q60 | Exceptions to cancellation / no-show | PASS |
| Q61 | No availability ranking | FAIL |
| Q62 | Callback when no appointment | PASS |
| Q63 | Callback number | PASS |
| Q64 | Who handles scheduling callbacks | PASS |
| Q65 | Particular technician | PASS |
| Q66 | Specific technician request | FAIL |
| Q68 | Several plumbing issues | FAIL |
| Q70 | Issues that need their own appointment | PASS |
| — | Section 4 complete screen | FAIL |

Q47, Q53, Q65, and Q70 attach rules to a caller type or a Section 2 service id. Q63 defaults to “The number the customer is calling from” when Q62 becomes Yes. Q50 clears the day count when “No maximum” is checked, but it hides the number field instead of leaving it disabled. QA-042. Removed options “Not sure yet”, “Try the next authorized person”, “Different jobs follow different rules”, weekend/after-hours rows, and “Alexander should not reschedule/cancel” were not found.

### Section 5 — Pricing and Payments

Intro drops “collect payment information”. QA-048. Button matches. Initial fee state shows “No fees added yet” and “+ Add a fee”. Templates do not prefill amounts. Cards are vertical, with Remove, Duplicate, and Collapse. No horizontal fee table was found. Screenshot: `qa/screenshots/s5-fees-initial.png`.

| ID | Question | Status |
| --- | --- | --- |
| Q71 | How work is priced | FAIL |
| Q72 | Parts markup | FAIL |
| Q73 | Unknown exact price | FAIL |
| Q74 | Fee cards | FAIL |
| Q75 | Area travel fee or minimum | FAIL |
| Q76 | Visit type by service | FAIL |
| Q78 | Paid diagnostic explanation | FAIL |
| Q79 | Per-service pricing | PASS |
| — | “How much will this cost?” | EXTRA/OBSOLETE |
| Q82 | Never say about pricing | FAIL |
| Q83 | Promotions | FAIL |
| Q84 | Combining promotions | PASS |
| Q85 | Waive or modify a fee or discount | PASS |
| Q86 | Payment methods | PASS |
| Q87 | When payment is due | PASS |
| Q88 | Financing | FAIL |
| Q89 | Financial remedies | PASS |
| Q91 | Financial-approval contact | PASS |
| — | Section 5 complete screen | FAIL |

Q79 links “explain the fee” to Q74 fee records by id. Q89 stores limits on the specific remedy. Q84 and Q85 hide when Q83 is No. Q87 uses separate detail fields for deposit, progress payments, invoice, and other. Memberships Q92–Q96 are not a customer section.

Leaving Q74 empty is rejected unless the no-fee checkbox is selected. The specification says to leave the section empty when there are no separate fees. QA-025.

### Section 6 — Customer Care

Intro replaces previous-work problems, repeat callbacks, and non-service calls with different wording. QA-048. Warranties, referrals, and multichannel consent are not in this section.

| ID | Question | Status |
| --- | --- | --- |
| Q97 | Problem with previous work | FAIL |
| Q101 | Repeat callback | PASS |
| Q102 | Unhappy-customer escalation | FAIL |
| Q103 | Promises never made to an unhappy customer | PASS |
| Q109 | Non-service call routing | FAIL |
| Q113 | Customer information use | FAIL |
| Q114 | Records never disclosed | PASS |
| Q115 | Additional-service recommendations | FAIL |
| Q116 | Unusual calls | FAIL |
| — | Section 6 complete screen | FAIL |

Q102 preselects the eight standard triggers. Q103 preselects the five standard restrictions. Q114 preselects payment information, information about another customer, and sensitive account information, and leaves internal notes and technician notes unselected. Q109 “Send to someone specific” picks a contact for that caller row.

### Section 7 — Voice and Conversation

Intro copy, time, and button match. Speech-engine controls (pitch, temperature, interruption, response length) are not exposed.

| ID | Question | Status |
| --- | --- | --- |
| Q129 | Supported languages | FAIL |
| Q130 | Voice | FAIL |
| Q131 | Communication style | PASS |
| Q132 | Spoken name | FAIL |
| Q133 | AI disclosure | FAIL |
| Q134 | Pronunciation | FAIL |
| Q135 | Second-language behavior | FAIL |
| Q136 | Perceived voice | FAIL |
| Q137 | Accent | FAIL |
| Q138 | Formality | FAIL |
| Q139 | Brand phrases | FAIL |
| Q140 | Other voice / identity notes | FAIL |
| — | Section 7 complete screen | FAIL |

Screenshot: `qa/screenshots/s7-voice-preview.png`.

### Section 8 — Integration Systems and Final Setup

Intro is reordered and slightly rewritten. QA-048. Button “Begin Final Setup →” matches. No password or API-credential field was found.

| ID | Question | Status |
| --- | --- | --- |
| Q117 | CRM / field-service system | FAIL |
| Q118 | Appointment schedule software | FAIL |
| Q119 | Dispatch system | FAIL |
| Q120 | Phone system | FAIL |
| Q121 | Other software | FAIL |
| Q122 | Authorized integration actions | FAIL |
| Q123 | Administrator / authorized person | FAIL |
| Q124 | Software connection notice | FAIL |
| Q125 | Integration failure fallback | FAIL |
| Q126 | Anything not asked | FAIL |
| Q127 | Review your setup | FAIL |
| Q128 | Confirm your answers | PASS |
| — | Final review screen | FAIL |
| — | Submission confirmation | FAIL |
| — | Section 8 complete screen | FAIL |

Q122 preselects the 15 standard capabilities and does not preselect Other. Q128 checkbox sentences match. A fully valid draft submitted through `/onboarding/review` reached the success screen with “Progress: 8 of 8 sections complete”. Screenshot: `qa/screenshots/submitted-success.png`.

## 4. Complete Defect Register

| ID | Section | Question/Screen | Severity | Category | Expected | Actual | Code Location | Reproduction | Recommended Fix |
| -- | ------- | --------------- | -------- | -------- | -------- | ------ | ------------- | ------------ | --------------- |
| QA-001 | Welcome | Welcome body | MEDIUM | Wording | “operates—including your services, service area, scheduling rules, emergency procedures, pricing policies, customer-care standards, and team handoffs.” | “operates - including … customer-care standards, voice, and team handoffs.” | `src/app/onboarding/page.tsx` | Open `/onboarding` | Restore the em dash and remove “voice,” |
| QA-002 | 1–7 | Section complete CTA | MEDIUM | Wording | “Continue to Your Services →”, “Continue to Emergencies →”, and the same pattern through Section 7 | “Continue to Section 2 →” through “Continue to Section 7 →”; Section 8 uses “Review Your Setup →” | `src/app/onboarding/sections/*/complete/page.tsx` | Finish any section | Use the named next-section buttons from the DOCX |
| QA-003 | 1–7 | Section complete body | LOW | Extra copy | One completion paragraph, progress, next section, and the continue button | The heading sentence is repeated inside the paragraph, and Sections 1–6 add a checklist that is not in the DOCX | same complete pages | Open any section complete URL with a valid draft | Remove the repeated sentence and the extra checklist |
| QA-004 | 1 | Q10 | MEDIUM | Missing help | Help/prompt: “When can customers normally receive plumbing service?” plus “This may be different from your office hours.” | Only “This may be different from your office hours.” | `src/components/onboarding/Section1Form.tsx` | Open Section 1 form | Add the missing sentence |
| QA-005 | 2 | Q14 service names | HIGH | Wording / catalog | “Water filtration / softening / reverse osmosis”; “Remodel or project plumbing”; “Specialty plumbing” | “Water filtration, softening or RO”; “Remodel or project work”; “Other specialty plumbing” | `src/lib/onboarding/section2Catalog.ts` | Open Section 2 and scroll the plumbing list | Restore the three approved labels |
| QA-006 | 2 | Q14 / Q16 state labels | HIGH | Options | “With conditions”; “We don’t offer this” | “Yes, with conditions”; “We do not offer this” | `src/lib/onboarding/validation/section2.ts` `SERVICE_OFFER_LABELS` | Open any plumbing row. Screenshot `qa/screenshots/s2-form-390.png` | Use the four approved state labels |
| QA-007 | 2 | Q16 | HIGH | Wording / catalog | Question: “Which of these services does your company provide?” Rows: “General diagnostic/service visit”; “Plumbing inspection”; “Sewer/drain camera inspection”; “Hydro-jetting” | Question: “Which diagnostic, drain, and inspection services does your company provide?” Rows add plurals and “Hydro-jetting / advanced drain cleaning” | `Section2Form.tsx`, `section2Catalog.ts` | Open the second service matrix | Restore the question and the four row labels |
| QA-008 | 2 | Q18 | HIGH | Options | “We serve this”; “With conditions”; “We don’t serve this” | “We serve these normally”; “Yes, with conditions”; “We do not serve these” | `CUSTOMER_SERVE_LABELS` | Open “Who does your company serve?” | Restore the four approved column labels |
| QA-009 | 2 | Q20 | HIGH | Wording | “Will you install or work with items supplied by the customer?” | “Will you install or work with fixtures, equipment, or materials supplied by the customer?” | `Section2Form.tsx` | Open Q20 | Restore “items supplied by the customer” |
| QA-010 | 2 | Q25, Q26, Q27 | MEDIUM | Wording | Q25 “Are there areas you serve only under certain conditions?” Q26 “Tell us about those conditional service areas.” Q27 “Is your after-hours service area different?” Option “We don’t provide after-hours field service” | Q25 “Are there any areas you sometimes serve, but only under certain conditions?” Q26 “Which areas are conditional, and what are the conditions?” Q27 “When you are providing after-hours service, where will you go?” Option “We do not provide…” | `Section2Form.tsx`, `validation/section2.ts` | Open the last three Section 2 questions | Restore the approved questions and the contraction in the Q27 option |
| QA-011 | 2 | Q28 | HIGH | Field type | Structured geography using the same controls as Q22–Q23, only when Q27 is “A smaller service area” | A single long-answer box labeled “What is your after-hours service area?” | `Section2Form.tsx` | Choose “A smaller service area” | Reuse the ZIP / city / radius controls and store the result as geography, not a paragraph |
| QA-012 | 2 | Q15 / Q17 / Q19 | MEDIUM | Wording | Row prompts “Tell us about any services that have special conditions.”, “Tell us about any of these services that have special conditions.”, and “Are there any special conditions for the customers or properties you selected?” | Every row uses the label “Condition” | `ServicePolicy.tsx` default `conditionLabel` | Choose “Yes, with conditions” on a service | Use the approved prompt for that matrix |
| QA-013 | 3 | Q29–Q40 titles | MEDIUM | Wording | Approved question titles, including “What should Alexander do with calls that come in after hours?”, “When is after-hours emergency field service available?”, “Who should Alexander contact first?”, “Is there a backup person Alexander should contact?”, “What should Alexander do if nobody on your team answers?”, “How should Alexander retry an unanswered contact?”, “What should Alexander do if an emergency comes in and your schedule is already full?” | Paraphrases such as “What should Alexander do when someone calls outside your normal office hours?”, “When can your company actually send someone out for an after-hours emergency?”, “If the first person does not respond, should Alexander contact someone else?” | `Section3Form.tsx` | Read Section 3 from Q29 downward | Restore each approved title. See Section 7 for the pairs |
| QA-014 | 3 | Q29 labels | MEDIUM | Options | Column labels “Urgent, not emergency”, “Human review”, “Recommended default” | “Urgent, but not an emergency”, “Human review required”, “Use Alexander's recommended default” | `EmergencyClassification.tsx` | Open the first emergency matrix | The implementation note asks for those longer phrases as explanations. The column labels themselves still have to match the table |
| QA-015 | 3 | Q38 | HIGH | Options | Fourth option: “Take the customer’s information and arrange a callback”. Removed option must not appear | Fourth option: “Do not override the schedule - take the customer's information and arrange follow-up” | `validation/section3.ts` `CAPACITY_MODE_OPTIONS` | Open the full-schedule emergency question. Screenshot `qa/screenshots/s3-q38-option.png` | Delete the hybrid option and add the approved callback option |
| QA-016 | 3 | Q34 call types | HIGH | Options | “Warranty or callback issues” | “Callback / previous-work issues” | `ContactCardEditor.tsx` | Open the primary escalation card | Restore the approved call-type label. The warranty module was removed; this call type was not |
| QA-017 | 4 | Q44 | HIGH | Options | Row “Warranty or callback exception”. Column “Another person/role” | Row “Callback / previous-work exception”. Column “Another person / role” | `section4Catalog.ts`, `validation/section4.ts` | Open the exception matrix | Restore the warranty/callback row label |
| QA-018 | 4 | Q56 and Q57 | HIGH | Options | Reschedule: “Reschedule the appointment directly” and “Reschedule only under certain conditions”. Cancel: “Cancel the appointment directly” and “Cancel only under certain conditions” | Both questions share “Reschedule or cancel directly” and “Only under certain conditions” | `CHANGE_AUTHORITY_OPTIONS` | Compare the reschedule and cancel questions | Give each question its own option labels |
| QA-019 | 4 | Q51 | HIGH | Default / spec flag | Five rows. First label is “[Row 1 label – verify from video]”. Do not invent the label. Later rows: Late morning, Early afternoon, Afternoon, Late afternoon. No invented clock times | First row is “Morning”. Other four names match. Times start empty | `section4Catalog.ts` `APPOINTMENT_WINDOW_TEMPLATES` | Open appointment windows | SPECIFICATION FLAG — CONFIRM AGAINST VIDEO. Do not ship “Morning” until the recording is checked |
| QA-020 | 4 | Q52 | MEDIUM | Options | “Confirm the appointment date”, “Confirm the appointment time or arrival window”, “Confirm the requested service”, “Confirm the customer’s name and service address”, “Confirm the callback phone number”, “Confirm the email address provided” | Those phrases without “Confirm the” / “Confirm the customer’s” | `CONFIRMATION_INFO_OPTIONS` | Open the confirmation checklist | Restore the six approved labels. All six are correctly preselected |
| QA-021 | 4 | Q48 | MEDIUM | Options | “Human review is always required when the work is classified as an emergency” | “Human review is always required for emergency authorization” | `EMERGENCY_AUTH_OPTIONS` | Open the emergency-authorization question | Restore the approved option |
| QA-022 | 4–6 | Multiple contractions and titles | MEDIUM | Wording | Apostrophes and question titles as printed, including “We don’t accept specific-technician requests”, “isn’t available”, “doesn’t know”, “didn’t solve”, “you don’t offer”, “don’t fit” | “do not”, “is not”, “does not”, “did not” substitutions, plus rewritten Q42, Q45, Q49, Q54, Q61, Q66, Q68, Q71, Q73, Q97, Q102, Q116 | Section 4–6 forms and catalogs | Compare each title in Section 7 of this report | Restore the approved strings. Do not normalize contractions |
| QA-023 | 5 | Extra pricing question | HIGH | Obsolete question | No such question. Pricing authority is Q73 plus per-service Q79 | Required question: “When a customer asks “How much will this cost?”, what is Alexander normally allowed to do?” with four options that are not in the DOCX | `Section5Form.tsx`, `GENERAL_PRICING_AUTHORITY_OPTIONS` | Open Section 5 below the diagnostic explanation | Remove the question and stop requiring `generalPricingAuthority` |
| QA-024 | 5 | Q88 | HIGH | Obsolete fields | If Yes, capture “Financing provider and terms” only. “Do not expose a separate financing workflow/action matrix” | Provider/terms plus a required permission checklist (explain options, send application link, help begin application, transfer, other) and a required “Approved eligibility statement”. Extra help: “Alexander must not promise financing approval.” | `Section5Form.tsx`, `FINANCING_PERMISSION_OPTIONS` | Answer Yes to financing | Keep provider and terms. Remove the permission matrix, eligibility statement, and invented help |
| QA-025 | 5 | Q74 | HIGH | Validation | “Leave this section empty if your company does not charge separate fees.” The checkbox is an explicit alternate that hides the cards | Empty state plus the checkbox, but Continue is blocked until a fee exists or the checkbox is selected | `validation/section5.ts` | Leave fees empty and do not check the no-fee box | Allow a truly empty fee list to complete the section. Keep the checkbox as the explicit no-fee state |
| QA-026 | 5 | Q74 labels | MEDIUM | Wording | “What is this fee called?”; “What is the amount?”; “May Alexander quote this fee to customers?” with “No, Alexander should not quote it”; templates such as “Diagnostic/service-call fee” | “Fee name or type”; “Amount”; quote option “No”; templates “Diagnostic / service-call” without “fee” | `FeeCardEditor.tsx`, `section5Catalog.ts` | Add a fee | Restore the approved field labels, quote option, and template names |
| QA-027 | 5 | Q75 | MEDIUM | Data association | Identify the area and the fee, normalized to service-area geography already captured | Free-text “Area” plus optional amount fields. Suggestions may appear, but the row is not a reference to a Q23/Q26 area id | `Section5Form.tsx` | Answer Yes, then add an area | Select an existing geography record, or store a stable area id |
| QA-028 | 5 | Q78 | MEDIUM | Field type | Reference the Q74 fee record instead of re-entering the amount | A required long answer. Help text says not to re-enter the amount, but there is no fee picker | `Section5Form.tsx` | Mark a visit as a paid diagnostic | Link the explanation to the diagnostic fee record |
| QA-029 | 6 | Q115 | HIGH | Options | “Mention only approved offers, memberships, or services”; “Don’t proactively recommend additional services” | “Mention only approved offers, promotions, or services”; “Do not proactively recommend additional services”. Help text is also rewritten | `section6Catalog.ts` | Open the additional-services question | Restore “memberships” and the approved contraction. Help must match the DOCX |
| QA-030 | 7 | Q129 | HIGH | Options / conditional | Order: English, Spanish, Other supported language, English only. Other reveals a language field. Help includes “Select only languages verified for the selected voice.” | Order starts with English only. Other is visible but disabled, and the language field never appears. Help omits the verification sentence. Screenshot `qa/screenshots/s7-voice-preview.png` | `Section7Form.tsx`, `approvedVoiceCatalog.ts` `VOICE_LANGUAGE_CAPABILITY_CATALOG_AVAILABLE = false` | Open Section 7 | Restore order and help. Do not disable Other unless the DOCX is changed. If a voice cannot speak a language, say so after the customer enters it |
| QA-031 | 7 | Q130 | HIGH | Missing audio | Single choice with audio previews. Help says the preview is more reliable than a description | Voice A/B/C render, each with “Preview coming soon”. `previewSrc` is null. “Another approved voice” is disabled | `approvedVoiceCatalog.ts`, `VoicePreviewCard.tsx` | Open the voice question | Attach the approved preview files. Until then this question does not meet the spec |
| QA-032 | 7 | Q132–Q140 help | MEDIUM | Help text | Approved help, including “Alexander remains the name of the product…”, the pronunciation example, and the Q135 language-behavior help | Shortened, rewritten, or missing help. Q135 has no help. Q133 adds a sentence about legal/platform disclosure that is not in the DOCX. Q134 option is “Yes — enter pronunciation details” instead of “Yes — enter the pronunciation details below” | `section7Catalog.ts`, `Section7Form.tsx` | Read each optional and required voice question | Restore each help string and the Q134 option |
| QA-033 | 8 | Q117–Q125 | HIGH | Required marker | Required questions show a red asterisk. Optional questions show “(Optional)” | None of Q117–Q125 show an asterisk. They are still validated on continue, except where noted below. Screenshot `qa/screenshots/s8-form-no-asterisk.png` | `Section8Form.tsx` | Open Section 8 | Pass `required` into each `QuestionCard` |
| QA-034 | 8 | Q121 | HIGH | Requiredness / missing option | Required. Options include “Membership / service-plan software” and “None” | Marked “(Optional)”. An empty selection is valid. Membership / service-plan software is absent. “None” is present | `Section8Form.tsx`, `section8Catalog.ts`, `validation/section8.ts` | Open “any other software” and continue with nothing selected | Mark it required, require None or one or more categories, and add the membership option |
| QA-035 | 8 | Q121 follow-up | HIGH | Extra required field | Each selected category gets its own software-name field | Each card also requires “What should Alexander be able to access?” | `AdditionalSoftwareCardEditor.tsx` | Select “Payment system” | Keep the software name. Remove the extra required access essay, or move that intent into Q122 |
| QA-036 | 8 | Q124 | HIGH | Wording | Full notice: sign into the company’s own software, authorize Alexander, do not enter passwords or private API credentials, and the team will configure and test | Shortened notice that omits signing in and authorizing. “I understand” remains | `section8Catalog.ts` `Q111_NOTICE` | Open “Software connection notice” | Restore the full approved notice |
| QA-037 | 8 | Q125 | HIGH | Validation | “Follow another rule” captures and requires the fallback rule | The text area appears and is not required. `validateSection8` does not check `failureFallbackCustom` | `Section8Form.tsx`, `validation/section8.ts` | Choose “Follow another rule” and continue with an empty box | Require the rule while that option is selected |
| QA-038 | 8 | Q127 review | MEDIUM | Wording | Fixed summaries, for example “Company information, hours and availability”, “Services, customers and service area”, “Pricing, fees, payments and financial authority” | Dynamic or different summaries, for example “Identity and hours not yet complete”, “Callbacks, complaints, privacy, and unusual calls”, “CRM: Not answered…” | `globalReviewSummaries.ts` | Open `/onboarding/review` | Use the eight approved summary lines. Edit links can stay |
| QA-039 | 8 | Submission confirmation | MEDIUM | Wording | Heading “Thank you. We have received your setup information.” | Heading “Questionnaire received”. The thank-you sentence is in the body | `src/app/onboarding/submitted/page.tsx` | Submit a valid questionnaire. Screenshot `qa/screenshots/submitted-success.png` | Use the approved heading |
| QA-040 | Global | Save status | MEDIUM | Persistence copy | Do not imply cross-device save unless server persistence is implemented | When `REDIS_URL` is missing, local save still sets status to “saved”, which renders “Saved just now” | `OnboardingContext.tsx` `runServerSave` | Edit a field with Redis unset | Say that progress is saved in this browser when the server draft was not written |
| QA-041 | 2 | Service conditions | MEDIUM | Stale hidden value | Hidden condition text must not be stored as an active rule | Switching from “With conditions” to “Ask our team first” hides the box but keeps the string on the draft. `normalizeSection2` nulls it. The submit API stores the raw draft | `ServicePolicy.tsx`, `normalize/section2.ts`, `src/app/api/onboarding/submit/route.ts` | Enter a condition, switch to “Ask our team first”, submit | Clear the condition when the policy changes, or persist the normalized record |
| QA-042 | 4 | Q50 | LOW | Field behavior | “No maximum” disables and clears the numeric field | The numeric field is cleared and removed from the layout | `Section4Form.tsx` | Check “No maximum” | Keep the field visible and disabled |
| QA-043 | 3 | Section intro | LOW | Wording | “what has—and has not—been confirmed” | “what has - and has not - been confirmed” | `sections/3/intro/page.tsx` | Open the Emergencies intro | Restore the em dashes |
| QA-044 | 1 | Q2 and Q7 help | LOW | Help text | Q2 “Leave blank if it's the same as the name above.” Q7 “Example: California Contractor License #123456 — C-36 Plumbing.” | Q2 “it is”. Q7 “For example:” and a hyphen instead of an em dash | `Section1Form.tsx` | Open Q2 and Q7 | Restore both help strings |
| QA-046 | 4 | Q46 | MEDIUM | Options | Column “Request / schedule” | “Request / schedule service” | `CALLER_PERMISSION_OPTIONS` | Open the caller matrix | Remove the extra word “service” |
| QA-048 | 3–6, 8 | Section intros | MEDIUM | Wording | Section 4 names booking authority, appointment types, availability, and “You can choose how much responsibility…”. Section 5 includes “collect payment information”. Section 6 names previous-work problems, repeat callbacks, complaints, service recovery, privacy, non-service calls, and additional-service boundaries. Section 8 leads with calendar, then CRM | Those sentences are rewritten or reordered. Section 5 drops “collect payment information”. Section 6 leads with “callbacks” | `sections/*/intro/page.tsx` | Open each intro | Restore the approved intro paragraphs |

QA-045 was not used. Mobile 2×2 wrapping of “Ask our team first” is readable and is not filed as a defect.

## 5. Missing Specification Items

These approved behaviors are absent or not reachable:

- Q10 prompt “When can customers normally receive plumbing service?”
- Q14 labels “Water filtration / softening / reverse osmosis”, “Remodel or project plumbing”, “Specialty plumbing”
- Q16 question “Which of these services does your company provide?” and the four shorter diagnostic labels
- Q18 labels “We serve this” and “We don’t serve this”
- Q20 question using “items supplied by the customer”
- Q28 structured geography
- Q38 option “Take the customer’s information and arrange a callback”
- Q34 call type “Warranty or callback issues”
- Q44 row “Warranty or callback exception”
- Q51 video-confirmed first window label (not supplied by the DOCX)
- Q56/Q57 distinct reschedule and cancel option labels
- Q115 option containing “memberships”
- Q121 option “Membership / service-plan software”
- Q124 full connection notice
- Q129 selectable “Other supported language” with a language field
- Q130 playable audio previews
- Q135 help text
- Approved section-complete button names
- Approved Q127 review-summary lines
- Submission heading “Thank you. We have received your setup information.”

## 6. Extra / Legacy Implementation

Intentionally deleted legacy questions were not found as their own screens: no memberships section, no warranty module, no referral question, no communication-consent block, no “Not sure yet” on the Zoom-simplified policy questions. Q120 “Not sure” remains, and the DOCX still includes it.

Still customer-facing, and not in the active specification:

- Section 5 required question “When a customer asks “How much will this cost?”…” and `GENERAL_PRICING_AUTHORITY_OPTIONS`
- Q88 financing permission checklist and “Approved eligibility statement”
- Q88 help “Alexander must not promise financing approval.”
- Q121 required “What should Alexander be able to access?”
- Q38 option that keeps the removed “Do not override the schedule” policy
- Q34 / Q44 labels that replace “Warranty or callback” with “Callback / previous-work”
- Section complete checklists on Sections 1–6
- Q133 extra sentence about mandatory legal/platform disclosure

## 7. Exact Wording Mismatches

```text
Expected:
"operates—including your services, service area, scheduling rules, emergency procedures, pricing policies, customer-care standards, and team handoffs."

Actual:
"operates - including your services, service area, scheduling rules, emergency procedures, pricing policies, customer-care standards, voice, and team handoffs."

Difference:
Spaced hyphen instead of an em dash. Extra word "voice,".
```

```text
Expected:
"Continue to Your Services →"

Actual:
"Continue to Section 2 →"

Difference:
Section number instead of the section name. The same pattern is used for Sections 3–7.
```

```text
Expected:
"Leave blank if it's the same as the name above."

Actual:
"Leave blank if it is the same as the name above."

Difference:
"it's" expanded to "it is".
```

```text
Expected:
"Example: California Contractor License #123456 — C-36 Plumbing."

Actual:
"For example: California Contractor License #123456 - C-36 Plumbing."

Difference:
"Example" became "For example". Em dash became a hyphen.
```

```text
Expected:
"Which of these may Alexander tell customers?"

Actual:
"Which of these may Alexander tell customers about your company?"

Difference:
The rendered title is the longer sentence also printed under Q5. The short title is not shown.
```

```text
Expected:
"What other credential or trust claim may Alexander tell customers?"

Actual:
"What else may Alexander tell customers about your company?"

Difference:
The field label is the sentence under Q6, not the question title.
```

```text
Expected:
"Is there anything Alexander should never claim about your company?"

Actual:
"Is there anything Alexander should never claim about your company's credentials, awards, guarantees, experience, or affiliations?"

Difference:
The rendered title is the longer sentence under Q8.
```

```text
Expected:
"When can customers normally receive plumbing service?"

Actual:
(not shown)

Difference:
Missing prompt. Only "This may be different from your office hours." is shown.
```

```text
Expected:
"What hours should Alexander answer?"

Actual:
"What hours should Alexander answer your calls?"

Difference:
The rendered line is the sentence under Q12, not the question title.
```

```text
Expected:
"Is there any recurring availability rule Alexander should know?"

Actual:
"Is there anything else Alexander should know about your normal hours or availability?"

Difference:
The rendered title is the sentence under Q13.
```

```text
Expected:
"Water filtration / softening / reverse osmosis"
"Remodel or project plumbing"
"Specialty plumbing"

Actual:
"Water filtration, softening or RO"
"Remodel or project work"
"Other specialty plumbing"
```

```text
Expected:
"With conditions"
"We don’t offer this"

Actual:
"Yes, with conditions"
"We do not offer this"
```

```text
Expected:
"Which of these services does your company provide?"

Actual:
"Which diagnostic, drain, and inspection services does your company provide?"
```

```text
Expected:
"General diagnostic/service visit"
"Plumbing inspection"
"Sewer/drain camera inspection"
"Hydro-jetting"

Actual:
"General diagnostic/service visits"
"Plumbing inspections"
"Sewer/drain camera inspections"
"Hydro-jetting / advanced drain cleaning"
```

```text
Expected:
"We serve this"
"We don’t serve this"

Actual:
"We serve these normally"
"We do not serve these"
```

```text
Expected:
"Will you install or work with items supplied by the customer?"

Actual:
"Will you install or work with fixtures, equipment, or materials supplied by the customer?"
```

```text
Expected:
"Are there areas you serve only under certain conditions?"

Actual:
"Are there any areas you sometimes serve, but only under certain conditions?"
```

```text
Expected:
"Tell us about those conditional service areas."

Actual:
"Which areas are conditional, and what are the conditions?"
```

```text
Expected:
"Is your after-hours service area different?"

Actual:
"When you are providing after-hours service, where will you go?"
```

```text
Expected:
"We don’t provide after-hours field service"

Actual:
"We do not provide after-hours field service"
```

```text
Expected:
"Urgent, not emergency"

Actual:
"Urgent, but not an emergency"
```

```text
Expected:
"What should Alexander do with calls that come in after hours?"

Actual:
"What should Alexander do when someone calls outside your normal office hours?"
```

```text
Expected:
"Urgent but contained"

Actual:
"Urgent, but contained"
```

```text
Expected:
"When is after-hours emergency field service available?"

Actual:
"When can your company actually send someone out for an after-hours emergency?"
```

```text
Expected:
"We don’t provide after-hours emergency field service"

Actual:
"We do not provide after-hours emergency field service"
```

```text
Expected:
"When is after-hours emergency service available?"

Actual:
"When can your company provide after-hours emergency service?"
```

```text
Expected:
"Who should Alexander contact first?"

Actual:
"Who should Alexander contact first when a call requires immediate human attention?"
```

```text
Expected:
"Warranty or callback issues"

Actual:
"Callback / previous-work issues"
```

```text
Expected:
"Is there a backup person Alexander should contact?"

Actual:
"If the first person does not respond, should Alexander contact someone else?"
```

```text
Expected:
"What should Alexander do if nobody on your team answers?"

Actual:
"If Alexander cannot reach anyone on your team, what should he do?"
```

```text
Expected:
"Never tell the customer that someone has been reached, dispatched, or is handling the situation unless that action is confirmed."

Actual:
"Alexander will never tell the customer that someone has been reached, dispatched, or is handling the situation unless that action has actually been confirmed."
```

```text
Expected:
"How should Alexander retry an unanswered contact?"

Actual:
"If an urgent escalation is not answered, how should Alexander retry?"
```

```text
Expected:
"What should Alexander do if an emergency comes in and your schedule is already full?"

Actual:
"If an emergency comes in when your normal schedule is already full, what should Alexander do?"
```

```text
Expected:
"Take the customer’s information and arrange a callback"

Actual:
"Do not override the schedule - take the customer's information and arrange follow-up"
```

```text
Expected:
"How much capacity do you reserve for emergencies?"

Actual:
"How much capacity do you normally protect for emergencies?"
```

```text
Expected:
"When is an emergency override allowed?"

Actual:
"When may Alexander use an emergency override?"
```

```text
Expected:
"What should Alexander do if a caller asks to speak with a person?"

Actual:
"If a caller asks to speak with a person, what should Alexander do?"
```

```text
Expected:
"If someone says they don’t want to speak with an AI, what should Alexander do?"

Actual:
"If someone says they do not want to speak with an AI, what should Alexander do?"
```

```text
Expected:
"Who can approve these types of exceptions?"

Actual:
"Who has authority to approve each type of exception?"
```

```text
Expected:
"Warranty or callback exception"

Actual:
"Callback / previous-work exception"
```

```text
Expected:
"Refund, credit or goodwill exception"

Actual:
"Refund, credit, or goodwill exception"

Difference:
Added comma after "credit".
```

```text
Expected:
"What should Alexander do if the person who must approve an exception isn’t available?"

Actual:
"What should Alexander do if the person who must approve an exception is not available?"
```

```text
Expected:
"Request / schedule"

Actual:
"Request / schedule service"
```

```text
Expected:
"Do any callers have a maximum amount they’re allowed to approve?"

Actual:
"Do any callers have a maximum amount they are allowed to approve?"
```

```text
Expected:
"When there’s an emergency, do the same authorization rules still apply?"

Actual:
"When there is an emergency, do the same authorization rules still apply?"
```

```text
Expected:
"Human review is always required when the work is classified as an emergency"

Actual:
"Human review is always required for emergency authorization"
```

```text
Expected:
"When an eligible customer wants service, what may Alexander normally do?"

Actual:
The same sentence is shown. The question title "What is Alexander normally allowed to do when a customer wants an appointment?" is not shown.
```

```text
Expected:
"How far in advance may Alexander schedule appointments?"

Actual:
"How far into the future may Alexander book?"
```

```text
Expected:
"What appointment windows do you offer?"

Actual:
"What appointment windows may Alexander offer customers?"
```

```text
Expected:
"When may Alexander offer these appointments?"

Actual:
"When may Alexander offer same-day or holiday appointments?"
```

```text
Expected:
"Add the customer to a callback/waitlist"

Actual:
"Add the customer to a callback / waitlist"
```

```text
Expected:
"We don’t accept specific-technician requests"

Actual:
"We do not accept specific-technician requests"
```

```text
Expected:
"What should Alexander do when a customer has several plumbing issues?"

Actual:
"If a customer wants help with more than one plumbing problem, what should Alexander normally do?"
```

```text
Expected:
"How does your company normally price plumbing work?"

Actual:
"How does your company normally determine what a customer pays?"
```

```text
Expected:
"If Alexander doesn’t know the exact price, what should he normally tell the customer?"

Actual:
"If Alexander does not know the exact price, what should he normally tell the customer?"
```

```text
Expected:
"Explain the applicable service/diagnostic fee and that additional work is quoted separately"

Actual:
"Explain the applicable service / diagnostic fee and that additional work is quoted separately"
```

```text
Expected:
"Never guarantee a final repair price before diagnosis unless it’s an approved fixed price"
"Never promise that there won’t be additional charges"
"Never promise a discount that hasn’t been authorized"

Actual:
"unless it is an approved fixed price"
"Never promise there will not be additional charges"
"Never promise a discount that has not been authorized"
```

```text
Expected:
"What should Alexander do when a customer says there’s a problem with work your company already performed?"

Actual:
"When a customer calls about a problem with previous work, what should Alexander normally do first?"
```

```text
Expected:
"When should Alexander involve someone on your team because a customer is unhappy?"

Actual:
"When should Alexander escalate an unhappy customer to your team?"
```

```text
Expected:
"Customer says the previous repair didn’t solve the problem"

Actual:
"Customer says the previous repair did not solve the problem"
```

```text
Expected:
"Customer requesting a service you don’t offer"

Actual:
"Customer requesting a service you do not offer"
```

```text
Expected:
"Use available customer information and service history when it helps resolve the call"

Actual:
"Use available customer and service history when it helps resolve the call"

Difference:
Missing "information".
```

```text
Expected:
"This applies only when Alexander has access to the information through connected software and the caller is authorized to receive it."

Actual:
"This policy applies only when the information is available through connected software and the caller is authorized to access it."
```

```text
Expected:
"Mention only approved offers, memberships, or services"
"Don’t proactively recommend additional services"

Actual:
"Mention only approved offers, promotions, or services"
"Do not proactively recommend additional services"
```

```text
Expected:
"Are there any other rules Alexander should follow for unusual calls?"
"Anything else Alexander should know about calls that don’t fit your normal service process?"

Actual:
"Is there anything else Alexander should know about calls that do not fit your normal service process?"
```

```text
Expected:
"Select only languages verified for the selected voice. If more than one language is selected, Alexander should respond in the caller’s language when it can do so reliably."

Actual:
"If more than one language is selected, Alexander should respond in the caller’s language when it can do so reliably."
```

```text
Expected:
"Alexander remains the name of the product. This controls the name callers hear when the company’s receptionist introduces himself."

Actual:
"Alexander remains the product name. This controls the spoken receptionist name."
```

```text
Expected:
"Yes — enter the pronunciation details below"

Actual:
"Yes — enter pronunciation details"
```

```text
Expected:
"What software does your company use to manage customers and jobs?"
and
"What system do you use to manage customers, jobs, or your field-service operations?"

Actual:
"What system do you use to manage customers, jobs, or field-service operations?"

Difference:
Missing "your" before "field-service operations".
```

```text
Expected:
"We don’t use one"
"We don’t use scheduling software"
"We don’t use dispatch software"

Actual:
"We do not use one"
"We do not use scheduling software"
"We do not use dispatch software"
```

```text
Expected:
"Collect the customer’s information and send the request to our team"
"If Alexander can’t access a system or complete an action, what should he normally do?"

Actual:
"Collect the customer’s information and send the request to our team" matches.
The rendered question is the longer Q125 sentence, and "can’t" in the short title is not shown.
```

```text
Expected:
"Is there anything important about your company that we haven’t asked?"

Actual:
"Anything else Alexander should know about how your company operates?"
```

## 8. Conditional Logic Failures

| Branch | Result |
| --- | --- |
| Q5 Other → Q6 | Shows and hides. Browser-confirmed |
| Q11 specific hours → Q12 schedule | Shows only for that option |
| Q14/Q16/Q18 With conditions → row condition | Bound to that row. Ask our team first does not show a condition. Browser-confirmed on two services |
| Q20/Q21 Yes, with conditions | Condition only for that choice |
| Q22 → one of ZIP, cities, or radius | Correct |
| Q25 Yes → Q26 rows | Correct show/hide. Prompt text is wrong |
| Q27 smaller area → Q28 | Shows, but the control is a paragraph, not structured geography |
| Q30 Other | Shows “Which situations?” rather than an “Other situation” field |
| Q32 certain hours → Q33 | Structured week schedule. Title differs |
| Q35 Yes → backup card | Correct |
| Q36/Q37 custom rules | Show and are required |
| Q38 three branches | Show the matching follow-up. The fourth choice itself is the wrong option |
| Q42/Q43 custom | Show and are required |
| Q44 Another person/role | Captures a person for that row |
| Q47 Yes → caller-limit rows | Caller type comes from Q46 |
| Q50 No maximum | Clears the number. Hides it instead of disabling it |
| Q53/Q65/Q70 | Use Section 2 service ids |
| Q62 Yes → Q63 and Q64 | Both appear. Q63 defaults to the calling number |
| Q68 separate issues → Q70 | Service multi-select |
| Q74 waiver Yes/Sometimes → waiver rule | Required only then |
| Q83 No → Q84 and Q85 | Hidden, and those values are cleared |
| Q87 deposit, progress, invoice, other | Separate fields. Cleared when unchecked |
| Q88 Yes | Shows provider/terms plus forbidden extra fields |
| Q89 within rules → that remedy’s limit | Stored on the remedy id |
| Q109 Send to someone specific | Contact is stored on that caller type |
| Q125 Follow another rule | Field appears and is not required. QA-037 |
| Q129 Other | Option is disabled, so the language field cannot open. QA-030 |

## 9. Defaults and Validation Failures

Defaults that match:

- Q9 office hours Monday–Friday 8:00 AM–5:00 PM, weekend closed
- Q10 service hours Monday–Saturday 8:00 AM–6:00 PM, Sunday no service
- Q29 every row preselected to Alexander’s recommended default
- Q52 all six confirmation items preselected
- Q63 calling-number default when callbacks are allowed
- Q82 first five restrictions preselected
- Q102 eight escalation triggers preselected
- Q103 five prohibited promises preselected
- Q114 three privacy items preselected; internal notes and technician notes not preselected
- Q122 fifteen standard capabilities preselected; Other not preselected
- Q74 starts with no fee rows

Failures:

- Q51 first window is “Morning” without video confirmation. QA-019
- Q74 empty list cannot continue. QA-025
- Q121 empty selection can continue. QA-034
- Q125 custom rule can be blank. QA-037
- Q88 financing permissions and eligibility statement are required even though they should not exist. QA-024
- Extra pricing question is required. QA-023
- Section 8 required questions have no asterisk. QA-033
- Q50 hides rather than disables the day count. QA-042

## 10. Data-Model / Payload Problems

Checked and holding:

- Plumbing, diagnostic, and customer conditions are stored on the entity id. Two services did not share one string.
- Caller spending limits store a caller-type id.
- Booking rules, technician mappings, and separate-issue selections store service ids.
- Q79 pricing rules and linked fee ids are per service.
- Q89 remedy rules are per remedy.
- Fee cards have their own ids. Values are not shared across cards.
- Q121 software names are per category id.
- Voice answers normalize toward `primary_language`, `supported_languages`, `voice_id`, and the other `voice_profile` fields in `normalize/section7.ts`.
- Submission of a valid draft through the review screen succeeded and did not duplicate the submission on that single post.

Problems:

- QA-041. The raw submitted draft can still contain a condition string after the customer leaves “With conditions”. Normalization drops it. The API persists the raw draft.
- QA-027. Area travel fees are free text, not ids of Q23/Q26 areas.
- QA-011. After-hours service area is a paragraph, so it cannot reuse the normal service-area structure.
- QA-015 and QA-017. The stored option ids represent policies the DOCX removed or renamed (`no_override`, `callback_previous_work`).

## 11. UX / Responsive Problems

Viewports checked: 1440, 1280, 768, and 390 on Sections 2, 3, 4, and 5, plus a 390 screenshot of the service matrix and a 768 screenshot of fees.

- No document-level horizontal scroll was found on those pages.
- Fee cards are vertical. There is no fee table.
- At 390px, “Ask our team first” and “We do not offer this” wrap inside the button. They stay readable. Screenshot: `qa/screenshots/s2-form-390.png`.
- Section 8 questions look optional because the asterisk is missing. Screenshot: `qa/screenshots/s8-form-no-asterisk.png`.
- Voice rows show “Preview coming soon” beside the description. Screenshot: `qa/screenshots/s7-voice-preview.png`.

## 12. Unclear Specification Items

SPECIFICATION FLAG — CONFIRM AGAINST VIDEO

Q51’s first appointment-window label is “[Row 1 label – verify from video]”. The DOCX says the transcript rendered that label as “Monday” and that it must be checked against the video before production. The other labels are Late morning, Early afternoon, Afternoon, and Late afternoon. The implementation uses “Morning”. This audit does not treat “Morning” as approved.

Q64 says “Required: Conditional” and does not print an explicit “show if” sentence. It sits with Q63, which is shown when Q62 is Yes. The implementation shows Q64 in that same case. That reading was not treated as a defect.

## 13. Recommended Fix Order

1. No blockers.
2. Policy options that would be configured incorrectly: QA-015, QA-016, QA-017, QA-018, QA-006, QA-008, QA-005, QA-007, QA-029, QA-041.
3. Missing or unreachable branches: QA-011, QA-030, QA-031, QA-034, QA-037.
4. Extra required questions and validation: QA-023, QA-024, QA-025, QA-035, QA-033.
5. Wrong inputs, defaults, and the video-gated window name: QA-019, QA-009, QA-026, QA-027, QA-028, QA-020, QA-021, QA-046.
6. Exact wording and help: QA-001, QA-002, QA-004, QA-010, QA-012, QA-013, QA-014, QA-022, QA-032, QA-036, QA-038, QA-039, QA-044, QA-048.
7. Polish: QA-003, QA-040, QA-042, QA-043.

## Browser evidence

- Welcome, Section 1 Other field, two-service conditions, mobile service matrix, fee initial state, voice previews, Section 8 missing asterisks, Q38 option, and the success screen are under `qa/screenshots/`.
- Same-browser resume: “Summit Plumbing QA” remained in Q1 after reload.
- One complete valid draft was submitted through the real review button and reached the success screen. A second company was not clicked through every question by hand. Branches that were exercised in the browser are listed in Section 8.

## Result

FAIL. The form can be completed and submitted. It does not match the approved questionnaire closely enough to configure Alexander from these answers without correcting the defects above.
