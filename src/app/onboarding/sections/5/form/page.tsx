"use client";

import { useEffect } from "react";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { Section5Form } from "@/components/onboarding/Section5Form";
import { useOnboarding } from "@/lib/onboarding/OnboardingContext";
import { getSection5Progress } from "@/lib/onboarding/progress/section5";

export default function Section5FormPage() {
  const { draft, saveStatus, lastSavedAt, setNavigation } = useOnboarding();
  const sectionProgress = getSection5Progress(
    draft.section5,
    draft.section2,
    draft.contacts,
    draft.fees,
  );

  useEffect(() => {
    setNavigation({ stage: "section-form", sectionId: 5 });
  }, [setNavigation]);

  return (
    <OnboardingShell
      completedSections={draft.navigation.completedSections}
      activeSectionId={5}
      currentSectionProgress={sectionProgress}
      saveStatus={saveStatus}
      lastSavedAt={lastSavedAt}
    >
      <Section5Form />
    </OnboardingShell>
  );
}
