import { createHash, timingSafeEqual } from "node:crypto";

export const extractionFields = [
  "caller_name", "callback_number", "service_requested", "problem_description",
  "property_type", "property_address_or_city", "urgency", "preferred_appointment_time",
  "customer_message", "human_follow_up_required", "service_area_eligibility",
  "call_outcome", "call_summary",
] as const;
export type Intake = Record<typeof extractionFields[number], string | boolean | null>;
export type RequestStatus = "Received" | "Pending Review" | "Synced" | "Failed" | "Needs Attention";
export type Binding = {
  id: string; customerId: string; workspaceId: string; flowId: string;
  agentId: string; activatedAt: string; timezone: "America/Los_Angeles";
};

export function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function bearerToken(header: string | null): string {
  const match = /^Bearer ([A-Za-z0-9_-]{43,256})$/.exec(header ?? "");
  if (!match) throw new Error("unauthorized");
  return match[1];
}

export function equalSecret(a: string, b: string): boolean {
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_payload");
  return value as Record<string, unknown>;
}

export function normalizeIntake(value: unknown): Intake {
  const raw = object(value);
  const normalized = {} as Intake;
  for (const field of extractionFields) {
    const v = raw[field];
    if (field === "human_follow_up_required") {
      normalized[field] = v === true || v === "true" || v === "yes" ? true
        : v === false || v === "false" || v === "no" ? false : null;
    } else if (v == null || v === "") {
      normalized[field] = null;
    } else {
      if (typeof v !== "string" || v.length > 8000) throw new Error("invalid_extraction");
      const text = v.trim().replace(/\r\n/g, "\n");
      normalized[field] = /^(unknown|not provided|n\/a|null|none)$/i.test(text) ? null : text || null;
    }
  }
  return normalized;
}

export function classifyIntake(fields: Intake): { create: boolean; status: RequestStatus; reason: string } {
  const outcome = fields.call_outcome;
  if (outcome === "completed_information_only") return { create: false, status: "Received", reason: "information_only" };
  // A service name, contact details, or follow-up flag alone does not establish service intent.
  if (outcome !== "intake_collected" && outcome !== "appointment_requested_not_confirmed") {
    return { create: false, status: "Needs Attention", reason: "intent_requires_review" };
  }
  if (!fields.service_requested || !fields.problem_description) {
    return { create: false, status: "Needs Attention", reason: "service_intent_incomplete" };
  }
  const complete = fields.caller_name && fields.callback_number && fields.property_address_or_city;
  return { create: true, status: complete ? "Pending Review" : "Needs Attention", reason: complete ? "request_only" : "contact_incomplete" };
}

export function verifyCall(raw: unknown, callId: string, binding: Binding, now = Date.now()) {
  const call = object(raw);
  if (call._id !== callId || call.workspaceId !== binding.workspaceId ||
      call.callFlowId !== binding.flowId || call.agentId !== binding.agentId) throw new Error("call_binding_mismatch");
  if (call.status !== "completed") throw new Error("call_not_completed");
  const ended = typeof call.endTime === "number" ? call.endTime * (call.endTime < 1e12 ? 1000 : 1) : NaN;
  const activated = Date.parse(binding.activatedAt);
  if (!Number.isFinite(ended) || !Number.isFinite(activated) || ended < activated || ended > now + 60_000 || now - ended > 86400_000) {
    throw new Error("call_outside_ingestion_window");
  }
  const fields = normalizeIntake(call.analyzedData);
  const decision = classifyIntake(fields);
  return { callId, endedAt: new Date(ended).toISOString(), fields, ...decision,
    fingerprint: tokenHash(JSON.stringify(fields)) };
}

export async function retrieveCall(callId: string, binding: Binding, apiKey: string, fetcher = fetch) {
  if (!/^[a-zA-Z0-9_-]{8,128}$/.test(callId)) throw new Error("invalid_call_id");
  if (!apiKey) throw new Error("trillet_not_configured");
  const response = await fetcher(`https://api.trillet.ai/v2/api/call-history/${encodeURIComponent(callId)}`, {
    headers: { "x-api-key": apiKey, "x-workspace-id": binding.workspaceId },
    redirect: "error", signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("trillet_read_failed");
  return verifyCall(await response.json(), callId, binding);
}
