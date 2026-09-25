"use client";

import { useEffect } from "react";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { ContentCard } from "@/components/onboarding/ui/Card";
import { PrimaryButton, SecondaryButton } from "@/components/onboarding/ui/Buttons";
import { useOnboarding } from "@/lib/onboarding/OnboardingContext";
import { TOTAL_SECTIONS } from "@/lib/onboarding/sections";
import { useRouter } from "next/navigation";
import { section7IsValid } from "@/lib/onboarding/validation/section7";
import { getSection7Progress } from "@/lib/onboarding/progress/section7";
import { addCompletedSection } from "@/lib/onboarding/draft-utils";

const SUMMARY_ITEMS = [
  "Supported languages and voice selected",
  "Communication style and spoken name configured",
  "AI disclosure behavior set",
  "Pronunciation and language-switching policies recorded",
  "Optional presentation preferences captured",
];

export default function Section7CompletePage() {
  const { draft, saveStatus, lastSavedAt, markSectionComplete } = useOnboarding();
  const router = useRouter();
  const sectionProgress = getSection7Progress(draft.section7);

  const completedSections = addCompletedSection(draft.navigation.completedSections, 7);

  useEffect(() => {
    if (!section7IsValid(draft.section7)) {
      router.replace("/onboarding/sections/7/form");
      return;
    }
    if (!draft.navigation.completedSections.includes(7)) {
      markSectionComplete(7);
    }
  }, [draft.section7, draft.navigation.completedSections, router, markSectionComplete]);

  return (
    <OnboardingShell
      completedSections={completedSections}
      activeSectionId={7}
      currentSectionProgress={sectionProgress}
      saveStatus={saveStatus}
      lastSavedAt={lastSavedAt}
    >
      <ContentCard className="text-center">
        <p className="text-sm font-medium tracking-wide text-[var(--color-alexander-blue)] uppercase">
          Section 7 of {TOTAL_SECTIONS}
        </p>
        <h1 className="mt-4 font-serif text-3xl font-semibold text-[var(--color-alexander-navy)] sm:text-4xl">
          Voice and conversation saved
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-[var(--color-alexander-muted)]">
          Alexander now has a voice that fits your company. You have selected how he should sound,
          introduce himself, identify himself as an AI, handle supported languages, pronounce
          important names, and communicate with callers. These choices help Alexander feel natural
          and consistent while preserving the professional standards and safeguards built into his
          core behavior.
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

        <p className="mt-6 text-sm text-[var(--color-alexander-muted)]">
          Next: Integration Systems and Final Setup
        </p>

        <div className="mx-auto mt-10 flex max-w-md flex-col gap-3">
          <PrimaryButton onClick={() => router.push("/onboarding/sections/8/intro")}>
            Continue to Section 8 →
          </PrimaryButton>
          <SecondaryButton onClick={() => router.push("/onboarding/sections/7/review")}>
            Review Section 7
          </SecondaryButton>
        </div>
      </ContentCard>
    </OnboardingShell>
  );
}
