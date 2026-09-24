"use client";

import { useEffect } from "react";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { Section4Form } from "@/components/onboarding/Section4Form";
import { useOnboarding } from "@/lib/onboarding/OnboardingContext";
import { getSection4Progress } from "@/lib/onboarding/progress/section4";

export default function Section4FormPage() {
  const { draft, saveStatus, lastSavedAt, setNavigation } = useOnboarding();
  const sectionProgress = getSection4Progress(
    draft.section4,
    draft.contacts,
    draft.fees,
    draft.section2,
  );

  useEffect(() => {
    setNavigation({ stage: "section-form", sectionId: 4 });
  }, [setNavigation]);

  return (
    <OnboardingShell
      completedSections={draft.navigation.completedSections}
      activeSectionId={4}
      currentSectionProgress={sectionProgress}
      saveStatus={saveStatus}
      lastSavedAt={lastSavedAt}
    >
      <Section4Form />
    </OnboardingShell>
  );
}
