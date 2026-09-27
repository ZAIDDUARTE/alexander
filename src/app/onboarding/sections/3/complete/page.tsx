"use client";

import { useEffect } from "react";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { ContentCard } from "@/components/onboarding/ui/Card";
import { PrimaryLink, SecondaryButton } from "@/components/onboarding/ui/Buttons";
import { useOnboarding } from "@/lib/onboarding/OnboardingContext";
import { TOTAL_SECTIONS } from "@/lib/onboarding/sections";
import { useRouter } from "next/navigation";
import { section3IsValid } from "@/lib/onboarding/validation/section3";
import { getSection3Progress } from "@/lib/onboarding/progress/section3";
import { addCompletedSection } from "@/lib/onboarding/draft-utils";


export default function Section3CompletePage() {
  const { draft, saveStatus, lastSavedAt, markSectionComplete } = useOnboarding();
  const router = useRouter();
  const sectionProgress = getSection3Progress(draft.section3, draft.contacts);

  const completedSections = addCompletedSection(draft.navigation.completedSections, 3);

  useEffect(() => {
    if (!section3IsValid(draft.section3, draft.contacts)) {
      router.replace("/onboarding/sections/3/form");
      return;
    }
    if (!draft.navigation.completedSections.includes(3)) {
      markSectionComplete(3);
    }
  }, [draft.section3, draft.contacts, draft.navigation.completedSections, router, markSectionComplete]);

  return (
    <OnboardingShell
      completedSections={completedSections}
      activeSectionId={3}
      currentSectionProgress={sectionProgress}
      saveStatus={saveStatus}
      lastSavedAt={lastSavedAt}
    >
      <ContentCard className="text-center">
        <p className="text-sm font-medium tracking-wide text-[var(--color-alexander-blue)] uppercase">
          Section 3 of {TOTAL_SECTIONS}
        </p>
        <h1 className="mt-4 font-serif text-3xl font-semibold text-[var(--color-alexander-navy)] sm:text-4xl">
          Alexander now knows how your company handles urgent situations
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-[var(--color-alexander-muted)]">
          He understands which
          calls require immediate attention, when human approval is needed, who should be
          contacted, what happens when nobody answers, and how to communicate unresolved
          situations truthfully. This gives Alexander a clear safety and escalation framework
          instead of forcing him to guess under pressure.
        </p>
        <p className="mt-4 text-sm text-[var(--color-alexander-muted)]">
          Progress: {completedSections.length} of {TOTAL_SECTIONS} sections complete
        </p>


        <p className="mt-6 text-sm text-[var(--color-alexander-muted)]">Next: Scheduling</p>

        <div className="mx-auto mt-10 flex max-w-md flex-col gap-3">
          <PrimaryLink href="/onboarding/sections/4/intro">Continue to Scheduling →</PrimaryLink>
          <SecondaryButton onClick={() => router.push("/onboarding/sections/3/review")}>
            Review Section 3
          </SecondaryButton>
        </div>
      </ContentCard>
    </OnboardingShell>
  );
}
