"use client";

import { useEffect } from "react";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { Section8Form } from "@/components/onboarding/Section8Form";
import { useOnboarding } from "@/lib/onboarding/OnboardingContext";
import { getSection8Progress } from "@/lib/onboarding/progress/section8";

export default function Section8FormPage() {
  const { draft, saveStatus, lastSavedAt, setNavigation } = useOnboarding();
  const sectionProgress = getSection8Progress(draft.section8);

  useEffect(() => {
    setNavigation({ stage: "section-form", sectionId: 8 });
  }, [setNavigation]);

  return (
    <OnboardingShell
      completedSections={draft.navigation.completedSections}
      activeSectionId={8}
      currentSectionProgress={sectionProgress}
      saveStatus={saveStatus}
      lastSavedAt={lastSavedAt}
    >
      <Section8Form />
    </OnboardingShell>
  );
}
