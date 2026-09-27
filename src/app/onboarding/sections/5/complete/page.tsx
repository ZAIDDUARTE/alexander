"use client";

import { useEffect } from "react";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { ContentCard } from "@/components/onboarding/ui/Card";
import { PrimaryButton, SecondaryButton } from "@/components/onboarding/ui/Buttons";
import { useOnboarding } from "@/lib/onboarding/OnboardingContext";
import { TOTAL_SECTIONS } from "@/lib/onboarding/sections";
import { useRouter } from "next/navigation";
import { section5IsValid } from "@/lib/onboarding/validation/section5";
import { getSection5Progress } from "@/lib/onboarding/progress/section5";
import { addCompletedSection } from "@/lib/onboarding/draft-utils";


export default function Section5CompletePage() {
  const { draft, saveStatus, lastSavedAt, markSectionComplete } = useOnboarding();
  const router = useRouter();
  const sectionProgress = getSection5Progress(
    draft.section5,
    draft.section2,
    draft.contacts,
    draft.fees,
  );

  const completedSections = addCompletedSection(draft.navigation.completedSections, 5);

  useEffect(() => {
    if (
      !section5IsValid(
        draft.section5,
        draft.section2,
        draft.contacts,
        draft.fees,
        draft.section4,
      )
    ) {
      router.replace("/onboarding/sections/5/form");
      return;
    }
    if (!draft.navigation.completedSections.includes(5)) {
      markSectionComplete(5);
    }
  }, [
    draft.section5,
    draft.section2,
    draft.section4,
    draft.contacts,
    draft.fees,
    draft.navigation.completedSections,
    router,
    markSectionComplete,
  ]);

  return (
    <OnboardingShell
      completedSections={completedSections}
      activeSectionId={5}
      currentSectionProgress={sectionProgress}
      saveStatus={saveStatus}
      lastSavedAt={lastSavedAt}
    >
      <ContentCard className="text-center">
        <p className="text-sm font-medium tracking-wide text-[var(--color-alexander-blue)] uppercase">
          Section 5 of {TOTAL_SECTIONS}
        </p>
        <h1 className="mt-4 font-serif text-3xl font-semibold text-[var(--color-alexander-navy)] sm:text-4xl">
          Alexander now understands your financial boundaries
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-[var(--color-alexander-muted)]">
          He knows which fees and payment
          information he may explain, which prices require an estimate or human review, and which
          discounts, credits, refunds, or exceptions require authorization. This helps Alexander
          provide useful information without making financial promises your company has not
          approved.
        </p>
        <p className="mt-4 text-sm text-[var(--color-alexander-muted)]">
          Progress: {completedSections.length} of {TOTAL_SECTIONS} sections complete
        </p>


        <p className="mt-6 text-sm text-[var(--color-alexander-muted)]">Next: Customer Care</p>

        <div className="mx-auto mt-10 flex max-w-md flex-col gap-3">
          <PrimaryButton onClick={() => router.push("/onboarding/sections/6/intro")}>
            Continue to Customer Care →
          </PrimaryButton>
          <SecondaryButton onClick={() => router.push("/onboarding/sections/5/review")}>
            Review Section 5
          </SecondaryButton>
        </div>
      </ContentCard>
    </OnboardingShell>
  );
}
