"use client";

import { AlexanderLogo } from "./AlexanderLogo";
import { OnboardingProgress } from "./OnboardingProgress";
import { SaveStatusIndicator } from "./SaveStatus";
import type { SaveStatus } from "@/lib/onboarding/persistence";

type Props = {
  children: React.ReactNode;
  /** Section ids that have been formally completed (banked, monotonic). */
  completedSections: number[];
  activeSectionId?: number;
  /** Fraction (0–1) of the active section's applicable questions completed. */
  currentSectionProgress?: number;
  showProgress?: boolean;
  saveStatus?: SaveStatus;
  lastSavedAt?: Date | null;
};

export function OnboardingShell({
  children,
  completedSections,
  activeSectionId = 1,
  currentSectionProgress = 0,
  showProgress = true,
  saveStatus = "idle",
  lastSavedAt = null,
}: Props) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-alexander-bg)]">
      <header className="border-b border-[var(--color-alexander-border)] bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <AlexanderLogo />
          <div className="flex items-center gap-4">
            <SaveStatusIndicator status={saveStatus} lastSavedAt={lastSavedAt} />
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-alexander-border)] text-sm text-[var(--color-alexander-muted)] transition-colors duration-150 hover:border-[var(--color-alexander-blue)]/40 hover:text-[var(--color-alexander-blue)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-alexander-blue)]"
              aria-label="Help"
            >
              ?
            </button>
          </div>
        </div>
      </header>

      {showProgress && (
        <div className="mx-auto w-full max-w-4xl px-4 pt-8 sm:px-6">
          <OnboardingProgress
            currentSection={activeSectionId}
            completedSections={completedSections}
            currentSectionProgress={currentSectionProgress}
          />
        </div>
      )}

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}
