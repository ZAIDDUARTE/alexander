"use client";

import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { SectionIntro } from "@/components/onboarding/SectionIntro";
import { SecondaryLink } from "@/components/onboarding/ui/Buttons";
import { useOnboarding } from "@/lib/onboarding/OnboardingContext";
import { getSection3Progress } from "@/lib/onboarding/progress/section3";

export default function Section3IntroPage() {
  const { draft, saveStatus, lastSavedAt, setNavigation } = useOnboarding();
  const sectionProgress = getSection3Progress(draft.section3, draft.contacts);

  return (
    <OnboardingShell
      completedSections={draft.navigation.completedSections}
      activeSectionId={3}
      currentSectionProgress={sectionProgress}
      saveStatus={saveStatus}
      lastSavedAt={lastSavedAt}
    >
      <SectionIntro
        sectionNumber={3}
        title="Emergencies"
        description="Tell Alexander which situations require immediate attention and what should happen when your team needs to step in. This section establishes your emergency rules, after-hours response, approval requirements, escalation contacts, retry process, and fallback behavior. Alexander will use this information to recognize urgent situations, gather the right details, and communicate honestly about what has - and has not - been confirmed."
        estimatedTime="10–15 minutes"
        ctaHref="/onboarding/sections/3/form"
        ctaLabel="Begin Emergency Setup →"
        onBegin={() => setNavigation({ stage: "section-form", sectionId: 3 })}
      />
      <div className="mx-auto mt-6 max-w-sm">
        <SecondaryLink href="/onboarding/sections/2/complete">
          ← Back to Section 2 completion
        </SecondaryLink>
      </div>
    </OnboardingShell>
  );
}
