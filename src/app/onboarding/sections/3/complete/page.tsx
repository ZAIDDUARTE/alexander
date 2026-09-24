"use client";

import { useEffect } from "react";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { ContentCard } from "@/components/onboarding/ui/Card";
import { PrimaryButton, SecondaryButton } from "@/components/onboarding/ui/Buttons";
import { useOnboarding } from "@/lib/onboarding/OnboardingContext";
import { TOTAL_SECTIONS } from "@/lib/onboarding/sections";
import { useRouter } from "next/navigation";
import { section3IsValid } from "@/lib/onboarding/validation/section3";
import { getSection3Progress } from "@/lib/onboarding/progress/section3";
import { addCompletedSection } from "@/lib/onboarding/draft-utils";

const SUMMARY_ITEMS = [
  "Emergency situations classified",
  "Dispatch approval requirements set",
  "After-hours call handling configured",
  "After-hours emergency service availability set",
  "Primary escalation contact configured",
  "Fallback and retry rules set",
  "Emergency capacity/override rule set",
];

export default function Section3CompletePage() {
  const { draft, saveStatus, lastSavedAt, markSectionComplete } = useOnboarding();
  const router = useRouter();
  const sectionProgress = getSection3Progress(draft.section3, draft.contacts);

  const completedSections = addCompletedSection(draft.navigation.completedSections, 3);

  useEffect(() => {
    if (!section3IsValid(draft.section3, draft.contacts)) {
      router.replace("/onboarding/sections/3/form");
      return;
    }
    if (!draft.navigation.completedSections.includes(3)) {
      markSectionComplete(3);
    }
  }, [draft.section3, draft.contacts, draft.navigation.completedSections, router, markSectionComplete]);

  return (
    <OnboardingShell
      completedSections={completedSections}
      activeSectionId={3}
      currentSectionProgress={sectionProgress}
      saveStatus={saveStatus}
      lastSavedAt={lastSavedAt}
    >
      <ContentCard className="text-center">
        <p className="text-sm font-medium tracking-wide text-[var(--color-alexander-blue)] uppercase">
          Section 3 of {TOTAL_SECTIONS}
        </p>
        <h1 className="mt-4 font-serif text-3xl font-semibold text-[var(--color-alexander-navy)] sm:text-4xl">
          Alexander now knows how your company handles urgent situations
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-[var(--color-alexander-muted)]">
          Alexander now knows how your company handles urgent situations. He understands which
          calls require immediate attention, when human approval is needed, who should be
          contacted, what happens when nobody answers, and how to communicate unresolved
          situations truthfully. This gives Alexander a clear safety and escalation framework
          instead of forcing him to guess under pressure.
        </p>
        <p className="mt-4 text-sm text-[var(--color-alexander-muted)]">
          Progress: {completedSections.length} of {TOTAL_SECTIONS} sections complete
        </p>

        <ul className="mx-auto mt-8 max-w-md space-y-3 text-left">
          {SUMMARY_ITEMS.map((item) => (
            <li
              key={item}
              className="flex items-start gap-3 rounded-lg border border-[var(--color-alexander-border)] bg-[var(--color-alexander-success-bg)] px-4 py-3 text-sm text-[var(--color-alexander-navy)]"
            >
              <span className="mt-0.5 text-[var(--color-alexander-success)]" aria-hidden>✓</span>
              {item}
            </li>
          ))}
        </ul>

        <p className="mt-6 text-sm text-[var(--color-alexander-muted)]">Next: Scheduling</p>

        <div className="mx-auto mt-10 flex max-w-md flex-col gap-3">
          <PrimaryButton disabled title="Scheduling (Section 4) is not available in this build yet">
            Continue to Section 4 →
          </PrimaryButton>
          <p className="text-center text-xs text-[var(--color-alexander-muted)]">
            Section 4 — Scheduling — will be added in the next implementation pass.
          </p>
          <SecondaryButton onClick={() => router.push("/onboarding/sections/3/review")}>
            Review Section 3
          </SecondaryButton>
        </div>
      </ContentCard>
    </OnboardingShell>
  );
}
