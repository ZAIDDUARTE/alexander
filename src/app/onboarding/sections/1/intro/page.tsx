"use client";

import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { SectionIntro } from "@/components/onboarding/SectionIntro";
import { SecondaryLink } from "@/components/onboarding/ui/Buttons";
import { useOnboarding } from "@/lib/onboarding/OnboardingContext";
import { getSection1Progress } from "@/lib/onboarding/progress/section1";

export default function Section1IntroPage() {
  const { draft, saveStatus, lastSavedAt, setNavigation } = useOnboarding();
  const sectionProgress = getSection1Progress(draft.section1);

  return (
    <OnboardingShell
      completedSections={draft.navigation.completedSections}
      activeSectionId={1}
      currentSectionProgress={sectionProgress}
      saveStatus={saveStatus}
      lastSavedAt={lastSavedAt}
    >
      <SectionIntro
        sectionNumber={1}
        title="Your Company"
        description="Tell Alexander who your company is, when you are available, and what he is authorized to say about your business. This section helps Alexander introduce your company accurately, follow your operating hours, and avoid making claims you have not approved. You do not need to answer questions that do not apply to your business."
        estimatedTime="5–10 minutes"
        ctaHref="/onboarding/sections/1/form"
        ctaLabel="Begin Your Company →"
        onBegin={() => setNavigation({ stage: "section-form", sectionId: 1 })}
      />
      <div className="mx-auto mt-6 max-w-sm">
        <SecondaryLink href="/onboarding">← Back to welcome</SecondaryLink>
      </div>
    </OnboardingShell>
  );
}
