"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { Section7Form } from "@/components/onboarding/Section7Form";
import { Section7ReviewSummary } from "@/components/onboarding/Section7ReviewSummary";
import { PrimaryButton, SecondaryButton } from "@/components/onboarding/ui/Buttons";
import { useOnboarding } from "@/lib/onboarding/OnboardingContext";
import { getSection7Progress } from "@/lib/onboarding/progress/section7";

export default function Section7ReviewPage() {
  const { draft, saveStatus, lastSavedAt, setNavigation } = useOnboarding();
  const router = useRouter();
  const sectionProgress = getSection7Progress(draft.section7);

  useEffect(() => {
    setNavigation({ stage: "section-review", sectionId: 7 });
  }, [setNavigation]);

  return (
    <OnboardingShell
      completedSections={draft.navigation.completedSections}
      activeSectionId={7}
      currentSectionProgress={sectionProgress}
      saveStatus={saveStatus}
      lastSavedAt={lastSavedAt}
    >
      <p className="mb-6 text-sm text-[var(--color-alexander-muted)]">
        Review your answers below. Changes save automatically.
      </p>
      <Section7ReviewSummary draft={draft} />
      <div className="mt-8">
        <Section7Form mode="review" />
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <SecondaryButton
          className="sm:flex-1"
          onClick={() => router.push("/onboarding/sections/7/complete")}
        >
          Back to completion
        </SecondaryButton>
        <PrimaryButton className="sm:flex-1" onClick={() => router.push("/onboarding/sections/7/form")}>
          Edit in full form →
        </PrimaryButton>
      </div>
    </OnboardingShell>
  );
}
