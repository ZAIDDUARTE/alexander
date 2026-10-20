import type { AnswerKind } from "../onboarding/questionnaire-v1/types";
import type { ReviewIssue } from "./types";

export function validateQuestionConstraints(
  questionId: string,
  answerKind: AnswerKind,
  value: unknown,
): ReviewIssue[] {
  const issues: ReviewIssue[] = [];

  if (questionId === "Q38" && answerKind === "composite" && value && typeof value === "object") {
    const v = value as { bookingHorizonDays?: unknown; bookingHorizonNoMaximum?: unknown };
    const unlimited = v.bookingHorizonNoMaximum === true;
    if (!unlimited) {
      const raw = v.bookingHorizonDays;
      const days = typeof raw === "string" ? Number.parseInt(raw, 10) : Number(raw);
      if (!Number.isFinite(days) || days <= 0) {
        issues.push({
          code: "Q38_BOOKING_HORIZON",
          severity: "error",
          message:
            "Q38 requires a positive booking horizon in days or an explicit unlimited option.",
          scope: { question_id: "Q38", profile_field: "booking_horizon", policy_group: "scheduling" },
        });
      }
    }
  }

  if (questionId === "Q40" && answerKind === "multi_select") {
    if (!Array.isArray(value)) {
      issues.push({
        code: "Q40_CONFIRMATION_ALLOWLIST",
        severity: "error",
        message: "Q40 post-confirmation output allowlist must be a multi-select list.",
        scope: { question_id: "Q40", profile_field: "confirmation_outputs", policy_group: "scheduling" },
      });
    }
  }

  return issues;
}
