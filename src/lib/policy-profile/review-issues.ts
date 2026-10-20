import type { QuestionnaireAnswersV1 } from "../onboarding/questionnaire-v1/types";
import { getQuestionAnswerValue } from "./answers-access";
import type { InstallationContext, ReviewIssue } from "./types";

export function detectInstallationIssues(installation: InstallationContext): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  if (!installation.company_id) {
    issues.push({
      code: "PROFILE-01",
      severity: "warning",
      message:
        "installation.company_id is not supplied by the answer export; provide it through authenticated application setup.",
      scope: { policy_group: "company" },
      resolution_hint: "Set company_id during tenant provisioning — do not infer from questionnaire prose.",
    });
  }
  if (!installation.timezone) {
    issues.push({
      code: "PROFILE-01",
      severity: "warning",
      message: "installation.timezone is missing; scheduling and notice calculations require a trusted timezone.",
      scope: { policy_group: "scheduling" },
    });
  }
  if (!installation.currency) {
    issues.push({
      code: "PROFILE-01",
      severity: "warning",
      message: "installation.currency is missing; money calculations require an explicit currency code.",
      scope: { policy_group: "pricing" },
    });
  }
  return issues;
}

export function detectSubstantiveProfileIssues(answers: QuestionnaireAnswersV1): ReviewIssue[] {
  const issues: ReviewIssue[] = [];

  const mainPhone = getQuestionAnswerValue(answers, "Q3");
  if (typeof mainPhone === "string" && mainPhone.startsWith("+424")) {
    issues.push({
      code: "PROFILE-02",
      severity: "warning",
      message:
        "Main business phone uses an uncommon country/area prefix; confirm dialing destination before automated outbound calls.",
      scope: { question_id: "Q3", profile_field: "main_phone", policy_group: "company" },
    });
  }

  const territory = getQuestionAnswerValue(answers, "Q17");
  if (territory && typeof territory === "object") {
    const zipCodes = (territory as { zipCodes?: unknown }).zipCodes;
    if (typeof zipCodes === "string" && zipCodes.includes("—")) {
      issues.push({
        code: "PROFILE-03",
        severity: "warning",
        message:
          "Service territory packs multiple ZIP/city tokens into a single string; preserve verbatim and use a reviewed structured location list for enforcement.",
        scope: { question_id: "Q17", profile_field: "service_territory", policy_group: "services" },
      });
    }
  }

  const q32 = getQuestionAnswerValue(answers, "Q32");
  if (q32 && typeof q32 === "object") {
    const authority = (q32 as { authority?: Record<string, string> }).authority ?? {};
    const approverIds =
      (q32 as { approverContactIds?: Record<string, unknown> }).approverContactIds ?? {};
    const rolesNeedingApprover = Object.entries(authority).filter(([, role]) => role && role !== "");
    const hasEmptyApproverMap = Object.keys(approverIds).length === 0;
    if (rolesNeedingApprover.length > 0 && hasEmptyApproverMap) {
      issues.push({
        code: "PROFILE-04",
        severity: "warning",
        message:
          "Exception authority roles are configured but approverContactIds is empty; roles alone do not identify reachable approvers.",
        scope: {
          question_id: "Q32",
          profile_field: "exception_authority",
          policy_group: "scheduling",
          action_scopes: ["verified_approval"],
        },
      });
    }
  }

  const q64 = getQuestionAnswerValue(answers, "Q64");
  if (q64 && typeof q64 === "object") {
    const rule = (q64 as { returnVisitEligibilityRule?: string }).returnVisitEligibilityRule;
    if (rule && rule.trim()) {
      issues.push({
        code: "PROFILE-05",
        severity: "info",
        message:
          "Written return-visit eligibility (Q64) is preserved as policy evidence; executable warranty predicates require reviewed structured rules.",
        scope: {
          question_id: "Q64",
          profile_field: "prior_work_handling",
          policy_group: "customer_care",
          action_scopes: ["book_appointment", "verified_approval"],
        },
      });
    }
  }

  const q41a = getQuestionAnswerValue(answers, "Q41A");
  if (Array.isArray(q41a) && q41a.length > 0) {
    issues.push({
      code: "PROFILE-05",
      severity: "info",
      message:
        "Conditional booking rules (Q41A) contain prose conditions; they are not automatically executable permissions.",
      scope: {
        question_id: "Q41A",
        profile_field: "service_booking_rules",
        policy_group: "scheduling",
        action_scopes: ["book_appointment"],
      },
    });
  }

  const entities = answers.entities;
  for (const fee of Object.values(entities.fees ?? {})) {
    const amountFixed = (fee as { amountFixed?: string }).amountFixed;
    if (amountFixed === "") {
      issues.push({
        code: "PROFILE-06",
        severity: "warning",
        message:
          "A Section 4 fee entity has a blank amountFixed; match amounts from Q56 and retain notice/exemption prose from Section 4.",
        scope: { policy_group: "pricing", action_scopes: ["cancel_appointment"] },
      });
      break;
    }
  }

  const q56 = getQuestionAnswerValue(answers, "Q56");
  if (q56 && typeof q56 === "object") {
    const details = (q56 as { details?: Record<string, { applicability?: string }> }).details;
    const cancellation = details?.cancellation;
    if (cancellation?.applicability?.toLowerCase().includes("grace period")) {
      issues.push({
        code: "PROFILE-06",
        severity: "warning",
        message:
          "Cancellation applicability references a grace period without a defined cutoff; confirm before enforcing charges.",
        scope: { question_id: "Q56", profile_field: "additional_fee_amounts", policy_group: "pricing" },
      });
    }
  }

  if (getQuestionAnswerValue(answers, "Q26") === "no") {
    issues.push({
      code: "PROFILE-07",
      severity: "info",
      message:
        "No backup emergency contact is configured (Q26); confirm escalation coverage and no-next-contact behavior.",
      scope: { question_id: "Q26", policy_group: "emergencies" },
    });
  }

  issues.push({
    code: "PROFILE-08",
    severity: "warning",
    message:
      "Software selections and integration fallback preferences do not establish working connections; verify authorization and destinations during provider setup.",
    scope: {
      policy_group: "system_preferences",
      action_scopes: ["lookup_customer", "book_appointment"],
    },
  });

  return issues;
}

export function computeReviewState(issues: ReviewIssue[]): "READY" | "REVIEW_REQUIRED" | "REJECTED" {
  if (issues.some((i) => i.severity === "error" && i.code.startsWith("SOURCE_"))) {
    return "REJECTED";
  }
  if (issues.length > 0) return "REVIEW_REQUIRED";
  return "READY";
}
