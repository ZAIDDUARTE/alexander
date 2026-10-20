/**
 * Verification helpers for FINAL_AGENT_INSTRUCTIONS vs demo call scenarios.
 */

export type ScenarioCheck = {
  id: number;
  name: string;
  requiredThemes: string[];
  forbiddenPhrases: string[];
};

export const DEMO_SCENARIO_CHECKS: ScenarioCheck[] = [
  {
    id: 1,
    name: "Routine repair",
    requiredThemes: ["demo", "appointment", "knowledge"],
    forbiddenPhrases: ["appointment is confirmed", "I booked you"],
  },
  {
    id: 2,
    name: "Office hours",
    requiredThemes: ["office", "hours", "knowledge"],
    forbiddenPhrases: [],
  },
  {
    id: 3,
    name: "Spanish",
    requiredThemes: ["language", "Spanish"],
    forbiddenPhrases: [],
  },
  {
    id: 4,
    name: "Gas odor",
    requiredThemes: ["911", "gas", "hazard"],
    forbiddenPhrases: [],
  },
  {
    id: 5,
    name: "Out of area",
    requiredThemes: ["territory", "service area"],
    forbiddenPhrases: [],
  },
  {
    id: 6,
    name: "Price quote",
    requiredThemes: ["price", "knowledge"],
    forbiddenPhrases: ["final price guaranteed"],
  },
  {
    id: 7,
    name: "Reschedule",
    requiredThemes: ["calendar", "demo"],
    forbiddenPhrases: ["rescheduled your appointment"],
  },
  {
    id: 8,
    name: "Human now",
    requiredThemes: ["transfer", "demo"],
    forbiddenPhrases: ["connecting you now", "I've transferred"],
  },
  {
    id: 9,
    name: "Prior work complaint",
    requiredThemes: ["prior", "complaint", "warranty"],
    forbiddenPhrases: [],
  },
  {
    id: 10,
    name: "Repiping project",
    requiredThemes: ["conditions", "knowledge"],
    forbiddenPhrases: ["project is scheduled"],
  },
];

export type VerificationResult = {
  ok: boolean;
  charCount: number;
  hasJsonBlock: boolean;
  hasLisa: boolean;
  hasCompany: boolean;
  noPromiseCallbacks: boolean;
  noSerializedJson: boolean;
  noMasculineAgentPronouns: boolean;
  hasUnverifiedCredentialGuidance: boolean;
  scenarioCoverage: { id: number; name: string; themesOk: boolean; missingThemes: string[] }[];
  errors: string[];
};

function hasSerializedJsonInInstructions(text: string): boolean {
  if (text.includes("```json") || text.includes('"policies":')) return true;
  if (text.includes('"callerLanguages"') || text.includes('"englishOnly"')) return true;
  if (text.includes('"remedies"') && text.includes('"rules"')) return true;
  if (/\{\s*\n\s*"/.test(text)) return true;
  return false;
}

export function verifyFinalInstructions(
  text: string,
  companyName: string,
  agentName: string,
): VerificationResult {
  const lower = text.toLowerCase();
  const errors: string[] = [];

  const noSerializedJson = !hasSerializedJsonInInstructions(text);
  if (!noSerializedJson) {
    errors.push("instructions contain serialized JSON");
  }

  const noMasculineAgentPronouns = !/\b(he|him|his)\s+(should|must|may)\b/i.test(text);
  if (!noMasculineAgentPronouns) {
    errors.push("instructions use masculine pronouns for the agent");
  }

  const hasUnverifiedCredentialGuidance =
    lower.includes("onboarding") &&
    (lower.includes("license") || lower.includes("credential")) &&
    lower.includes("not records you verified");

  if (!hasUnverifiedCredentialGuidance) {
    errors.push("missing guidance that license/phone are not verified on the call");
  }
  if (text.length > 25_000) {
    errors.push(`instructions too long (${text.length} chars); target concise install prompt`);
  }
  if (!lower.includes(agentName.toLowerCase())) {
    errors.push(`missing agent name ${agentName}`);
  }
  if (!lower.includes(companyName.toLowerCase().split(" ")[0])) {
    errors.push(`missing company reference`);
  }
  if (!lower.includes("knowledge")) {
    errors.push("missing knowledge base reference");
  }
  if (!lower.includes("911")) {
    errors.push("missing emergency 911 guidance");
  }

  const noPromiseCallbacks =
    lower.includes("never say or imply") &&
    (lower.includes("callback") || lower.includes("call back")) &&
    lower.includes("transfer");

  if (!noPromiseCallbacks) {
    errors.push("missing explicit no-promise rules for callback/transfer");
  }

  const scenarioCoverage = DEMO_SCENARIO_CHECKS.map((sc) => {
    const missingThemes: string[] = [];
    for (const theme of sc.requiredThemes) {
      if (!lower.includes(theme.toLowerCase())) {
        missingThemes.push(theme);
      }
    }
    for (const forbidden of sc.forbiddenPhrases) {
      if (lower.includes(forbidden.toLowerCase())) {
        errors.push(`scenario ${sc.id}: forbidden phrase in instructions: ${forbidden}`);
      }
    }
    return {
      id: sc.id,
      name: sc.name,
      themesOk: missingThemes.length === 0,
      missingThemes,
    };
  });

  const themesFailed = scenarioCoverage.filter((s) => !s.themesOk);
  if (themesFailed.length) {
    for (const f of themesFailed) {
      errors.push(`scenario ${f.id} (${f.name}): weak coverage — missing themes: ${f.missingThemes.join(", ")}`);
    }
  }

  return {
    ok: errors.length === 0,
    charCount: text.length,
    hasJsonBlock: text.includes("```json"),
    hasLisa: lower.includes(agentName.toLowerCase()),
    hasCompany: lower.includes("marina"),
    noPromiseCallbacks,
    noSerializedJson,
    noMasculineAgentPronouns,
    hasUnverifiedCredentialGuidance,
    scenarioCoverage,
    errors,
  };
}
