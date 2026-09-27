"use client";

import { useEffect } from "react";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { ContentCard } from "@/components/onboarding/ui/Card";
import { PrimaryButton, SecondaryButton } from "@/components/onboarding/ui/Buttons";
import { useOnboarding } from "@/lib/onboarding/OnboardingContext";
import { TOTAL_SECTIONS } from "@/lib/onboarding/sections";
import { useRouter } from "next/navigation";
import { section6IsValid } from "@/lib/onboarding/validation/section6";
import { getSection6Progress } from "@/lib/onboarding/progress/section6";
import { addCompletedSection } from "@/lib/onboarding/draft-utils";


export default function Section6CompletePage() {
  const { draft, saveStatus, lastSavedAt, markSectionComplete } = useOnboarding();
  const router = useRouter();
  const sectionProgress = getSection6Progress(draft.section6, draft.contacts);

  const completedSections = addCompletedSection(draft.navigation.completedSections, 6);

  useEffect(() => {
    if (!section6IsValid(draft.section6, draft.contacts)) {
      router.replace("/onboarding/sections/6/form");
      return;
    }
    if (!draft.navigation.completedSections.includes(6)) {
      markSectionComplete(6);
    }
  }, [draft.section6, draft.contacts, draft.navigation.completedSections, router, markSectionComplete]);

  return (
    <OnboardingShell
      completedSections={completedSections}
      activeSectionId={6}
      currentSectionProgress={sectionProgress}
      saveStatus={saveStatus}
      lastSavedAt={lastSavedAt}
    >
      <ContentCard className="text-center">
        <p className="text-sm font-medium tracking-wide text-[var(--color-alexander-blue)] uppercase">
          Section 6 of {TOTAL_SECTIONS}
        </p>
        <h1 className="mt-4 font-serif text-3xl font-semibold text-[var(--color-alexander-navy)] sm:text-4xl">
          Customer care policies saved
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-[var(--color-alexander-muted)]">
          Alexander now understands how to support existing customers and unusual calls. He knows how
          to handle callbacks, complaints, privacy boundaries, non-service callers, and requests that
          require your team&apos;s involvement. This helps every caller receive a clear next step
          without unsupported promises.
        </p>
        <p className="mt-4 text-sm text-[var(--color-alexander-muted)]">
          Progress: {completedSections.length} of {TOTAL_SECTIONS} sections complete
        </p>


        <p className="mt-6 text-sm text-[var(--color-alexander-muted)]">Next: Voice and Conversation</p>

        <div className="mx-auto mt-10 flex max-w-md flex-col gap-3">
          <PrimaryButton onClick={() => router.push("/onboarding/sections/7/intro")}>
            Continue to Voice and Conversation →
          </PrimaryButton>
          <SecondaryButton onClick={() => router.push("/onboarding/sections/6/review")}>
            Review Section 6
          </SecondaryButton>
        </div>
      </ContentCard>
    </OnboardingShell>
  );
}
