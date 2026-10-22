import {
  QUESTION_REGISTRY_V1,
  getRegistryQuestion,
} from "@/lib/onboarding/questionnaire-v1/registry";
import type { AnswerKind, ShelfId } from "@/lib/onboarding/questionnaire-v1/types";
import { classifyQuestionImpact } from "./profile-change-detection";

export type EditableBusinessSetting = {
  questionId: string;
  sectionId: ShelfId;
  answerKind: AnswerKind;
  debugLabel: string;
  classification: "routine" | "operationally_sensitive";
  impact: "low" | "high" | "unknown";
  optionIds?: string[];
  matrixItemIds?: string[];
};

/**
 * Questionnaire-derived settings customers may edit after initial submit.
 * Roots only — conditionals stay driven by parent answers + registry rules.
 */
export function listEditableBusinessSettings(): EditableBusinessSetting[] {
  return QUESTION_REGISTRY_V1.filter((q) => q.kind === "root" && q.sectionId !== "SUBMISSION").map(
    (q) => {
      const classified = classifyQuestionImpact(q.questionId);
      return {
        questionId: q.questionId,
        sectionId: q.sectionId as ShelfId,
        answerKind: q.answerKind,
        debugLabel: q.debugLabel || q.questionId,
        classification: classified.classification,
        impact: classified.impact,
        optionIds: q.optionIds,
        matrixItemIds: q.matrixItemIds,
      };
    },
  );
}

export function isEditableQuestionId(questionId: string): boolean {
  const q = getRegistryQuestion(questionId);
  return Boolean(q && q.kind === "root" && q.sectionId !== "SUBMISSION");
}

export function groupEditableSettingsBySection(): Record<string, EditableBusinessSetting[]> {
  const grouped: Record<string, EditableBusinessSetting[]> = {};
  for (const setting of listEditableBusinessSettings()) {
    const key = setting.sectionId;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(setting);
  }
  return grouped;
}
