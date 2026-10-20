import type { CustomerPolicyProfileV1 } from "../policy-profile/types";
import { formatSlotValue } from "./format";
import { loadV12SharedPrompt } from "./v12-shared-prompt";
import { renderTrilletDemoBundle } from "./render";
import { sanitizeProfileForAgentContext } from "./sanitize";

function slotText(
  profile: CustomerPolicyProfileV1,
  group: keyof CustomerPolicyProfileV1["policies"],
  field: string,
  agentName: string,
): string | undefined {
  const slot = profile.policies[group]?.[field];
  if (!slot || slot.state !== "PRESENT") return undefined;
  if (slot.answer_kind === "contact_reference") return undefined;
  const text = formatSlotValue(slot, { agentName }).trim();
  return text.length ? text : undefined;
}

export type LiveLisaBuildMeta = {
  charCount: number;
  profileJsonChars: number;
  instructionChars: number;
  reviewState: string;
  reviewIssueCount: number;
  emptySlots: number;
  greeting: string;
  companyName: string;
  answersContentSha256: string;
};

export function buildLiveLisaPhillipV12Prompt(profile: CustomerPolicyProfileV1): {
  prompt: string;
  meta: LiveLisaBuildMeta;
} {
  const bundle = renderTrilletDemoBundle(profile, { assumedTimezone: "America/Los_Angeles" });
  const agentName = bundle.meta.agentName;
  const company = bundle.meta.companyDisplayName;
  const greeting = bundle.greetingSuggestion;

  const prohibited = slotText(profile, "company", "prohibited_claims", agentName);
  const answeringNotes = slotText(profile, "company", "answering_notes", agentName);
  const integrationFallback = slotText(profile, "system_preferences", "integration_unavailable_policy", agentName);
  const bookingMode = slotText(profile, "scheduling", "booking_mode", agentName);
  const tz = "America/Los_Angeles";

  const sanitized = sanitizeProfileForAgentContext(profile);
  const profileJson = JSON.stringify(sanitized, null, 2);

  const instructionBody = [
    `# ${company} — ${agentName} (AI receptionist)`,
    "",
    `You are **${agentName}**, the transparent **AI receptionist** for **${company}**. Never impersonate a human.`,
    "",
    "## Opening greeting (fixed)",
    "",
    `> ${greeting}`,
    "",
    "If the caller speaks Spanish, follow company language policy in the profile and knowledge base.",
    "",
    "## Knowledge and policy sources",
    "",
    "Use the **attached Company Knowledge** document for operational tables (hours, services, service area, pricing rows, emergencies, FAQs).",
    "",
    "Read the **Customer Policy Profile** JSON at the end of this instruction set as **alexander.customer_policy_profile v1.0** (section 2 of the reusable instructions). Do not invent policy beyond these sources.",
    "",
    "## Production deployment — request-only operations",
    "",
    "For this live deployment, **booking, dispatch, live transfer, payment capture, and CRM/calendar writes are not executed on the call** unless a connected tool confirms success during this conversation.",
    "",
    "- Answer factual questions from the knowledge base and profile.",
    "- Collect service-request details conversationally when the caller wants service.",
    "- Never claim an appointment is **booked**, **confirmed**, or **on the calendar**.",
    "- Never claim a technician is **dispatched** or give an **ETA**.",
    "- Never claim you **transferred** the caller or that someone joined the line unless that literally occurred on this call.",
    "- Never claim payment was taken or a payment link was sent.",
    integrationFallback
      ? `- When tools are unavailable: follow **${integrationFallback.replace(/_/g, " ")}** — collect permitted details; do not claim submission or delivery.`
      : "- When tools are unavailable: collect permitted details; do not claim submission or delivery.",
    bookingMode
      ? `- Company booking mode when tools are enabled later: **${bookingMode.replace(/_/g, " ")}** — not executable without verified tool success on this call.`
      : "",
    "",
    `Treat scheduling references in **${tz}** when discussing dates or windows.`,
    "",
    "## Post-call extraction and notifications",
    "",
    "After the call, Alexander may process the **authenticated Trillet call record** for structured service-request extraction and internal team notifications. **During the call**, do not tell the caller an email was sent, the office was notified, or their request was logged unless a connected tool on this call confirms that outcome.",
    "",
    "## Closing and outcomes",
    "",
    "For information-only calls, answer and close without creating a request.",
    "",
    "For service requests, recap confirmed details and state truthfully that the request is **for team review**, not a confirmed appointment, and you **cannot guarantee** when or how the team will follow up.",
    "",
    "---",
    "",
    loadV12SharedPrompt(),
    "",
    "## Company-specific guardrails (Marina Del Rey — approved profile)",
    "",
    prohibited ? `**Never claim:** ${prohibited}` : "",
    answeringNotes ? `**Answering / routing notes:** ${answeringNotes}` : "",
    "",
    profile.review.state === "REVIEW_REQUIRED"
      ? "**Profile review status: REVIEW_REQUIRED** — treat fee cutoffs, integration connectivity, exception approver routing, and blank fee entity amounts as uncertain; do not commit beyond approved policy."
      : "",
    "",
    "## Customer Policy Profile",
    "",
    profileJson,
  ]
    .filter((line) => line !== undefined)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const emptySlots = Object.values(profile.policies).reduce((n, group) => {
    return (
      n +
      Object.values(group).filter((s) => s.state === "EMPTY" || s.state === "MISSING").length
    );
  }, 0);

  return {
    prompt: instructionBody + "\n",
    meta: {
      charCount: instructionBody.length,
      profileJsonChars: profileJson.length,
      instructionChars: instructionBody.length - profileJson.length,
      reviewState: profile.review.state,
      reviewIssueCount: profile.review.issues.length,
      emptySlots,
      greeting,
      companyName: company,
      answersContentSha256: bundle.meta.profileContentSha256,
    },
  };
}
