# Alexander Browser E2E Remediation

Source: verified browser defects AX-BE2E-001 through AX-BE2E-009.
Approved question wording, answer options, branching, and payload shape were left in place.
Q51 appointment-window label remains `Morning`. Q130 voice previews remain `Preview coming soon`.

| ID | Original Severity | Status | Root Cause | Files Changed | Verification |
| -- | ----------------- | ------ | ---------- | ------------- | ------------ |
| AX-BE2E-001 | MEDIUM | FIXED | Section 1 required errors were generic `required.` strings, so a failed continue did not name the missing field. | `src/lib/onboarding/validation/section1.ts`, `src/lib/onboarding/validation/section3.ts`, `src/components/onboarding/Section1Form.tsx` | Empty Section 1 with specific hours, then Continue. Alerts were `Company name is required.`, `Main business phone number is required.`, `Select at least one option.`, and `Specify at least one day when Alexander should answer calls.` No alert was exactly `required.` Schedule day errors now name the day, for example `Monday: opening and closing times are required when the office is open.` |
| AX-BE2E-002 | HIGH | FIXED | `OfficeWeeklySchedule` and `ServiceWeeklySchedule` built ids from the weekday only (`monday-start`, `monday-end`, `monday-availability`), so every schedule on the page shared those ids. | `src/components/onboarding/WeeklySchedule.tsx`, `src/components/onboarding/Section1Form.tsx`, `src/components/onboarding/Section3Form.tsx`, `src/components/onboarding/ContactCardEditor.tsx` | Each schedule now requires a stable `idPrefix`. On one Section 1 screen, `#office-hours-monday-start`, `#service-hours-monday-start`, and `#alexander-hours-monday-start` each appeared once, and `label[for=office-hours-monday-start]` matched. Duplicate `id` list was empty. Section 3 `#primary-contact-hours-monday-start` appeared once; duplicate `id` list was empty. Contact cards use prefixes such as `primary-contact-hours` and `backup-contact-hours`. |
| AX-BE2E-003 | MEDIUM | FIXED | Matrix condition validation used one shared sentence, `Describe the conditions for this service.`, for every row. | `src/lib/onboarding/validation/section2.ts`, `src/lib/onboarding/validation/section2.test.ts` | Three services set to `With conditions` produced `Describe the conditions for General plumbing repair.`, `Describe the conditions for Toilet repair or replacement.`, and `Describe the conditions for Water heater repair.` Single-choice Q20/Q21 messages are unchanged. |
| AX-BE2E-004 | HIGH | FIXED | Excluded territory and after-hours geography do not share a React state path. Geography inputs had no `name`. When the after-hours control unmounted, the browser moved that unnamed value into the previous unnamed excluded-territory textarea and fired `onChange`. | `src/components/onboarding/Section2Form.tsx`, `src/components/onboarding/ui/Fields.tsx`, `src/components/onboarding/ui/TokenListField.tsx` | Entered excluded geography `Area A` and after-hours geography `Area B`, then toggled after-hours area several times back to `Same service area as normal`. Excluded territory stayed `Area A`. Stored draft: `afterHoursMode: "same"`, `afterHoursCities: []`, `afterHoursZips: []`. Leaving `A smaller service area` clears after-hours geography in React state. Normalization still emits after-hours geography only when the mode is `smaller`. Inputs use `name={id}` and `autoComplete="off"`. |
| AX-BE2E-005 | MEDIUM | FIXED | Every overlapping window stored the same sentence, `This window overlaps another enabled window.` | `src/lib/onboarding/validation/section4.ts`, `src/lib/onboarding/validation/section4.test.ts`, `src/components/onboarding/AppointmentWindowEditor.tsx` | Overlap checks remain. Each conflicting window gets one named message, for example `Morning overlaps Late morning.` With morning 08:00–11:00 and late morning 10:00–12:00, the form showed those two sentences and zero copies of `another enabled window.` Affected rows stay highlighted. |
| AX-BE2E-006 | LOW | FIXED | The approved helper `Put these in the order Alexander should try them.` was easy to miss, so users learned the four-option ranking rule only after Continue failed. | `src/components/onboarding/Section4Form.tsx` | The approved helper remains. A visible line now reads `Rank all four options from first choice to last choice.` Ranking logic and the validation message `Set the priority order for all four fallback options.` are unchanged. Both sentences were present once on the Section 4 form. |
| AX-BE2E-007 | MEDIUM | FIXED | Invalid price rows all used `Enter a valid approved price greater than zero.` with no service name. | `src/lib/onboarding/validation/section5.ts`, `src/components/onboarding/ServicePricingCards.tsx` | Three quote-approved exact-price rows left invalid produced `Enter a valid approved price greater than zero for General plumbing repair.`, `…Toilet repair or replacement.`, and `…Water heater repair.` The invalid card border uses the required color. Minimum, maximum, and range messages also name the service. |
| AX-BE2E-008 | MEDIUM | FIXED | Phone-provider radios displayed provider names while the underlying values were not stable element-associated ids. Catalog ids were already the semantic values; radios now also have unique ids bound to those values. | `src/components/onboarding/ui/RadioGroup.tsx`, `src/components/onboarding/Section8Form.tsx`, `src/components/onboarding/Section7Form.tsx` | Section 8 phone radios exposed `ringcentral`, `dialpad`, `zoom_phone`, `gohighlevel`, `traditional_landline`, `mobile_phones`, `custom`, and `not_sure`, each once. Selecting RingCentral stored `section8.phoneProvider === "ringcentral"`. After reload, `#phoneProvider-ringcentral` stayed checked. The “Another approved voice” radio uses `value` `another` via `VOICE_CHOICE_ANOTHER`. |
| AX-BE2E-009 | MEDIUM | FIXED | Final confirmation checkboxes could be clicked, but they lacked unique ids and matching `htmlFor` labels, so the accessible name and keyboard target were unreliable. | `src/components/onboarding/OnboardingGlobalReview.tsx`, `src/components/onboarding/Section8Form.tsx` | Each confirmation uses `id` and `htmlFor` `confirm-${key}` (`confirm-answersAccurate`, `confirm-capabilitiesDependOnIntegrations`, `confirm-actionsRequireSupportAuthorizationConfirmation`). Locator `checkbox` named `/I confirm that these answers accurately/` matched once. Space toggled the focused checkbox. Clicking the second confirmation’s label checked `#confirm-capabilitiesDependOnIntegrations`. With all required confirmations set, Submit Questionnaire was enabled and submission reached `Thank you. We have received your setup information.` |

## Accessibility sweep

Checked the questionnaire controls touched by these defects:

- Schedule inputs use unique ids and matching `htmlFor` labels.
- Phone-provider and voice radios have non-empty, unique values.
- Final confirmation checkboxes toggle from the label, the checkbox, and keyboard Space.
- Text and geography fields set `name` from their id. Empty visible labels no longer render an empty `<label>`.
- No duplicate ids were found on the Section 1 schedule screen or the Section 3 primary-contact schedule screen.

## Regression

- Tests: 428 passed, 0 failed.
- Typecheck: PASS (`tsc --noEmit`).
- Lint: PASS (`eslint src`).
- Build: PASS (`next build`, Next.js 15.5.26).
- Save/resume: PASS. RingCentral remained selected after reload.
- Review/edit: PASS. Review rendered the confirmation controls and the submit action.
- Submission: PASS.

## Responsive

`documentElement.scrollWidth` matched `clientWidth` (no horizontal document overflow):

| Surface | 1440 | 1280 | 768 | 390 |
| -- | -- | -- | -- | -- |
| Section 2 service matrix | PASS | PASS | PASS | PASS |
| Section 4 appointment windows | PASS | PASS | PASS | PASS |
| Section 5 fee/pricing | PASS | PASS | PASS | PASS |
| Review | PASS | PASS | PASS | PASS |

## Known external

- Q51 — first appointment-window label remains `Morning`, awaiting authoritative Zoom-video confirmation.
- Q130 — approved voice preview audio is unavailable. Previews stay `Preview coming soon`.
