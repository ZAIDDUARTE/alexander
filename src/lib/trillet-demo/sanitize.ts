import type { CustomerPolicyProfileV1 } from "../policy-profile/types";
import { POLICY_GROUPS } from "../policy-profile/types";

/** Profile JSON safe to embed in agent context (no raw entity phone books or internal IDs). */
function redactContactIdsInValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(redactContactIdsInValue);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === "contact_id" || k === "approverContactId" || k.endsWith("ContactId")) {
        out[k] = "[redacted-contact-reference]";
        continue;
      }
      out[k] = redactContactIdsInValue(v);
    }
    return out;
  }
  if (typeof value === "string" && /^contact-[a-z0-9]+$/i.test(value)) {
    return "[redacted-contact-reference]";
  }
  return value;
}

export function sanitizeProfileForAgentContext(
  profile: CustomerPolicyProfileV1,
): CustomerPolicyProfileV1 {
  const copy = JSON.parse(JSON.stringify(profile)) as CustomerPolicyProfileV1;
  copy.entities = {
    contacts: {},
    fees: summarizeFees(profile.entities.fees),
    systems: summarizeSystems(profile.entities.systems),
  };
  for (const group of Object.keys(copy.policies)) {
    const policies = copy.policies[group as keyof typeof copy.policies];
    for (const slot of Object.values(policies)) {
      if (slot.value !== null && slot.value !== undefined) {
        slot.value = redactContactIdsInValue(slot.value);
      }
    }
  }
  return copy;
}

function summarizeFees(fees: Record<string, Record<string, unknown>>): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {};
  for (const fee of Object.values(fees)) {
    const key = String(fee.feeKey ?? fee.name ?? "fee");
    out[key] = {
      name: fee.name,
      feeKey: fee.feeKey,
      noticeRequired: fee.noticeRequired,
      applicationRule: fee.applicationRule,
      waiverPolicy: fee.waiverPolicy,
    };
  }
  return out;
}

function summarizeSystems(
  systems: Record<string, Record<string, unknown>>,
): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {};
  for (const sys of Object.values(systems)) {
    const key = String(sys.providerKey ?? sys.role ?? "system");
    out[key] = {
      role: sys.role,
      providerKey: sys.providerKey,
      displayName: sys.displayName,
    };
  }
  return out;
}

export function redactSensitiveText(text: string): string {
  return text
    .replace(/contact-[a-z0-9]+/gi, "[contact]")
    .replace(/\bsw-[a-z0-9]+\b/gi, "[system]")
    .replace(/\bfee-[a-z0-9]+\b/gi, "[fee]");
}
