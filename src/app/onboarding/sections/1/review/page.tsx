"use client";

import { useRouter } from "next/navigation";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { Section1Form } from "@/components/onboarding/Section1Form";
import { PrimaryButton, SecondaryButton } from "@/components/onboarding/ui/Buttons";
import { useOnboarding } from "@/lib/onboarding/OnboardingContext";
import { useEffect } from "react";
import { getSection1Progress } from "@/lib/onboarding/progress/section1";

export default function Section1ReviewPage() {
  const { draft, saveStatus, lastSavedAt, setNavigation } = useOnboarding();
  const router = useRouter();
  const sectionProgress = getSection1Progress(draft.section1);

  useEffect(() => {
    setNavigation({ stage: "section-review", sectionId: 1 });
  }, [setNavigation]);

  return (
    <OnboardingShell
      completedSections={draft.navigation.completedSections}
      activeSectionId={1}
      currentSectionProgress={sectionProgress}
      saveStatus={saveStatus}
      lastSavedAt={lastSavedAt}
    >
      <p className="mb-6 text-sm text-[var(--color-alexander-muted)]">
        Review your answers below. Changes save automatically.
      </p>
      <Section1Form mode="review" />
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <SecondaryButton
          className="sm:flex-1"
          onClick={() => router.push("/onboarding/sections/1/complete")}
        >
          Back to completion
        </SecondaryButton>
        <PrimaryButton className="sm:flex-1" onClick={() => router.push("/onboarding/sections/1/form")}>
          Edit in full form →
        </PrimaryButton>
      </div>
    </OnboardingShell>
  );
}
