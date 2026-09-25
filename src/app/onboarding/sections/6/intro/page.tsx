"use client";

import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { SectionIntro } from "@/components/onboarding/SectionIntro";
import { SecondaryLink } from "@/components/onboarding/ui/Buttons";
import { useOnboarding } from "@/lib/onboarding/OnboardingContext";
import { getSection6Progress } from "@/lib/onboarding/progress/section6";

export default function Section6IntroPage() {
  const { draft, saveStatus, lastSavedAt, setNavigation } = useOnboarding();
  const sectionProgress = getSection6Progress(draft.section6, draft.contacts);

  return (
    <OnboardingShell
      completedSections={draft.navigation.completedSections}
      activeSectionId={6}
      currentSectionProgress={sectionProgress}
      saveStatus={saveStatus}
      lastSavedAt={lastSavedAt}
    >
      <SectionIntro
        sectionNumber={6}
        title="Customer Care"
        description="Tell Alexander how to care for existing customers and handle situations that require context, patience, or follow-up. This section covers callbacks, complaints, service recovery, privacy boundaries, additional-service recommendations, and non-service calls. These policies help Alexander recognize when a caller may already have a relationship with your company and respond appropriately without making unsupported promises."
        estimatedTime="10–15 minutes"
        ctaHref="/onboarding/sections/6/form"
        ctaLabel="Begin Customer Care →"
        onBegin={() => setNavigation({ stage: "section-form", sectionId: 6 })}
      />
      <div className="mx-auto mt-6 max-w-sm">
        <SecondaryLink href="/onboarding/sections/5/complete">
          ← Back to Section 5 completion
        </SecondaryLink>
      </div>
    </OnboardingShell>
  );
}
