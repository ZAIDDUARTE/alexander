"use client";

import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { ContentCard } from "@/components/onboarding/ui/Card";
import { SecondaryButton } from "@/components/onboarding/ui/Buttons";
import { useOnboarding } from "@/lib/onboarding/OnboardingContext";
import { hasPendingSubmissionChanges } from "@/lib/onboarding/submissionIntegrity";
import { useRouter } from "next/navigation";

const CONFIRMATION_COPY =
  "Thank you. We have received your setup information. Your Alexander configuration is now being prepared. Our team will review your answers and contact you if we need clarification. Before Alexander goes live, you will have the opportunity to review and approve how he represents your company. You have completed the most important part of the process. We’ll take it from here.";

export default function SubmittedPage() {
  const { draft, saveStatus, lastSavedAt } = useOnboarding();
  const router = useRouter();
  const pendingChanges = hasPendingSubmissionChanges(draft);

  return (
    <OnboardingShell
      completedSections={draft.navigation.completedSections}
      activeSectionId={8}
      currentSectionProgress={1}
      saveStatus={saveStatus}
      lastSavedAt={lastSavedAt}
    >
      <ContentCard className="text-center">
        <h1 className="font-serif text-3xl font-semibold text-[var(--color-alexander-navy)]">
          Questionnaire received
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-[var(--color-alexander-muted)]">
          {CONFIRMATION_COPY}
        </p>
        {pendingChanges && (
          <p className="mt-4 text-sm text-[var(--color-alexander-warning)]" role="status">
            Changes have been made since your last submission. Return to review to submit updated
            answers.
          </p>
        )}
        {draft.submission.submittedAt && (
          <p className="mt-4 text-xs text-[var(--color-alexander-muted)]">
            Submitted {new Date(draft.submission.submittedAt).toLocaleString()}
          </p>
        )}
        <div className="mx-auto mt-10 max-w-md">
          <SecondaryButton onClick={() => router.push("/onboarding/review")}>
            Return to review
          </SecondaryButton>
        </div>
      </ContentCard>
    </OnboardingShell>
  );
}
