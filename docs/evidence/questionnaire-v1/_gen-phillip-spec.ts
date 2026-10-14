/**
 * Regenerates Phillip's questionnaire structure spec (MD + DOCX) from the
 * frozen Q-ID inventory, registry debug labels, and current UI catalogs.
 *
 * Run: npx tsx docs/evidence/questionnaire-v1/_gen-phillip-spec.ts
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Q114_CONFIRMATIONS } from "../../../src/lib/onboarding/section8Catalog";
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
  YES_NO_POLICY_LABELS,
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

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const OUT_MD = join(REPO_ROOT, "Alexander-Final-Questionnaire-Specification-v1.0.md");
const OUT_DOCX = join(REPO_ROOT, "Alexander-Final-Questionnaire-Specification-v1.0.docx");
const DOCX_SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "build_phillip_docx.py");

const inventory = JSON.parse(
  readFileSync(join(REPO_ROOT, "docs/evidence/questionnaire-v1/qid-inventory-full.json"), "utf8"),
) as {
  freezeCommit: string;
  SCHEMA_VERSION: number;
  rootCount: number;
  childCount: number;
  entries: Entry[];
};
const entries = inventory.entries;
const registry = JSON.parse(
  readFileSync(join(REPO_ROOT, "src/lib/onboarding/questionnaire-v1/_generated-registry.json"), "utf8"),
) as {
  freezeCommit: string;
  entries: { questionId: string; debugLabel: string }[];
};
const registryLabel = new Map(registry.entries.map((e) => [e.questionId, e.debugLabel]));

function asOpts(rows: readonly { id?: string; value?: string; label: string }[]): Opt[] {
  return rows.map((row) => ({ id: row.id ?? row.value ?? "", label: row.label }));
}

function yesNoPolicyOpts(): Opt[] {
  return (Object.entries(YES_NO_POLICY_LABELS) as [string, string][]).map(([id, label]) => ({
    id,
    label,
  }));
}

const CONTACT_CATEGORY_LINES = [
  "Emergencies (`emergencies`)",
  "Urgent calls (`urgent_calls`)",
  "Scheduling exceptions (`scheduling_exceptions`)",
  "Pricing or fee exceptions (`pricing_exceptions`)",
  "Customer complaints (`customer_complaints`)",
  "Warranty or callback issues (`callback_previous_work`)",
  "Other (`other`)",
];

const CONTACT_CARD_ESCALATION = `Contact card (escalation profile), exact visible structure:
  - Person or role (short text, required)
  - Phone number (phone number, required)
  - Weekly availability (weekly schedule; days Monday–Sunday; each day Closed or open with Start and End; at least one open day required)
  - Call categories (multi-select / checkboxes, required; at least one). Exact order:
    ${CONTACT_CATEGORY_LINES.map((l) => `    - ${l}`).join("\n")}
  - When Other is selected: Other category (short text, required)`;

const FEE_SCHEDULING_CROSS_RULE =
  "If Q45 is Yes or Only under certain conditions, Q56 must include Cancellation fee. If Q46 is Yes or Only under certain conditions, Q56 must include No-show fee. If Q45 is No, Q56 must not include Cancellation fee. If Q46 is No, Q56 must not include No-show fee. “We don’t charge additional fees” cannot be selected on Q56 while Q45 or Q46 is Yes or Only under certain conditions. Enforced when continuing from Section 5 (Pricing and Payments) and again on final questionnaire submit.";

const DISPLAY_CONDITION: Record<string, string> = {
  Q5A: "Q5 includes Other (`other`)",
  Q10A: "Q10 = `specific_hours`",
  Q15A: "Q15 = `with_conditions` (Yes, with conditions)",
  Q16A: "Q16 = `with_conditions` (Yes, with conditions)",
  Q19A: "Q19 = `yes` (Yes)",
  Q26A: "Q26 = `yes` (Yes)",
  Q27A: "Q27 = `custom` (Follow another rule)",
  Q28A: "Q28 = `custom` (Use another rule)",
  Q29A: "Q29 = `reserved_capacity`, `emergency_override`, or `authorized_approval`",
  Q30A: "Q30 = `custom` (Follow another rule)",
  Q31A: "Q31 = `custom` (Follow another rule)",
  Q33A: "Q33 = `other` (Other)",
  Q35A: "Q35 = `yes` (Yes)",
  Q36A: "Q36 = `special_rules` (No - emergencies have special rules)",
  Q41A: "Q41 = `yes` (Yes)",
  Q43A: "Q43 = `conditional` (Reschedule only under certain conditions)",
  Q44A: "Q44 = `conditional` (Cancel only under certain conditions)",
  Q45A: "Q45 = `yes` or `conditional` (Yes / Only under certain conditions)",
  Q46A: "Q46 = `yes` or `conditional` (Yes / Only under certain conditions)",
  Q49A: "Q49 = `yes` (Yes)",
  Q49B: "Q49 = `yes` (Yes)",
  Q50A: "Q50 = `yes` (Yes)",
  Q52A: "Q52 = `separate_issues` (Certain issues must be scheduled separately)",
  Q53A: "Q53 includes Other (`other`)",
  Q54A: "Q54 = `allowed` (Allowed)",
  Q57A: "Q57 = `yes` (Yes)",
  Q58A: "Q58 = `yes` or `sometimes` (Yes / Sometimes)",
  Q59A: "Q59 includes Other (`other`)",
  Q62A: "Q62 includes Other (`other`)",
  Q66A: "Q66 includes Other (`other`)",
  Q67A: "Q67 includes Other (`other`)",
  Q70A: "Q70 includes Other (`other`)",
  Q73A: "Q73 includes Other (`other`) and English only is not the only language selection",
  Q74A:
    "Q74 = `another_approved` (Another approved voice) and the additional approved voice catalog is non-empty",
  Q76A: "Q76 = `company_specific` or `another_approved`",
  Q77A: "Q77 = `custom` (Custom disclosure)",
  Q78A: "Q78 = `yes` (Yes)",
  Q79A: "Q79 = `custom` (Custom rule)",
  Q81A: "Q81 = `other_approved` (Other approved accent)",
  Q85A: "Q85 = `custom` (Another system)",
  Q86A: "Q86 = `custom` (Another scheduling system)",
  Q87A: "Q87 = `custom` (Another phone system)",
  Q89A: "Q89 = `someone_else` (Someone else)",
  Q91A: "Q91 = `custom` (Follow another rule)",
};

const EXTRA_OPTIONS: Record<string, Opt[]> = {
  Q15: yesNoPolicyOpts(),
  Q16: yesNoPolicyOpts(),
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
  Q25: `Contact picker plus contact card.\n${CONTACT_CARD_ESCALATION}`,
  Q26A: `Contact picker plus contact card (same escalation profile as Q25).\n${CONTACT_CARD_ESCALATION}`,
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
  Q49B: `Contact picker plus contact card (same escalation profile as Q25).\n${CONTACT_CARD_ESCALATION}`,
  Q50A: `Repeater headed “Assignment” plus a number. Each row: Job or service (required; includes “Other job” and “Other job description”), Required technician with “Select from contacts” or “Enter technician name”, and Technician name when entering a name.`,
  Q52A: `Checklist of eligible Section 2 services plus Other. Other reveals “Describe other work that needs its own appointment” (required).`,
  Q54A: `Repeater of offered Section 2 services. Each row has a price-mode single select, exact order:
  - Exact price (\`exact\`) — shows Exact price (currency, required)
  - Starting at (\`starting_at\`) — shows Starting at (currency, required)
  - Price range (\`range\`) — shows Minimum (currency, required) and Maximum (currency, required)
  - Hourly (\`hourly\`) — shows Hourly rate (currency, required)
  - Requires an estimate / diagnosis (\`estimate\`) — no dollar amount
Then “Any conditions or details Alexander should know?” (open field, optional).`,
  Q56: `Multi-select. Each selected fee except “We don’t charge additional fees” shows Amount, When does it apply?, credit choice (${ADDITIONAL_FEE_CREDIT_OPTIONS.map((o) => o.label).join("; ")}), and “When is it credited?” only when credit is Sometimes. “We don’t charge additional fees” cannot be combined with a fee and shows no fee details.`,
  Q57A: `Repeater. Each row: Area (required) and Fee or minimum (required).`,
  Q63: `Multi-select. Each selected remedy except “None - human approval is required” shows that remedy’s rule text. None cannot be combined with a remedy.`,
  Q68: `Matrix — one disposition per non-service call type. “Transfer the call” reveals a contact selector on that row.`,
  Q78A: `Repeater. Each row: Term (required), Pronunciation (required), and optional audio sample reference.`,
  Q88: `Multi-select of software categories. Each selected category except None shows one required short-text field labeled “What software do you use?”. None cannot be combined with another category and shows no software card. No separate Other-category label, desired-access, or other-details field is rendered.`,
  Q89A: `Name (required), Email (required), Phone (optional).`,
  Q90: `Notice text, then one required checkbox labeled “I understand”. Notice: ${Q111_NOTICE_PARAGRAPHS.join(" ")}`,
  Q93: `Acknowledgement checkbox group on Final Review. Exact statements, in order:\n${Q114_CONFIRMATIONS.map((c, i) => `  ${i + 1}. ${c.label}`).join("\n")}\nAll three checkboxes are required. Final submit stays blocked until every required questionnaire section is valid and all three are checked.`,
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
  Q45:
    "Select an option. Yes or Only under certain conditions collects notice and when-it-applies text in Q45A (amount is collected in Section 5, not here). " +
    FEE_SCHEDULING_CROSS_RULE,
  Q45A: "Notice required before cancellation and When does this fee apply? are required open fields when displayed. Amount is not collected in Scheduling.",
  Q46:
    "Select an option. Yes or Only under certain conditions collects when-it-applies text in Q46A (amount is collected in Section 5, not here). " +
    FEE_SCHEDULING_CROSS_RULE,
  Q46A: "When does this fee apply? is required when displayed. Amount is not collected in Scheduling.",
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
  Q56:
    "Select at least one option. “We don’t charge additional fees” cannot be combined with a fee. A selected fee requires its visible detail fields; “When is it credited?” is required only when credit is Sometimes. " +
    FEE_SCHEDULING_CROSS_RULE,
  Q57: "Select yes or no.",
  Q57A: "Add at least one area.",
  Q58: "Select an option.",
  Q58A: "Required non-empty explanation when displayed.",
  Q59: "Select at least one payment method.",
  Q59A: "Describe the other payment method.",
  Q60: "Select at least one payment-due policy. Other is a selectable choice but does not currently reveal a text field.",
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
  Q74A:
    "Select an approved library voice (required when displayed). Control is not shown while the additional approved voice catalog is empty.",
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
  Q10: "No. Selecting specific hours displays Q10A, a required weekly schedule.",
  Q12: "Yes — “With conditions” on a row shows a required conditions text field for that service.",
  Q13: "Yes — “With conditions” on a row shows a required conditions text field for that service.",
  Q14: "Yes — “With conditions” on a row shows a required conditions text field for that customer type.",
  Q15:
    "Yes — selecting “Yes, with conditions” shows an inline required open field labeled “What are the conditions?” (registered as Q15A).",
  Q16:
    "Yes — selecting “Yes, with conditions” shows an inline required open field labeled “What are the conditions?” (registered as Q16A).",
  Q17: "No. The selected geography mode shows ZIP codes, cities, or address and radius.",
  Q19: "No. Selecting Yes displays Q19A, a required repeater of area and condition text.",
  Q20: "No. “A smaller service area” shows the geography controls.",
  Q22: "Yes — selecting “Other” displays a required “Other situation” field.",
  Q24: "No. “Only during certain hours” shows a required weekly emergency schedule.",
  Q26: "No. Selecting Yes displays Q26A, a required backup contact card.",
  Q27: "Yes — selecting “Follow another rule” displays Q27A, a required open field.",
  Q28: "Yes — selecting “Use another rule” displays Q28A, a required open field.",
  Q29: "Yes — reserved capacity, emergency override, and authorized approval each display Q29A’s matching required field.",
  Q30: "Yes — selecting “Follow another rule” displays Q30A, a required open field.",
  Q31: "Yes — selecting “Follow another rule” displays Q31A, a required open field.",
  Q32: "No. “Another person or role” asks for an approver contact on that row.",
  Q33: "Yes — selecting “Other” displays Q33A, a required open field.",
  Q35: "No. Selecting Yes displays Q35A, a required spending-limit repeater.",
  Q36: "Yes — selecting “No - emergencies have special rules” displays Q36A, a required open field.",
  Q41: "Yes — selecting Yes displays Q41A, a required booking-rule repeater.",
  Q42: "Yes — “Allowed with conditions” shows a conditions text field on that row.",
  Q43: "Yes — selecting “Reschedule only under certain conditions” displays Q43A, a required open field.",
  Q44: "Yes — selecting “Cancel only under certain conditions” displays Q44A, a required open field.",
  Q45: "Yes — Yes or Only under certain conditions displays Q45A fee-detail fields.",
  Q46: "Yes — Yes or Only under certain conditions displays Q46A fee-detail fields.",
  Q49: "No. Selecting Yes displays Q49A (callback-number single select) and Q49B (callback contact card), both required.",
  Q50: "Yes — selecting Yes displays Q50A, a required assignment repeater. Other job description is an open field on a row.",
  Q52: "Yes — “Certain issues must be scheduled separately” displays Q52A. Other on that checklist shows a required open field.",
  Q53: "Yes — selecting “Other” displays Q53A, a required short-text field.",
  Q54: "Yes — Allowed displays Q54A. Each price row has an optional conditions open field.",
  Q56: "Yes — each selected fee shows amount, applicability, and credit fields. Sometimes shows “When is it credited?”. “We don’t charge additional fees” shows no detail fields.",
  Q57: "No. Selecting Yes displays Q57A, a required repeater of open text fields.",
  Q58: "Yes — Yes or Sometimes displays Q58A, a required open field.",
  Q59: "Yes — selecting “Other” displays Q59A, a required short-text field.",
  Q62: "Yes — selecting Other displays Q62A, a required short-text field.",
  Q63: "Yes — each selected remedy shows its rule text. None shows no rule fields.",
  Q64: "Yes — Schedule a return visit shows an eligibility open field. Custom shows a custom-rule open field.",
  Q66: "Yes — selecting Other displays Q66A, a required short-text field.",
  Q67: "Yes — selecting Other displays Q67A, a required short-text field.",
  Q68: "No. Selecting “Transfer the call” on a row shows a contact selector on that row.",
  Q69: "Yes — Custom shows a custom-rule open field.",
  Q70: "Yes — selecting Other displays Q70A, a required short-text field.",
  Q71: "Yes — Custom shows a custom-rule open field.",
  Q73: "Yes — Other, when English only is not selected, displays Q73A, a required short-text field.",
  Q74:
    "No. “Another approved voice” is visible but disabled while the additional approved voice catalog is empty. When the catalog has at least one voice, selecting it displays Q74A, a required radio list.",
  Q76: "Yes — company-specific or another approved name displays Q76A, a required short-text field.",
  Q77: "Yes — custom disclosure displays Q77A, an optional open field.",
  Q78: "No. Selecting Yes displays Q78A, a required pronunciation repeater.",
  Q79: "Yes — custom displays Q79A, an optional open field.",
  Q81: "Yes — other approved accent displays Q81A, a required short-text field.",
  Q85: "Yes — “Another system” displays Q85A, a required short-text field.",
  Q86: "Yes — “Another scheduling system” displays Q86A, a required short-text field.",
  Q87: "Yes — “Another phone system” displays Q87A, a required short-text field.",
  Q88: "Yes — each selected category except None shows the required open field “What software do you use?”. Other does not reveal a separate category-label field. None shows no software card.",
  Q89: "No. Selecting someone else displays Q89A: name and email required, phone optional.",
  Q91: "Yes — “Follow another rule” displays Q91A, a required open field.",
};

/** Literal rendered prompts. Used instead of registry debug summaries. */
const EXACT_QUESTION: Record<string, string | string[]> = {
  Q19A: [
    "Area {n}",
    "City, ZIP, neighborhood, radius segment, or other area",
    "Travel fee, minimum job, selected hours, manager approval, or other approved condition",
  ],
  Q26A: ["Person or role", "Phone number", "Weekly availability", "Call categories"],
  Q27A: "What rule should Alexander follow?",
  Q28A: "What retry rule should Alexander follow?",
  Q29A: [
    "Reserved capacity: How much capacity do you reserve for emergencies?",
    "Emergency override: When is an emergency override allowed?",
    "Authorized approval: Who can approve an emergency scheduling exception?",
  ],
  Q30A: "What rule should Alexander follow?",
  Q31A: "What rule should Alexander follow?",
  Q33A: "What should Alexander do?",
  Q35A: ["Caller type", "Maximum amount"],
  Q36A: "How does emergency authorization differ?",
  Q41A: ["Service / job", "Special booking rule"],
  Q43A: "When may Alexander reschedule?",
  Q44A: "When may Alexander cancel?",
  Q45A: ["Notice required before cancellation", "When does this fee apply?"],
  Q46A: "When does this fee apply?",
  Q50A: ["Job or service", "Other job description", "Technician name"],
  Q52A: "Describe other work that needs its own appointment",
  Q57A: ["Area", "Fee or minimum"],
  Q66A: "Describe the other escalation trigger",
  Q67A: "Describe the other prohibited promise",
  Q70A: "Describe other restricted information",
  Q74A: "No separate question sentence. Choices are additional approved voice names.",
  Q93: "Confirm your answers",
  Q78A: ["Name or spelling", "Preferred pronunciation", "Optional audio example (URL or reference)"],
};

const PRESELECTED: Record<string, string> = {
  Q8: "Monday–Friday open 08:00–17:00; Saturday and Sunday closed.",
  Q9: "Monday–Saturday regular hours 08:00–18:00; Sunday no service.",
  Q21: "Each emergency row is preselected from EMERGENCY_ROW_DEFAULTS (Emergency, Urgent, but not an emergency, or Human review required).",
  Q23: "Emergency → Contact our on-call team; Urgent, but not an emergency → Schedule service; Routine / non-urgent → Schedule service.",
  Q34: "Homeowner, Landlord / property manager, Spouse / family member, and Remote family member → Full authorization; Tenant and Realtor → Schedule only; Other third party → Human approval required.",
  Q37: "Book an available appointment (`book_appointment`).",
  Q39: "All five windows start enabled, with empty start and end times.",
  Q40: "All confirmation-information options are preselected.",
  Q54: "No - Alexander should not quote service prices (`not_allowed`).",
  Q55: "Explain that pricing will be provided after the job is evaluated (`technician_after_evaluation`).",
  Q57: "No (`no`).",
  Q58A: "None. The explanation starts empty.",
  Q61: "Yes - Alexander may send customers a secure payment link (`secure_link`).",
  Q62: "Booking or service fees; Deposits; Completed invoices; Outstanding balances.",
  Q63: "None - human approval is required (`none`).",
  Q66: "The first eight escalation triggers are preselected. Other is not preselected.",
  Q67: "The first five prohibited promises are preselected. Other is not preselected.",
  Q68: "Vendor or supplier → Take a message; Sales solicitation → Politely decline; Job applicant → Take a message; Current employee → Transfer the call; Media inquiry, Attorney / legal inquiry, and Government / regulator → Human review; Wrong number / spam → Politely decline.",
  Q70: "Payment information; Information about another customer; Sensitive account information.",
  Q91: "Collect the customer’s information and send the request to our team (`collect_and_send`).",
};

function exactQuestionField(entry: Entry): { label: string; lines: string[] } {
  const exact = EXACT_QUESTION[entry.id];
  if (Array.isArray(exact)) {
    return {
      label: "Exact question(s)",
      lines: exact.map((line, index) => `  ${index + 1}. ${line}`),
    };
  }
  return {
    label: "Exact question",
    lines: [exact ?? registryLabel.get(entry.id) ?? TITLES[entry.id] ?? entry.title],
  };
}

function preselectedOf(entry: Entry): string {
  return PRESELECTED[entry.id] ?? "None";
}

function inputTypeOf(entry: Entry): string {
  const overrides: Record<string, string> = {
    Q17: "Single select / dropdown + composite structured input",
    Q74: "Single select / radio (approved voice library cards)",
    Q74A: "Single select / radio from additional approved voice catalog",
    Q90: "Required acknowledgement checkbox",
    Q93: "Acknowledgement checkbox group",
  };
  return overrides[entry.id] ?? entry.type;
}

function optionsOf(entry: Entry): Opt[] {
  if (EXTRA_OPTIONS[entry.id]?.length) return EXTRA_OPTIONS[entry.id];
  return entry.options?.length ? entry.options : [];
}

function rowsOf(entry: Entry): Row[] {
  return entry.matrixRows?.length ? entry.matrixRows : EXTRA_ROWS[entry.id] ?? [];
}

function isOpen(entry: Entry): boolean {
  return /Short text|Long\/open text|Phone number|^URL$/.test(entry.type);
}

function answerChoices(entry: Entry): string[] {
  if (entry.id === "Q74A") {
    return [
      "No selectable options currently configured. Choices are dynamically populated from ADDITIONAL_APPROVED_VOICES. The catalog is currently empty, so this control is not displayed.",
    ];
  }
  if (entry.id === "Q60") {
    const lines = ["Exact order:"];
    for (const option of optionsOf(entry)) lines.push(`  - ${option.label} (\`${option.id}\`)`);
    lines.push("Other is a selectable choice but does not currently reveal a text field.");
    return lines;
  }
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
  return DISPLAY_CONDITION[entry.id] ?? "UNKNOWN — NEEDS CONFIRMATION";
}

function requiredWhenDisplayed(entry: Entry): string {
  if (entry.required.startsWith("Optional")) return "Optional";
  return "Required";
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

const freezeShort = inventory.freezeCommit.slice(0, 7);

let spec = `# Alexander Final Questionnaire Specification v1.0

# Questionnaire Overview

Questionnaire name:  
Alexander Customer Onboarding Questionnaire

Specification version:  
1.0

- **Questionnaire schema version:** ${inventory.SCHEMA_VERSION}
- **Questionnaire specification version:** 1.0
- **Q-ID registry freeze commit:** \`${inventory.freezeCommit}\` (\`${freezeShort}\`). This identifies the permanent Q-ID registry. It is not a claim that every later questionnaire behavior change is absent.
- **Questionnaire source commit:** \`${execSync("git rev-parse HEAD", { cwd: REPO_ROOT }).toString().trim()}\`
- **Specification generated from commit/date:** \`${execSync("git rev-parse HEAD", { cwd: REPO_ROOT }).toString().trim()}\` / 2026-10-05

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

Final root Q-ID:  
**Q93**

Final Review and Submission appears after Section 8. It is not a ninth questionnaire section. Permanent Q-ID: **Q93**.

Numbered Q-IDs represent main/root questions. Letter suffixes represent conditional child questions. Matrix rows, repeater rows, contacts, services, fees, and similar structures do not become separate Q-IDs unless explicitly registered as questions.

Question counts follow the production Q-ID registry. Some composite questions contain conditional inline fields that do not have independent Q-IDs; those fields are documented inside their parent Q-ID. If every separately rendered prompt must receive its own Q-ID, that is a product decision and is listed under Items Requiring Confirmation. Production IDs are not renumbered here.

---

`;

for (const sectionId of sectionOrder) {
  const list = entries.filter((entry) => entry.section === sectionId);
  spec += `## ${sectionTitles[sectionId]}\n\n`;
  if (sectionId === "SUBMISSION") {
    spec += `Not a ninth questionnaire section.\n\n`;
  }
  for (const entry of list) {
    const choices = answerChoices(entry);
    const exact = exactQuestionField(entry);
    spec += `### ${entry.id}\n\n`;
    spec += `- **Question ID:** ${entry.id}\n`;
    spec += `- **Section:** ${sectionHeading(entry)}\n`;
    if (exact.lines.length === 1) {
      spec += `- **${exact.label}:** ${exact.lines[0]}\n`;
    } else {
      spec += `- **${exact.label}:**\n`;
      for (const line of exact.lines) spec += `${line}\n`;
    }
    spec += `- **Input type:** ${inputTypeOf(entry)}\n`;
    spec += `- **Required/Optional:** ${requiredLabel(entry)}\n`;
    spec += `- **Answer choices:** ${choices[0]}\n`;
    for (const line of choices.slice(1)) spec += `${line}\n`;
    spec += `- **Allows Other/free text:** ${otherText(entry)}\n`;
    spec += `- **Conditional:** ${entry.kind === "child" ? "Yes" : "No"}\n`;
    spec += `- **Display condition:** ${displayCondition(entry)}\n`;
    spec += `- **Required when displayed:** ${requiredWhenDisplayed(entry)}\n`;
    spec += `- **Validation/restrictions:** ${VALIDATION[entry.id] ?? "None"}\n`;
    spec += `- **Preselected/default:** ${preselectedOf(entry)}\n`;
    spec += `\n`;
  }
}

const ids = entries.map((entry) => entry.id);
const unique = new Set(ids);
const forbidden = /\b(normalized|S3|questionnaire answers|Prompt Zero|Company Truth|Harbor|ClearFlow|onboarding_id|submission_id)\b/i;
const forbiddenHits = spec.match(new RegExp(forbidden, "gi")) ?? [];
const unknownConditions = children.filter((e) => displayCondition(e).startsWith("UNKNOWN"));
const missingValidation = entries.filter((entry) => !VALIDATION[entry.id]).map((entry) => entry.id);
const q15Opts = optionsOf(entries.find((e) => e.id === "Q15")!);
const q68Opts = optionsOf(entries.find((e) => e.id === "Q68")!);
const wordingOk =
  q15Opts.some((o) => o.label === "Yes, with conditions") &&
  !q15Opts.some((o) => o.label === "With conditions" && o.id === "with_conditions");
const q68Transfer =
  q68Opts.some((o) => o.label === "Transfer the call") ||
  (STRUCTURE.Q68?.includes("Transfer the call") ?? false);

const bannedUmbrella = [
  "Capacity-mode branch details",
  "Spending limit rows",
  "Service booking rule rows",
  "Late-cancellation fee details",
  "No-show fee details (when)",
  "Technician requirement details",
  "Multi-issue custom / branch details",
  "Area / Fee or minimum rows",
  "Conditional territory details",
  "Another approved voice selection",
  "must be selected here",
];
const q74Block = spec.slice(spec.indexOf("### Q74A"), spec.indexOf("### Q75"));
const q90Block = spec.slice(spec.indexOf("### Q90"), spec.indexOf("### Q91"));
const q54aBlock = spec.slice(spec.indexOf("### Q54A"), spec.indexOf("### Q55"));
const qaChecks = {
  sections: sectionOrder.filter((s) => s !== "SUBMISSION").length === 8,
  everyQid: unique.size === entries.length && entries.length === inventory.rootCount + inventory.childCount,
  order: roots[0]?.id === "Q1" && roots.at(-1)?.id === "Q93",
  wording:
    "MANUALLY VERIFIED for corrected composite prompts; not an automated character comparison of all 137 questions. Banned umbrella titles are absent: " +
    String(
      wordingOk &&
        bannedUmbrella.every((phrase) => !spec.includes(phrase)) &&
        spec.includes("Notice required before cancellation") &&
        spec.includes("Service / job") &&
        spec.includes("Book an available appointment (`book_appointment`)."),
    ),
  helperExcluded: !spec.includes("Raw storage path") && !spec.includes("Stored option IDs"),
  options: spec.includes("Price range (`range`)") && spec.includes("Requires an estimate / diagnosis (`estimate`)"),
  optionOrder: "NOT VERIFIED — no full option-order comparison against every catalog",
  inputTypes: q90Block.includes("Required acknowledgement checkbox") && !q90Block.includes("Single select"),
  requiredOptional: "NOT VERIFIED — presence of the field is checked; values are not compared to every UI required flag",
  conditionalTriggers: unknownConditions.length === 0,
  conditionalRequired: "NOT VERIFIED — not compared to every conditional required flag",
  validation: missingValidation.length === 0 && spec.includes("Q56 must include Cancellation fee"),
  defaults:
    "MANUALLY VERIFIED against createDefault* for the listed fresh-draft defaults. Not an automated diff of every default. Q37 label present: " +
    String(spec.includes("Book an available appointment (`book_appointment`).")),
  contactCards: spec.includes("Warranty or callback issues (`callback_previous_work`)"),
  crossFee: spec.includes("If Q45 is No, Q56 must not include Cancellation fee."),
  noSynthetic: forbiddenHits.length === 0,
  noDownstream: !/\bmanifest\b/i.test(spec) && !/\bGPT\b/.test(spec) && !/\bS3\b/.test(spec),
  nothingInvented: unknownConditions.length === 0 && !q74Block.includes("Open Field"),
  q54a: ["Exact price", "Starting at", "Price range", "Hourly", "Requires an estimate / diagnosis"].every((label) =>
    q54aBlock.includes(label),
  ),
  inlineFields: spec.includes("conditional inline fields that do not have independent Q-IDs"),
};

spec += `# Items Requiring Confirmation

**Inline conditional fields and question count** — The questionnaire currently contains 93 main questions and 44 registered conditional questions, for 137 registered Q-IDs. Some additional fields that appear conditionally are documented inside their parent question rather than receiving a separate A/B/C-style Q-ID. Please confirm whether this matches the intended definition of question/subset counting, or whether every separately displayed conditional prompt should receive its own lettered Q-ID.
`;

writeFileSync(OUT_MD, spec);
writeFileSync(join(REPO_ROOT, "docs/Alexander-Final-Questionnaire-Specification-v1.0.md"), spec);

execSync(`/private/tmp/alexander-docx-venv/bin/python "${DOCX_SCRIPT}" "${OUT_MD}" "${OUT_DOCX}"`, {
  stdio: "inherit",
});

console.log(
  JSON.stringify(
    {
      OUT_MD,
      OUT_DOCX,
      roots: roots.length,
      children: children.length,
      total: entries.length,
      missingValidation,
      unknownConditions: unknownConditions.map((e) => e.id),
      wordingOk,
      q68Transfer,
      forbiddenHits,
      qaChecks,
    },
    null,
    2,
  ),
);
