"use client";

import { useRouter } from "next/navigation";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { Section8ReviewSummary } from "@/components/onboarding/Section8ReviewSummary";
import { PrimaryButton, SecondaryButton } from "@/components/onboarding/ui/Buttons";
import { useOnboarding } from "@/lib/onboarding/OnboardingContext";
import { useEffect } from "react";
import { getSection8Progress } from "@/lib/onboarding/progress/section8";

export default function Section8ReviewPage() {
  const { draft, saveStatus, lastSavedAt, setNavigation } = useOnboarding();
  const router = useRouter();
  const sectionProgress = getSection8Progress(draft.section8);

  useEffect(() => {
    setNavigation({ stage: "section-review", sectionId: 8 });
  }, [setNavigation]);

  return (
    <OnboardingShell
      completedSections={draft.navigation.completedSections}
      activeSectionId={8}
      currentSectionProgress={sectionProgress}
      saveStatus={saveStatus}
      lastSavedAt={lastSavedAt}
    >
      <p className="mb-6 text-sm text-[var(--color-alexander-muted)]">
        Integration systems and final setup summary.
      </p>
      <Section8ReviewSummary draft={draft} />
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <SecondaryButton
          className="sm:flex-1"
          onClick={() => router.push("/onboarding/sections/8/complete")}
        >
          Back to completion
        </SecondaryButton>
        <PrimaryButton className="sm:flex-1" onClick={() => router.push("/onboarding/sections/8/form")}>
          Edit in full form →
        </PrimaryButton>
      </div>
    </OnboardingShell>
  );
}
