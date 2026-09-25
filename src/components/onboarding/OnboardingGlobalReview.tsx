"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ContentCard } from "./ui/Card";
import { PrimaryButton } from "./ui/Buttons";
import { useOnboarding } from "@/lib/onboarding/OnboardingContext";
import { buildGlobalReviewCards } from "@/lib/onboarding/globalReviewSummaries";
import { draftTimestamp } from "@/lib/onboarding/draft-utils";
import { loadLocalDraft, saveLocalDraft } from "@/lib/onboarding/persistence";
import { postQuestionnaireSubmit } from "@/lib/onboarding/server-api";
import { Q114_CONFIRMATIONS } from "@/lib/onboarding/section8Catalog";
import { hasPendingSubmissionChanges } from "@/lib/onboarding/submissionIntegrity";
import { canSubmitQuestionnaire, validateAllSections } from "@/lib/onboarding/validateOnboarding";

const FINAL_REVIEW_INTRO =
  "You have finished the setup questionnaire. Thank you for taking the time to teach Alexander how your company operates. Your answers will now be reviewed and converted into Alexander’s company-specific configuration. We will test routine calls, urgent situations, scheduling requests, customer-care situations, escalation failures, and other important edge cases before your receptionist goes live. If anything requires clarification, our team will contact you before enabling that behavior. You are not expected to configure the underlying AI technology yourself. That is our responsibility.";

const WHAT_HAPPENS_NEXT = [
  "We review and normalize your answers.",
  "We configure Alexander around your approved policies.",
  "We test his behavior using realistic customer scenarios.",
  "You review and approve the final experience.",
  "Alexander goes live when the configuration is ready.",
];

function pickNewestDraft(memory: ReturnType<typeof useOnboarding>["draft"]): typeof memory {
  const local = loadLocalDraft();
  return draftTimestamp(local) >= draftTimestamp(memory) ? local : memory;
}

export function OnboardingGlobalReview() {
  const { draft, flushSave, saveDraftNow, updateSubmissionConfirmations, getDraftSnapshot } =
    useOnboarding();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const sectionResults = useMemo(() => validateAllSections(draft), [draft]);
  const cards = useMemo(() => buildGlobalReviewCards(draft), [draft]);
  const submitReady = canSubmitQuestionnaire(draft);
  const pendingResubmit = hasPendingSubmissionChanges(draft);

  const submitDisabledReason = useMemo(() => {
    if (submitting) return "Submitting your questionnaire…";
    const invalid = sectionResults.filter((r) => !r.valid).map((r) => r.sectionId);
    if (invalid.length > 0) {
      return `Complete required answers in section${invalid.length > 1 ? "s" : ""} ${invalid.join(", ")} before submitting.`;
    }
    const c = draft.submission.confirmations;
    if (!c.answersAccurate || !c.capabilitiesDependOnIntegrations || !c.actionsRequireSupportAuthorizationConfirmation) {
      return pendingResubmit
        ? "Confirm all three statements again to submit your updated answers."
        : "Confirm all three statements below to submit.";
    }
    return null;
  }, [draft.submission.confirmations, sectionResults, submitting, pendingResubmit]);

  const handleSubmit = async () => {
    setSubmitError(null);
    await flushSave();
    const latest = pickNewestDraft(getDraftSnapshot());
    setSubmitting(true);
    try {
      const result = await postQuestionnaireSubmit(latest);
      if (!result.ok || !result.draft) {
        setSubmitError(
          result.reason === "missing_confirmations"
            ? "All three confirmations are required."
            : result.reason === "missing_draft"
              ? "Could not submit — refresh the page and try again."
              : "Some sections still need attention. Review the warnings above.",
        );
        setSubmitting(false);
        return;
      }
      saveLocalDraft(result.draft);
      await saveDraftNow(result.draft);
      router.push("/onboarding/submitted");
    } catch {
      setSubmitError("Submission failed. Please try again.");
      setSubmitting(false);
    }
  };

  const submitLabel = pendingResubmit ? "Submit updated answers" : "Submit Questionnaire";

  return (
    <div className="space-y-8">
      <ContentCard>
        <h1 className="font-serif text-3xl font-semibold text-[var(--color-alexander-navy)]">
          Review Your Setup
        </h1>
        {pendingResubmit && (
          <p className="mt-4 rounded-lg border border-[var(--color-alexander-warning)]/40 bg-[var(--color-alexander-warning)]/10 px-4 py-3 text-sm text-[var(--color-alexander-navy)]" role="status">
            Changes have been made since your last submission. Review your answers and confirm below
            before submitting updated answers.
          </p>
        )}
        <p className="mt-4 text-base leading-relaxed text-[var(--color-alexander-muted)]">
          {FINAL_REVIEW_INTRO}
        </p>
        <h2 className="mt-8 text-lg font-semibold text-[var(--color-alexander-navy)]">
          What happens next
        </h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[var(--color-alexander-muted)]">
          {WHAT_HAPPENS_NEXT.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </ContentCard>

      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => {
          const valid = sectionResults.find((r) => r.sectionId === card.sectionId)?.valid ?? false;
          return (
            <ContentCard key={card.sectionId} className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-alexander-blue)]">
                    Section {card.sectionId}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-[var(--color-alexander-navy)]">
                    {card.title}
                  </h3>
                </div>
                <Link
                  href={card.editHref}
                  className="shrink-0 rounded-md border border-[var(--color-alexander-border)] px-3 py-2 text-sm font-medium text-[var(--color-alexander-blue)] hover:bg-[var(--color-alexander-info-bg)]"
                  aria-label={`Edit section ${card.sectionId}: ${card.title}`}
                >
                  Edit
                </Link>
              </div>
              <p className="flex-1 text-sm text-[var(--color-alexander-muted)]">{card.summary}</p>
              {!valid && (
                <p className="text-sm font-medium text-[var(--color-alexander-warning)]" role="status">
                  This section has incomplete or invalid answers.
                </p>
              )}
            </ContentCard>
          );
        })}
      </div>

      <ContentCard>
        <h2 className="text-lg font-semibold text-[var(--color-alexander-navy)]">Confirm your answers</h2>
        <fieldset className="mt-4 space-y-4">
          <legend className="sr-only">Final confirmations</legend>
          {Q114_CONFIRMATIONS.map((item) => (
            <label
              key={item.key}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--color-alexander-border)] px-4 py-4"
            >
              <input
                type="checkbox"
                className="mt-0.5 h-5 w-5 accent-[var(--color-alexander-blue)]"
                checked={draft.submission.confirmations[item.key]}
                onChange={(e) =>
                  updateSubmissionConfirmations({ [item.key]: e.target.checked }, { immediate: true })
                }
              />
              <span className="text-sm text-[var(--color-alexander-navy)]">{item.label}</span>
            </label>
          ))}
        </fieldset>

        {submitError && (
          <p className="mt-4 text-sm text-[var(--color-alexander-error)]" role="alert">
            {submitError}
          </p>
        )}

        <p className="mt-4 text-sm text-[var(--color-alexander-muted)]" aria-live="polite">
          {submitDisabledReason}
        </p>

        <div className="mt-6">
          <PrimaryButton
            disabled={!submitReady || submitting}
            onClick={() => void handleSubmit()}
            aria-busy={submitting}
          >
            {submitting ? "Submitting…" : submitLabel}
          </PrimaryButton>
        </div>
      </ContentCard>
    </div>
  );
}
