/**
 * Static prompt QA for A/B versions — not a substitute for voice evaluation.
 */

export type AbBehaviorCheck = {
  id: string;
  name: string;
  requiredPatterns: RegExp[];
  forbiddenPatterns: RegExp[];
  appliesTo: "both" | "B";
};

export const AB_FORBIDDEN_BOTH: RegExp[] = [
  /they'll contact you/i,
  /they will contact you to confirm/i,
  /ALX-C000002|Phillip'?s live production/i,
  /\bI booked you\b/i,
  /appointment is confirmed/i,
  /connecting you now/i,
  /I've transferred/i,
  /payment (was|has been) taken/i,
];

export const AB_BEHAVIOR_CHECKS: AbBehaviorCheck[] = [
  {
    id: "sandbox-request-only",
    name: "Request-only / no false booking claims",
    appliesTo: "both",
    requiredPatterns: [/request-only|never claim to have booked|not a confirmed appointment/i],
    forbiddenPatterns: [],
  },
  {
    id: "no-callback-guarantee",
    name: "No guaranteed team follow-up wording",
    appliesTo: "both",
    requiredPatterns: [/cannot guarantee when or how the team will follow up/i],
    forbiddenPatterns: [/they'll contact you/i],
  },
  {
    id: "shared-functions-none",
    name: "No connected booking/transfer/payment tools",
    appliesTo: "both",
    requiredPatterns: [/Connected functions[\s\S]*None/i, /No booking, transfer, payment/i],
    forbiddenPatterns: [],
  },
  {
    id: "factual-no-intake",
    name: "Factual question without unnecessary intake",
    appliesTo: "both",
    requiredPatterns: [/factual|hours, service or price inquiry/i, /do not (collect a service request when the caller only asks a factual question|force full intake)/i],
    forbiddenPatterns: [],
  },
  {
    id: "corrections",
    name: "Caller corrections and memory",
    appliesTo: "both",
    requiredPatterns: [/correct details immediately|update the working understanding/i],
    forbiddenPatterns: [],
  },
  {
    id: "gas-leak",
    name: "Gas leak safety",
    appliesTo: "both",
    requiredPatterns: [/gas/i, /emergency services|911|leave the area|immediate danger/i],
    forbiddenPatterns: [],
  },
  {
    id: "shared-safety-footer",
    name: "Shared A/B safety harmonization present",
    appliesTo: "both",
    requiredPatterns: [/A\/B test — shared safety overlay/i, /Do not promise the team will call back/i],
    forbiddenPatterns: [],
  },
  {
    id: "topic-switch",
    name: "Topic switching / multiple intents",
    appliesTo: "B",
    requiredPatterns: [/multiple intents|reassess|new question|conversational branches/i],
    forbiddenPatterns: [],
  },
  {
    id: "refuse-scheduling",
    name: "Caller refuses scheduling",
    appliesTo: "B",
    requiredPatterns: [/declin(e|es) scheduling|do not want an appointment|respect that choice/i],
    forbiddenPatterns: [],
  },
  {
    id: "frustrated",
    name: "Frustrated caller / complaints",
    appliesTo: "B",
    requiredPatterns: [/frustrat|complaint|without admitting fault/i],
    forbiddenPatterns: [],
  },
  {
    id: "conversational-intelligence",
    name: "v1.2 conversational intelligence section",
    appliesTo: "B",
    requiredPatterns: [/CONVERSATIONAL INTELLIGENCE|advance the caller's actual purpose/i],
    forbiddenPatterns: [],
  },
  {
    id: "no-card",
    name: "Credit card collection refusal",
    appliesTo: "B",
    requiredPatterns: [/never ask the caller to dictate full card|security codes|banking credentials/i],
    forbiddenPatterns: [/what is your card number/i],
  },
  {
    id: "privacy",
    name: "Privacy and unauthorized disclosures",
    appliesTo: "B",
    requiredPatterns: [/restricted_disclosures|never reveal another customer/i],
    forbiddenPatterns: [],
  },
  {
    id: "tool-outcomes",
    name: "Accurate reporting of tool outcomes",
    appliesTo: "B",
    requiredPatterns: [/Describe only the business outcome|never claim a request was sent when you only collected it/i],
    forbiddenPatterns: [],
  },
];

export type AbQaResult = {
  version: "A" | "B";
  ok: boolean;
  checks: Array<{ id: string; name: string; pass: boolean; missing: string[]; forbiddenHit: string[]; skipped?: boolean }>;
};

function runChecks(text: string, version: "A" | "B"): AbQaResult["checks"] {
  return AB_BEHAVIOR_CHECKS.map((check) => {
    if (check.appliesTo === "B" && version === "A") {
      return { id: check.id, name: check.name, pass: true, missing: [], forbiddenHit: [], skipped: true };
    }
    const missing: string[] = [];
    const forbiddenHit: string[] = [];
    for (const re of check.requiredPatterns) {
      if (!re.test(text)) missing.push(re.source);
    }
    for (const re of check.forbiddenPatterns) {
      if (re.test(text)) forbiddenHit.push(re.source);
    }
    return {
      id: check.id,
      name: check.name,
      pass: missing.length === 0 && forbiddenHit.length === 0,
      missing,
      forbiddenHit,
    };
  });
}

export function qaAbPrompt(version: "A" | "B", text: string): AbQaResult {
  const checks = runChecks(text, version);
  const globalForbidden = AB_FORBIDDEN_BOTH.filter((re) => re.test(text)).map((re) => re.source);
  if (globalForbidden.length) {
    checks.push({
      id: "global-forbidden",
      name: "No guarantees, other customers, or false actions",
      pass: false,
      missing: [],
      forbiddenHit: globalForbidden,
    });
  }
  const active = checks.filter((c) => !c.skipped);
  return { version, ok: active.every((c) => c.pass), checks };
}

export function qaAbPrompts(versionA: string, versionB: string): { a: AbQaResult; b: AbQaResult } {
  return { a: qaAbPrompt("A", versionA), b: qaAbPrompt("B", versionB) };
}
