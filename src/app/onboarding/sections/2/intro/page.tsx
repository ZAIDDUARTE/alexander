"use client";

import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { SectionIntro } from "@/components/onboarding/SectionIntro";
import { SecondaryLink } from "@/components/onboarding/ui/Buttons";
import { useOnboarding } from "@/lib/onboarding/OnboardingContext";
import { getSection2Progress } from "@/lib/onboarding/progress/section2";

export default function Section2IntroPage() {
  const { draft, saveStatus, lastSavedAt, setNavigation } = useOnboarding();
  const sectionProgress = getSection2Progress(draft.section2);

  return (
    <OnboardingShell
      completedSections={draft.navigation.completedSections}
      activeSectionId={2}
      currentSectionProgress={sectionProgress}
      saveStatus={saveStatus}
      lastSavedAt={lastSavedAt}
    >
      <SectionIntro
        sectionNumber={2}
        title="Your Services"
        description="Tell Alexander which jobs your company accepts, who you serve, and where you work. This information helps him recognize the difference between a service your company routinely provides, a request that requires review, and a job your company does not accept. The more clearly your service boundaries are defined, the more confidently Alexander can qualify calls and guide customers to the right next step."
        estimatedTime="10–15 minutes"
        ctaHref="/onboarding/sections/2/form"
        ctaLabel="Begin Your Services →"
        onBegin={() => setNavigation({ stage: "section-form", sectionId: 2 })}
      />
      <div className="mx-auto mt-6 max-w-sm">
        <SecondaryLink href="/onboarding/sections/1/complete">
          ← Back to Section 1 completion
        </SecondaryLink>
      </div>
    </OnboardingShell>
  );
}
