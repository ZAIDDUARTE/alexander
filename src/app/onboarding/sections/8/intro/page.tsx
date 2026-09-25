"use client";

import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { SectionIntro } from "@/components/onboarding/SectionIntro";
import { SecondaryLink } from "@/components/onboarding/ui/Buttons";
import { useOnboarding } from "@/lib/onboarding/OnboardingContext";
import { getSection8Progress } from "@/lib/onboarding/progress/section8";

export default function Section8IntroPage() {
  const { draft, saveStatus, lastSavedAt, setNavigation } = useOnboarding();
  const sectionProgress = getSection8Progress(draft.section8);

  return (
    <OnboardingShell
      completedSections={draft.navigation.completedSections}
      activeSectionId={8}
      currentSectionProgress={sectionProgress}
      saveStatus={saveStatus}
      lastSavedAt={lastSavedAt}
    >
      <SectionIntro
        sectionNumber={8}
        title="Integration Systems and Final Setup"
        description="This final section connects Alexander’s approved behavior to the systems and people who help your company operate. Tell us about your CRM or field-service software, calendar, dispatch, phone system, integrations, permissions, connection owner, and any final implementation details. You do not need to provide passwords or ordinary account credentials here. When a secure connection is required, we will guide you through the appropriate setup process."
        estimatedTime="5–10 minutes"
        ctaHref="/onboarding/sections/8/form"
        ctaLabel="Begin Final Setup →"
        onBegin={() => setNavigation({ stage: "section-form", sectionId: 8 })}
      />
      <div className="mx-auto mt-6 max-w-sm">
        <SecondaryLink href="/onboarding/sections/7/complete">
          ← Back to Section 7 completion
        </SecondaryLink>
      </div>
    </OnboardingShell>
  );
}
