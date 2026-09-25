"use client";

import { useEffect } from "react";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { ContentCard } from "@/components/onboarding/ui/Card";
import { PrimaryButton, SecondaryButton } from "@/components/onboarding/ui/Buttons";
import { useOnboarding } from "@/lib/onboarding/OnboardingContext";
import { TOTAL_SECTIONS } from "@/lib/onboarding/sections";
import { useRouter } from "next/navigation";
import { section5IsValid } from "@/lib/onboarding/validation/section5";
import { getSection5Progress } from "@/lib/onboarding/progress/section5";
import { addCompletedSection } from "@/lib/onboarding/draft-utils";

const SUMMARY_ITEMS = [
  "Pricing models and material markup policies set",
  "Fees, travel, and area minimum charges configured",
  "Visit types and service pricing rules defined",
  "Forbidden pricing statements selected",
  "Promotions, payment methods, and due policies set",
  "Financing and financial remedy authority configured",
];

export default function Section5CompletePage() {
  const { draft, saveStatus, lastSavedAt, markSectionComplete } = useOnboarding();
  const router = useRouter();
  const sectionProgress = getSection5Progress(
    draft.section5,
    draft.section2,
    draft.contacts,
    draft.fees,
  );

  const completedSections = addCompletedSection(draft.navigation.completedSections, 5);

  useEffect(() => {
    if (
      !section5IsValid(
        draft.section5,
        draft.section2,
        draft.contacts,
        draft.fees,
        draft.section4,
      )
    ) {
      router.replace("/onboarding/sections/5/form");
      return;
    }
    if (!draft.navigation.completedSections.includes(5)) {
      markSectionComplete(5);
    }
  }, [
    draft.section5,
    draft.section2,
    draft.section4,
    draft.contacts,
    draft.fees,
    draft.navigation.completedSections,
    router,
    markSectionComplete,
  ]);

  return (
    <OnboardingShell
      completedSections={completedSections}
      activeSectionId={5}
      currentSectionProgress={sectionProgress}
      saveStatus={saveStatus}
      lastSavedAt={lastSavedAt}
    >
      <ContentCard className="text-center">
        <p className="text-sm font-medium tracking-wide text-[var(--color-alexander-blue)] uppercase">
          Section 5 of {TOTAL_SECTIONS}
        </p>
        <h1 className="mt-4 font-serif text-3xl font-semibold text-[var(--color-alexander-navy)] sm:text-4xl">
          Alexander now understands your financial boundaries
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-[var(--color-alexander-muted)]">
          Alexander now understands your financial boundaries. He knows which fees and payment
          information he may explain, which prices require an estimate or human review, and which
          discounts, credits, refunds, or exceptions require authorization. This helps Alexander
          provide useful information without making financial promises your company has not
          approved.
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

        <p className="mt-6 text-sm text-[var(--color-alexander-muted)]">Next: Customer Care</p>

        <div className="mx-auto mt-10 flex max-w-md flex-col gap-3">
          <PrimaryButton disabled title="Customer Care (Section 6) is not available in this build yet">
            Continue to Section 6 →
          </PrimaryButton>
          <p className="text-center text-xs text-[var(--color-alexander-muted)]">
            Section 6 — Customer Care — will be added in the next implementation pass.
          </p>
          <SecondaryButton onClick={() => router.push("/onboarding/sections/5/review")}>
            Review Section 5
          </SecondaryButton>
        </div>
      </ContentCard>
    </OnboardingShell>
  );
}
