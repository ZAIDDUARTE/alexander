import type { AnswerKind } from "../onboarding/questionnaire-v1/types";
import type { AnswerState } from "./types";

export function isRequiredWhenActive(requiredLabel: string): boolean {
  const normalized = requiredLabel.toLowerCase();
  if (normalized.includes("optional") && !normalized.includes("required")) return false;
  return normalized.includes("required");
}

export function isExplicitBlankValue(value: unknown, answerKind: AnswerKind): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (answerKind === "acknowledgement_group" && typeof value === "object" && value) {
    const entries = Object.values(value as Record<string, unknown>);
    return entries.length === 0 || entries.every((v) => v === false);
  }
  if (answerKind === "composite" && typeof value === "object" && value) {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (keys.length === 0) return true;
    return keys.every((k) => isExplicitBlankValue(obj[k], "scalar_text"));
  }
  return false;
}

export function classifyActiveAnswerState(
  value: unknown,
  answerKind: AnswerKind,
  requiredLabel: string,
): AnswerState {
  if (isExplicitBlankValue(value, answerKind)) {
    return isRequiredWhenActive(requiredLabel) ? "INVALID" : "EMPTY";
  }
  return "PRESENT";
}

export function inactiveSlot(): Pick<
  import("./types").PolicyAnswerSlot,
  "source_pointer" | "state" | "answer_kind" | "value"
> {
  return {
    source_pointer: null,
    state: "INACTIVE",
    answer_kind: null,
    value: null,
  };
}

export function missingSlot(): Pick<
  import("./types").PolicyAnswerSlot,
  "source_pointer" | "state" | "answer_kind" | "value"
> {
  return {
    source_pointer: null,
    state: "MISSING",
    answer_kind: null,
    value: null,
  };
}
