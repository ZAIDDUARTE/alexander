/**
 * One-shot evidence doc generator. Not application runtime code.
 * Run: npx tsx docs/evidence/questionnaire-v1/_gen-spec-docs.ts
 */
import { writeFileSync } from "node:fs";
import {
  PLUMBING_SERVICES,
  DIAGNOSTIC_SERVICES,
  CUSTOMER_PROPERTY_TYPES,
} from "../../../src/lib/onboarding/section2Catalog";
import { EMERGENCY_SCENARIOS } from "../../../src/lib/onboarding/section3Catalog";
import { EMERGENCY_ROW_DEFAULTS } from "../../../src/lib/onboarding/section3Defaults";
import {
  CALLER_TYPES,
  EXCEPTION_TYPES,
  APPOINTMENT_WINDOW_TEMPLATES,
} from "../../../src/lib/onboarding/section4Catalog";
import { CALLER_AUTHORITY_DEFAULTS } from "../../../src/lib/onboarding/types";
import {
  PRICING_MODEL_OPTIONS,
  QUOTE_PERMISSION_OPTIONS,
  SERVICE_PRICE_MODE_OPTIONS,
  UNKNOWN_PRICE_OPTIONS,
  ADDITIONAL_FEE_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  PAYMENT_DUE_OPTIONS,
  PAYMENT_ASSISTANCE_OPTIONS,
  PAYMENT_COLLECTION_OPTIONS,
  DEFAULT_PAYMENT_COLLECTION_SCOPE,
  FINANCIAL_REMEDY_OPTIONS,
} from "../../../src/lib/onboarding/section5Catalog";
import {
  NON_SERVICE_CALL_TYPE_ROWS,
  NON_SERVICE_DISPOSITION_OPTIONS,
  DEFAULT_NON_SERVICE_DISPOSITIONS,
} from "../../../src/lib/onboarding/section6Catalog";
import {
  CRM_FSM_OPTIONS,
  SCHEDULING_OPTIONS,
  PHONE_OPTIONS,
  ADDITIONAL_SOFTWARE_CATEGORIES,
  CONNECTION_OWNER_OPTIONS,
  FAILURE_FALLBACK_OPTIONS,
  Q114_CONFIRMATIONS,
} from "../../../src/lib/onboarding/section8Catalog";
import { CALLER_AUTHORITY_OPTIONS } from "../../../src/lib/onboarding/stage3Migration";
import {
  COMMUNICATION_STYLE_OPTIONS,
  SPOKEN_NAME_OPTIONS,
  AI_DISCLOSURE_OPTIONS,
  PRONUNCIATION_MODE_OPTIONS,
  LANGUAGE_SWITCHING_OPTIONS,
  PERCEIVED_VOICE_OPTIONS,
  FORMALITY_OPTIONS,
} from "../../../src/lib/onboarding/section7Catalog";
import {
  APPROVED_PRIMARY_VOICES,
  APPROVED_ACCENT_OPTIONS,
} from "../../../src/lib/onboarding/approvedVoiceCatalog";
import { DEFAULT_BOOKING_OPTIONS } from "../../../src/lib/onboarding/validation/section4";
import {
  AFTER_HOURS_DISPOSITION_OPTIONS,
  AFTER_HOURS_CALL_CLASS_LABELS,
} from "../../../src/components/onboarding/AfterHoursDispositionMatrix";
import { EMERGENCY_CLASSIFICATION_LABELS } from "../../../src/components/onboarding/EmergencyClassification";

type Opt = { id: string; label: string };
type Row = { id: string; label: string; default?: string };
type Entry = {
  id: string;
  parent?: string;
  kind: "root" | "child";
  section: string;
  sectionName: string;
  evidence?: string;
  title: string;
  raw: string;
  file: string;
  type: string;
  required: string;
  condition?: string;
  defaultValue?: string;
  options?: Opt[];
  matrixRows?: Row[];
  notes?: string;
};

const entries: Entry[] = [];
let n = 0;
const letter = (i: number) =>
  i < 26 ? String.fromCharCode(65 + i) : `A${String.fromCharCode(65 + (i - 26))}`;
function R(e: Omit<Entry, "id" | "kind">): string {
  n += 1;
  const id = `Q${n}`;
  entries.push({ ...e, id, kind: "root" });
  return id;
}
function C(parent: string, idx: number, e: Omit<Entry, "id" | "kind" | "parent">): string {
  const id = `${parent}${letter(idx)}`;
  entries.push({ ...e, id, parent, kind: "child" });
  return id;
}

const S1 = ["S1", "Your Company"] as const;
const S2 = ["S2", "Your Services"] as const;
const S3 = ["S3", "Emergencies"] as const;
const S4 = ["S4", "Scheduling"] as const;
const S5 = ["S5", "Pricing and Payments"] as const;
const S6 = ["S6", "Customer Care"] as const;
const S7 = ["S7", "Voice and Conversation"] as const;
const S8 = ["S8", "Integration Systems and Final Setup"] as const;
const SUB = ["SUBMISSION", "Final Review and Submission"] as const;

const policyOpts: Opt[] = [
  { id: "offered", label: "We offer this" },
  { id: "with_conditions", label: "With conditions" },
  { id: "ask_team", label: "Ask our team first" },
  { id: "not_offered", label: "We don’t offer this" },
];

// ---- S1 ----
R({
  section: S1[0],
  sectionName: S1[1],
  evidence: "E-S1-01",
  title: "What name do your customers know your company by?",
  raw: "section1.customerFacingName",
  file: "Section1Form.tsx",
  type: "Short text",
  required: "Required",
});
R({
  section: S1[0],
  sectionName: S1[1],
  evidence: "E-S1-02",
  title: "What is your legal business name?",
  raw: "section1.legalName",
  file: "Section1Form.tsx",
  type: "Short text",
  required: "Optional",
});
R({
  section: S1[0],
  sectionName: S1[1],
  evidence: "E-S1-03",
  title: "What is your main business phone number?",
  raw: "section1.mainPhone",
  file: "Section1Form.tsx",
  type: "Phone number",
  required: "Required",
});
R({
  section: S1[0],
  sectionName: S1[1],
  evidence: "E-S1-04",
  title: "What is your website?",
  raw: "section1.website",
  file: "Section1Form.tsx",
  type: "URL",
  required: "Optional",
});
const qClaims = R({
  section: S1[0],
  sectionName: S1[1],
  evidence: "E-S1-05",
  title: "Which of these may Alexander tell customers?",
  raw: "section1.approvedClaims",
  file: "Section1Form.tsx",
  type: "Multi-select / checkboxes",
  required: "Required",
  notes: "Exact option labels from APPROVED_CLAIM_OPTIONS in Section1Form / catalog",
});
C(qClaims, 0, {
  section: S1[0],
  sectionName: S1[1],
  title: "What other credential or trust claim may Alexander tell customers?",
  raw: "section1.otherApprovedClaim",
  file: "Section1Form.tsx",
  type: "Short text",
  required: "Required when displayed",
  condition: `${qClaims} includes other`,
});
R({
  section: S1[0],
  sectionName: S1[1],
  evidence: "E-S1-06",
  title: "Are there any license numbers or credential details Alexander may give customers?",
  raw: "section1.licensingDetails",
  file: "Section1Form.tsx",
  type: "Long/open text",
  required: "Optional",
});
R({
  section: S1[0],
  sectionName: S1[1],
  evidence: "E-S1-07",
  title: "Is there anything Alexander should never claim about your company?",
  raw: "section1.forbiddenClaims",
  file: "Section1Form.tsx",
  type: "Long/open text",
  required: "Optional",
});
R({
  section: S1[0],
  sectionName: S1[1],
  evidence: "E-S1-08",
  title: "What are your normal office hours?",
  raw: "section1.officeHours",
  file: "Section1Form.tsx",
  type: "Weekly schedule",
  required: "Required",
});
R({
  section: S1[0],
  sectionName: S1[1],
  evidence: "E-S1-09",
  title: "When are service appointments normally available?",
  raw: "section1.serviceHours",
  file: "Section1Form.tsx",
  type: "Weekly schedule",
  required: "Required",
});
const qAns = R({
  section: S1[0],
  sectionName: S1[1],
  evidence: "E-S1-10",
  title: "When should Alexander answer your calls?",
  raw: "section1.answeringMode",
  file: "Section1Form.tsx",
  type: "Single select",
  required: "Required",
});
C(qAns, 0, {
  section: S1[0],
  sectionName: S1[1],
  title: "What hours should Alexander answer?",
  raw: "section1.answeringSchedule",
  file: "Section1Form.tsx",
  type: "Weekly schedule",
  required: "Required when displayed",
  condition: `${qAns} = specific_hours`,
});
R({
  section: S1[0],
  sectionName: S1[1],
  evidence: "E-S1-11",
  title: "Is there any recurring availability rule Alexander should know?",
  raw: "section1.recurringAvailabilityNotes",
  file: "Section1Form.tsx",
  type: "Long/open text",
  required: "Optional",
});

// ---- S2 ----
R({
  section: S2[0],
  sectionName: S2[1],
  evidence: "E-S2-01",
  title: "Which plumbing services does your company provide?",
  raw: "section2.plumbingServices[serviceId].{policy,condition}",
  file: "Section2Form.tsx + ServicePolicy.tsx",
  type: "Matrix — single select per row",
  required: "Required",
  options: policyOpts,
  matrixRows: PLUMBING_SERVICES.map((s) => ({ id: s.id, label: s.label })),
  notes: "Per-row condition when with_conditions is an item field, not a separate Q-ID",
});
R({
  section: S2[0],
  sectionName: S2[1],
  evidence: "E-S2-02",
  title: "Which of these services does your company provide?",
  raw: "section2.diagnosticServices[serviceId].{policy,condition}",
  file: "Section2Form.tsx + ServicePolicy.tsx",
  type: "Matrix — single select per row",
  required: "Required",
  options: policyOpts,
  matrixRows: DIAGNOSTIC_SERVICES.map((s) => ({ id: s.id, label: s.label })),
});
R({
  section: S2[0],
  sectionName: S2[1],
  evidence: "E-S2-03",
  title: "Who does your company serve?",
  raw: "section2.customerPropertyTypes[typeId].{policy,condition}",
  file: "Section2Form.tsx + ServicePolicy.tsx",
  type: "Matrix — single select per row",
  required: "Required",
  options: policyOpts,
  matrixRows: CUSTOMER_PROPERTY_TYPES.map((s) => ({ id: s.id, label: s.label })),
});
const qSup = R({
  section: S2[0],
  sectionName: S2[1],
  evidence: "E-S2-04",
  title: "Will you install or work with items supplied by the customer?",
  raw: "section2.customerSuppliedMaterialsPolicy",
  file: "Section2Form.tsx",
  type: "Single select",
  required: "Required",
  options: policyOpts,
});
C(qSup, 0, {
  section: S2[0],
  sectionName: S2[1],
  title: "What are the conditions?",
  raw: "section2.customerSuppliedMaterialsCondition",
  file: "Section2Form.tsx",
  type: "Long/open text",
  required: "Required when displayed",
  condition: `${qSup} = with_conditions`,
});
const qCorr = R({
  section: S2[0],
  sectionName: S2[1],
  evidence: "E-S2-05",
  title: "Will you repair or finish work another plumber started?",
  raw: "section2.correctiveWorkPolicy",
  file: "Section2Form.tsx",
  type: "Single select",
  required: "Required",
  options: policyOpts,
});
C(qCorr, 0, {
  section: S2[0],
  sectionName: S2[1],
  title: "What are the conditions?",
  raw: "section2.correctiveWorkCondition",
  file: "Section2Form.tsx",
  type: "Long/open text",
  required: "Required when displayed",
  condition: `${qCorr} = with_conditions`,
});
R({
  section: S2[0],
  sectionName: S2[1],
  evidence: "E-S2-06",
  title: "How would you like to define your normal service area?",
  raw: "section2.serviceAreaDefinitionMode + active geo branch fields",
  file: "Section2Form.tsx",
  type: "Single select + composite structured input",
  required: "Required",
});
R({
  section: S2[0],
  sectionName: S2[1],
  evidence: "E-S2-07",
  title: "Are there any areas inside or near your service area that you do not serve?",
  raw: "section2 excluded-area fields",
  file: "Section2Form.tsx",
  type: "Composite structured input",
  required: "Optional",
});
const qTerr = R({
  section: S2[0],
  sectionName: S2[1],
  evidence: "E-S2-08",
  title: "Are there areas you serve only under certain conditions?",
  raw: "section2.hasConditionalTerritory",
  file: "Section2Form.tsx",
  type: "Single select",
  required: "Required",
  options: [
    { id: "yes", label: "Yes" },
    { id: "no", label: "No" },
  ],
});
C(qTerr, 0, {
  section: S2[0],
  sectionName: S2[1],
  title: "Conditional territory details",
  raw: "section2.conditionalTerritories[]",
  file: "Section2Form.tsx",
  type: "Repeatable structured rows",
  required: "Required when displayed",
  condition: `${qTerr} = yes`,
});
R({
  section: S2[0],
  sectionName: S2[1],
  evidence: "E-S2-09",
  title: "Is your after-hours service area different?",
  raw: "section2.afterHoursAreaMode + after-hours geo",
  file: "Section2Form.tsx",
  type: "Single select + composite structured input",
  required: "Required",
});

// ---- S3 ----
R({
  section: S3[0],
  sectionName: S3[1],
  evidence: "E-S3-01",
  title: "How should Alexander treat each of these situations?",
  raw: "section3.emergencyClassifications[scenarioId]",
  file: "EmergencyClassification.tsx",
  type: "Matrix — single select per row",
  required: "Required",
  options: (Object.keys(EMERGENCY_CLASSIFICATION_LABELS) as Array<
    keyof typeof EMERGENCY_CLASSIFICATION_LABELS
  >).map((id) => ({ id, label: EMERGENCY_CLASSIFICATION_LABELS[id] })),
  matrixRows: EMERGENCY_SCENARIOS.map((s) => ({
    id: s.id,
    label: s.label,
    default: EMERGENCY_ROW_DEFAULTS[s.id],
  })),
  defaultValue: "Per-row EMERGENCY_ROW_DEFAULTS",
});
R({
  section: S3[0],
  sectionName: S3[1],
  evidence: "E-S3-02",
  title:
    "Are there any emergencies where Alexander must get human approval before arranging emergency dispatch?",
  raw: "section3.dispatchApproval (+ dispatchApprovalOtherDetail)",
  file: "Section3Form.tsx",
  type: "Multi-select / checkboxes",
  required: "Required",
});
R({
  section: S3[0],
  sectionName: S3[1],
  evidence: "E-S3-03",
  title: "What should Alexander do with calls that come in after hours?",
  raw: "section3.afterHoursDisposition.{emergency,urgent_contained,routine}",
  file: "AfterHoursDispositionMatrix.tsx",
  type: "Matrix — single select per row",
  required: "Required",
  options: AFTER_HOURS_DISPOSITION_OPTIONS.map((o) => ({ id: o.value, label: o.label })),
  matrixRows: (["emergency", "urgent_contained", "routine"] as const).map((id) => ({
    id,
    label: AFTER_HOURS_CALL_CLASS_LABELS[id],
    default: id === "emergency" ? "contact_on_call" : "schedule_service",
  })),
  defaultValue:
    "emergency→contact_on_call; urgent_contained→schedule_service; routine→schedule_service",
});
R({
  section: S3[0],
  sectionName: S3[1],
  evidence: "E-S3-04",
  title: "When is after-hours emergency field service available?",
  raw: "section3.emergencyServiceMode",
  file: "Section3Form.tsx",
  type: "Single select",
  required: "Required",
});
R({
  section: S3[0],
  sectionName: S3[1],
  evidence: "E-S3-05",
  title: "Who should Alexander contact first?",
  raw: "section3.primaryContactId → contacts[]",
  file: "Section3Form.tsx",
  type: "Contact selector / contact editor",
  required: "Required",
});
const qBak = R({
  section: S3[0],
  sectionName: S3[1],
  evidence: "E-S3-06",
  title: "Is there a backup person Alexander should contact?",
  raw: "section3.hasBackupContact",
  file: "Section3Form.tsx",
  type: "Single select",
  required: "Required",
  options: [
    { id: "yes", label: "Yes" },
    { id: "no", label: "No" },
  ],
});
C(qBak, 0, {
  section: S3[0],
  sectionName: S3[1],
  title: "Backup contact",
  raw: "section3.backupContactId → contacts[]",
  file: "Section3Form.tsx",
  type: "Contact selector / contact editor",
  required: "Required when displayed",
  condition: `${qBak} = yes`,
});
const qNob = R({
  section: S3[0],
  sectionName: S3[1],
  evidence: "E-S3-07",
  title: "What should Alexander do if nobody on your team answers?",
  raw: "section3.nobodyRespondsFallback",
  file: "Section3Form.tsx",
  type: "Single select",
  required: "Required",
});
C(qNob, 0, {
  section: S3[0],
  sectionName: S3[1],
  title: "Custom nobody-responds rule",
  raw: "section3.nobodyRespondsCustom",
  file: "Section3Form.tsx",
  type: "Long/open text",
  required: "Required when displayed",
  condition: `${qNob} = custom`,
});
const qRet = R({
  section: S3[0],
  sectionName: S3[1],
  evidence: "E-S3-08",
  title: "How should Alexander retry an unanswered contact?",
  raw: "section3.retryPolicy",
  file: "Section3Form.tsx",
  type: "Single select",
  required: "Required",
});
C(qRet, 0, {
  section: S3[0],
  sectionName: S3[1],
  title: "Custom retry rule",
  raw: "section3.retryCustom",
  file: "Section3Form.tsx",
  type: "Long/open text",
  required: "Required when displayed",
  condition: `${qRet} = custom`,
});
const qCap = R({
  section: S3[0],
  sectionName: S3[1],
  evidence: "E-S3-09",
  title:
    "What should Alexander do if an emergency comes in and your schedule is already full?",
  raw: "section3.capacityMode",
  file: "Section3Form.tsx",
  type: "Single select",
  required: "Required",
});
C(qCap, 0, {
  section: S3[0],
  sectionName: S3[1],
  title: "Capacity-mode branch details",
  raw: "section3.reservedCapacityNotes | emergencyOverrideNotes | capacityApproverContactId",
  file: "Section3Form.tsx",
  type: "Composite structured input",
  required: "Required when displayed",
  condition: `${qCap} selects a branch that reveals notes/approver fields`,
});

// ---- S4 (25 QuestionCards; 2 conditional cards = children) ----
const qHum = R({
  section: S4[0],
  sectionName: S4[1],
  evidence: "E-S4-01",
  title: "What should Alexander do if a caller asks to speak with a person?",
  raw: "section4.humanRequestPolicy (+ humanRequestCustomRule)",
  file: "Section4Form.tsx",
  type: "Single select",
  required: "Required",
});
C(qHum, 0, {
  section: S4[0],
  sectionName: S4[1],
  title: "Custom human-request rule",
  raw: "section4.humanRequestCustomRule",
  file: "Section4Form.tsx",
  type: "Long/open text",
  required: "Required when displayed",
  condition: `${qHum} = custom`,
});
const qAi = R({
  section: S4[0],
  sectionName: S4[1],
  evidence: "E-S4-02",
  title: "What should Alexander do if a caller doesn’t want to speak with AI?",
  raw: "section4.aiRefusalPolicy (+ aiRefusalCustomRule)",
  file: "Section4Form.tsx",
  type: "Single select",
  required: "Required",
});
C(qAi, 0, {
  section: S4[0],
  sectionName: S4[1],
  title: "Custom AI-refusal rule",
  raw: "section4.aiRefusalCustomRule",
  file: "Section4Form.tsx",
  type: "Long/open text",
  required: "Required when displayed",
  condition: `${qAi} = custom`,
});
R({
  section: S4[0],
  sectionName: S4[1],
  evidence: "E-S4-03",
  title: "Who can approve these types of exceptions?",
  raw: "section4.exceptionAuthority[exceptionTypeId]",
  file: "ExceptionAuthorityMatrix.tsx",
  type: "Matrix — single select per row",
  required: "Required",
  matrixRows: EXCEPTION_TYPES.map((e) => ({ id: e.id, label: e.label })),
});
const qAppr = R({
  section: S4[0],
  sectionName: S4[1],
  evidence: "E-S4-04",
  title:
    "What should Alexander do if the person who must approve an exception isn’t available?",
  raw: "section4.approverUnavailablePolicy",
  file: "Section4Form.tsx",
  type: "Single select",
  required: "Required",
});
C(qAppr, 0, {
  section: S4[0],
  sectionName: S4[1],
  title: "Other approver-unavailable rule",
  raw: "section4.approverUnavailableOther",
  file: "Section4Form.tsx",
  type: "Long/open text",
  required: "Required when displayed",
  condition: `${qAppr} = other`,
});
R({
  section: S4[0],
  sectionName: S4[1],
  evidence: "E-S4-05",
  title: "What can different types of callers authorize?",
  raw: "section4.callerPermissions[callerTypeId]",
  file: "CallerAuthorizationMatrix.tsx",
  type: "Matrix — single select per row",
  required: "Required",
  options: CALLER_AUTHORITY_OPTIONS.map((o) => ({ id: o.value, label: o.label })),
  matrixRows: CALLER_TYPES.map((c) => ({
    id: c.id,
    label: c.label,
    default: CALLER_AUTHORITY_DEFAULTS[c.id],
  })),
  defaultValue: "CALLER_AUTHORITY_DEFAULTS per caller type",
});
const qSpend = R({
  section: S4[0],
  sectionName: S4[1],
  evidence: "E-S4-06",
  title: "Are there spending limits for any of these callers?",
  raw: "section4.hasSpendingLimits",
  file: "Section4Form.tsx",
  type: "Single select",
  required: "Required",
  options: [
    { id: "yes", label: "Yes" },
    { id: "no", label: "No" },
  ],
});
C(qSpend, 0, {
  section: S4[0],
  sectionName: S4[1],
  title: "Spending limit rows",
  raw: "section4.spendingLimits[]",
  file: "Section4Form.tsx",
  type: "Repeatable structured rows",
  required: "Required when displayed",
  condition: `${qSpend} = yes`,
  notes: "callerTypeId + maxAmount; generated row ids",
});
const qEmAuth = R({
  section: S4[0],
  sectionName: S4[1],
  evidence: "E-S4-07",
  title: "Do emergency situations change any of these authorization rules?",
  raw: "section4.emergencyAuthorizationMode",
  file: "Section4Form.tsx",
  type: "Single select",
  required: "Required",
});
C(qEmAuth, 0, {
  section: S4[0],
  sectionName: S4[1],
  title: "Emergency special authorization rules",
  raw: "section4.emergencyAuthorizationRules",
  file: "Section4Form.tsx",
  type: "Long/open text",
  required: "Required when displayed",
  condition: `${qEmAuth} = special_rules`,
});
R({
  section: S4[0],
  sectionName: S4[1],
  evidence: "E-S4-08",
  title: "When an eligible customer wants service, what may Alexander normally do?",
  raw: "section4.defaultBookingMode",
  file: "Section4Form.tsx",
  type: "Single select",
  required: "Required",
  options: DEFAULT_BOOKING_OPTIONS.map((o) => ({ id: o.value, label: o.label })),
  defaultValue: "book_appointment",
});
R({
  section: S4[0],
  sectionName: S4[1],
  evidence: "E-S4-09",
  title: "How far in advance may Alexander schedule appointments?",
  raw: "section4 booking-horizon fields",
  file: "Section4Form.tsx",
  type: "Composite structured input",
  required: "Required",
});
R({
  section: S4[0],
  sectionName: S4[1],
  evidence: "E-S4-10",
  title: "What appointment windows do you offer?",
  raw: "section4.appointmentWindows[]",
  file: "AppointmentWindowEditor.tsx",
  type: "Repeatable structured rows",
  required: "Required",
  matrixRows: APPOINTMENT_WINDOW_TEMPLATES.map((t) => ({ id: t.id, label: t.label })),
  notes: "Template shells enabled by default; start/end empty until filled",
});
R({
  section: S4[0],
  sectionName: S4[1],
  evidence: "E-S4-11",
  title:
    "When an appointment is successfully confirmed, what information may Alexander repeat to the customer?",
  raw: "section4.confirmationInfo[]",
  file: "Section4Form.tsx",
  type: "Multi-select / checkboxes",
  required: "Required",
  notes: "createDefaultConfirmationInfo preselects all catalog confirmation options",
});
const qBookRules = R({
  section: S4[0],
  sectionName: S4[1],
  evidence: "E-S4-12",
  title: "Do any types of jobs follow different booking rules?",
  raw: "section4.hasServiceBookingRules",
  file: "Section4Form.tsx",
  type: "Single select",
  required: "Required",
});
C(qBookRules, 0, {
  section: S4[0],
  sectionName: S4[1],
  title: "Service booking rule rows",
  raw: "section4.serviceBookingRules[]",
  file: "Section4Form.tsx",
  type: "Repeatable structured rows",
  required: "Required when displayed",
  condition: `${qBookRules} = yes`,
});
R({
  section: S4[0],
  sectionName: S4[1],
  evidence: "E-S4-13",
  title: "When may Alexander offer these appointments?",
  raw: "section4.capacityPolicies.{same_day,holiday}.{policy,condition}",
  file: "Section4Form.tsx",
  type: "Matrix — single select per row",
  required: "Required",
  notes: "Rows same_day and holiday; with_conditions reveals condition placeholders",
});
const qResched = R({
  section: S4[0],
  sectionName: S4[1],
  evidence: "E-S4-14",
  title: "What may Alexander do when a customer wants to reschedule?",
  raw: "section4.rescheduleAuthority",
  file: "Section4Form.tsx",
  type: "Single select",
  required: "Required",
});
C(qResched, 0, {
  section: S4[0],
  sectionName: S4[1],
  title: "Reschedule conditions",
  raw: "section4.rescheduleConditions",
  file: "Section4Form.tsx",
  type: "Long/open text",
  required: "Required when displayed",
  condition: `${qResched} = conditional`,
});
const qCancel = R({
  section: S4[0],
  sectionName: S4[1],
  evidence: "E-S4-15",
  title: "What may Alexander do when a customer wants to cancel?",
  raw: "section4.cancellationAuthority",
  file: "Section4Form.tsx",
  type: "Single select",
  required: "Required",
});
C(qCancel, 0, {
  section: S4[0],
  sectionName: S4[1],
  title: "Cancellation conditions",
  raw: "section4.cancellationConditions",
  file: "Section4Form.tsx",
  type: "Long/open text",
  required: "Required when displayed",
  condition: `${qCancel} = conditional`,
});
const qLate = R({
  section: S4[0],
  sectionName: S4[1],
  evidence: "E-S4-16",
  title: "Do you charge a late-cancellation fee?",
  raw: "section4.lateCancellationFeeMode (+ linked fee notice/when; NO amount in Scheduling)",
  file: "Section4Form.tsx",
  type: "Single select + composite structured input",
  required: "Required",
});
C(qLate, 0, {
  section: S4[0],
  sectionName: S4[1],
  title: "Late-cancellation fee details (notice / when)",
  raw: "linked FeeRecord fields + late-cancellation when/notice",
  file: "Section4Form.tsx",
  type: "Composite structured input",
  required: "Required when displayed",
  condition: `${qLate} = yes or conditional`,
});
const qNoShow = R({
  section: S4[0],
  sectionName: S4[1],
  evidence: "E-S4-17",
  title: "Do you charge a no-show fee?",
  raw: "section4.noShowFeeMode (+ linked fee when; NO amount in Scheduling)",
  file: "Section4Form.tsx",
  type: "Single select + composite structured input",
  required: "Required",
});
C(qNoShow, 0, {
  section: S4[0],
  sectionName: S4[1],
  title: "No-show fee details (when)",
  raw: "linked FeeRecord + no-show when",
  file: "Section4Form.tsx",
  type: "Composite structured input",
  required: "Required when displayed",
  condition: `${qNoShow} = yes or conditional`,
});
R({
  section: S4[0],
  sectionName: S4[1],
  evidence: "E-S4-18",
  title: "Are there exceptions to your cancellation or no-show rules?",
  raw: "section4.cancellationNoShowExceptions",
  file: "Section4Form.tsx",
  type: "Long/open text",
  required: "Optional",
});
R({
  section: S4[0],
  sectionName: S4[1],
  evidence: "E-S4-19",
  title:
    "What should Alexander do if the customer needs service but there are no appropriate appointments available?",
  raw: "section4.noAvailabilityFallbackOrder[]",
  file: "Section4Form.tsx + PriorityOrderList.tsx",
  type: "Ordered multi-select",
  required: "Required",
});
const qCb = R({
  section: S4[0],
  sectionName: S4[1],
  evidence: "E-S4-20",
  title: "May Alexander arrange a callback when no appointment is available?",
  raw: "section4.mayArrangeCallback",
  file: "Section4Form.tsx",
  type: "Single select",
  required: "Required",
  options: [
    { id: "yes", label: "Yes" },
    { id: "no", label: "No" },
  ],
});
C(qCb, 0, {
  section: S4[0],
  sectionName: S4[1],
  evidence: "E-S4-21",
  title: "What phone number should Alexander use for the callback?",
  raw: "section4.callbackNumberPolicy",
  file: "Section4Form.tsx",
  type: "Single select",
  required: "Required when displayed",
  condition: `${qCb} = yes`,
});
C(qCb, 1, {
  section: S4[0],
  sectionName: S4[1],
  evidence: "E-S4-22",
  title: "Who should receive or handle scheduling callbacks?",
  raw: "section4.callbackOwnerContactId → contacts[]",
  file: "Section4Form.tsx",
  type: "Contact selector / contact editor",
  required: "Required when displayed",
  condition: `${qCb} = yes`,
});
const qTechJobs = R({
  section: S4[0],
  sectionName: S4[1],
  evidence: "E-S4-23",
  title: "Are there any jobs that require a particular technician?",
  raw: "section4 technician-requirement fields",
  file: "Section4Form.tsx",
  type: "Single select + composite structured input",
  required: "Required",
});
C(qTechJobs, 0, {
  section: S4[0],
  sectionName: S4[1],
  title: "Technician requirement details",
  raw: "section4 technician requirement detail fields",
  file: "Section4Form.tsx",
  type: "Composite structured input",
  required: "Required when displayed",
  condition: `${qTechJobs} = yes (reveals detail panel)`,
});
R({
  section: S4[0],
  sectionName: S4[1],
  evidence: "E-S4-24",
  title: "What should Alexander do if a customer asks for a specific technician?",
  raw: "section4.specificTechnicianPolicy",
  file: "Section4Form.tsx",
  type: "Single select",
  required: "Required",
});
const qMulti = R({
  section: S4[0],
  sectionName: S4[1],
  evidence: "E-S4-25",
  title: "What should Alexander do when a customer has several plumbing issues?",
  raw: "section4.multiIssuePolicy",
  file: "Section4Form.tsx",
  type: "Single select",
  required: "Required",
});
C(qMulti, 0, {
  section: S4[0],
  sectionName: S4[1],
  title: "Multi-issue custom / branch details",
  raw: "section4 multi-issue conditional fields",
  file: "Section4Form.tsx",
  type: "Composite structured input",
  required: "Required when displayed",
  condition: `${qMulti} selects a branch that reveals extra fields`,
});

writeFileSync(
  "docs/evidence/questionnaire-v1/qid-inventory-s1-s4.json",
  JSON.stringify(
    {
      roots: n,
      children: entries.filter((e) => e.kind === "child").length,
      lastRoot: `Q${n}`,
      entries,
    },
    null,
    2,
  ),
);
console.log(JSON.stringify({ roots: n, total: entries.length, last: `Q${n}` }));
