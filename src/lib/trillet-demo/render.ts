import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { CustomerPolicyProfileV1, PolicyAnswerSlot, PolicyGroupId } from "../policy-profile/types";
import { POLICY_GROUPS } from "../policy-profile/types";

import { formatSlotValue, humanizeFieldName } from "./format";
import { redactSensitiveText, sanitizeProfileForAgentContext } from "./sanitize";
import { AGENT_INSTRUCTIONS_V1_1 } from "./agent-instructions-v1_1";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const AGENT_INSTRUCTIONS_VERSION = "1.1";
export const DEMO_MODE_LABEL = "SUNDAY_CALLABLE_DEMO_V1";

export type TrilletDemoRenderOptions = {
  /** Defaults to bundled Agent Instructions v1.1 text */
  agentInstructionsPath?: string;
  /** IANA timezone for spoken date context when installation.timezone is null */
  assumedTimezone?: string;
};

export type TrilletDemoBundle = {
  sharedPrompt: string;
  companyKnowledge: string;
  sanitizedProfileJson: string;
  greetingSuggestion: string;
  meta: {
    companyDisplayName: string;
    agentName: string;
    reviewState: string;
    profileContentSha256: string;
    approxPromptChars: number;
    approxKnowledgeChars: number;
  };
};

function loadSharedInstructions(path?: string): string {
  if (!path) return AGENT_INSTRUCTIONS_V1_1.trim();
  try {
    return readFileSync(path, "utf8").trim();
  } catch {
    return AGENT_INSTRUCTIONS_V1_1.trim();
  }
}

function slot(profile: CustomerPolicyProfileV1, group: PolicyGroupId, field: string): PolicyAnswerSlot | undefined {
  return profile.policies[group]?.[field];
}

function slotText(
  profile: CustomerPolicyProfileV1,
  group: PolicyGroupId,
  field: string,
  opts?: { allowContactReference?: boolean },
): string | undefined {
  const s = slot(profile, group, field);
  if (!s || s.state === "INACTIVE" || s.state === "MISSING" || s.state === "INVALID") return undefined;
  if (s.state === "EMPTY") return undefined;
  if (s.answer_kind === "contact_reference" && !opts?.allowContactReference) return undefined;
  const agentName =
    profile.policies.conversation?.agent_name?.state === "PRESENT" &&
    typeof profile.policies.conversation.agent_name.value === "string"
      ? String(profile.policies.conversation.agent_name.value).trim()
      : "Lisa";
  return formatSlotValue(s, { agentName });
}

function buildDemoOverlay(profile: CustomerPolicyProfileV1, assumedTimezone: string): string {
  const review = profile.review.state;
  const lines: string[] = [
    "## SUNDAY CALLABLE DEMO — OPERATING CONSTRAINTS (OVERRIDE FOR THIS DEPLOYMENT)",
    "",
    `Mode: ${DEMO_MODE_LABEL}`,
    "",
    "External integrations are **not** connected for this demo (no live CRM, calendar, payments, or verified transfers).",
    "",
    "### You MUST",
    "- Introduce yourself using the configured agent name and AI disclosure from the customer profile.",
    "- Answer factual questions using the company knowledge document and embedded policy profile.",
    "- Recognize potential hazards (gas, active flooding, sewage inside, water near electricity) and tell the caller to move to safety and call 911 if there is immediate danger. Do not provide technical repair instructions for hazardous situations.",
    "- For service requests: collect caller name, callback number, service address, description, urgency, and preferred times — then explain the scheduling team will follow up to confirm.",
    "- Use approved starting-at or exact price rows when quoting; never promise a final price when policy says starting_at or team_provides_pricing.",
    "- Honor service-area and service-eligibility rules; if unclear, say the team must verify the address.",
    "",
    "### You MUST NOT",
    "- Confirm an appointment is booked, scheduled, or on the calendar.",
    "- Quote a technician arrival time, dispatch, or ETA.",
    "- Claim you updated CRM/Jobber/Housecall Pro, processed payment, sent a payment link, or completed a transfer to a human.",
    "- Read internal contact IDs, entity IDs, or staff private numbers aloud.",
    "- Waive fees, approve exceptions, or promise warranty coverage without verified approval.",
    "",
    "### Booking language (use consistently)",
    '- Say: "I can take your request and our scheduling team will contact you to confirm availability."',
    '- Do NOT say: "You are all set," "I booked you," or "Your appointment is confirmed."',
    "",
    `### Timezone`,
    `installation.timezone is unset; treat scheduling references as **${assumedTimezone}** unless the caller specifies otherwise.`,
    "",
    `### Profile review state: **${review}**`,
    "Treat open review issues conservatively — do not rely on disputed fee cutoffs, unverified integrations, or unresolved approver routing for commitments.",
    "",
  ];

  if (profile.review.issues.length) {
    lines.push("### Active review issues (summary)");
    for (const issue of profile.review.issues) {
      lines.push(`- **${issue.code}** (${issue.severity}): ${issue.message}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function buildGreeting(profile: CustomerPolicyProfileV1): string {
  const company =
    slotText(profile, "company", "company_name") ?? "the company";
  const agentName = slotText(profile, "conversation", "agent_name") ?? "Lisa";
  const disclosure = slot(profile, "conversation", "ai_disclosure")?.value;
  const style =
    disclosure === "opening_ai_receptionist"
      ? `Hi, thanks for calling ${company}. This is ${agentName}, the company's AI receptionist.`
      : `Hi, thanks for calling ${company}. This is ${agentName}.`;
  return style;
}

function buildCompanyKnowledge(profile: CustomerPolicyProfileV1, assumedTimezone: string): string {
  const sections: string[] = [
    `# Company knowledge — ${slotText(profile, "company", "company_name") ?? "Customer"}`,
    "",
    "Readable reference for callers. Internal entity IDs and private staff contact sheets are omitted.",
    "",
    "License, phone, and credential lines below are **onboarding-supplied reference data** for this demo — not independently verified on a live call. Lisa should present them as company-provided information, not as registry- or directory-confirmed facts.",
    "",
    "## Identity & trust",
  ];

  const push = (title: string, body: string | undefined) => {
    if (!body) return;
    sections.push(`### ${title}`, redactSensitiveText(body), "");
  };

  push("Legal name", slotText(profile, "company", "legal_name"));
  push("Public website", slotText(profile, "company", "website"));
  push("License / credentials", slotText(profile, "company", "credential_details"));
  push("Permitted claims", slotText(profile, "company", "permitted_claims"));
  push("Never claim", slotText(profile, "company", "prohibited_claims"));
  push("Main business line", slotText(profile, "company", "main_phone"));

  sections.push("## Hours (distinct types)");
  push("Office hours", slotText(profile, "company", "office_hours"));
  push("Field service hours", slotText(profile, "company", "service_hours"));
  push("Answering coverage", slotText(profile, "company", "answering_hours"));
  push("Answering schedule", slotText(profile, "company", "answering_schedule"));
  push("Answering notes", slotText(profile, "company", "answering_notes"));

  sections.push("## Services & territory");
  push("Plumbing services matrix", slotText(profile, "services", "plumbing_services"));
  push("Diagnostic services matrix", slotText(profile, "services", "diagnostic_services"));
  push("Property types matrix", slotText(profile, "services", "property_eligibility"));
  push("Service area", slotText(profile, "services", "service_area"));
  push("Excluded territory", slotText(profile, "services", "excluded_territory"));
  push("After-hours territory", slotText(profile, "services", "after_hours_territory"));

  sections.push("## Emergencies");
  push("Urgency classifications", slotText(profile, "emergencies", "urgency_classifications"));
  push("Emergency triggers", slotText(profile, "emergencies", "escalation_triggers"));
  push("After-hours handling", slotText(profile, "emergencies", "after_hours_handling"));
  push("Emergency service hours", slotText(profile, "emergencies", "emergency_service_hours"));
  push("Nobody responds fallback", slotText(profile, "emergencies", "nobody_responds"));
  push("Retry policy", slotText(profile, "emergencies", "retry_policy"));

  sections.push("## Scheduling (intake — demo cannot confirm slots)");
  push("Booking mode", slotText(profile, "scheduling", "booking_mode"));
  push("Booking horizon", slotText(profile, "scheduling", "booking_horizon"));
  push("Appointment windows", slotText(profile, "scheduling", "appointment_windows"));
  push("Information to collect", slotText(profile, "scheduling", "required_booking_information"));
  push("Same-day / holiday rules", slotText(profile, "scheduling", "date_exception_rules"));
  push("Service-specific booking rules", slotText(profile, "scheduling", "service_booking_rules"));
  push("Caller authority", slotText(profile, "scheduling", "caller_authority"));
  push("Human request handling", slotText(profile, "scheduling", "human_request_policy"));
  push("AI refusal handling", slotText(profile, "scheduling", "ai_refusal_policy"));

  sections.push("## Pricing & payments");
  push("Pricing models", slotText(profile, "pricing", "pricing_models"));
  push("Quote permission", slotText(profile, "pricing", "quote_permission"));
  push("Authorized price rows", slotText(profile, "pricing", "authorized_price_rows"));
  push("When price unknown", slotText(profile, "pricing", "unknown_price_response"));
  push("Additional fee amounts", slotText(profile, "pricing", "additional_fee_amounts"));
  push("Payment methods", slotText(profile, "pricing", "payment_methods"));
  push("Financial remedies", slotText(profile, "pricing", "financial_remedies"));

  sections.push("## Customer care");
  push("Prior work handling", slotText(profile, "customer_care", "prior_work_handling"));
  push("Repeat callback policy", slotText(profile, "customer_care", "repeat_callback_policy"));
  push("Complaint escalation", slotText(profile, "customer_care", "complaint_escalation"));
  push("Restricted disclosures", slotText(profile, "customer_care", "restricted_disclosures"));

  sections.push("## Voice & conversation (Lisa)");
  push("Languages", slotText(profile, "conversation", "languages"));
  push("Agent name", slotText(profile, "conversation", "agent_name"));
  push("Communication style", slotText(profile, "conversation", "communication_style"));
  push("AI disclosure", slotText(profile, "conversation", "ai_disclosure"));
  push("Formality", slotText(profile, "conversation", "formality"));

  sections.push("## Integration note (demo)");
  push(
    "Requested systems (not live in demo)",
    "CRM/scheduling/phone selections are configuration intent only — do not claim live access.",
  );

  sections.push("---", `Reference timezone for scheduling language: ${assumedTimezone}`, "");

  return sections.join("\n");
}

function buildPolicyAppendix(profile: CustomerPolicyProfileV1): string {
  const lines: string[] = [
    "## CUSTOMER POLICY PROFILE (serialized)",
    "",
    "Full active policy slots for this customer (`alexander.customer_policy_profile` v1.0).",
    "Entity contact directories are summarized — use company knowledge for caller-facing facts.",
    "",
    "```json",
    JSON.stringify(sanitizeProfileForAgentContext(profile), null, 2),
    "```",
  ];
  return lines.join("\n");
}

export function renderTrilletDemoBundle(
  profile: CustomerPolicyProfileV1,
  options: TrilletDemoRenderOptions = {},
): TrilletDemoBundle {
  const assumedTimezone = options.assumedTimezone ?? "America/Los_Angeles";
  const sharedCore = loadSharedInstructions(options.agentInstructionsPath);
  const demoOverlay = buildDemoOverlay(profile, assumedTimezone);
  const knowledge = buildCompanyKnowledge(profile, assumedTimezone);
  const policyAppendix = buildPolicyAppendix(profile);
  const greetingSuggestion = buildGreeting(profile);

  const sharedPrompt = [
    sharedCore,
    "",
    "---",
    "",
    demoOverlay,
    "",
    "---",
    "",
    policyAppendix,
  ].join("\n");

  const sanitizedProfileJson = JSON.stringify(sanitizeProfileForAgentContext(profile), null, 2);

  const companyDisplayName =
    slotText(profile, "company", "company_name") ?? "Unknown company";

  return {
    sharedPrompt,
    companyKnowledge: knowledge,
    sanitizedProfileJson,
    greetingSuggestion,
    meta: {
      companyDisplayName,
      agentName: slotText(profile, "conversation", "agent_name") ?? "Lisa",
      reviewState: profile.review.state,
      profileContentSha256: profile.source.answers_content_sha256,
      approxPromptChars: sharedPrompt.length,
      approxKnowledgeChars: knowledge.length,
    },
  };
}

/** List PRESENT slots for QA */
export function listActivePolicyFields(profile: CustomerPolicyProfileV1): string[] {
  const keys: string[] = [];
  for (const group of POLICY_GROUPS) {
    for (const [field, slot] of Object.entries(profile.policies[group])) {
      if (slot.state === "PRESENT") keys.push(`${group}.${field}`);
    }
  }
  return keys.sort();
}
