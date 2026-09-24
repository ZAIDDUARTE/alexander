"use client";

import { useEffect } from "react";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { ContentCard } from "@/components/onboarding/ui/Card";
import { PrimaryButton, SecondaryButton } from "@/components/onboarding/ui/Buttons";
import { useOnboarding } from "@/lib/onboarding/OnboardingContext";
import { TOTAL_SECTIONS } from "@/lib/onboarding/sections";
import { useRouter } from "next/navigation";
import { section4IsValid } from "@/lib/onboarding/validation/section4";
import { getSection4Progress } from "@/lib/onboarding/progress/section4";
import { addCompletedSection } from "@/lib/onboarding/draft-utils";

const SUMMARY_ITEMS = [
  "Human-request and AI-refusal policies set",
  "Exception approval authority configured",
  "Caller authorization and spending limits set",
  "Booking horizon and appointment windows configured",
  "Reschedule, cancellation, and fee policies set",
  "Callback and technician assignment rules set",
  "Multi-issue scheduling policy set",
];

export default function Section4CompletePage() {
  const { draft, saveStatus, lastSavedAt, markSectionComplete } = useOnboarding();
  const router = useRouter();
  const sectionProgress = getSection4Progress(
    draft.section4,
    draft.contacts,
    draft.fees,
    draft.section2,
  );

  const completedSections = addCompletedSection(draft.navigation.completedSections, 4);

  useEffect(() => {
    if (!section4IsValid(draft.section4, draft.contacts, draft.fees, draft.section2)) {
      router.replace("/onboarding/sections/4/form");
      return;
    }
    if (!draft.navigation.completedSections.includes(4)) {
      markSectionComplete(4);
    }
  }, [
    draft.section4,
    draft.contacts,
    draft.fees,
    draft.section2,
    draft.navigation.completedSections,
    router,
    markSectionComplete,
  ]);

  return (
    <OnboardingShell
      completedSections={completedSections}
      activeSectionId={4}
      currentSectionProgress={sectionProgress}
      saveStatus={saveStatus}
      lastSavedAt={lastSavedAt}
    >
      <ContentCard className="text-center">
        <p className="text-sm font-medium tracking-wide text-[var(--color-alexander-blue)] uppercase">
          Section 4 of {TOTAL_SECTIONS}
        </p>
        <h1 className="mt-4 font-serif text-3xl font-semibold text-[var(--color-alexander-navy)] sm:text-4xl">
          Alexander now understands your scheduling rules
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-[var(--color-alexander-muted)]">
          Alexander now understands your scheduling rules. He knows when appointments may be offered,
          what information is needed, which situations require approval, and how to handle changes,
          cancellations, capacity limits, and scheduling exceptions. This helps prevent double
          promises, unsupported availability claims, and unnecessary back-and-forth with your team.
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

        <p className="mt-6 text-sm text-[var(--color-alexander-muted)]">Next: Pricing and Payments</p>

        <div className="mx-auto mt-10 flex max-w-md flex-col gap-3">
          <PrimaryButton disabled title="Pricing and Payments (Section 5) is not available in this build yet">
            Continue to Section 5 →
          </PrimaryButton>
          <p className="text-center text-xs text-[var(--color-alexander-muted)]">
            Section 5 — Pricing and Payments — will be added in the next implementation pass.
          </p>
          <SecondaryButton onClick={() => router.push("/onboarding/sections/4/review")}>
            Review Section 4
          </SecondaryButton>
        </div>
      </ContentCard>
    </OnboardingShell>
  );
}
