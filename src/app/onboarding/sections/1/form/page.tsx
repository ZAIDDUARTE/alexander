"use client";

import { useEffect } from "react";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { Section1Form } from "@/components/onboarding/Section1Form";
import { useOnboarding } from "@/lib/onboarding/OnboardingContext";
import { getSection1Progress } from "@/lib/onboarding/progress/section1";

export default function Section1FormPage() {
  const { draft, saveStatus, lastSavedAt, setNavigation } = useOnboarding();
  const sectionProgress = getSection1Progress(draft.section1);

  useEffect(() => {
    setNavigation({ stage: "section-form", sectionId: 1 });
  }, [setNavigation]);

  return (
    <OnboardingShell
      completedSections={draft.navigation.completedSections}
      activeSectionId={1}
      currentSectionProgress={sectionProgress}
      saveStatus={saveStatus}
      lastSavedAt={lastSavedAt}
    >
      <Section1Form />
    </OnboardingShell>
  );
}
