"use client";

import { useEffect } from "react";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { Section6Form } from "@/components/onboarding/Section6Form";
import { useOnboarding } from "@/lib/onboarding/OnboardingContext";
import { getSection6Progress } from "@/lib/onboarding/progress/section6";

export default function Section6FormPage() {
  const { draft, saveStatus, lastSavedAt, setNavigation } = useOnboarding();
  const sectionProgress = getSection6Progress(draft.section6, draft.contacts);

  useEffect(() => {
    setNavigation({ stage: "section-form", sectionId: 6 });
  }, [setNavigation]);

  return (
    <OnboardingShell
      completedSections={draft.navigation.completedSections}
      activeSectionId={6}
      currentSectionProgress={sectionProgress}
      saveStatus={saveStatus}
      lastSavedAt={lastSavedAt}
    >
      <Section6Form />
    </OnboardingShell>
  );
}
