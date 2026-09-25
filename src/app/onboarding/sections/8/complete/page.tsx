"use client";

import { useEffect } from "react";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { ContentCard } from "@/components/onboarding/ui/Card";
import { PrimaryButton, SecondaryButton } from "@/components/onboarding/ui/Buttons";
import { useOnboarding } from "@/lib/onboarding/OnboardingContext";
import { TOTAL_SECTIONS } from "@/lib/onboarding/sections";
import { useRouter } from "next/navigation";
import { section8IsValid } from "@/lib/onboarding/validation/section8";
import { getSection8Progress } from "@/lib/onboarding/progress/section8";
import { addCompletedSection } from "@/lib/onboarding/draft-utils";

export default function Section8CompletePage() {
  const { draft, saveStatus, lastSavedAt, markSectionComplete } = useOnboarding();
  const router = useRouter();
  const sectionProgress = getSection8Progress(draft.section8);

  const completedSections = addCompletedSection(draft.navigation.completedSections, 8);

  useEffect(() => {
    if (!section8IsValid(draft.section8, draft.systems)) {
      router.replace("/onboarding/sections/8/form");
      return;
    }
    if (!draft.navigation.completedSections.includes(8)) {
      markSectionComplete(8);
    }
  }, [draft.section8, draft.systems, draft.navigation.completedSections, router, markSectionComplete]);

  return (
    <OnboardingShell
      completedSections={completedSections}
      activeSectionId={8}
      currentSectionProgress={sectionProgress}
      saveStatus={saveStatus}
      lastSavedAt={lastSavedAt}
    >
      <ContentCard className="text-center">
        <p className="text-sm font-medium tracking-wide text-[var(--color-alexander-blue)] uppercase">
          Section 8 of {TOTAL_SECTIONS}
        </p>
        <h1 className="mt-4 font-serif text-3xl font-semibold text-[var(--color-alexander-navy)] sm:text-4xl">
          Your Alexander setup is complete
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-[var(--color-alexander-muted)]">
          You have provided the information we need to configure Alexander around your company’s
          services, policies, customers, team, voice, and operating systems. Our team will now
          normalize your answers, configure Alexander, verify the saved settings, and test his behavior
          against realistic calls before asking you to approve the final experience.
        </p>
        <p className="mt-4 text-sm text-[var(--color-alexander-muted)]">
          Progress: {completedSections.length} of {TOTAL_SECTIONS} sections complete
        </p>

        <div className="mx-auto mt-10 flex max-w-md flex-col gap-3">
          <PrimaryButton onClick={() => router.push("/onboarding/review")}>
            Review Your Setup →
          </PrimaryButton>
          <SecondaryButton onClick={() => router.push("/onboarding/sections/8/review")}>
            Review Section 8
          </SecondaryButton>
        </div>
      </ContentCard>
    </OnboardingShell>
  );
}
