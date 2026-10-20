/**
 * Shared condition evaluator for questionnaire answers v1.
 *
 * Describes EXISTING frozen UI / validation activation behavior.
 * Does NOT change the frozen questionnaire UI.
 *
 * All serializers in this package must use isQuestionActive — do not
 * re-implement the same parent rules independently.
 */

import { hasAdditionalApprovedVoices } from "../approvedVoiceCatalog";
import type { OnboardingDraft } from "../types";
import { QUESTION_REGISTRY_BY_ID } from "./registry";

const ALWAYS_ACTIVE_ROOT = true;

/**
 * Returns whether the permanent Q-ID is currently active for clean answers.
 * Root questions in S1–S8 and Q93 are always considered active for serialization
 * (blank/unanswered values remain distinguishable). Conditional children follow
 * frozen display conditions.
 */
export function isQuestionActive(questionId: string, draft: OnboardingDraft): boolean {
  const meta = QUESTION_REGISTRY_BY_ID.get(questionId);
  if (!meta) return false;
  if (meta.kind === "root") return ALWAYS_ACTIVE_ROOT;
  return evaluateConditional(questionId, draft);
}

function evaluateConditional(questionId: string, draft: OnboardingDraft): boolean {
  const s1 = draft.section1;
  const s2 = draft.section2;
  const s3 = draft.section3;
  const s4 = draft.section4;
  const s5 = draft.section5;
  const s6 = draft.section6;
  const s7 = draft.section7;
  const s8 = draft.section8;

  switch (questionId) {
    case "Q5A":
      return s1.approvedClaims.includes("other");
    case "Q10A":
      return s1.answeringMode === "specific_hours";
    case "Q15A":
      return s2.customerSuppliedMaterialsPolicy === "with_conditions";
    case "Q16A":
      return s2.correctiveWorkPolicy === "with_conditions";
    case "Q19A":
      return s2.hasConditionalTerritory === "yes";
    case "Q26A":
      return s3.hasBackupContact === "yes";
    case "Q27A":
      return s3.nobodyRespondsFallback === "custom";
    case "Q28A":
      return s3.retryRule === "custom";
    case "Q29A":
      return (
        s3.capacityMode === "reserved_capacity" ||
        s3.capacityMode === "emergency_override" ||
        s3.capacityMode === "authorized_approval"
      );
    case "Q30A":
      return s4.humanRequestPolicy === "custom";
    case "Q31A":
      return s4.aiRefusalPolicy === "custom";
    case "Q33A":
      return s4.approverUnavailablePolicy === "other";
    case "Q35A":
      return s4.hasSpendingLimits === "yes";
    case "Q36A":
      return s4.emergencyAuthMode === "special_rules";
    case "Q41A":
      return s4.hasServiceBookingRules === "yes";
    case "Q43A":
      return s4.rescheduleAuthority === "conditional";
    case "Q44A":
      return s4.cancellationAuthority === "conditional";
    case "Q45A":
      return s4.lateCancellationFeeMode === "yes" || s4.lateCancellationFeeMode === "conditional";
    case "Q46A":
      return s4.noShowFeeMode === "yes" || s4.noShowFeeMode === "conditional";
    case "Q49A":
    case "Q49B":
      return s4.mayArrangeCallback === "yes";
    case "Q50A":
      return s4.hasTechnicianAssignments === "yes";
    case "Q52A":
      return s4.multiIssueMode === "separate_issues";
    case "Q53A":
      return s5.pricingModels.includes("other");
    case "Q54A":
      return s5.mayQuoteServicePrices === "allowed";
    case "Q57A":
      return s5.hasAreaTravelOrMinimum === "yes";
    case "Q58A":
      return s5.materialMarkupPolicy === "yes" || s5.materialMarkupPolicy === "sometimes";
    case "Q59A":
      return s5.paymentMethods.includes("other");
    case "Q62A":
      return s5.paymentCollectionScope.includes("other");
    case "Q66A":
      return s6.escalationTriggers.includes("other");
    case "Q67A":
      return s6.forbiddenUnhappyPromises.includes("other");
    case "Q70A":
      return s6.restrictedInformation.includes("other");
    case "Q73A":
      return s7.callerLanguages.includes("other") && !s7.englishOnly;
    case "Q74A":
      return s7.voiceSelection === "another_approved" && hasAdditionalApprovedVoices();
    case "Q76A":
      return s7.spokenNameMode === "company_specific" || s7.spokenNameMode === "another_approved";
    case "Q77A":
      return s7.aiDisclosureStyle === "custom";
    case "Q78A":
      return s7.pronunciationMode === "yes";
    case "Q79A":
      return s7.languageSwitchingPolicy === "custom";
    case "Q81A":
      return s7.accentPreference === "other_approved";
    case "Q85A":
      return s8.crmFsmProvider === "custom";
    case "Q86A":
      return s8.schedulingProvider === "custom";
    case "Q87A":
      return s8.phoneProvider === "custom";
    case "Q89A":
      return s8.connectionOwnerMode === "someone_else";
    case "Q91A":
      return s8.failureFallback === "custom";
    default:
      return false;
  }
}

/** Convenience: active question IDs for a draft (registry order). */
export function listActiveQuestionIds(draft: OnboardingDraft): string[] {
  return [...QUESTION_REGISTRY_BY_ID.keys()].filter((id) => isQuestionActive(id, draft));
}
