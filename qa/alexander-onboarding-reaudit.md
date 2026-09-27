# Alexander Onboarding Re-audit

Original audit remains in `qa/alexander-onboarding-audit.md` and `qa/alexander-onboarding-audit.json`.

## Original result

```text
Sections audited: 8 / 8
Active spec items audited: 114 / 114
BLOCKER: 0
CRITICAL: 0
HIGH: 22
MEDIUM: 20
LOW: 4
Exact copy mismatches: 72
Result: FAIL
```

Branch `main` at `848a71208af0b4dc90a523edb8173b14aa7d5941` before remediation.

## Retest method

The rendered questionnaire was exercised in Chrome against the local dev server after the remediation:

- Welcome copy, local save, and resume of the company name
- Section 2 service-condition rows, including two services at once and clearing a condition when the policy leaves “With conditions”
- After-hours “A smaller service area” showing the structured geography question
- Section 3 full-schedule option
- Section 5 empty fee state, add-fee controls, and absence of the extra pricing question
- Section 7 language order and voice-preview state
- Section 8 required asterisks
- Section 4 reschedule and cancel options
- Section 6 additional-service wording
- Review summaries and a successful submission of a valid draft
- Horizontal overflow at 1440, 1280, 768, and 390

Automated checks after the code changes: 428 tests passed, `npm run typecheck` passed, `npm run lint` passed, `npm run build` passed.

## Defects fixed

45 of 46 original defects are resolved in the rendered form, validation, progress, and normalized policy.

QA-019 is not an implementation defect. The first appointment-window label remains `Morning` because the specification still marks that label for video confirmation.

## Defects remaining

| ID | Severity | Status |
| --- | --- | --- |
| QA-031 | HIGH | REMAINING |

Voice A, Voice B, and Voice C still show “Preview coming soon”. The preview player is implemented, and `previewSrc` is null. The repository contains no approved audio file. Playback was not invented.

## New regressions

None found in the retest paths above. Save still persists in this browser. Submission reached “Thank you. We have received your setup information.”

## Q51

```text
Q51 first appointment-window label:
Current implementation: Morning
Status: Awaiting authoritative video confirmation
Action taken: None
```

## Retest counts

```text
BLOCKER: 0
CRITICAL: 0
HIGH: 1
MEDIUM: 0
LOW: 0

Exact copy mismatches: 0
Missing spec items: 1
Extra/obsolete customer-facing items: 0
Conditional logic defects: 0
Validation/default defects: 0
Data-model defects: 0
Responsive/UX defects: 0

Unresolved specification clarifications: 1 (Q51 label)
Result: FAIL
```

The remaining missing item is the Q130 audio preview. It is separate from the Q51 label clarification.
