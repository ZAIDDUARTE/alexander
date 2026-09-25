import type { OnboardingDraft } from "./types";

/** Questionnaire payload fingerprint — excludes navigation, submission, and timestamps. */
export function questionnaireContentFingerprint(draft: OnboardingDraft): string {
  const payload = {
    section1: draft.section1,
    section2: draft.section2,
    section3: draft.section3,
    section4: draft.section4,
    section5: draft.section5,
    section6: draft.section6,
    section7: draft.section7,
    section8: draft.section8,
    contacts: draft.contacts,
    fees: draft.fees,
    systems: draft.systems,
  };
  return stableSerialize(payload);
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableSerialize(obj[k])}`).join(",")}}`;
}

/** True when a prior submission exists and questionnaire content changed since then. */
export function hasPendingSubmissionChanges(draft: OnboardingDraft): boolean {
  if (draft.submission.status !== "submitted") return false;
  const revision = draft.submission.lastSubmittedContentRevision;
  if (!revision) return false;
  return questionnaireContentFingerprint(draft) !== revision;
}

/**
 * After a material questionnaire edit (not navigation/submission-only), Q114 must be reconfirmed.
 */
export function applyPostSubmissionEditPolicy(
  prev: OnboardingDraft,
  next: OnboardingDraft,
): OnboardingDraft {
  if (prev.submission.status !== "submitted" || !prev.submission.lastSubmittedContentRevision) {
    return next;
  }
  const prevFp = questionnaireContentFingerprint(prev);
  const nextFp = questionnaireContentFingerprint(next);
  if (prevFp === nextFp) return next;

  return {
    ...next,
    submission: {
      ...next.submission,
      confirmations: {
        answersAccurate: false,
        capabilitiesDependOnIntegrations: false,
        actionsRequireSupportAuthorizationConfirmation: false,
      },
    },
  };
}
