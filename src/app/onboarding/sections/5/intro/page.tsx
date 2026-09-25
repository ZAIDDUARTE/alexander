"use client";

import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { SectionIntro } from "@/components/onboarding/SectionIntro";
import { SecondaryLink } from "@/components/onboarding/ui/Buttons";
import { useOnboarding } from "@/lib/onboarding/OnboardingContext";
import { getSection5Progress } from "@/lib/onboarding/progress/section5";

export default function Section5IntroPage() {
  const { draft, saveStatus, lastSavedAt, setNavigation } = useOnboarding();
  const sectionProgress = getSection5Progress(
    draft.section5,
    draft.section2,
    draft.contacts,
    draft.fees,
  );

  return (
    <OnboardingShell
      completedSections={draft.navigation.completedSections}
      activeSectionId={5}
      currentSectionProgress={sectionProgress}
      saveStatus={saveStatus}
      lastSavedAt={lastSavedAt}
    >
      <SectionIntro
        sectionNumber={5}
        title="Pricing and Payments"
        description="Tell Alexander what he may explain about fees, estimates, payments, and financial policies. You decide whether Alexander may share specific prices, explain service fees, provide approved ranges, or send financial questions to your team. If your company does not want Alexander to discuss a particular financial topic, simply indicate that. He will not guess or improvise."
        estimatedTime="10–15 minutes"
        ctaHref="/onboarding/sections/5/form"
        ctaLabel="Begin Pricing and Payments →"
        onBegin={() => setNavigation({ stage: "section-form", sectionId: 5 })}
      />
      <div className="mx-auto mt-6 max-w-sm">
        <SecondaryLink href="/onboarding/sections/4/complete">
          ← Back to Section 4 completion
        </SecondaryLink>
      </div>
    </OnboardingShell>
  );
}
