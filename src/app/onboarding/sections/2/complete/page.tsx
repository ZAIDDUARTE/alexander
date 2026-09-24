"use client";

import { useEffect } from "react";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { ContentCard } from "@/components/onboarding/ui/Card";
import { PrimaryButton, SecondaryButton } from "@/components/onboarding/ui/Buttons";
import { useOnboarding } from "@/lib/onboarding/OnboardingContext";
import { TOTAL_SECTIONS } from "@/lib/onboarding/sections";
import { useRouter } from "next/navigation";
import { section2IsValid } from "@/lib/onboarding/validation/section2";
import { getSection2Progress } from "@/lib/onboarding/progress/section2";
import { addCompletedSection } from "@/lib/onboarding/draft-utils";

const SUMMARY_ITEMS = [
  "Plumbing services configured",
  "Diagnostic, drain, and inspection services configured",
  "Customer and property types configured",
  "Customer-supplied materials policy set",
  "Corrective work policy set",
  "Service area defined",
  "After-hours coverage policy set",
];

export default function Section2CompletePage() {
  const { draft, saveStatus, lastSavedAt, markSectionComplete } = useOnboarding();
  const router = useRouter();
  const sectionProgress = getSection2Progress(draft.section2);

  const completedSections = addCompletedSection(draft.navigation.completedSections, 2);

  useEffect(() => {
    if (!section2IsValid(draft.section2)) {
      router.replace("/onboarding/sections/2/form");
      return;
    }
    if (!draft.navigation.completedSections.includes(2)) {
      markSectionComplete(2);
    }
  }, [draft.section2, draft.navigation.completedSections, router, markSectionComplete]);

  return (
    <OnboardingShell
      completedSections={completedSections}
      activeSectionId={2}
      currentSectionProgress={sectionProgress}
      saveStatus={saveStatus}
      lastSavedAt={lastSavedAt}
    >
      <ContentCard className="text-center">
        <p className="text-sm font-medium tracking-wide text-[var(--color-alexander-blue)] uppercase">
          Section 2 of {TOTAL_SECTIONS}
        </p>
        <h1 className="mt-4 font-serif text-3xl font-semibold text-[var(--color-alexander-navy)] sm:text-4xl">
          Alexander now understands the work your company does
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-[var(--color-alexander-muted)]">
          Alexander now understands the work your company does. He knows which services you offer,
          which customers and properties you serve, where you normally work, and which requests
          require special conditions or human review. This helps Alexander qualify opportunities
          without promising work your company does not provide.
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

        <p className="mt-6 text-sm text-[var(--color-alexander-muted)]">Next: Emergencies</p>

        <div className="mx-auto mt-10 flex max-w-md flex-col gap-3">
          <PrimaryButton disabled title="Emergencies (Section 3) is not available in this build yet">
            Continue to Section 3 →
          </PrimaryButton>
          <p className="text-center text-xs text-[var(--color-alexander-muted)]">
            Section 3 — Emergencies — will be added in the next implementation pass.
          </p>
          <SecondaryButton onClick={() => router.push("/onboarding/sections/2/review")}>
            Review Section 2
          </SecondaryButton>
        </div>
      </ContentCard>
    </OnboardingShell>
  );
}
