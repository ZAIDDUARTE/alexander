"use client";

import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { SectionIntro } from "@/components/onboarding/SectionIntro";
import { SecondaryLink } from "@/components/onboarding/ui/Buttons";
import { useOnboarding } from "@/lib/onboarding/OnboardingContext";
import { getSection7Progress } from "@/lib/onboarding/progress/section7";

export default function Section7IntroPage() {
  const { draft, saveStatus, lastSavedAt, setNavigation } = useOnboarding();
  const sectionProgress = getSection7Progress(draft.section7);

  return (
    <OnboardingShell
      completedSections={draft.navigation.completedSections}
      activeSectionId={7}
      currentSectionProgress={sectionProgress}
      saveStatus={saveStatus}
      lastSavedAt={lastSavedAt}
    >
      <SectionIntro
        sectionNumber={7}
        title="Voice and Conversation"
        description="Now choose how Alexander should sound and introduce himself to your customers. We provide the conversational intelligence standard. You choose the voice, identity details, language preferences, and communication style that should feel specific to your company. These choices affect Alexander’s presentation, not his underlying safety rules, reasoning, authority, or business policies."
        estimatedTime="5–10 minutes"
        ctaHref="/onboarding/sections/7/form"
        ctaLabel="Begin Voice and Conversation →"
        onBegin={() => setNavigation({ stage: "section-form", sectionId: 7 })}
      />
      <div className="mx-auto mt-6 max-w-sm">
        <SecondaryLink href="/onboarding/sections/6/complete">
          ← Back to Section 6 completion
        </SecondaryLink>
      </div>
    </OnboardingShell>
  );
}
