"use client";

import { useEffect } from "react";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { Section3Form } from "@/components/onboarding/Section3Form";
import { useOnboarding } from "@/lib/onboarding/OnboardingContext";
import { getSection3Progress } from "@/lib/onboarding/progress/section3";

export default function Section3FormPage() {
  const { draft, saveStatus, lastSavedAt, setNavigation } = useOnboarding();
  const sectionProgress = getSection3Progress(draft.section3, draft.contacts);

  useEffect(() => {
    setNavigation({ stage: "section-form", sectionId: 3 });
  }, [setNavigation]);

  return (
    <OnboardingShell
      completedSections={draft.navigation.completedSections}
      activeSectionId={3}
      currentSectionProgress={sectionProgress}
      saveStatus={saveStatus}
      lastSavedAt={lastSavedAt}
    >
      <Section3Form />
    </OnboardingShell>
  );
}
