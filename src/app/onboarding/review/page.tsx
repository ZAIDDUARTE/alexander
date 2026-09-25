"use client";

import { useEffect } from "react";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { OnboardingGlobalReview } from "@/components/onboarding/OnboardingGlobalReview";
import { useOnboarding } from "@/lib/onboarding/OnboardingContext";
import { getSection8Progress } from "@/lib/onboarding/progress/section8";

export default function GlobalReviewPage() {
  const { draft, saveStatus, lastSavedAt, setNavigation, setCurrentRoute } = useOnboarding();

  useEffect(() => {
    setNavigation({ stage: "section-review", sectionId: 8 });
    setCurrentRoute("/onboarding/review");
  }, [setNavigation, setCurrentRoute]);

  return (
    <OnboardingShell
      completedSections={draft.navigation.completedSections}
      activeSectionId={8}
      currentSectionProgress={getSection8Progress(draft.section8)}
      saveStatus={saveStatus}
      lastSavedAt={lastSavedAt}
    >
      <OnboardingGlobalReview />
    </OnboardingShell>
  );
}
