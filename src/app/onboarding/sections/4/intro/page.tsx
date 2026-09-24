"use client";

import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { SectionIntro } from "@/components/onboarding/SectionIntro";
import { SecondaryLink } from "@/components/onboarding/ui/Buttons";
import { useOnboarding } from "@/lib/onboarding/OnboardingContext";
import { getSection4Progress } from "@/lib/onboarding/progress/section4";

export default function Section4IntroPage() {
  const { draft, saveStatus, lastSavedAt, setNavigation } = useOnboarding();
  const sectionProgress = getSection4Progress(
    draft.section4,
    draft.contacts,
    draft.fees,
    draft.section2,
  );

  return (
    <OnboardingShell
      completedSections={draft.navigation.completedSections}
      activeSectionId={4}
      currentSectionProgress={sectionProgress}
      saveStatus={saveStatus}
      lastSavedAt={lastSavedAt}
    >
      <SectionIntro
        sectionNumber={4}
        title="Scheduling"
        description="Tell Alexander when and how your company can accept appointments. This section defines booking authority, appointment windows, authorization, capacity rules, rescheduling, cancellation policy, technician assignment, and exceptions. Alexander may be configured to book within your rules, request approval, collect information for your team, or use a combination of these approaches."
        estimatedTime="10–15 minutes"
        ctaHref="/onboarding/sections/4/form"
        ctaLabel="Begin Scheduling →"
        onBegin={() => setNavigation({ stage: "section-form", sectionId: 4 })}
      />
      <div className="mx-auto mt-6 max-w-sm">
        <SecondaryLink href="/onboarding/sections/3/complete">
          ← Back to Section 3 completion
        </SecondaryLink>
      </div>
    </OnboardingShell>
  );
}
