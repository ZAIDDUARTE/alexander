"use client";

import { useEffect } from "react";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { ContentCard } from "@/components/onboarding/ui/Card";
import { PrimaryButton, SecondaryButton } from "@/components/onboarding/ui/Buttons";
import { useOnboarding } from "@/lib/onboarding/OnboardingContext";
import { TOTAL_SECTIONS } from "@/lib/onboarding/sections";
import { useRouter } from "next/navigation";
import { section1IsValid } from "@/lib/onboarding/validation/section1";
import { getSection1Progress } from "@/lib/onboarding/progress/section1";

const SUMMARY_ITEMS = [
  "Company identity configured",
  "Approved claims captured",
  "Office hours configured",
  "Service availability configured",
  "Call answering hours policy set",
];

export default function Section1CompletePage() {
  const { draft, saveStatus, lastSavedAt, markSectionComplete } = useOnboarding();
  const router = useRouter();
  const sectionProgress = getSection1Progress(draft.section1);

  const completedSections = draft.navigation.completedSections.includes(1)
    ? draft.navigation.completedSections
    : [...draft.navigation.completedSections, 1].sort((a, b) => a - b);

  useEffect(() => {
    if (!section1IsValid(draft.section1)) {
      router.replace("/onboarding/sections/1/form");
      return;
    }
    if (!draft.navigation.completedSections.includes(1)) {
      markSectionComplete(1);
    }
  }, [draft.section1, draft.navigation.completedSections, router, markSectionComplete]);

  return (
    <OnboardingShell
      completedSections={completedSections}
      activeSectionId={1}
      currentSectionProgress={sectionProgress}
      saveStatus={saveStatus}
      lastSavedAt={lastSavedAt}
    >
      <ContentCard className="text-center">
        <p className="text-sm font-medium tracking-wide text-[var(--color-alexander-blue)] uppercase">
          Section 1 of {TOTAL_SECTIONS}
        </p>
        <h1 className="mt-4 font-serif text-3xl font-semibold text-[var(--color-alexander-navy)] sm:text-4xl">
          Your company is now part of Alexander&apos;s foundation
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-[var(--color-alexander-muted)]">
          Your company is now part of Alexander&apos;s foundation. Alexander now understands your
          company&apos;s identity, operating hours, approved claims, and basic availability. This
          helps him represent your business accurately and communicate with callers within the
          boundaries you have established.
        </p>
        <p className="mt-4 text-sm text-[var(--color-alexander-muted)]">
          Progress: 1 of {TOTAL_SECTIONS} sections complete
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

        <p className="mt-6 text-sm text-[var(--color-alexander-muted)]">Next: Your Services</p>

        <div className="mx-auto mt-10 flex max-w-md flex-col gap-3">
          <PrimaryButton disabled title="Your Services (Section 2) is not available in this build yet">
            Continue to Section 2 →
          </PrimaryButton>
          <p className="text-center text-xs text-[var(--color-alexander-muted)]">
            Section 2 — Your Services — will be added in the next implementation pass.
          </p>
          <SecondaryButton onClick={() => router.push("/onboarding/sections/1/review")}>
            Review Section 1
          </SecondaryButton>
        </div>
      </ContentCard>
    </OnboardingShell>
  );
}
