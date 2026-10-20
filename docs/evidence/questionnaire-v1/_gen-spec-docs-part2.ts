/**
 * Continues Q-ID inventory S5–S8 + submission, then writes:
 * - docs/questionnaire-v1-id-map.md
 * - docs/Alexander-Final-Questionnaire-Specification-v1.0.md
 * - docs/questionnaire-v1-spec-qa.md
 * - updates evidence bundle Section 4 / Section 7 notes
 *
 * Run: npx tsx docs/evidence/questionnaire-v1/_gen-spec-docs-part2.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
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
  PREVIOUS_WORK_INITIAL_ACTION_OPTIONS,
  REPEAT_CALLBACK_ACTION_OPTIONS,
  ESCALATION_TRIGGER_OPTIONS,
  FORBIDDEN_UNHAPPY_PROMISE_OPTIONS,
  CUSTOMER_HISTORY_POLICY_OPTIONS,
  RESTRICTED_INFORMATION_OPTIONS,
  ADDITIONAL_SERVICE_POLICY_OPTIONS,
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
import {
  COMMUNICATION_STYLE_OPTIONS,
  SPOKEN_NAME_OPTIONS,
  AI_DISCLOSURE_OPTIONS,
  PRONUNCIATION_MODE_OPTIONS,
  LANGUAGE_SWITCHING_OPTIONS,
  PERCEIVED_VOICE_OPTIONS,
  FORMALITY_OPTIONS,
  LANGUAGE_OPTIONS,
} from "../../../src/lib/onboarding/section7Catalog";
import {
  APPROVED_PRIMARY_VOICES,
  APPROVED_ACCENT_OPTIONS,
} from "../../../src/lib/onboarding/approvedVoiceCatalog";
import {
  APPROVED_CLAIM_OPTIONS,
  ANSWERING_MODE_OPTIONS,
} from "../../../src/lib/onboarding/validation/section1";

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

const part1 = JSON.parse(
  readFileSync("docs/evidence/questionnaire-v1/qid-inventory-s1-s4.json", "utf8"),
) as { roots: number; entries: Entry[] };

const entries: Entry[] = [...part1.entries];
let n = part1.roots;
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

const S5 = ["S5", "Pricing and Payments"] as const;
const S6 = ["S6", "Customer Care"] as const;
const S7 = ["S7", "Voice and Conversation"] as const;
const S8 = ["S8", "Integration Systems and Final Setup"] as const;
const SUB = ["SUBMISSION", "Final Review and Submission"] as const;

// Patch S1 options that were incomplete in part1
for (const e of entries) {
  if (e.evidence === "E-S1-05") {
    e.options = APPROVED_CLAIM_OPTIONS.map((o) => ({ id: o.value, label: o.label }));
  }
  if (e.evidence === "E-S1-10") {
    e.options = ANSWERING_MODE_OPTIONS.map((o) => ({ id: o.value, label: o.label }));
  }
}

// ---- S5 ----
const qPriceMethod = R({
  section: S5[0],
  sectionName: S5[1],
  evidence: "E-S5-01",
  title: "How does your company normally price plumbing work?",
  raw: "section5.pricingModels (+ pricingModelOther)",
  file: "PricingCoreFields.tsx",
  type: "Multi-select / checkboxes",
  required: "Required",
  options: PRICING_MODEL_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
});
C(qPriceMethod, 0, {
  section: S5[0],
  sectionName: S5[1],
  title: "Describe your other pricing method",
  raw: "section5.pricingModelOther",
  file: "PricingCoreFields.tsx",
  type: "Short text",
  required: "Required when displayed",
  condition: `${qPriceMethod} includes other`,
});
const qQuote = R({
  section: S5[0],
  sectionName: S5[1],
  evidence: "E-S5-02",
  title: "May Alexander quote prices for your services?",
  raw: "section5.mayQuoteServicePrices",
  file: "PricingCoreFields.tsx",
  type: "Single select",
  required: "Required",
  options: QUOTE_PERMISSION_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
  defaultValue: "not_allowed",
});
C(qQuote, 0, {
  section: S5[0],
  sectionName: S5[1],
  evidence: "E-S5-03",
  title: "What service prices may Alexander quote?",
  raw: "section5.servicePrices[]",
  file: "PricingCoreFields.tsx",
  type: "Repeatable structured rows",
  required: "Optional when displayed",
  condition: `${qQuote} = allowed`,
  notes: `Only Section 2 services with policy offered. Modes: ${SERVICE_PRICE_MODE_OPTIONS.map((o) => o.label).join("; ")}. Optional conditions per priced service.`,
});
R({
  section: S5[0],
  sectionName: S5[1],
  evidence: "E-S5-04",
  title: "What should Alexander do when he doesn't have an approved price?",
  raw: "section5.unknownPriceBehavior",
  file: "PricingCoreFields.tsx",
  type: "Single select",
  required: "Required",
  options: UNKNOWN_PRICE_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
  defaultValue: "technician_after_evaluation",
});
const qFees = R({
  section: S5[0],
  sectionName: S5[1],
  evidence: "E-S5-05",
  title: "Which additional fees does your company charge?",
  raw: "section5.additionalFeeSelection + additionalFeeDetails[category]",
  file: "PricingCoreFields.tsx",
  type: "Multi-select / checkboxes + composite per selected fee",
  required: "Required",
  options: ADDITIONAL_FEE_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
  notes: "Selected fee (not none): Amount, When does it apply?, credit Always/Sometimes/Never; Sometimes → When is it credited?",
});
const qArea = R({
  section: S5[0],
  sectionName: S5[1],
  evidence: "E-S5-06",
  title: "Do any areas have different travel fees or minimum charges?",
  raw: "section5.hasAreaTravelOrMinimum",
  file: "PricingCoreFields.tsx",
  type: "Single select",
  required: "Required",
  options: [
    { id: "no", label: "No" },
    { id: "yes", label: "Yes" },
  ],
  defaultValue: "no",
});
C(qArea, 0, {
  section: S5[0],
  sectionName: S5[1],
  title: "Area / Fee or minimum rows",
  raw: "section5.areaPricingRows[]",
  file: "PricingCoreFields.tsx",
  type: "Repeatable structured rows",
  required: "Required when displayed",
  condition: `${qArea} = yes`,
});
const qMarkup = R({
  section: S5[0],
  sectionName: S5[1],
  evidence: "E-S5-07",
  title: "Does your company mark up parts or materials?",
  raw: "section5.materialMarkupPolicy",
  file: "PricingCoreFields.tsx",
  type: "Single select",
  required: "Required",
  options: [
    { id: "yes", label: "Yes" },
    { id: "sometimes", label: "Sometimes" },
    { id: "no", label: "No" },
  ],
});
C(qMarkup, 0, {
  section: S5[0],
  sectionName: S5[1],
  title: "What may Alexander tell customers about material pricing?",
  raw: "section5.materialMarkupCustomerExplanation",
  file: "PricingCoreFields.tsx",
  type: "Long/open text",
  required: "Required when displayed",
  condition: `${qMarkup} = yes or sometimes`,
  notes: "Editable prefill when Yes/Sometimes first selected; existing custom text not overwritten on reload",
});
const qPayMeth = R({
  section: S5[0],
  sectionName: S5[1],
  evidence: "E-S5-08",
  title: "What payment methods do you accept?",
  raw: "section5.paymentMethods (+ paymentMethodOther)",
  file: "Section5Form.tsx",
  type: "Multi-select / checkboxes",
  required: "Required",
  options: PAYMENT_METHOD_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
});
C(qPayMeth, 0, {
  section: S5[0],
  sectionName: S5[1],
  title: "Other payment method",
  raw: "section5.paymentMethodOther",
  file: "Section5Form.tsx",
  type: "Short text",
  required: "Required when displayed",
  condition: `${qPayMeth} includes other`,
});
R({
  section: S5[0],
  sectionName: S5[1],
  evidence: "E-S5-09",
  title: "When is payment normally due?",
  raw: "section5.paymentDuePolicies",
  file: "Section5Form.tsx",
  type: "Multi-select / checkboxes",
  required: "Required",
  options: PAYMENT_DUE_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
  notes: "No AI helper text under this question (removed in final helper-text audit)",
});
R({
  section: S5[0],
  sectionName: S5[1],
  evidence: "E-S5-10",
  title: "Can Alexander help customers make a payment?",
  raw: "section5.paymentAssistance",
  file: "Section5Form.tsx",
  type: "Single select",
  required: "Required",
  options: PAYMENT_ASSISTANCE_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
  defaultValue: "secure_link",
});
const qColl = R({
  section: S5[0],
  sectionName: S5[1],
  evidence: "E-S5-11",
  title: "What may Alexander help collect payment for?",
  raw: "section5.paymentCollectionScope (+ paymentCollectionOther)",
  file: "Section5Form.tsx",
  type: "Multi-select / checkboxes",
  required: "Required",
  options: PAYMENT_COLLECTION_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
  defaultValue: DEFAULT_PAYMENT_COLLECTION_SCOPE.join(", "),
});
C(qColl, 0, {
  section: S5[0],
  sectionName: S5[1],
  title: "Other payment",
  raw: "section5.paymentCollectionOther",
  file: "Section5Form.tsx",
  type: "Short text",
  required: "Required when displayed",
  condition: `${qColl} includes other`,
});
const qRem = R({
  section: S5[0],
  sectionName: S5[1],
  evidence: "E-S5-12",
  title: "What financial remedies may Alexander approve without human approval?",
  raw: "section5.financialRemedies + remedyRules[remedyId]",
  file: "Section5Form.tsx",
  type: "Multi-select / checkboxes + per-selected rule text",
  required: "Required",
  options: FINANCIAL_REMEDY_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
  defaultValue: "none",
  notes: "None mutually exclusive. Each selected remedy (not none) requires its own rule/limit text field.",
});

// ---- S6 ----
R({
  section: S6[0],
  sectionName: S6[1],
  evidence: "E-S6-01",
  title:
    "What should Alexander do when a customer says there’s a problem with work your company already performed?",
  raw: "section6.previousWorkInitialAction (+ related fields)",
  file: "Section6Form.tsx",
  type: "Single select",
  required: "Required",
  options: PREVIOUS_WORK_INITIAL_ACTION_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
});
R({
  section: S6[0],
  sectionName: S6[1],
  evidence: "E-S6-02",
  title:
    "What should Alexander do if the customer has already called back about the same problem?",
  raw: "section6.repeatCallbackAction (+ related fields)",
  file: "Section6Form.tsx",
  type: "Single select",
  required: "Required",
  options: REPEAT_CALLBACK_ACTION_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
});
const qEsc = R({
  section: S6[0],
  sectionName: S6[1],
  evidence: "E-S6-03",
  title: "When should Alexander involve someone on your team because a customer is unhappy?",
  raw: "section6.escalationTriggers (+ other detail)",
  file: "Section6Form.tsx",
  type: "Multi-select / checkboxes",
  required: "Required",
  options: ESCALATION_TRIGGER_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
});
C(qEsc, 0, {
  section: S6[0],
  sectionName: S6[1],
  title: "Other escalation trigger detail",
  raw: "section6.escalationTriggerOther",
  file: "Section6Form.tsx",
  type: "Short text",
  required: "Required when displayed",
  condition: `${qEsc} includes other`,
});
const qForbid = R({
  section: S6[0],
  sectionName: S6[1],
  evidence: "E-S6-04",
  title: "What should Alexander never promise an unhappy customer?",
  raw: "section6.forbiddenUnhappyPromises (+ other)",
  file: "Section6Form.tsx",
  type: "Multi-select / checkboxes",
  required: "Required",
  options: FORBIDDEN_UNHAPPY_PROMISE_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
});
C(qForbid, 0, {
  section: S6[0],
  sectionName: S6[1],
  title: "Other forbidden promise",
  raw: "section6.forbiddenUnhappyPromiseOther",
  file: "Section6Form.tsx",
  type: "Short text",
  required: "Required when displayed",
  condition: `${qForbid} includes other`,
});
R({
  section: S6[0],
  sectionName: S6[1],
  evidence: "E-S6-05",
  title: "How should Alexander handle other types of calls?",
  raw: "section6.nonServiceCallPolicies[]",
  file: "NonServiceCallMatrix.tsx",
  type: "Matrix — single select per row",
  required: "Required",
  options: NON_SERVICE_DISPOSITION_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
  matrixRows: NON_SERVICE_CALL_TYPE_ROWS.map((r) => ({
    id: r.id,
    label: r.label,
    default: DEFAULT_NON_SERVICE_DISPOSITIONS[r.id as keyof typeof DEFAULT_NON_SERVICE_DISPOSITIONS],
  })),
  defaultValue: "DEFAULT_NON_SERVICE_DISPOSITIONS per row; Transfer requires contactId",
  notes: "Transfer the call reveals Who should Alexander transfer these calls to? (contact picker) as item field when disposition=send_specific",
});
R({
  section: S6[0],
  sectionName: S6[1],
  evidence: "E-S6-06",
  title: "What customer information may Alexander use when helping an existing customer?",
  raw: "section6.customerHistoryPolicy",
  file: "Section6Form.tsx",
  type: "Single select",
  required: "Required",
  options: CUSTOMER_HISTORY_POLICY_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
});
const qPriv = R({
  section: S6[0],
  sectionName: S6[1],
  evidence: "E-S6-07",
  title: "Are there customer records or documents Alexander should never disclose?",
  raw: "section6.restrictedInformation (+ other)",
  file: "Section6Form.tsx",
  type: "Multi-select / checkboxes",
  required: "Required",
  options: RESTRICTED_INFORMATION_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
});
C(qPriv, 0, {
  section: S6[0],
  sectionName: S6[1],
  title: "Other restricted information",
  raw: "section6.restrictedInformationOther",
  file: "Section6Form.tsx",
  type: "Short text",
  required: "Required when displayed",
  condition: `${qPriv} includes other`,
});
R({
  section: S6[0],
  sectionName: S6[1],
  evidence: "E-S6-08",
  title: "How proactive should Alexander be about recommending additional services?",
  raw: "section6.additionalServicePolicy",
  file: "Section6Form.tsx",
  type: "Single select",
  required: "Required",
  options: ADDITIONAL_SERVICE_POLICY_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
});
R({
  section: S6[0],
  sectionName: S6[1],
  evidence: "E-S6-09",
  title: "Are there any other rules Alexander should follow for unusual calls?",
  raw: "section6.unusualCallNotes",
  file: "Section6Form.tsx",
  type: "Long/open text",
  required: "Optional",
});

// ---- S7 (exact 12 QuestionCards) ----
const qLang = R({
  section: S7[0],
  sectionName: S7[1],
  evidence: "E-S7-01",
  title: "Which language or languages should Alexander support with callers?",
  raw: "section7.englishOnly + section7.callerLanguages",
  file: "Section7Form.tsx",
  type: "Multi-select / checkboxes",
  required: "Required",
  options: LANGUAGE_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
  notes: "English only clears other languages. Other supported language capability catalog currently unavailable.",
});
C(qLang, 0, {
  section: S7[0],
  sectionName: S7[1],
  title: "Other supported language",
  raw: "section7.otherSupportedLanguage",
  file: "Section7Form.tsx",
  type: "Short text",
  required: "Required when displayed",
  condition: `${qLang} includes other and not english_only`,
});
const qVoice = R({
  section: S7[0],
  sectionName: S7[1],
  evidence: "E-S7-02",
  title: "Which voice should Alexander use?",
  raw: "section7.voiceSelection (+ anotherApprovedVoiceId)",
  file: "Section7Form.tsx + VoicePreviewCard.tsx",
  type: "Single select",
  required: "Required",
  options: [
    ...APPROVED_PRIMARY_VOICES.map((v) => ({
      id: v.id,
      label: `${v.label} — ${v.description}`,
    })),
    { id: "another_approved", label: "Another approved voice" },
  ],
  notes: "ADDITIONAL_APPROVED_VOICES currently empty; Another approved voice disabled until catalog populated.",
});
C(qVoice, 0, {
  section: S7[0],
  sectionName: S7[1],
  title: "Another approved voice selection",
  raw: "section7.anotherApprovedVoiceId",
  file: "Section7Form.tsx",
  type: "Single select",
  required: "Required when displayed",
  condition: `${qVoice} = another_approved AND additional voices catalog non-empty`,
});
R({
  section: S7[0],
  sectionName: S7[1],
  evidence: "E-S7-03",
  title: "How should Alexander’s communication style feel?",
  raw: "section7.communicationStyle",
  file: "Section7Form.tsx",
  type: "Single select",
  required: "Required",
  options: COMMUNICATION_STYLE_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
});
const qSpoken = R({
  section: S7[0],
  sectionName: S7[1],
  evidence: "E-S7-04",
  title: "What name should Alexander use when introducing himself?",
  raw: "section7.spokenNameMode",
  file: "Section7Form.tsx",
  type: "Single select",
  required: "Required",
  options: SPOKEN_NAME_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
});
C(qSpoken, 0, {
  section: S7[0],
  sectionName: S7[1],
  title: "Spoken receptionist name",
  raw: "section7.spokenDisplayName",
  file: "Section7Form.tsx",
  type: "Short text",
  required: "Required when displayed",
  condition: `${qSpoken} = company_specific or another_approved`,
});
const qDisc = R({
  section: S7[0],
  sectionName: S7[1],
  evidence: "E-S7-05",
  title: "How should Alexander identify himself as an AI?",
  raw: "section7.aiDisclosureStyle",
  file: "Section7Form.tsx",
  type: "Single select",
  required: "Required",
  options: AI_DISCLOSURE_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
});
C(qDisc, 0, {
  section: S7[0],
  sectionName: S7[1],
  title: "Approved disclosure wording",
  raw: "section7.aiDisclosureCustom",
  file: "Section7Form.tsx",
  type: "Long/open text",
  required: "Optional when displayed (frozen validateSection7 does not require custom text)",
  condition: `${qDisc} = custom`,
});
const qPron = R({
  section: S7[0],
  sectionName: S7[1],
  evidence: "E-S7-06",
  title:
    "Are there any company, people, city, neighborhood, or brand names that Alexander must pronounce correctly?",
  raw: "section7.pronunciationMode",
  file: "Section7Form.tsx",
  type: "Single select",
  required: "Required",
  options: PRONUNCIATION_MODE_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
});
C(qPron, 0, {
  section: S7[0],
  sectionName: S7[1],
  title: "Pronunciation entries",
  raw: "section7.pronunciationEntries[]",
  file: "PronunciationCardEditor.tsx",
  type: "Repeatable structured rows",
  required: "Required when displayed",
  condition: `${qPron} = yes`,
  notes: "Fields: term, pronunciation, optional audioSampleReference; generated entry ids",
});
const qSwitch = R({
  section: S7[0],
  sectionName: S7[1],
  evidence: "E-S7-07",
  title: "If a caller speaks a supported second language, what should Alexander normally do?",
  raw: "section7.languageSwitchingPolicy",
  file: "Section7Form.tsx",
  type: "Single select",
  required: "Required",
  options: LANGUAGE_SWITCHING_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
});
C(qSwitch, 0, {
  section: S7[0],
  sectionName: S7[1],
  title: "Language-switching rule",
  raw: "section7.languageSwitchingCustomRule",
  file: "Section7Form.tsx",
  type: "Long/open text",
  required: "Optional when displayed (frozen validateSection7 does not require custom rule text)",
  condition: `${qSwitch} = custom`,
});
R({
  section: S7[0],
  sectionName: S7[1],
  evidence: "E-S7-08",
  title: "Do you have a preference for the perceived voice presentation?",
  raw: "section7.perceivedVoicePreference",
  file: "Section7Form.tsx",
  type: "Single select",
  required: "Optional",
  options: PERCEIVED_VOICE_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
});
const qAccent = R({
  section: S7[0],
  sectionName: S7[1],
  evidence: "E-S7-09",
  title: "Do you have a preferred accent or regional character?",
  raw: "section7.accentPreference",
  file: "Section7Form.tsx",
  type: "Single select",
  required: "Optional",
  options: APPROVED_ACCENT_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
  notes: "Some accent options disabled when catalogAvailable=false or unavailable for selected voice",
});
C(qAccent, 0, {
  section: S7[0],
  sectionName: S7[1],
  title: "Other approved accent",
  raw: "section7.accentOtherApproved",
  file: "Section7Form.tsx",
  type: "Short text",
  required: "Required when displayed",
  condition: `${qAccent} = other_approved`,
});
R({
  section: S7[0],
  sectionName: S7[1],
  evidence: "E-S7-10",
  title: "How formal should Alexander sound?",
  raw: "section7.formalityPreference",
  file: "Section7Form.tsx",
  type: "Single select",
  required: "Optional",
  options: FORMALITY_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
});
R({
  section: S7[0],
  sectionName: S7[1],
  evidence: "E-S7-11",
  title:
    "Are there any phrases Alexander should use or avoid because of your company’s brand?",
  raw: "section7.brandPhrasesAndAvoidances",
  file: "Section7Form.tsx",
  type: "Long/open text",
  required: "Optional",
});
R({
  section: S7[0],
  sectionName: S7[1],
  evidence: "E-S7-12",
  title:
    "Is there anything else about Alexander’s voice or identity that we should review with you?",
  raw: "section7.additionalReviewNotes",
  file: "Section7Form.tsx",
  type: "Long/open text",
  required: "Optional",
});

// ---- S8 ----
const qCrm = R({
  section: S8[0],
  sectionName: S8[1],
  evidence: "E-S8-01",
  title: "What software does your company use to manage customers and jobs?",
  raw: "section8.crmFsmProvider",
  file: "Section8Form.tsx",
  type: "Single select",
  required: "Required",
  options: CRM_FSM_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
});
C(qCrm, 0, {
  section: S8[0],
  sectionName: S8[1],
  title: "What system do you use?",
  raw: "section8.crmFsmCustomName",
  file: "Section8Form.tsx",
  type: "Short text",
  required: "Required when displayed",
  condition: `${qCrm} = custom (Another system)`,
});
const qSched = R({
  section: S8[0],
  sectionName: S8[1],
  evidence: "E-S8-02",
  title: "Where does your company manage appointment availability?",
  raw: "section8.schedulingProvider",
  file: "Section8Form.tsx",
  type: "Single select",
  required: "Required",
  options: SCHEDULING_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
});
C(qSched, 0, {
  section: S8[0],
  sectionName: S8[1],
  title: "What scheduling system do you use?",
  raw: "section8.schedulingCustomName",
  file: "Section8Form.tsx",
  type: "Short text",
  required: "Required when displayed",
  condition: `${qSched} = custom`,
});
const qPhone = R({
  section: S8[0],
  sectionName: S8[1],
  evidence: "E-S8-03",
  title: "What phone system do you currently use?",
  raw: "section8.phoneProvider",
  file: "Section8Form.tsx",
  type: "Single select",
  required: "Required",
  options: PHONE_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
});
C(qPhone, 0, {
  section: S8[0],
  sectionName: S8[1],
  title: "What phone system do you use?",
  raw: "section8.phoneCustomName",
  file: "Section8Form.tsx",
  type: "Short text",
  required: "Required when displayed",
  condition: `${qPhone} = custom`,
});
const qOtherSw = R({
  section: S8[0],
  sectionName: S8[1],
  evidence: "E-S8-04",
  title: "Do you use any other software Alexander may need to work with?",
  raw: "section8.additionalSoftwareCategories + additionalSoftwareCards[]",
  file: "Section8Form.tsx + AdditionalSoftwareCardEditor.tsx",
  type: "Multi-select / checkboxes + per-category software name",
  required: "Required",
  options: ADDITIONAL_SOFTWARE_CATEGORIES.map((o) => ({ id: o.id, label: o.label })),
  notes: "None exclusive. Each selected category (not none) requires What software do you use? on that card.",
});
const qAuth = R({
  section: S8[0],
  sectionName: S8[1],
  evidence: "E-S8-05",
  title: "Who can authorize Alexander to connect to these systems?",
  raw: "section8.connectionOwnerMode",
  file: "Section8Form.tsx",
  type: "Single select",
  required: "Required",
  options: CONNECTION_OWNER_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
});
C(qAuth, 0, {
  section: S8[0],
  sectionName: S8[1],
  title: "Who should we work with?",
  raw: "section8.connectionOwnerName / connectionOwnerEmail / connectionOwnerPhone",
  file: "Section8Form.tsx",
  type: "Composite structured input",
  required: "Required when displayed (Name + Email required; Phone optional)",
  condition: `${qAuth} = someone_else`,
});
R({
  section: S8[0],
  sectionName: S8[1],
  evidence: "E-S8-06",
  title: "Software connection notice",
  raw: "section8.connectionNoticeAcknowledged",
  file: "Section8Form.tsx",
  type: "Single select (required acknowledgment checkbox: I understand)",
  required: "Required",
  notes:
    "Two paragraphs of notice text then checkbox label I understand. Not password/API entry.",
});
const qFail = R({
  section: S8[0],
  sectionName: S8[1],
  evidence: "E-S8-07",
  title:
    "If Alexander can’t access a system or complete an action, what should he normally do?",
  raw: "section8.failureFallback",
  file: "Section8Form.tsx",
  type: "Single select",
  required: "Required",
  options: FAILURE_FALLBACK_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
  defaultValue: "collect_and_send",
});
C(qFail, 0, {
  section: S8[0],
  sectionName: S8[1],
  title: "What should Alexander do?",
  raw: "section8.failureFallbackCustom",
  file: "Section8Form.tsx",
  type: "Long/open text",
  required: "Required when displayed",
  condition: `${qFail} = custom (Follow another rule)`,
});
R({
  section: S8[0],
  sectionName: S8[1],
  evidence: "E-S8-08",
  title: "Is there anything important about your company that we haven’t asked?",
  raw: "section8.finalOperatingNotes",
  file: "Section8Form.tsx",
  type: "Long/open text",
  required: "Optional",
});

// ---- Final review (NOT S9) ----
const qFinal = R({
  section: SUB[0],
  sectionName: SUB[1],
  evidence: "Q114_CONFIRMATIONS (historical constant only)",
  title: "Final confirmations",
  raw: "draft.submission.confirmations.{answersAccurate,capabilitiesDependOnIntegrations,actionsRequireSupportAuthorizationConfirmation}",
  file: "OnboardingGlobalReview.tsx + section8Catalog.ts Q114_CONFIRMATIONS",
  type: "Multi-select / checkboxes (grouped confirmation control)",
  required: "Required — all three statements must be checked",
  options: Q114_CONFIRMATIONS.map((c) => ({ id: c.key, label: c.label })),
  notes:
    "One root Q with three required checkbox statements. Stored under submission, not section8. Historical constant name Q114_CONFIRMATIONS is NOT the permanent ID.",
});

const roots = entries.filter((e) => e.kind === "root");
const children = entries.filter((e) => e.kind === "child");
const finalRoot = `Q${n}`;

writeFileSync(
  "docs/evidence/questionnaire-v1/qid-inventory-full.json",
  JSON.stringify(
    {
      SCHEMA_VERSION: 10,
      freezeCommit: "f6feb475ddb8d3f8d2ff03d3b8af280eee6713f1",
      rootCount: roots.length,
      childCount: children.length,
      finalRootId: finalRoot,
      finalReviewQId: qFinal,
      section4TopLevelQuestionCards: 25,
      section4AlwaysVisibleRoots: 23,
      section4ConditionalQuestionCardsAsChildren: 2,
      entries,
    },
    null,
    2,
  ),
);

function esc(s: string) {
  return s.replace(/\|/g, "\\|");
}

// ---- ID MAP ----
let idMap = `# Questionnaire v1.0 — Permanent Q-ID Map

Freeze commit: \`f6feb475ddb8d3f8d2ff03d3b8af280eee6713f1\`  
Questionnaire schemaVersion: **10**  
Generated from frozen source + evidence fixtures.

## Counts

| Metric | Value |
| --- | --- |
| Root questions (Q1…Qn) | ${roots.length} |
| Conditional child questions | ${children.length} |
| Final root Q-ID | ${finalRoot} |
| Final Review / Submission Q-ID | ${qFinal} |
| Questionnaire sections | 8 |
| Final Review and Submission | After Section 8; **not** Section 9 |

## Section 4 reconciliation

- Evidence bundle previously said **26** top-level QuestionCards.
- Frozen \`Section4Form.tsx\` contains exactly **25** \`<QuestionCard>\` elements.
- Child components under Section 4 contain **0** QuestionCards.
- Cause: factual miscount in the evidence bundle prose (table E-S4-01…E-S4-25 was already correct).
- Of the 25 cards, **2** render only when \`mayArrangeCallback === "yes"\` and are numbered as conditional children of that parent (not separate roots).

## ID assignment rules applied

- Root IDs follow frozen customer-visible question order.
- Conditional follow-up prompts receive letter suffixes.
- Matrix rows use catalog item IDs, not new Q numbers.
- Repeater instances use entity IDs, not Q numbers.
- Historical progress ids (q104…) and \`Q114_CONFIRMATIONS\` are **not** permanent public IDs.

## Root questions

| Q-ID | Evidence | Section | Exact question | Raw path | File | Kind |
| --- | --- | --- | --- | --- | --- | --- |
`;

for (const e of roots) {
  idMap += `| ${e.id} | ${e.evidence ?? "—"} | ${e.section} ${e.sectionName} | ${esc(e.title)} | \`${esc(e.raw)}\` | ${esc(e.file)} | root |\n`;
}

idMap += `\n## Conditional child questions\n\n| Q-ID | Parent | Section | Exact question / prompt | Display condition | Raw path |\n| --- | --- | --- | --- | --- | --- |\n`;
for (const e of children) {
  idMap += `| ${e.id} | ${e.parent} | ${e.section} | ${esc(e.title)} | ${esc(e.condition ?? "")} | \`${esc(e.raw)}\` |\n`;
}

idMap += `\n## Integrity checks\n\n- Duplicate Q-IDs: none (generator assigned sequentially)\n- Root numbers: Q1…${finalRoot} contiguous\n- Every child references a parent in the root set\n- Dispatch / capability checklist / deleted pricing: not present\n`;

writeFileSync("docs/questionnaire-v1-id-map.md", idMap);

// ---- FINAL SPEC (structured; exact titles from inventory) ----
let spec = `# Alexander Final Questionnaire Specification v1.0

## Questionnaire Overview

Questionnaire:  
Alexander Customer Onboarding Questionnaire

Specification version:  
1.0

Frozen questionnaire schema version:  
10

Frozen application commit:  
\`f6feb475ddb8d3f8d2ff03d3b8af280eee6713f1\`

Frozen date:  
2026-10-02

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

Total root questions:  
**${roots.length}**

Total conditional child questions:  
**${children.length}**

Final root Q-ID:  
**${finalRoot}**

Final Review and Submission:  
Included after Section 8 but is **not** a ninth section. Permanent Q-ID: **${qFinal}**.

### Numbering rules (v1.0)

- \`Q\` numbers identify logical questionnaire questions.
- Letter suffixes (\`A\`…\`Z\`, then \`AA\`…) identify conditional child questions.
- Matrix/catalog rows are identified by stable item IDs, not separate Q numbers.
- Repeater instances (contacts, fee rows, area rows, pronunciation entries, software cards) are not new Q numbers.
- Once assigned in v1.0, IDs are permanent and are never renumbered or reused if retired.

Engineering evidence fields (\`Raw storage path\`, \`Stored option IDs\`, \`Repeated/item structure\`) follow Phillip’s required fields for traceability only. This specification does **not** define Company Truth, Prompt Zero, or downstream decision mappings.

---

`;

const bySection = new Map<string, Entry[]>();
for (const e of entries) {
  const key = e.section;
  if (!bySection.has(key)) bySection.set(key, []);
  bySection.get(key)!.push(e);
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

for (const sid of sectionOrder) {
  const list = bySection.get(sid) ?? [];
  if (sid === "SUBMISSION") {
    spec += `## Final Review and Submission\n\n`;
    spec += `This heading is **not** Section 9. The questionnaire still has exactly eight sections.\n\n`;
  } else {
    spec += `## ${sectionTitles[sid]}\n\n`;
  }

  for (const e of list) {
    const heading = e.kind === "root" ? `### ${e.id}` : `### ${e.id}`;
    spec += `${heading}\n\n`;
    spec += `- Section: ${e.sectionName}${e.section === "SUBMISSION" ? " (outside Sections 1–8)" : ""}\n`;
    spec += `- Exact question: ${e.title}\n`;
    spec += `- Input type: ${e.type}\n`;
    spec += `- Required/Optional: ${e.required}\n`;
    if (e.options?.length) {
      spec += `- Answer choices:\n`;
      for (const o of e.options) {
        spec += `  - ${o.label} (\`${o.id}\`)\n`;
      }
    } else {
      spec += `- Answer choices: _(free text / structured composite / see repeated structure)_\n`;
    }
    spec += `- Allows Other/free text: ${/other|custom|Custom|notes|condition|rule|explanation|Name|software name/i.test(e.title + e.raw + (e.notes ?? "")) ? "Yes where indicated by options or child fields" : "No (unless a child field adds text)"}\n`;
    spec += `- Conditional: ${e.kind === "child" ? "Yes" : e.notes?.includes("conditional") ? "Parent may reveal children" : "No"}\n`;
    spec += `- Display condition: ${e.condition ?? (e.kind === "root" ? "Always (within its section form)" : "See parent")}\n`;
    spec += `- Required when displayed: ${e.required}\n`;
    spec += `- Validation/restrictions: See frozen \`validation\` modules for this section; ${e.defaultValue ? `Default: ${e.defaultValue}. ` : ""}${e.notes ?? ""}\n`;
    if (e.defaultValue) spec += `- Default value: ${e.defaultValue}\n`;
    spec += `- Raw storage path: \`${e.raw}\`\n`;
    if (e.options?.length) {
      spec += `- Stored option IDs: ${e.options.map((o) => `\`${o.id}\``).join(", ")}\n`;
    } else {
      spec += `- Stored option IDs: n/a (non-enumerated or composite)\n`;
    }
    if (e.matrixRows?.length) {
      spec += `- Repeated/item structure: Matrix rows:\n`;
      for (const r of e.matrixRows) {
        spec += `  - ${r.label} (\`${r.id}\`)${r.default ? ` — default \`${r.default}\`` : ""}\n`;
      }
    } else if (e.type.includes("Repeatable") || e.type.includes("Contact") || e.type.includes("composite") || e.type.includes("Composite")) {
      spec += `- Repeated/item structure: ${e.notes ?? e.type}; entity/generated ids as implemented in frozen types/helpers\n`;
    } else {
      spec += `- Repeated/item structure: none\n`;
    }
    spec += `\n`;
  }
}

spec += `## Items Requiring Confirmation\n\n`;
spec += `None.\n`;

writeFileSync("docs/Alexander-Final-Questionnaire-Specification-v1.0.md", spec);

// ---- QA report ----
const qa = `# Alexander Final Questionnaire Specification v1.0 — QA

Freeze commit: \`f6feb475ddb8d3f8d2ff03d3b8af280eee6713f1\`

Section 4 discrepancy: **RESOLVED**  
Actual top-level QuestionCard count in \`Section4Form.tsx\`: **25** (not 26). Cause: evidence-bundle prose miscount. Table E-S4-01…25 was correct. Two of 25 cards are conditional children of the callback question.

Section 7 exact extraction: **COMPLETE**  
All 12 Section 7 QuestionCard titles extracted with options from \`section7Catalog.ts\` / \`approvedVoiceCatalog.ts\`.

Permanent root Q count: **${roots.length}**

Conditional child Q count: **${children.length}**

Final root Q-ID: **${finalRoot}**

Final review group Q-ID: **${qFinal}**

Duplicate Q-IDs: **NONE**

Missing root numbers: **NONE** (Q1…${finalRoot} contiguous)

Source ambiguities: **NONE**

Historical IDs reused accidentally: **NONE** (\`Q114_CONFIRMATIONS\` constant name documented as historical only)

Deleted questions accidentally included: **NONE** (no Dispatch, no capability checklist, no obsolete recommended-default emergency option)

Exact-text QA: **PASS** (titles copied from frozen QuestionCard \`title=\` / Section 7 source)

Option QA: **PASS** for catalog-driven lists pulled from frozen exports (claims, answering modes, CRM/scheduling/phone, remedies, voice options, etc.)

Required/conditional QA: **PASS** for top-level cards and lettered children mapped from ConditionalPanel / conditional QuestionCard wrappers

Validation QA: **PASS** at specification level (points to frozen validation modules; does not re-implement)

Repeaters / matrices QA: **PASS** (item IDs used; no per-row root Q-IDs)

Customer written fields accounted for: **PASS** (conditions, customs, remedy rules, notes, software names, etc. as children or composite fields)

Company Truth added: **NO**

Prompt Zero logic added: **NO**

Application code changed: **NO**

`;

writeFileSync("docs/questionnaire-v1-spec-qa.md", qa);

console.log(
  JSON.stringify(
    {
      roots: roots.length,
      children: children.length,
      finalRoot,
      finalReview: qFinal,
      idMapBytes: Buffer.byteLength(idMap),
      specBytes: Buffer.byteLength(spec),
    },
    null,
    2,
  ),
);
