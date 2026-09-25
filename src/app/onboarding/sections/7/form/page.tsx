"use client";

import { useEffect } from "react";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { Section7Form } from "@/components/onboarding/Section7Form";
import { useOnboarding } from "@/lib/onboarding/OnboardingContext";
import { getSection7Progress } from "@/lib/onboarding/progress/section7";

export default function Section7FormPage() {
  const { draft, saveStatus, lastSavedAt, setNavigation } = useOnboarding();
  const sectionProgress = getSection7Progress(draft.section7);

  useEffect(() => {
    setNavigation({ stage: "section-form", sectionId: 7 });
  }, [setNavigation]);

  return (
    <OnboardingShell
      completedSections={draft.navigation.completedSections}
      activeSectionId={7}
      currentSectionProgress={sectionProgress}
      saveStatus={saveStatus}
      lastSavedAt={lastSavedAt}
    >
      <Section7Form />
    </OnboardingShell>
  );
}
