import type { QuestionnaireAnswersV1 } from "../onboarding/questionnaire-v1/types";
import { getQuestionAnswerValue } from "./answers-access";
import type { ReviewIssue } from "./types";

function feeMode(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "mode" in value) {
    return String((value as { mode?: unknown }).mode ?? "");
  }
  return "";
}

export function validateCrossQuestionConstraints(answers: QuestionnaireAnswersV1): ReviewIssue[] {
  const issues: ReviewIssue[] = [];

  const q56 = getQuestionAnswerValue(answers, "Q56");
  const q63 = getQuestionAnswerValue(answers, "Q63");
  const remedies =
    q63 && typeof q63 === "object" && "remedies" in q63
      ? (q63 as { remedies?: unknown }).remedies
      : undefined;
  const remediesNone = Array.isArray(remedies) && remedies.includes("none");

  const q45Mode = feeMode(getQuestionAnswerValue(answers, "Q45"));
  const q46Mode = feeMode(getQuestionAnswerValue(answers, "Q46"));

  const q56Selection =
    q56 && typeof q56 === "object" && "selection" in q56
      ? (q56 as { selection?: string[] }).selection ?? []
      : [];

  const cancellationSelected = q56Selection.includes("cancellation");
  const noShowSelected = q56Selection.includes("no_show");

  if (remediesNone && (q45Mode === "yes" || q45Mode === "conditional" || q46Mode === "yes" || q46Mode === "conditional")) {
    issues.push({
      code: "REMEDY_NONE_WITH_FEES",
      severity: "error",
      message: "Q63 selects no remedies while Q45/Q46 configure cancellation or no-show fees.",
      scope: { question_id: "Q63", policy_group: "pricing" },
    });
  }

  if ((q45Mode === "yes" || q45Mode === "conditional") && !cancellationSelected) {
    issues.push({
      code: "CANCELLATION_FEE_Q45_Q56_MISMATCH",
      severity: "warning",
      message: "Q45 configures a late cancellation fee but Q56 does not select the cancellation category.",
      scope: { question_id: "Q45", policy_group: "scheduling", action_scopes: ["cancel_appointment"] },
    });
  }

  if ((q46Mode === "yes" || q46Mode === "conditional") && !noShowSelected) {
    issues.push({
      code: "NO_SHOW_FEE_Q46_Q56_MISMATCH",
      severity: "warning",
      message: "Q46 configures a no-show fee but Q56 does not select the no_show category.",
      scope: { question_id: "Q46", policy_group: "scheduling" },
    });
  }

  return issues;
}
