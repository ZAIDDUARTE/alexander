"use client";

import { useEffect } from "react";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { ContentCard } from "@/components/onboarding/ui/Card";
import { PrimaryLink, SecondaryButton } from "@/components/onboarding/ui/Buttons";
import { useOnboarding } from "@/lib/onboarding/OnboardingContext";
import { TOTAL_SECTIONS } from "@/lib/onboarding/sections";
import { useRouter } from "next/navigation";
import { section1IsValid } from "@/lib/onboarding/validation/section1";
import { getSection1Progress } from "@/lib/onboarding/progress/section1";
import { addCompletedSection } from "@/lib/onboarding/draft-utils";


export default function Section1CompletePage() {
  const { draft, saveStatus, lastSavedAt, markSectionComplete } = useOnboarding();
  const router = useRouter();
  const sectionProgress = getSection1Progress(draft.section1);

  const completedSections = addCompletedSection(draft.navigation.completedSections, 1);

  useEffect(() => {
    if (!section1IsValid(draft.section1)) {
      router.replace("/onboarding/sections/1/form");
      return;
    }
    if (!draft.navigation.completedSections.includes(1)) {
      markSectionComplete(1);
    }
  }, [draft.section1, draft.navigation.completedSections, router, markSectionComplete]);

  return (
    <OnboardingShell
      completedSections={completedSections}
      activeSectionId={1}
      currentSectionProgress={sectionProgress}
      saveStatus={saveStatus}
      lastSavedAt={lastSavedAt}
    >
      <ContentCard className="text-center">
        <p className="text-sm font-medium tracking-wide text-[var(--color-alexander-blue)] uppercase">
          Section 1 of {TOTAL_SECTIONS}
        </p>
        <h1 className="mt-4 font-serif text-3xl font-semibold text-[var(--color-alexander-navy)] sm:text-4xl">
          Your company is now part of Alexander&apos;s foundation
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-[var(--color-alexander-muted)]">
          Alexander now understands your
          company&apos;s identity, operating hours, approved claims, and basic availability. This
          helps him represent your business accurately and communicate with callers within the
          boundaries you have established.
        </p>
        <p className="mt-4 text-sm text-[var(--color-alexander-muted)]">
          Progress: 1 of {TOTAL_SECTIONS} sections complete
        </p>


        <p className="mt-6 text-sm text-[var(--color-alexander-muted)]">Next: Your Services</p>

        <div className="mx-auto mt-10 flex max-w-md flex-col gap-3">
          <PrimaryLink href="/onboarding/sections/2/intro">Continue to Your Services →</PrimaryLink>
          <SecondaryButton onClick={() => router.push("/onboarding/sections/1/review")}>
            Review Section 1
          </SecondaryButton>
        </div>
      </ContentCard>
    </OnboardingShell>
  );
}
