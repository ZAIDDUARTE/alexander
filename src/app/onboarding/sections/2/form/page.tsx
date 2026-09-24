"use client";

import { useEffect } from "react";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { Section2Form } from "@/components/onboarding/Section2Form";
import { useOnboarding } from "@/lib/onboarding/OnboardingContext";
import { getSection2Progress } from "@/lib/onboarding/progress/section2";

export default function Section2FormPage() {
  const { draft, saveStatus, lastSavedAt, setNavigation } = useOnboarding();
  const sectionProgress = getSection2Progress(draft.section2);

  useEffect(() => {
    setNavigation({ stage: "section-form", sectionId: 2 });
  }, [setNavigation]);

  return (
    <OnboardingShell
      completedSections={draft.navigation.completedSections}
      activeSectionId={2}
      currentSectionProgress={sectionProgress}
      saveStatus={saveStatus}
      lastSavedAt={lastSavedAt}
    >
      <Section2Form />
    </OnboardingShell>
  );
}
