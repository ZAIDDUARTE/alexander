import {
  hasPendingSubmissionChanges,
  questionnaireContentFingerprint,
} from "./submissionIntegrity";
import {
  onboardingSectionsAreValid,
  q114ConfirmationsComplete,
  validateAllSections,
} from "./validateOnboarding";
import type { OnboardingDraft } from "./types";

export type SubmitResult =
  | { ok: true; draft: OnboardingDraft; duplicate: boolean }
  | {
      ok: false;
      reason: "invalid_sections" | "missing_confirmations";
      draft: OnboardingDraft;
      invalidSectionIds?: number[];
    };

function invalidSectionIds(draft: OnboardingDraft): number[] {
  return validateAllSections(draft)
    .filter((r) => !r.valid)
    .map((r) => r.sectionId);
}

/**
 * Apply a successful submission to the given draft (client or server).
 * - Unchanged duplicate submit: preserve submittedAt + revision.
 * - Changed re-submit: new submittedAt + new revision.
 */
export function applyQuestionnaireSubmission(draft: OnboardingDraft): SubmitResult {
  if (!onboardingSectionsAreValid(draft)) {
    return {
      ok: false,
      reason: "invalid_sections",
      draft,
      invalidSectionIds: invalidSectionIds(draft),
    };
  }

  if (!q114ConfirmationsComplete(draft)) {
    return { ok: false, reason: "missing_confirmations", draft };
  }

  const fingerprint = questionnaireContentFingerprint(draft);
  const duplicate =
    draft.submission.status === "submitted" &&
    draft.submission.lastSubmittedContentRevision === fingerprint &&
    !hasPendingSubmissionChanges(draft);

  const now = new Date().toISOString();
  const submittedAt = duplicate && draft.submission.submittedAt ? draft.submission.submittedAt : now;

  return {
    ok: true,
    duplicate,
    draft: {
      ...draft,
      updatedAt: duplicate ? draft.updatedAt : now,
      submission: {
        ...draft.submission,
        status: "submitted",
        submittedAt,
        lastSubmittedContentRevision: fingerprint,
        confirmations: { ...draft.submission.confirmations },
      },
    },
  };
}

/** Server/client shared gate before marking submitted. */
export function prepareSubmission(draft: OnboardingDraft): SubmitResult {
  return applyQuestionnaireSubmission(draft);
}
