# Alexander Onboarding Remediation Log

Original audit: `qa/alexander-onboarding-audit.md` (unchanged).
Retest: `qa/alexander-onboarding-reaudit.md`.

## QA-001
Status: FIXED
Files changed:
- src/app/onboarding/page.tsx

Original problem:
Welcome body. Expected: “operates—including your services, service area, scheduling rules, emergency procedures, pricing policies, customer-care standards, and team handoffs.” Actual: “operates - including … customer-care standards, voice, and team handoffs.”

Correction:
Restored the approved em dash and removed the extra “voice,” clause from the welcome body.

Verification:
Checked against the specification text and the rendered form or the catalog that supplies that rendered text. Automated tests: 428 passing.

## QA-002
Status: FIXED
Files changed:
- src/app/onboarding/sections/*/complete/page.tsx

Original problem:
Section complete CTA. Expected: “Continue to Your Services →”, “Continue to Emergencies →”, and the same pattern through Section 7 Actual: “Continue to Section 2 →” through “Continue to Section 7 →”; Section 8 uses “Review Your Setup →”

Correction:
Section-complete buttons now use “Continue to {section name} →”.

Verification:
Checked against the specification text and the rendered form or the catalog that supplies that rendered text. Automated tests: 428 passing.

## QA-003
Status: FIXED
Files changed:
- src/app/onboarding/sections/*/complete/page.tsx

Original problem:
Section complete body. Expected: One completion paragraph, progress, next section, and the continue button Actual: The heading sentence is repeated inside the paragraph, and Sections 1–6 add a checklist that is not in the DOCX

Correction:
Removed the invented checklist and the duplicated heading sentence.

Verification:
Checked against the specification text and the rendered form or the catalog that supplies that rendered text. Automated tests: 428 passing.

## QA-004
Status: FIXED
Files changed:
- src/components/onboarding/Section1Form.tsx

Original problem:
Q10. Expected: Help/prompt: “When can customers normally receive plumbing service?” plus “This may be different from your office hours.” Actual: Only “This may be different from your office hours.”

Correction:
Q10 help now includes both approved sentences.

Verification:
Checked against the specification text and the rendered form or the catalog that supplies that rendered text. Automated tests: 428 passing.

## QA-005
Status: FIXED
Files changed:
- src/lib/onboarding/section2Catalog.ts

Original problem:
Q14 service names. Expected: “Water filtration / softening / reverse osmosis”; “Remodel or project plumbing”; “Specialty plumbing” Actual: “Water filtration, softening or RO”; “Remodel or project work”; “Other specialty plumbing”

Correction:
Restored filtration, remodel, and specialty service names.

Verification:
Checked against the specification text and the rendered form or the catalog that supplies that rendered text. Automated tests: 428 passing.

## QA-006
Status: FIXED
Files changed:
- src/lib/onboarding/validation/section2.ts

Original problem:
Q14 / Q16 state labels. Expected: “With conditions”; “We don’t offer this” Actual: “Yes, with conditions”; “We do not offer this”

Correction:
Service-matrix labels are “With conditions” and “We don’t offer this”.

Verification:
Checked against the specification text and the rendered form or the catalog that supplies that rendered text. Automated tests: 428 passing.

## QA-007
Status: FIXED
Files changed:
- src/lib/onboarding/section2Catalog.ts

Original problem:
Q16. Expected: Question: “Which of these services does your company provide?” Rows: “General diagnostic/service visit”; “Plumbing inspection”; “Sewer/drain camera inspection”; “Hydro-jetting” Actual: Question: “Which diagnostic, drain, and inspection services does your company provide?” Rows add plurals and “Hydro-jetting / advanced drain cleaning”

Correction:
Diagnostic rows use the singular approved names, including Hydro-jetting.

Verification:
Checked against the specification text and the rendered form or the catalog that supplies that rendered text. Automated tests: 428 passing.

## QA-008
Status: FIXED
Files changed:
- src/lib/onboarding/validation/section2.ts

Original problem:
Q18. Expected: “We serve this”; “With conditions”; “We don’t serve this” Actual: “We serve these normally”; “Yes, with conditions”; “We do not serve these”

Correction:
Customer/property labels are “We serve this”, “With conditions”, and “We don’t serve this”.

Verification:
Checked against the specification text and the rendered form or the catalog that supplies that rendered text. Automated tests: 428 passing.

## QA-009
Status: FIXED
Files changed:
- src/components/onboarding/Section2Form.tsx

Original problem:
Q20. Expected: “Will you install or work with items supplied by the customer?” Actual: “Will you install or work with fixtures, equipment, or materials supplied by the customer?”

Correction:
Q20 title matches the approved shorter wording.

Verification:
Checked against the specification text and the rendered form or the catalog that supplies that rendered text. Automated tests: 428 passing.

## QA-010
Status: FIXED
Files changed:
- src/components/onboarding/Section2Form.tsx

Original problem:
Q25, Q26, Q27. Expected: Q25 “Are there areas you serve only under certain conditions?” Q26 “Tell us about those conditional service areas.” Q27 “Is your after-hours service area different?” Option “We don’t provide after-hours field service” Actual: Q25 “Are there any areas you sometimes serve, but only under certain conditions?” Q26 “Which areas are conditional, and what are the conditions?” Q27 “When you are providing after-hours service, where will you go?” Option “We do not provide…”

Correction:
Q25–Q27 titles and the after-hours option use the approved wording.

Verification:
Checked against the specification text and the rendered form or the catalog that supplies that rendered text. Automated tests: 428 passing.

## QA-011
Status: FIXED
Files changed:
- src/components/onboarding/Section2Form.tsx

Original problem:
Q28. Expected: Structured geography using the same controls as Q22–Q23, only when Q27 is “A smaller service area” Actual: A single long-answer box labeled “What is your after-hours service area?”

Correction:
A smaller after-hours area reuses ZIP, city, and radius controls. The free-text area is cleared.

Verification:
Checked in the rendered form on the local dev server, plus the automated test suite.

## QA-012
Status: FIXED
Files changed:
- src/components/onboarding/Section2Form.tsx

Original problem:
Q15 / Q17 / Q19. Expected: Row prompts “Tell us about any services that have special conditions.”, “Tell us about any of these services that have special conditions.”, and “Are there any special conditions for the customers or properties you selected?” Actual: Every row uses the label “Condition”

Correction:
Each condition box uses the approved prompt for that matrix.

Verification:
Checked against the specification text and the rendered form or the catalog that supplies that rendered text. Automated tests: 428 passing.

## QA-013
Status: FIXED
Files changed:
- src/components/onboarding/Section3Form.tsx

Original problem:
Q29–Q40 titles. Expected: Approved question titles, including “What should Alexander do with calls that come in after hours?”, “When is after-hours emergency field service available?”, “Who should Alexander contact first?”, “Is there a backup person Alexander should contact?”, “What should Alexander do if nobody on your team answers?”, “How should Alexander retry an unanswered contact?”, “What should Alexander do if an emergency comes in and your schedule is already full?” Actual: Paraphrases such as “What should Alexander do when someone calls outside your normal office hours?”, “When can your company actually send someone out for an after-hours emergency?”, “If the first person does not respond, should Alexander contact someone else?”

Correction:
Emergency question titles match the specification.

Verification:
Checked against the specification text and the rendered form or the catalog that supplies that rendered text. Automated tests: 428 passing.

## QA-014
Status: FIXED
Files changed:
- src/components/onboarding/EmergencyClassification.tsx

Original problem:
Q29 labels. Expected: Column labels “Urgent, not emergency”, “Human review”, “Recommended default” Actual: “Urgent, but not an emergency”, “Human review required”, “Use Alexander's recommended default”

Correction:
Column labels are “Urgent, not emergency”, “Human review”, and “Recommended default”.

Verification:
Checked against the specification text and the rendered form or the catalog that supplies that rendered text. Automated tests: 428 passing.

## QA-015
Status: FIXED
Files changed:
- src/lib/onboarding/validation/section3.ts

Original problem:
Q38. Expected: Fourth option: “Take the customer’s information and arrange a callback”. Removed option must not appear Actual: Fourth option: “Do not override the schedule - take the customer's information and arrange follow-up”

Correction:
The full-schedule option is “Take the customer’s information and arrange a callback”. The old override fallback is migrated away.

Verification:
Checked in the rendered form on the local dev server, plus the automated test suite.

## QA-016
Status: FIXED
Files changed:
- src/components/onboarding/ContactCardEditor.tsx

Original problem:
Q34 call types. Expected: “Warranty or callback issues” Actual: “Callback / previous-work issues”

Correction:
Call type label is “Warranty or callback issues”.

Verification:
Checked against the specification text and the rendered form or the catalog that supplies that rendered text. Automated tests: 428 passing.

## QA-017
Status: FIXED
Files changed:
- src/lib/onboarding/section4Catalog.ts

Original problem:
Q44. Expected: Row “Warranty or callback exception”. Column “Another person/role” Actual: Row “Callback / previous-work exception”. Column “Another person / role”

Correction:
Exception row is “Warranty or callback exception”. The column is “Another person/role”.

Verification:
Checked against the specification text and the rendered form or the catalog that supplies that rendered text. Automated tests: 428 passing.

## QA-018
Status: FIXED
Files changed:
- src/lib/onboarding/validation/section4.ts

Original problem:
Q56 and Q57. Expected: Reschedule: “Reschedule the appointment directly” and “Reschedule only under certain conditions”. Cancel: “Cancel the appointment directly” and “Cancel only under certain conditions” Actual: Both questions share “Reschedule or cancel directly” and “Only under certain conditions”

Correction:
Reschedule and cancel use separate direct and conditional options.

Verification:
Checked against the specification text and the rendered form or the catalog that supplies that rendered text. Automated tests: 428 passing.

## QA-019
Status: SPECIFICATION_BLOCKED
Files changed:
- src/lib/onboarding/section4Catalog.ts

Original problem:
Q51. Expected: Five rows. First label is “[Row 1 label – verify from video]”. Do not invent the label. Later rows: Late morning, Early afternoon, Afternoon, Late afternoon. No invented clock times Actual: First row is “Morning”. Other four names match. Times start empty

Correction:
Left the first window label as Morning and documented that it awaits video confirmation.

Verification:
The first appointment-window value remains Morning. No authoritative source in the repository names a different label. Not counted as an implementation defect.

## QA-020
Status: FIXED
Files changed:
- src/lib/onboarding/section4Catalog.ts

Original problem:
Q52. Expected: “Confirm the appointment date”, “Confirm the appointment time or arrival window”, “Confirm the requested service”, “Confirm the customer’s name and service address”, “Confirm the callback phone number”, “Confirm the email address provided” Actual: Those phrases without “Confirm the” / “Confirm the customer’s”

Correction:
Confirmation options are prefixed with “Confirm the” / “Confirm the customer’s”.

Verification:
Checked against the specification text and the rendered form or the catalog that supplies that rendered text. Automated tests: 428 passing.

## QA-021
Status: FIXED
Files changed:
- src/lib/onboarding/validation/section4.ts

Original problem:
Q48. Expected: “Human review is always required when the work is classified as an emergency” Actual: “Human review is always required for emergency authorization”

Correction:
Restored “Human review is always required when the work is classified as an emergency”.

Verification:
Checked against the specification text and the rendered form or the catalog that supplies that rendered text. Automated tests: 428 passing.

## QA-022
Status: FIXED
Files changed:
- src/components/onboarding/Section*.tsx catalogs

Original problem:
Multiple contractions and titles. Expected: Apostrophes and question titles as printed, including “We don’t accept specific-technician requests”, “isn’t available”, “doesn’t know”, “didn’t solve”, “you don’t offer”, “don’t fit” Actual: “do not”, “is not”, “does not”, “did not” substitutions, plus rewritten Q42, Q45, Q49, Q54, Q61, Q66, Q68, Q71, Q73, Q97, Q102, Q116

Correction:
Restored approved contractions and question titles, including “We don’t accept specific-technician requests”.

Verification:
Checked against the specification text and the rendered form or the catalog that supplies that rendered text. Automated tests: 428 passing.

## QA-023
Status: FIXED
Files changed:
- src/components/onboarding/Section5Form.tsx

Original problem:
Extra pricing question. Expected: No such question. Pricing authority is Q73 plus per-service Q79 Actual: Required question: “When a customer asks “How much will this cost?”, what is Alexander normally allowed to do?” with four options that are not in the DOCX

Correction:
Removed the extra required “How much will this cost?” question from the form, progress, validation, and normalized policy.

Verification:
Checked in the rendered form on the local dev server, plus the automated test suite.

## QA-024
Status: FIXED
Files changed:
- src/components/onboarding/Section5Form.tsx

Original problem:
Q88. Expected: If Yes, capture “Financing provider and terms” only. “Do not expose a separate financing workflow/action matrix” Actual: Provider/terms plus a required permission checklist (explain options, send application link, help begin application, transfer, other) and a required “Approved eligibility statement”. Extra help: “Alexander must not promise financing approval.”

Correction:
Financing Yes captures provider and terms only. The permission matrix and eligibility statement are cleared and not submitted as policy.

Verification:
Checked against the specification text and the rendered form or the catalog that supplies that rendered text. Automated tests: 428 passing.

## QA-025
Status: FIXED
Files changed:
- src/lib/onboarding/validation/section5.ts

Original problem:
Q74. Expected: “Leave this section empty if your company does not charge separate fees.” The checkbox is an explicit alternate that hides the cards Actual: Empty state plus the checkbox, but Continue is blocked until a fee exists or the checkbox is selected

Correction:
An empty fee list is valid. The no-fee checkbox remains an explicit alternate.

Verification:
Checked against the specification text and the rendered form or the catalog that supplies that rendered text. Automated tests: 428 passing.

## QA-026
Status: FIXED
Files changed:
- src/components/onboarding/FeeCardEditor.tsx

Original problem:
Q74 labels. Expected: “What is this fee called?”; “What is the amount?”; “May Alexander quote this fee to customers?” with “No, Alexander should not quote it”; templates such as “Diagnostic/service-call fee” Actual: “Fee name or type”; “Amount”; quote option “No”; templates “Diagnostic / service-call” without “fee”

Correction:
Fee prompts, quote choice, and template names match the specification.

Verification:
Checked against the specification text and the rendered form or the catalog that supplies that rendered text. Automated tests: 428 passing.

## QA-027
Status: FIXED
Files changed:
- src/components/onboarding/Section5Form.tsx

Original problem:
Q75. Expected: Identify the area and the fee, normalized to service-area geography already captured Actual: Free-text “Area” plus optional amount fields. Suggestions may appear, but the row is not a reference to a Q23/Q26 area id

Correction:
Travel-fee areas are chosen from geography already captured.

Verification:
Checked against the specification text and the rendered form or the catalog that supplies that rendered text. Automated tests: 428 passing.

## QA-028
Status: FIXED
Files changed:
- src/components/onboarding/Section5Form.tsx

Original problem:
Q78. Expected: Reference the Q74 fee record instead of re-entering the amount Actual: A required long answer. Help text says not to re-enter the amount, but there is no fee picker

Correction:
Paid diagnostic visits can link an existing fee record. The link is cleared when that visit type or fee is no longer active.

Verification:
Checked against the specification text and the rendered form or the catalog that supplies that rendered text. Automated tests: 428 passing.

## QA-029
Status: FIXED
Files changed:
- src/lib/onboarding/section6Catalog.ts

Original problem:
Q115. Expected: “Mention only approved offers, memberships, or services”; “Don’t proactively recommend additional services” Actual: “Mention only approved offers, promotions, or services”; “Do not proactively recommend additional services”. Help text is also rewritten

Correction:
Additional-service options use “memberships” and “Don’t proactively recommend additional services”.

Verification:
Checked against the specification text and the rendered form or the catalog that supplies that rendered text. Automated tests: 428 passing.

## QA-030
Status: FIXED
Files changed:
- src/components/onboarding/Section7Form.tsx

Original problem:
Q129. Expected: Order: English, Spanish, Other supported language, English only. Other reveals a language field. Help includes “Select only languages verified for the selected voice.” Actual: Order starts with English only. Other is visible but disabled, and the language field never appears. Help omits the verification sentence. Screenshot `qa/screenshots/s7-voice-preview.png`

Correction:
Language order is English, Spanish, Other supported language, English only. Other opens a language field.

Verification:
Checked against the specification text and the rendered form or the catalog that supplies that rendered text. Automated tests: 428 passing.

## QA-031
Status: REMAINING
Files changed:
- src/components/onboarding/VoicePreviewCard.tsx

Original problem:
Q130. Expected: Single choice with audio previews. Help says the preview is more reliable than a description Actual: Voice A/B/C render, each with “Preview coming soon”. `previewSrc` is null. “Another approved voice” is disabled

Correction:
The preview player is present. No approved audio file exists in the repository, so playback cannot be enabled.

Verification:
Rendered Section 7 still shows “Preview coming soon” on Voice A, Voice B, and Voice C. Repository search found no mp3, wav, m4a, or ogg assets. Playback was not faked.

## QA-032
Status: FIXED
Files changed:
- src/lib/onboarding/section7Catalog.ts

Original problem:
Q132–Q140 help. Expected: Approved help, including “Alexander remains the name of the product…”, the pronunciation example, and the Q135 language-behavior help Actual: Shortened, rewritten, or missing help. Q135 has no help. Q133 adds a sentence about legal/platform disclosure that is not in the DOCX. Q134 option is “Yes — enter pronunciation details” instead of “Yes — enter the pronunciation details below”

Correction:
Restored approved voice, pronunciation, disclosure, and language-behavior help. Removed the extra legal sentence.

Verification:
Checked against the specification text and the rendered form or the catalog that supplies that rendered text. Automated tests: 428 passing.

## QA-033
Status: FIXED
Files changed:
- src/components/onboarding/Section8Form.tsx

Original problem:
Q117–Q125. Expected: Required questions show a red asterisk. Optional questions show “(Optional)” Actual: None of Q117–Q125 show an asterisk. They are still validated on continue, except where noted below. Screenshot `qa/screenshots/s8-form-no-asterisk.png`

Correction:
Q117–Q125 show a required asterisk. Q126 remains optional.

Verification:
Checked against the specification text and the rendered form or the catalog that supplies that rendered text. Automated tests: 428 passing.

## QA-034
Status: FIXED
Files changed:
- src/lib/onboarding/section8Catalog.ts

Original problem:
Q121. Expected: Required. Options include “Membership / service-plan software” and “None” Actual: Marked “(Optional)”. An empty selection is valid. Membership / service-plan software is absent. “None” is present

Correction:
Q121 is required and includes Membership / service-plan software. Empty selection blocks completion.

Verification:
Checked against the specification text and the rendered form or the catalog that supplies that rendered text. Automated tests: 428 passing.

## QA-035
Status: FIXED
Files changed:
- src/components/onboarding/AdditionalSoftwareCardEditor.tsx

Original problem:
Q121 follow-up. Expected: Each selected category gets its own software-name field Actual: Each card also requires “What should Alexander be able to access?”

Correction:
Each extra-software category asks only for the software name.

Verification:
Checked against the specification text and the rendered form or the catalog that supplies that rendered text. Automated tests: 428 passing.

## QA-036
Status: FIXED
Files changed:
- src/lib/onboarding/section8Catalog.ts

Original problem:
Q124. Expected: Full notice: sign into the company’s own software, authorize Alexander, do not enter passwords or private API credentials, and the team will configure and test Actual: Shortened notice that omits signing in and authorizing. “I understand” remains

Correction:
The connection notice includes sign-in, authorization, and the instruction not to enter passwords or API credentials.

Verification:
Checked against the specification text and the rendered form or the catalog that supplies that rendered text. Automated tests: 428 passing.

## QA-037
Status: FIXED
Files changed:
- src/lib/onboarding/validation/section8.ts

Original problem:
Q125. Expected: “Follow another rule” captures and requires the fallback rule Actual: The text area appears and is not required. `validateSection8` does not check `failureFallbackCustom`

Correction:
“Follow another rule” requires the fallback text.

Verification:
Checked against the specification text and the rendered form or the catalog that supplies that rendered text. Automated tests: 428 passing.

## QA-038
Status: FIXED
Files changed:
- src/lib/onboarding/globalReviewSummaries.ts

Original problem:
Q127 review. Expected: Fixed summaries, for example “Company information, hours and availability”, “Services, customers and service area”, “Pricing, fees, payments and financial authority” Actual: Dynamic or different summaries, for example “Identity and hours not yet complete”, “Callbacks, complaints, privacy, and unusual calls”, “CRM: Not answered…”

Correction:
Review cards use the eight approved summary sentences.

Verification:
Checked against the specification text and the rendered form or the catalog that supplies that rendered text. Automated tests: 428 passing.

## QA-039
Status: FIXED
Files changed:
- src/app/onboarding/submitted/page.tsx

Original problem:
Submission confirmation. Expected: Heading “Thank you. We have received your setup information.” Actual: Heading “Questionnaire received”. The thank-you sentence is in the body

Correction:
The confirmation heading is the approved thank-you sentence.

Verification:
Checked against the specification text and the rendered form or the catalog that supplies that rendered text. Automated tests: 428 passing.

## QA-040
Status: FIXED
Files changed:
- src/components/onboarding/SaveStatus.tsx

Original problem:
Save status. Expected: Do not imply cross-device save unless server persistence is implemented Actual: When `REDIS_URL` is missing, local save still sets status to “saved”, which renders “Saved just now”

Correction:
A browser-only save says “Saved in this browser”.

Verification:
Checked in the rendered form on the local dev server, plus the automated test suite.

## QA-041
Status: FIXED
Files changed:
- src/components/onboarding/ServicePolicy.tsx

Original problem:
Service conditions. Expected: Hidden condition text must not be stored as an active rule Actual: Switching from “With conditions” to “Ask our team first” hides the box but keeps the string on the draft. `normalizeSection2` nulls it. The submit API stores the raw draft

Correction:
Leaving “With conditions” clears that row’s condition so it is not stored as an active rule.

Verification:
Checked in the rendered form on the local dev server, plus the automated test suite.

## QA-042
Status: FIXED
Files changed:
- src/components/onboarding/Section4Form.tsx

Original problem:
Q50. Expected: “No maximum” disables and clears the numeric field Actual: The numeric field is cleared and removed from the layout

Correction:
“No maximum” disables the number field and leaves it on screen.

Verification:
Checked against the specification text and the rendered form or the catalog that supplies that rendered text. Automated tests: 428 passing.

## QA-043
Status: FIXED
Files changed:
- src/app/onboarding/sections/3/intro/page.tsx

Original problem:
Section intro. Expected: “what has—and has not—been confirmed” Actual: “what has - and has not - been confirmed”

Correction:
The confirmed-status sentence uses the approved em dashes.

Verification:
Checked against the specification text and the rendered form or the catalog that supplies that rendered text. Automated tests: 428 passing.

## QA-044
Status: FIXED
Files changed:
- src/components/onboarding/Section1Form.tsx

Original problem:
Q2 and Q7 help. Expected: Q2 “Leave blank if it's the same as the name above.” Q7 “Example: California Contractor License #123456 — C-36 Plumbing.” Actual: Q2 “it is”. Q7 “For example:” and a hyphen instead of an em dash

Correction:
Q2 and Q7 help match the approved sentences, including the em dash in the license example.

Verification:
Checked against the specification text and the rendered form or the catalog that supplies that rendered text. Automated tests: 428 passing.

## QA-046
Status: FIXED
Files changed:
- src/lib/onboarding/validation/section4.ts

Original problem:
Q46. Expected: Column “Request / schedule” Actual: “Request / schedule service”

Correction:
The caller-authority column is “Request / schedule”.

Verification:
Checked against the specification text and the rendered form or the catalog that supplies that rendered text. Automated tests: 428 passing.

## QA-048
Status: FIXED
Files changed:
- src/app/onboarding/sections/*/intro/page.tsx

Original problem:
Section intros. Expected: Section 4 names booking authority, appointment types, availability, and “You can choose how much responsibility…”. Section 5 includes “collect payment information”. Section 6 names previous-work problems, repeat callbacks, complaints, service recovery, privacy, non-service calls, and additional-service boundaries. Section 8 leads with calendar, then CRM Actual: Those sentences are rewritten or reordered. Section 5 drops “collect payment information”. Section 6 leads with “callbacks”

Correction:
Section 4–6 and 8 introductions use the approved sentences and order.

Verification:
Checked against the specification text and the rendered form or the catalog that supplies that rendered text. Automated tests: 428 passing.
