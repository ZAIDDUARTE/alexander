/**
 * Question Registry v1 — permanent Q-ID contract for frozen questionnaire.
 *
 * Source: docs/questionnaire-v1-id-map.md / qid-inventory-full.json
 * Exact customer wording lives in the Final Questionnaire Specification.
 * This registry owns identity, mapping, option IDs, and answer kinds.
 */

import generated from "./_generated-registry.json";
import type { RegistryQuestion, ShelfId } from "./types";

export const QUESTION_REGISTRY_V1: readonly RegistryQuestion[] =
  generated.entries as RegistryQuestion[];

export const QUESTION_REGISTRY_BY_ID: ReadonlyMap<string, RegistryQuestion> = new Map(
  QUESTION_REGISTRY_V1.map((q) => [q.questionId, q]),
);

export const QUESTION_REGISTRY_ROOT_IDS = QUESTION_REGISTRY_V1.filter((q) => q.kind === "root").map(
  (q) => q.questionId,
);

export const QUESTION_REGISTRY_CONDITIONAL_IDS = QUESTION_REGISTRY_V1.filter(
  (q) => q.kind === "conditional",
).map((q) => q.questionId);

export const QUESTION_REGISTRY_FREEZE_COMMIT = generated.freezeCommit as string;
export const QUESTION_REGISTRY_ROOT_COUNT = generated.rootCount as number;
export const QUESTION_REGISTRY_CHILD_COUNT = generated.childCount as number;

export function getRegistryQuestion(questionId: string): RegistryQuestion | undefined {
  return QUESTION_REGISTRY_BY_ID.get(questionId);
}

export function listQuestionsForShelf(sectionId: ShelfId): RegistryQuestion[] {
  return QUESTION_REGISTRY_V1.filter((q) => q.sectionId === sectionId);
}

export const SECTION_IDS = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"] as const;
