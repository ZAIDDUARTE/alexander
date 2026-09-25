"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { Section6Form } from "@/components/onboarding/Section6Form";
import { Section6ReviewSummary } from "@/components/onboarding/Section6ReviewSummary";
import { PrimaryButton, SecondaryButton } from "@/components/onboarding/ui/Buttons";
import { useOnboarding } from "@/lib/onboarding/OnboardingContext";
import { getSection6Progress } from "@/lib/onboarding/progress/section6";

export default function Section6ReviewPage() {
  const { draft, saveStatus, lastSavedAt, setNavigation } = useOnboarding();
  const router = useRouter();
  const sectionProgress = getSection6Progress(draft.section6, draft.contacts);

  useEffect(() => {
    setNavigation({ stage: "section-review", sectionId: 6 });
  }, [setNavigation]);

  return (
    <OnboardingShell
      completedSections={draft.navigation.completedSections}
      activeSectionId={6}
      currentSectionProgress={sectionProgress}
      saveStatus={saveStatus}
      lastSavedAt={lastSavedAt}
    >
      <p className="mb-6 text-sm text-[var(--color-alexander-muted)]">
        Review your answers below. Changes save automatically.
      </p>
      <Section6ReviewSummary draft={draft} />
      <div className="mt-8">
        <Section6Form mode="review" />
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <SecondaryButton
          className="sm:flex-1"
          onClick={() => router.push("/onboarding/sections/6/complete")}
        >
          Back to completion
        </SecondaryButton>
        <PrimaryButton className="sm:flex-1" onClick={() => router.push("/onboarding/sections/6/form")}>
          Edit in full form →
        </PrimaryButton>
      </div>
    </OnboardingShell>
  );
}
