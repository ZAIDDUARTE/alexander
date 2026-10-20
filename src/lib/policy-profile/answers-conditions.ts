/**
 * Conditional activation for clean questionnaire answers v1.
 * Mirrors frozen UI logic in questionnaire-v1/conditions.ts without requiring a raw draft.
 */

import { hasAdditionalApprovedVoices } from "../onboarding/approvedVoiceCatalog";
import type { QuestionnaireAnswersV1 } from "../onboarding/questionnaire-v1/types";
import { getRegistryQuestion } from "../onboarding/questionnaire-v1/registry";
import { getQuestionAnswerValue } from "./answers-access";

function includesMulti(value: unknown, option: string): boolean {
  if (Array.isArray(value)) return value.includes(option);
  if (value && typeof value === "object" && "selections" in value) {
    const selections = (value as { selections?: unknown }).selections;
    return Array.isArray(selections) && selections.includes(option);
  }
  if (value && typeof value === "object" && "callerLanguages" in value) {
    const langs = (value as { callerLanguages?: unknown }).callerLanguages;
    return Array.isArray(langs) && langs.includes(option);
  }
  return false;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function bool(value: unknown): boolean {
  return value === true;
}

export function isQuestionActiveInAnswers(
  answers: QuestionnaireAnswersV1,
  questionId: string,
): boolean {
  const meta = getRegistryQuestion(questionId);
  if (!meta) return false;
  if (meta.kind === "root") return true;
  return evaluateConditionalInAnswers(questionId, answers);
}

function evaluateConditionalInAnswers(questionId: string, answers: QuestionnaireAnswersV1): boolean {
  switch (questionId) {
    case "Q5A":
      return includesMulti(getQuestionAnswerValue(answers, "Q5"), "other");
    case "Q10A":
      return str(getQuestionAnswerValue(answers, "Q10")) === "specific_hours";
    case "Q15A":
      return str(getQuestionAnswerValue(answers, "Q15")) === "with_conditions";
    case "Q16A":
      return str(getQuestionAnswerValue(answers, "Q16")) === "with_conditions";
    case "Q19A":
      return str(getQuestionAnswerValue(answers, "Q19")) === "yes";
    case "Q26A":
      return str(getQuestionAnswerValue(answers, "Q26")) === "yes";
    case "Q27A":
      return str(getQuestionAnswerValue(answers, "Q27")) === "custom";
    case "Q28A":
      return str(getQuestionAnswerValue(answers, "Q28")) === "custom";
    case "Q29A": {
      const mode = str(getQuestionAnswerValue(answers, "Q29"));
      return (
        mode === "reserved_capacity" ||
        mode === "emergency_override" ||
        mode === "authorized_approval"
      );
    }
    case "Q30A":
      return str(getQuestionAnswerValue(answers, "Q30")) === "custom";
    case "Q31A":
      return str(getQuestionAnswerValue(answers, "Q31")) === "custom";
    case "Q33A":
      return str(getQuestionAnswerValue(answers, "Q33")) === "other";
    case "Q35A":
      return str(getQuestionAnswerValue(answers, "Q35")) === "yes";
    case "Q36A":
      return str(getQuestionAnswerValue(answers, "Q36")) === "special_rules";
    case "Q41A":
      return str(getQuestionAnswerValue(answers, "Q41")) === "yes";
    case "Q43A":
      return str(getQuestionAnswerValue(answers, "Q43")) === "conditional";
    case "Q44A":
      return str(getQuestionAnswerValue(answers, "Q44")) === "conditional";
    case "Q45A": {
      const v = getQuestionAnswerValue(answers, "Q45");
      if (typeof v === "string") return v === "yes" || v === "conditional";
      return false;
    }
    case "Q46A": {
      const v = getQuestionAnswerValue(answers, "Q46");
      if (typeof v === "string") return v === "yes" || v === "conditional";
      return false;
    }
    case "Q49A":
    case "Q49B":
      return str(getQuestionAnswerValue(answers, "Q49")) === "yes";
    case "Q50A":
      return str(getQuestionAnswerValue(answers, "Q50")) === "yes";
    case "Q52A":
      return str(getQuestionAnswerValue(answers, "Q52")) === "separate_issues";
    case "Q53A":
      return includesMulti(getQuestionAnswerValue(answers, "Q53"), "other");
    case "Q54A":
      return str(getQuestionAnswerValue(answers, "Q54")) === "allowed";
    case "Q57A":
      return str(getQuestionAnswerValue(answers, "Q57")) === "yes";
    case "Q58A": {
      const v = str(getQuestionAnswerValue(answers, "Q58"));
      return v === "yes" || v === "sometimes";
    }
    case "Q59A":
      return includesMulti(getQuestionAnswerValue(answers, "Q59"), "other");
    case "Q62A":
      return includesMulti(getQuestionAnswerValue(answers, "Q62"), "other");
    case "Q66A":
      return includesMulti(getQuestionAnswerValue(answers, "Q66"), "other");
    case "Q67A":
      return includesMulti(getQuestionAnswerValue(answers, "Q67"), "other");
    case "Q70A":
      return includesMulti(getQuestionAnswerValue(answers, "Q70"), "other");
    case "Q73A": {
      const q73 = getQuestionAnswerValue(answers, "Q73");
      if (q73 && typeof q73 === "object") {
        const o = q73 as { englishOnly?: boolean; callerLanguages?: string[] };
        return !o.englishOnly && Array.isArray(o.callerLanguages) && o.callerLanguages.includes("other");
      }
      return false;
    }
    case "Q74A":
      return (
        str(getQuestionAnswerValue(answers, "Q74")) === "another_approved" &&
        hasAdditionalApprovedVoices()
      );
    case "Q76A": {
      const mode = str(getQuestionAnswerValue(answers, "Q76"));
      return mode === "company_specific" || mode === "another_approved";
    }
    case "Q77A":
      return str(getQuestionAnswerValue(answers, "Q77")) === "custom";
    case "Q78A":
      return str(getQuestionAnswerValue(answers, "Q78")) === "yes";
    case "Q79A":
      return str(getQuestionAnswerValue(answers, "Q79")) === "custom";
    case "Q81A":
      return str(getQuestionAnswerValue(answers, "Q81")) === "other_approved";
    case "Q85A":
      return str(getQuestionAnswerValue(answers, "Q85")) === "custom";
    case "Q86A":
      return str(getQuestionAnswerValue(answers, "Q86")) === "custom";
    case "Q87A":
      return str(getQuestionAnswerValue(answers, "Q87")) === "custom";
    case "Q89A":
      return str(getQuestionAnswerValue(answers, "Q89")) === "someone_else";
    case "Q91A":
      return str(getQuestionAnswerValue(answers, "Q91")) === "custom";
    default:
      return false;
  }
}

export function isActivationUnknown(questionId: string): boolean {
  const meta = getRegistryQuestion(questionId);
  if (!meta || meta.kind !== "conditional") return false;
  return !meta.parentQuestionId;
}
