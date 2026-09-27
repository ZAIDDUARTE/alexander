"use client";

import { useEffect } from "react";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { ContentCard } from "@/components/onboarding/ui/Card";
import { PrimaryLink, SecondaryButton } from "@/components/onboarding/ui/Buttons";
import { useOnboarding } from "@/lib/onboarding/OnboardingContext";
import { TOTAL_SECTIONS } from "@/lib/onboarding/sections";
import { useRouter } from "next/navigation";
import { section4IsValid } from "@/lib/onboarding/validation/section4";
import { getSection4Progress } from "@/lib/onboarding/progress/section4";
import { addCompletedSection } from "@/lib/onboarding/draft-utils";


export default function Section4CompletePage() {
  const { draft, saveStatus, lastSavedAt, markSectionComplete } = useOnboarding();
  const router = useRouter();
  const sectionProgress = getSection4Progress(
    draft.section4,
    draft.contacts,
    draft.fees,
    draft.section2,
  );

  const completedSections = addCompletedSection(draft.navigation.completedSections, 4);

  useEffect(() => {
    if (!section4IsValid(draft.section4, draft.contacts, draft.fees, draft.section2)) {
      router.replace("/onboarding/sections/4/form");
      return;
    }
    if (!draft.navigation.completedSections.includes(4)) {
      markSectionComplete(4);
    }
  }, [
    draft.section4,
    draft.contacts,
    draft.fees,
    draft.section2,
    draft.navigation.completedSections,
    router,
    markSectionComplete,
  ]);

  return (
    <OnboardingShell
      completedSections={completedSections}
      activeSectionId={4}
      currentSectionProgress={sectionProgress}
      saveStatus={saveStatus}
      lastSavedAt={lastSavedAt}
    >
      <ContentCard className="text-center">
        <p className="text-sm font-medium tracking-wide text-[var(--color-alexander-blue)] uppercase">
          Section 4 of {TOTAL_SECTIONS}
        </p>
        <h1 className="mt-4 font-serif text-3xl font-semibold text-[var(--color-alexander-navy)] sm:text-4xl">
          Alexander now understands your scheduling rules
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-[var(--color-alexander-muted)]">
          He knows when appointments may be offered,
          what information is needed, which situations require approval, and how to handle changes,
          cancellations, capacity limits, and scheduling exceptions. This helps prevent double
          promises, unsupported availability claims, and unnecessary back-and-forth with your team.
        </p>
        <p className="mt-4 text-sm text-[var(--color-alexander-muted)]">
          Progress: {completedSections.length} of {TOTAL_SECTIONS} sections complete
        </p>


        <p className="mt-6 text-sm text-[var(--color-alexander-muted)]">Next: Pricing and Payments</p>

        <div className="mx-auto mt-10 flex max-w-md flex-col gap-3">
          <PrimaryLink href="/onboarding/sections/5/intro">Continue to Pricing and Payments →</PrimaryLink>
          <SecondaryButton onClick={() => router.push("/onboarding/sections/4/review")}>
            Review Section 4
          </SecondaryButton>
        </div>
      </ContentCard>
    </OnboardingShell>
  );
}
