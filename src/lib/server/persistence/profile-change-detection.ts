import { getRegistryQuestion } from "@/lib/onboarding/questionnaire-v1/registry";
import type { ShelfId } from "@/lib/onboarding/questionnaire-v1/types";

export type ChangeImpact = "low" | "high" | "unknown";

export type FieldChange = {
  questionId: string;
  sectionId: ShelfId | "UNKNOWN";
  classification: "routine" | "operationally_sensitive";
  impact: ChangeImpact;
  before: unknown;
  after: unknown;
};

export type ProfileDiff = {
  changes: FieldChange[];
  revisionImpact: ChangeImpact;
  requiresTrilletSync: boolean;
  requiresQa: boolean;
};

/** Sections whose edits change how the receptionist behaves operationally. */
const SENSITIVE_SECTIONS = new Set<ShelfId>(["S2", "S3", "S4", "S5", "S6", "S7"]);

/** Explicit high-impact roots even if section heuristics miss them. */
const SENSITIVE_QUESTION_IDS = new Set([
  "Q8",
  "Q9",
  "Q10",
  "Q11",
  "Q12",
  "Q13",
  "Q14",
  "Q15",
  "Q16",
  "Q17",
  "Q18",
  "Q19",
  "Q20",
  "Q21",
  "Q22",
  "Q23",
  "Q24",
  "Q25",
]);

/** Display / marketing identity that is usually routine. */
const ROUTINE_QUESTION_IDS = new Set(["Q1", "Q4", "Q5", "Q6", "Q7"]);

function stableJson(value: unknown): string {
  if (value === undefined) return "undefined";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function classifyQuestionImpact(questionId: string): {
  classification: "routine" | "operationally_sensitive";
  impact: ChangeImpact;
} {
  if (ROUTINE_QUESTION_IDS.has(questionId)) {
    return { classification: "routine", impact: "low" };
  }
  if (SENSITIVE_QUESTION_IDS.has(questionId)) {
    return { classification: "operationally_sensitive", impact: "high" };
  }
  const meta = getRegistryQuestion(questionId);
  if (meta && SENSITIVE_SECTIONS.has(meta.sectionId as ShelfId)) {
    return { classification: "operationally_sensitive", impact: "high" };
  }
  if (meta?.sectionId === "S1" || meta?.sectionId === "S8") {
    return { classification: "routine", impact: "low" };
  }
  return { classification: "operationally_sensitive", impact: "unknown" };
}

export function diffProfileFields(
  beforeFields: Record<string, unknown>,
  afterFields: Record<string, unknown>,
): ProfileDiff {
  const ids = new Set([...Object.keys(beforeFields), ...Object.keys(afterFields)]);
  const changes: FieldChange[] = [];

  for (const questionId of ids) {
    if (questionId.startsWith("_")) continue;
    const before = beforeFields[questionId];
    const after = afterFields[questionId];
    if (stableJson(before) === stableJson(after)) continue;
    const classified = classifyQuestionImpact(questionId);
    const meta = getRegistryQuestion(questionId);
    changes.push({
      questionId,
      sectionId: (meta?.sectionId as ShelfId) || "UNKNOWN",
      classification: classified.classification,
      impact: classified.impact,
      before: before ?? null,
      after: after ?? null,
    });
  }

  changes.sort((a, b) => a.questionId.localeCompare(b.questionId, "en"));

  let revisionImpact: ChangeImpact = "low";
  if (changes.length === 0) {
    revisionImpact = "low";
  } else if (changes.some((c) => c.impact === "high")) {
    revisionImpact = "high";
  } else if (changes.some((c) => c.impact === "unknown")) {
    revisionImpact = "unknown";
  }

  const sensitive = changes.some((c) => c.classification === "operationally_sensitive");
  return {
    changes,
    revisionImpact,
    requiresTrilletSync: sensitive || revisionImpact === "high" || revisionImpact === "unknown",
    requiresQa: revisionImpact === "high" || revisionImpact === "unknown",
  };
}
