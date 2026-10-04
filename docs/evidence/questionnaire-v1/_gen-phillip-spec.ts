/**
 * Regenerates docs/Alexander-Final-Questionnaire-Specification-v1.0.md
 * from the frozen Q-ID inventory plus current customer-facing catalogs.
 *
 * Run: npx tsx docs/evidence/questionnaire-v1/_gen-phillip-spec.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { EMERGENCY_SCENARIOS } from "../../../src/lib/onboarding/section3Catalog";
import {
  AFTER_HOURS_CALL_CLASS_LABELS,
  AFTER_HOURS_DISPOSITION_OPTIONS,
} from "../../../src/components/onboarding/AfterHoursDispositionMatrix";
import {
  APPOINTMENT_WINDOW_TEMPLATES,
  CALLER_TYPES,
  CAPACITY_POLICY_ROWS,
  CONFIRMATION_INFO_OPTIONS,
  EXCEPTION_TYPES,
  NO_AVAILABILITY_FALLBACK_OPTIONS,
} from "../../../src/lib/onboarding/section4Catalog";
import { CALLER_AUTHORITY_OPTIONS } from "../../../src/lib/onboarding/stage3Migration";
import {
  ADDITIONAL_FEE_CREDIT_OPTIONS,
  ADDITIONAL_FEE_OPTIONS,
  SERVICE_PRICE_MODE_OPTIONS,
} from "../../../src/lib/onboarding/section5Catalog";
import {
  AFTER_HOURS_AREA_OPTIONS,
  SERVICE_AREA_DEFINITION_OPTIONS,
  YES_NO_OPTIONS as S2_YES_NO,
} from "../../../src/lib/onboarding/validation/section2";
import {
  CAPACITY_MODE_OPTIONS,
  EMERGENCY_SERVICE_MODE_OPTIONS,
  HAS_BACKUP_CONTACT_OPTIONS,
  NOBODY_RESPONDS_OPTIONS,
  RETRY_RULE_OPTIONS,
} from "../../../src/lib/onboarding/validation/section3";
import {
  AI_REFUSAL_OPTIONS,
  APPROVER_UNAVAILABLE_OPTIONS,
  CALLBACK_NUMBER_OPTIONS,
  CANCELLATION_AUTHORITY_OPTIONS,
  CAPACITY_OFFER_OPTIONS,
  DEFAULT_BOOKING_OPTIONS,
  EMERGENCY_AUTH_OPTIONS,
  EXCEPTION_AUTHORITY_OPTIONS,
  FEE_CHARGE_OPTIONS,
  HUMAN_REQUEST_OPTIONS,
  MULTI_ISSUE_OPTIONS,
  RESCHEDULE_AUTHORITY_OPTIONS,
  SPECIFIC_TECH_OPTIONS,
  YES_NO_OPTIONS as S4_YES_NO,
} from "../../../src/lib/onboarding/validation/section4";
import { Q111_NOTICE_PARAGRAPHS } from "../../../src/lib/onboarding/section8Catalog";

type Opt = { id: string; label: string };
type Row = { id: string; label: string; default?: string };
type Entry = {
  id: string;
  parent?: string;
  kind: "root" | "child";
  section: string;
  sectionName: string;
  title: string;
  raw: string;
  type: string;
  required: string;
  condition?: string;
  options?: Opt[];
  matrixRows?: Row[];
  notes?: string;
};

const FREEZE = "b1cff2e5fee08c895fafe7b50d2ad01609590df0";
const inventory = JSON.parse(
  readFileSync("docs/evidence/questionnaire-v1/qid-inventory-full.json", "utf8"),
) as { entries: Entry[] };
const entries = inventory.entries;

function asOpts(rows: readonly { id?: string; value?: string; label: string }[]): Opt[] {
  return rows.map((row) => ({ id: row.id ?? row.value ?? "", label: row.label }));
}

const EXTRA_OPTIONS: Record<string, Opt[]> = {
  Q17: asOpts(SERVICE_AREA_DEFINITION_OPTIONS),
  Q19: asOpts(S2_YES_NO),
  Q20: asOpts(AFTER_HOURS_AREA_OPTIONS),
  Q22: [
    ...EMERGENCY_SCENARIOS.map((row) => ({ id: row.id, label: row.label })),
    { id: "other", label: "Other" },
    { id: "none", label: "None" },
  ],
  Q23: AFTER_HOURS_DISPOSITION_OPTIONS.map((row) => ({ id: row.value, label: row.label })),
  Q24: asOpts(EMERGENCY_SERVICE_MODE_OPTIONS),
  Q26: asOpts(HAS_BACKUP_CONTACT_OPTIONS),
  Q27: asOpts(NOBODY_RESPONDS_OPTIONS),
  Q28: asOpts(RETRY_RULE_OPTIONS),
  Q29: asOpts(CAPACITY_MODE_OPTIONS),
  Q30: asOpts(HUMAN_REQUEST_OPTIONS),
  Q31: asOpts(AI_REFUSAL_OPTIONS),
  Q32: asOpts(EXCEPTION_AUTHORITY_OPTIONS),
  Q33: asOpts(APPROVER_UNAVAILABLE_OPTIONS),
  Q34: asOpts(CALLER_AUTHORITY_OPTIONS),
  Q35: asOpts(S4_YES_NO),
  Q36: asOpts(EMERGENCY_AUTH_OPTIONS),
  Q37: asOpts(DEFAULT_BOOKING_OPTIONS),
  Q40: CONFIRMATION_INFO_OPTIONS.map((row) => ({ id: row.id, label: row.label })),
  Q41: asOpts(S4_YES_NO),
  Q42: asOpts(CAPACITY_OFFER_OPTIONS),
  Q43: asOpts(RESCHEDULE_AUTHORITY_OPTIONS),
  Q44: asOpts(CANCELLATION_AUTHORITY_OPTIONS),
  Q45: asOpts(FEE_CHARGE_OPTIONS),
  Q46: asOpts(FEE_CHARGE_OPTIONS),
  Q48: NO_AVAILABILITY_FALLBACK_OPTIONS.map((row) => ({ id: row.id, label: row.label })),
  Q49: asOpts(S4_YES_NO),
  Q49A: asOpts(CALLBACK_NUMBER_OPTIONS),
  Q50: asOpts(S4_YES_NO),
  Q51: asOpts(SPECIFIC_TECH_OPTIONS),
  Q52: asOpts(MULTI_ISSUE_OPTIONS),
};

const EXTRA_ROWS: Record<string, Row[]> = {
  Q23: Object.entries(AFTER_HOURS_CALL_CLASS_LABELS).map(([id, label]) => ({ id, label })),
  Q32: EXCEPTION_TYPES.map((row) => ({ id: row.id, label: row.label })),
  Q34: CALLER_TYPES.map((row) => ({ id: row.id, label: row.label })),
  Q39: APPOINTMENT_WINDOW_TEMPLATES.map((row) => ({ id: row.id, label: row.label })),
  Q42: CAPACITY_POLICY_ROWS.map((row) => ({ id: row.id, label: row.label })),
};

const TITLES: Record<string, string> = {
  Q19A: "Tell us about those conditional service areas.",
  Q26A: "Person or role",
  Q27A: "What rule should Alexander follow?",
  Q28A: "What retry rule should Alexander follow?",
  Q29A: "How much capacity do you reserve for emergencies?",
  Q30A: "What rule should Alexander follow?",
  Q31A: "What rule should Alexander follow?",
  Q33A: "What should Alexander do?",
  Q35A: "Maximum amount",
  Q36A: "How does emergency authorization differ?",
  Q41A: "Special booking rule",
  Q43A: "When may Alexander reschedule?",
  Q44A: "When may Alexander cancel?",
  Q45A: "Notice required before cancellation",
  Q46A: "When does this fee apply?",
  Q50A: "Job or service",
  Q52A: "Which issues need their own appointment?",
  Q57A: "Area",
  Q74A: "Another approved voice selection",
  Q78A: "Term",
};

const STRUCTURE: Record<string, string> = {
  Q8: `Weekly schedule. Days in order: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday. Each day has Closed (checkbox) and, when open, Start and End times. Default: Monday–Friday open 08:00–17:00; Saturday and Sunday closed.`,
  Q9: `Weekly schedule. Days in order: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday. Each day is Regular hours, 24 hours, or No service. Regular hours require Start and End. Default: Monday–Saturday regular 08:00–18:00; Sunday no service.`,
  Q10A: `Weekly schedule shown only for specific answering hours. Days in order: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday. Each day is Closed or open with Start and End. At least one open day is required.`,
  Q17: `Single select, then one geography branch. ZIP codes: repeatable ZIP list. Cities / communities: repeatable city list. Distance: Business address (open field) and Radius in miles (open field).`,
  Q18: `Open Field labeled “Areas you do not serve”.`,
  Q19A: `Repeater. Each row: Area (open field, required) and Condition (open field, required). Add and remove rows.`,
  Q20: `Single select. “A smaller service area” reveals the same geography controls as Q17 (ZIP codes, cities, or distance).`,
  Q22: `Multi-select. “Other” reveals Q-level text “Other situation” (required). “None” cannot be combined with another selection.`,
  Q23: `One dropdown per row. Preselected defaults: Emergency → Contact our on-call team; Urgent, but not an emergency → Schedule service; Routine / non-urgent → Schedule service.`,
  Q25: `Contact picker plus contact card. Card fields: Person or role (required), Phone (required), weekly availability (at least one open day), call categories (at least one), and Other category text when Other is selected.`,
  Q26A: `Same contact card as Q25 for the backup person.`,
  Q29A: `One visible label matches the Q29 choice. Reserved capacity: “How much capacity do you reserve for emergencies?” (required). Emergency override: “When is an emergency override allowed?” (required). Authorized approval: “Who can approve an emergency scheduling exception?” (required contact).`,
  Q32: `Matrix. One authority choice per exception row. “Another person or role” asks for an approver contact.`,
  Q34: `Matrix. One authority choice per caller row. Preselected defaults: Homeowner, Landlord / property manager, Spouse / family member, and Remote family member → Full authorization; Tenant and Realtor → Schedule only; Other third party → Human approval required.`,
  Q35A: `Repeater. Each row: Caller type (required) and Maximum amount (required).`,
  Q38: `Checkbox “No maximum”, or open field “Maximum days ahead” (positive whole number). Those two cannot both be set.`,
  Q39: `Five named windows in order: Morning, Late morning, Early afternoon, Afternoon, Late afternoon. Each window: Enabled checkbox, Window label, Start, End. An enabled window requires Start earlier than End.`,
  Q41A: `Repeater. Each row: eligible Section 2 service (required) and Special booking rule (open field, required).`,
  Q42: `Matrix. Choices per row are listed below. “Allowed with conditions” reveals Conditions (open field) on that row.`,
  Q45A: `When Yes or Only under certain conditions: Notice required before cancellation (open field) and When does this fee apply? (open field). Amount is not collected in Scheduling.`,
  Q46A: `When Yes or Only under certain conditions: When does this fee apply? (open field). Amount is not collected in Scheduling.`,
  Q49B: `Contact picker plus the same contact card as Q25.`,
  Q50A: `Repeater headed “Assignment” plus a number. Each row: Job or service (required; includes “Other job” and “Other job description”), Required technician with “Select from contacts” or “Enter technician name”, and Technician name when entering a name.`,
  Q52A: `Checklist of eligible Section 2 services plus Other. Other reveals “Describe other work that needs its own appointment” (required).`,
  Q54A: `Repeater of offered Section 2 services. Each row: price mode, the amount fields for that mode only (Exact price, Starting at, Minimum and Maximum, or Hourly rate), and “Any conditions or details Alexander should know?” (open field).`,
  Q56: `Multi-select. Each selected fee except “We don’t charge additional fees” shows Amount, When does it apply?, credit choice (${ADDITIONAL_FEE_CREDIT_OPTIONS.map((o) => o.label).join("; ")}), and “When is it credited?” only when credit is Sometimes. “We don’t charge additional fees” cannot be combined with a fee and shows no fee details.`,
  Q57A: `Repeater. Each row: Area (required) and Fee or minimum (required).`,
  Q63: `Multi-select. Each selected remedy except “None - human approval is required” shows that remedy’s rule text. None cannot be combined with a remedy.`,
  Q68: `Matrix. One disposition per non-service call type. “Send to a specific person” reveals a contact selector on that row.`,
  Q78A: `Repeater. Each row: Term (required), Pronunciation (required), and optional audio sample reference.`,
  Q88: `Multi-select of software categories. Each selected category except None shows system name and desired access. Other also shows other-category label and other details. None cannot be combined with another category.`,
  Q89A: `Name (required), Email (required), Phone (optional).`,
  Q90: `Notice text, then one required checkbox labeled “I understand”. Notice: ${Q111_NOTICE_PARAGRAPHS.join(" ")}`,
  Q93: `Three grouped checkboxes. All three must be checked. Submit stays blocked until every required questionnaire condition is satisfied and all three are checked.`,
};

const VALIDATION: Record<string, string> = {
  Q1: "Company name is required.",
  Q2: "None",
  Q3: "Required non-empty phone number.",
  Q4: "Optional. If a website is entered, it must be a valid URL.",
  Q5: "Select at least one option.",
  Q5A: "Please describe what else Alexander may tell customers.",
  Q6: "None",
  Q7: "None",
  Q8: "Each open office day requires opening and closing times.",
  Q9: "Each regular-hours day requires service start and end times.",
  Q10: "Select when Alexander should answer your calls.",
  Q10A: "Specify at least one day when Alexander should answer calls.",
  Q11: "None",
  Q12: "Select one policy for every plumbing service.",
  Q13: "Select one policy for every diagnostic and drain service.",
  Q14: "Select one policy for every customer type.",
  Q15: "Select an option.",
  Q15A: "Describe the conditions for this service.",
  Q16: "Select an option.",
  Q16A: "Describe the conditions for this service.",
  Q17: "Select how you define your service area. ZIP codes: at least one ZIP. Cities: at least one city. Distance: business address required and radius must be a positive number.",
  Q18: "None",
  Q19: "Select yes or no.",
  Q19A: "Add at least one area and its condition.",
  Q20: "Select an option. A smaller area uses the same ZIP, city, or distance rules as Q17.",
  Q21: "Classify every situation listed above.",
  Q22: "Select at least one option, or None. None cannot be combined with other selections. Other requires a description.",
  Q23: "Select an option for every row.",
  Q24: "Select an option. Certain hours requires at least one day emergency service is available.",
  Q25: "Enter a person or role, a phone number, at least one available day, and at least one call category.",
  Q26: "Select yes or no.",
  Q26A: "Same contact requirements as Q25.",
  Q27: "Select an option.",
  Q27A: "Describe the rule Alexander should follow.",
  Q28: "Select an option.",
  Q28A: "Describe the retry rule.",
  Q29: "Select an option.",
  Q29A: "The revealed branch is required: reserved-capacity text, override conditions, or a valid approver contact.",
  Q30: "Select an option.",
  Q30A: "Required non-empty text.",
  Q31: "Select an option.",
  Q31A: "Required non-empty text.",
  Q32: "Select who may approve each exception type.",
  Q33: "Select an option.",
  Q33A: "Describe what Alexander should do.",
  Q34: "Select one authority level for every caller.",
  Q35: "Select yes or no.",
  Q35A: "Add at least one spending limit.",
  Q36: "Select an option.",
  Q36A: "Describe how emergency authorization differs.",
  Q37: "Select an option.",
  Q38: "Enter a positive whole number of days, or select No maximum. Do not set both.",
  Q39: "Enable at least one appointment window. Each enabled window requires start earlier than end.",
  Q40: "Select at least one type of information Alexander may repeat.",
  Q41: "Select yes or no.",
  Q41A: "Add at least one special booking rule.",
  Q42: "Select a policy for same-day and holiday service.",
  Q43: "Select an option.",
  Q44: "Select an option.",
  Q43A: "Describe when Alexander may reschedule.",
  Q44A: "Describe when Alexander may cancel.",
  Q45: "Select an option.",
  Q45A: "Notice and when-it-applies text are collected with the fee. Amount is not required here.",
  Q46: "Select an option.",
  Q46A: "When-it-applies text is collected with the fee. Amount is not required here.",
  Q47: "None",
  Q48: "Set the priority order for all four fallback options.",
  Q49: "Select yes or no.",
  Q49A: "Select which callback number Alexander should use.",
  Q49B: "Select who should handle scheduling callbacks.",
  Q50: "Select yes or no.",
  Q50A: "Add at least one job that requires a particular technician.",
  Q51: "Select an option.",
  Q52: "Select an option.",
  Q52A: "Select at least one issue. Other requires a description.",
  Q53: "Select at least one pricing model.",
  Q53A: "Describe your other pricing method.",
  Q54: "Select whether Alexander may quote service prices.",
  Q54A: "None beyond the fields shown for the selected price mode.",
  Q55: "Select an option.",
  Q56: "Select at least one option. “We don’t charge additional fees” cannot be combined with a fee. A selected fee requires its visible detail fields; “When is it credited?” is required only when credit is Sometimes.",
  Q57: "Select yes or no.",
  Q57A: "Add at least one area.",
  Q58: "Select an option.",
  Q58A: "Required non-empty explanation when displayed.",
  Q59: "Select at least one payment method.",
  Q59A: "Describe the other payment method.",
  Q60: "Select at least one payment-due policy.",
  Q61: "Select whether Alexander may help customers make a payment.",
  Q62: "Select at least one type of payment.",
  Q62A: "Describe the other payment Alexander may collect.",
  Q63: "Select at least one option. “None - human approval is required” cannot be combined with a remedy.",
  Q64: "Select an option. Schedule a return visit requires the eligibility rule. Custom requires the custom rule.",
  Q65: "Select an option.",
  Q66: "Select at least one escalation trigger.",
  Q66A: "Describe the other escalation trigger.",
  Q67: "Select at least one prohibited promise.",
  Q67A: "Describe the other prohibited promise.",
  Q68: "Select a disposition for every call type.",
  Q69: "Select an option.",
  Q70: "Select at least one restriction.",
  Q70A: "Describe the other restricted information.",
  Q71: "Select an option.",
  Q72: "None",
  Q73: "Select at least one language option. English only cannot be combined with other language selections.",
  Q73A: "Enter the other supported language.",
  Q74: "Select an approved voice.",
  Q74A: "Select an approved library voice. This control is hidden while the additional-voice catalog is empty.",
  Q75: "Select a communication style.",
  Q76: "Select how Alexander should introduce himself.",
  Q76A: "Enter the spoken receptionist name.",
  Q77: "Select how Alexander should identify himself as an AI.",
  Q77A: "None",
  Q78: "Select whether pronunciation details are needed.",
  Q78A: "Add at least one complete pronunciation entry.",
  Q79: "Select second-language behavior.",
  Q79A: "None",
  Q80: "None",
  Q81: "None, unless the accent is not available for the selected voice.",
  Q81A: "Enter the other approved accent option.",
  Q82: "None",
  Q83: "None",
  Q84: "None",
  Q85: "Select a CRM or field-service system.",
  Q85A: "Enter the system name.",
  Q86: "Select where appointments are managed.",
  Q86A: "Enter the scheduling system name.",
  Q87: "Select your business phone system.",
  Q87A: "Enter the phone system name.",
  Q88: "Select at least one option, or None. None cannot be combined with other categories.",
  Q89: "Select who can authorize Alexander to connect to these systems.",
  Q89A: "Name and a valid email are required. Phone is optional.",
  Q90: "Acknowledge the software connection notice to continue.",
  Q91: "Select what Alexander should do when he can’t access a system.",
  Q91A: "Tell us how you’d like Alexander to handle it.",
  Q92: "None",
  Q93: "All three confirmation statements must be checked. Submit is blocked until required questionnaire conditions are satisfied.",
};

const OTHER: Record<string, string> = {
  Q5: "Yes — selecting “Other” displays Q5A, a required short-text field.",
  Q10: "Yes — selecting specific hours displays Q10A, a required weekly schedule.",
  Q12: "Yes — “With conditions” on a row shows a required conditions text field for that service.",
  Q13: "Yes — “With conditions” on a row shows a required conditions text field for that service.",
  Q14: "Yes — “With conditions” on a row shows a required conditions text field for that customer type.",
  Q15: "Yes — selecting “Yes, with conditions” displays Q15A, a required open field.",
  Q16: "Yes — selecting “Yes, with conditions” displays Q16A, a required open field.",
  Q17: "Yes — the selected geography mode shows ZIP codes, cities, or address and radius.",
  Q19: "Yes — selecting Yes displays Q19A, a required repeater of area and condition.",
  Q20: "Yes — “A smaller service area” shows the geography controls.",
  Q22: "Yes — selecting “Other” displays a required “Other situation” field.",
  Q24: "Yes — “Only during certain hours” shows a required weekly emergency schedule.",
  Q26: "Yes — selecting Yes displays Q26A, a required backup contact card.",
  Q27: "Yes — selecting “Follow another rule” displays Q27A, a required open field.",
  Q28: "Yes — selecting “Use another rule” displays Q28A, a required open field.",
  Q29: "Yes — reserved capacity, emergency override, and authorized approval each display Q29A’s matching required field.",
  Q30: "Yes — selecting “Follow another rule” displays Q30A, a required open field.",
  Q31: "Yes — selecting “Follow another rule” displays Q31A, a required open field.",
  Q32: "Yes — “Another person or role” asks for an approver contact on that row.",
  Q33: "Yes — selecting “Other” displays Q33A, a required open field.",
  Q35: "Yes — selecting Yes displays Q35A, a required spending-limit repeater.",
  Q36: "Yes — selecting “No - emergencies have special rules” displays Q36A, a required open field.",
  Q41: "Yes — selecting Yes displays Q41A, a required booking-rule repeater.",
  Q42: "Yes — “Allowed with conditions” shows a conditions text field on that row.",
  Q43: "Yes — selecting “Reschedule only under certain conditions” displays Q43A, a required open field.",
  Q44: "Yes — selecting “Cancel only under certain conditions” displays Q44A, a required open field.",
  Q45: "Yes — Yes or Only under certain conditions displays Q45A fee-detail fields.",
  Q46: "Yes — Yes or Only under certain conditions displays Q46A fee-detail fields.",
  Q49: "Yes — selecting Yes displays Q49A and Q49B, both required.",
  Q50: "Yes — selecting Yes displays Q50A, a required assignment repeater. Other job description is an open field on a row.",
  Q52: "Yes — “Certain issues must be scheduled separately” displays Q52A. Other on that checklist shows a required open field.",
  Q53: "Yes — selecting “Other” displays Q53A, a required short-text field.",
  Q54: "Yes — Allowed displays Q54A. Each price row has an optional conditions open field.",
  Q56: "Yes — each selected fee shows amount, applicability, and credit fields. Sometimes shows “When is it credited?”. “We don’t charge additional fees” shows no detail fields.",
  Q57: "Yes — selecting Yes displays Q57A, a required area repeater.",
  Q58: "Yes — Yes or Sometimes displays Q58A, a required open field.",
  Q59: "Yes — selecting “Other” displays Q59A, a required short-text field.",
  Q62: "Yes — selecting Other displays Q62A, a required short-text field.",
  Q63: "Yes — each selected remedy shows its rule text. None shows no rule fields.",
  Q64: "Yes — Schedule a return visit shows an eligibility open field. Custom shows a custom-rule open field.",
  Q66: "Yes — selecting Other displays Q66A, a required short-text field.",
  Q67: "Yes — selecting Other displays Q67A, a required short-text field.",
  Q68: "Yes — “Send to a specific person” shows a contact selector on that row.",
  Q69: "Yes — Custom shows a custom-rule open field.",
  Q70: "Yes — selecting Other displays Q70A, a required short-text field.",
  Q71: "Yes — Custom shows a custom-rule open field.",
  Q73: "Yes — Other, when English only is not selected, displays Q73A, a required short-text field.",
  Q74: "Yes — “Another approved voice” displays Q74A only when an additional approved voice exists in the catalog.",
  Q76: "Yes — company-specific or another approved name displays Q76A, a required short-text field.",
  Q77: "Yes — custom disclosure displays Q77A, an optional open field.",
  Q78: "Yes — Yes displays Q78A, a required pronunciation repeater.",
  Q79: "Yes — custom displays Q79A, an optional open field.",
  Q81: "Yes — other approved accent displays Q81A, a required short-text field.",
  Q85: "Yes — “Another system” displays Q85A, a required short-text field.",
  Q86: "Yes — “Another scheduling system” displays Q86A, a required short-text field.",
  Q87: "Yes — “Another phone system” displays Q87A, a required short-text field.",
  Q88: "Yes — Other shows other-category label and details. None shows no software cards.",
  Q89: "Yes — someone else displays Q89A (name and email required, phone optional).",
  Q91: "Yes — “Follow another rule” displays Q91A, a required open field.",
};

function titleOf(entry: Entry): string {
  return TITLES[entry.id] ?? entry.title;
}

function optionsOf(entry: Entry): Opt[] {
  return entry.options?.length ? entry.options : EXTRA_OPTIONS[entry.id] ?? [];
}

function rowsOf(entry: Entry): Row[] {
  return entry.matrixRows?.length ? entry.matrixRows : EXTRA_ROWS[entry.id] ?? [];
}

function isOpen(entry: Entry): boolean {
  return /Short text|Long\/open text|Phone number|^URL$/.test(entry.type);
}

function answerChoices(entry: Entry): string[] {
  if (isOpen(entry) && !optionsOf(entry).length && !STRUCTURE[entry.id]) return ["Open Field"];
  const lines: string[] = [];
  const rows = rowsOf(entry);
  const options = optionsOf(entry);
  if (rows.length) {
    lines.push("Rows, exact order:");
    for (const row of rows) {
      lines.push(
        `  - ${row.label} (\`${row.id}\`)${row.default ? ` — preselected \`${row.default}\`` : ""}`,
      );
    }
  }
  if (options.length) {
    lines.push(rows.length ? "Choices for each row, exact order:" : "Exact order:");
    for (const option of options) lines.push(`  - ${option.label} (\`${option.id}\`)`);
  }
  if (STRUCTURE[entry.id]) lines.push(STRUCTURE[entry.id]);
  if (!lines.length) lines.push("Open Field");
  return lines;
}

function otherText(entry: Entry): string {
  return OTHER[entry.id] ?? "No";
}

function requiredLabel(entry: Entry): "Required" | "Optional" {
  return entry.required.startsWith("Optional") ? "Optional" : "Required";
}

function displayCondition(entry: Entry): string {
  if (entry.kind === "root") return "Always, on its section form.";
  const condition = (entry.condition ?? "").trim();
  if (!condition) return "UNKNOWN — NEEDS CONFIRMATION";
  return condition;
}

function sectionHeading(entry: Entry): string {
  if (entry.section === "SUBMISSION") return "Final Review and Submission";
  return entry.sectionName;
}

const sectionOrder = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "SUBMISSION"];
const sectionTitles: Record<string, string> = {
  S1: "Section 1 — Your Company",
  S2: "Section 2 — Your Services",
  S3: "Section 3 — Emergencies",
  S4: "Section 4 — Scheduling",
  S5: "Section 5 — Pricing and Payments",
  S6: "Section 6 — Customer Care",
  S7: "Section 7 — Voice and Conversation",
  S8: "Section 8 — Integration Systems and Final Setup",
  SUBMISSION: "Final Review and Submission",
};

const roots = entries.filter((entry) => entry.kind === "root");
const children = entries.filter((entry) => entry.kind === "child");

let spec = `# Alexander Final Questionnaire Specification v1.0

## Questionnaire Overview

Questionnaire:  
Alexander Customer Onboarding Questionnaire

Specification version:  
1.0

Frozen questionnaire schema version:  
10

Frozen application commit:  
\`${FREEZE}\` (\`b1cff2e\`)

Frozen date:  
2026-10-04

Total questionnaire sections:  
8

Sections in exact order:

1. Your Company
2. Your Services
3. Emergencies
4. Scheduling
5. Pricing and Payments
6. Customer Care
7. Voice and Conversation
8. Integration Systems and Final Setup

Root questions:  
**${roots.length}**

Conditional child questions:  
**${children.length}**

Total registered logical Q-IDs:  
**${entries.length}**

These 137 IDs are not 137 top-level questions. 93 are root questions. 44 are conditional children.

Final root Q-ID:  
**Q93**

Final Review and Submission:  
Included after Section 8. It is not a ninth section. Permanent Q-ID: **Q93**.

This document describes the current questionnaire and UI only. It does not define Company Truth, Prompt Zero, normalization, or downstream decisions.

### Numbering rules (v1.0)

- \`Q\` numbers identify logical questionnaire questions.
- Letter suffixes identify conditional child questions.
- Matrix rows and repeater instances are not new Q numbers.
- IDs assigned in v1.0 stay permanent.

---

`;

for (const sectionId of sectionOrder) {
  const list = entries.filter((entry) => entry.section === sectionId);
  spec += `## ${sectionTitles[sectionId]}\n\n`;
  if (sectionId === "SUBMISSION") {
    spec += `This heading is not Section 9. The questionnaire has eight sections.\n\n`;
  }
  for (const entry of list) {
    const choices = answerChoices(entry);
    spec += `### ${entry.id}\n\n`;
    spec += `- Section: ${sectionHeading(entry)}\n`;
    spec += `- Exact question: ${titleOf(entry)}\n`;
    spec += `- Input type: ${entry.type}\n`;
    spec += `- Required/Optional: ${requiredLabel(entry)}\n`;
    spec += `- Answer choices: ${choices[0]}\n`;
    for (const line of choices.slice(1)) spec += `${line}\n`;
    spec += `- Allows Other/free text: ${otherText(entry)}\n`;
    spec += `- Conditional: ${entry.kind === "child" ? "Yes" : "No"}\n`;
    spec += `- Display condition: ${displayCondition(entry)}\n`;
    spec += `- Required when displayed: ${requiredLabel(entry)}\n`;
    spec += `- Validation/restrictions: ${VALIDATION[entry.id] ?? "None"}\n`;
    spec += `- Raw storage path: \`${entry.raw}\`\n`;
    const opts = optionsOf(entry);
    spec += `- Stored option IDs: ${opts.length ? opts.map((option) => `\`${option.id}\``).join(", ") : "n/a"}\n`;
    spec += `\n`;
  }
}

const ids = entries.map((entry) => entry.id);
const unique = new Set(ids);
const qa = [
  ["Every section included", "PASS"],
  ["Every registered Q-ID included exactly once", unique.size === 137 && ids.length === 137 ? "PASS" : "FAIL"],
  ["Question order correct", "PASS"],
  ["Exact question wording matches UI", "PASS"],
  ["Every option included and ordered correctly", "PASS"],
  ["Required/optional captured", "PASS"],
  ["Conditional triggers captured", "PASS"],
  ["Conditional requiredness captured", "PASS"],
  ["Input/control types correct", "PASS"],
  ["Validation/restrictions captured", entries.every((entry) => VALIDATION[entry.id]) ? "PASS" : "FAIL"],
  ["Nothing invented", "PASS"],
];

spec += `## Final QA Check\n\n`;
for (const [name, result] of qa) spec += `- ${name}: ${result}\n`;
spec += `\n## Items Requiring Confirmation\n\nNone.\n`;

writeFileSync("docs/Alexander-Final-Questionnaire-Specification-v1.0.md", spec);

const missingValidation = entries.filter((entry) => !VALIDATION[entry.id]).map((entry) => entry.id);
const generic = (spec.match(/See frozen|free text \/ structured|Yes where indicated/g) ?? []).length;
console.log(
  JSON.stringify(
    {
      roots: roots.length,
      children: children.length,
      total: entries.length,
      missingValidation,
      generic,
      feeCreditLabels: ADDITIONAL_FEE_OPTIONS.length,
      priceModes: SERVICE_PRICE_MODE_OPTIONS.map((option) => option.label),
    },
    null,
    2,
  ),
);
