"use client";

import { Fragment } from "react";
import { ONBOARDING_SECTIONS, TOTAL_SECTIONS } from "@/lib/onboarding/sections";
import {
  getConnectorFill,
  getOverallCompletionProgress,
  getSectionNodeState,
  type NodeState,
} from "@/lib/onboarding/progress/overall";

type Props = {
  currentSection: number;
  /** Section ids that have been formally completed (banked, monotonic). */
  completedSections: number[];
  /** Fraction (0–1) of the active section's applicable questions completed. */
  currentSectionProgress?: number;
};

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
      <path
        d="M5 10.5l3 3 7-7.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ProgressNodeCircle({ id, state }: { id: number; state: NodeState }) {
  return (
    <span
      className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ring-4 ring-[var(--color-alexander-bg)] ${
        state === "current" || state === "completed"
          ? "bg-[var(--color-alexander-blue)] text-white"
          : "border border-[var(--color-alexander-border)] bg-white text-[var(--color-alexander-muted)]"
      }`}
    >
      {state === "completed" ? <CheckIcon /> : id}
    </span>
  );
}

function ProgressConnectorTrack({ fill }: { fill: number }) {
  const percent = Math.round(Math.min(1, Math.max(0, fill)) * 100);
  return (
    <div className="relative h-0.5 min-w-[1.5rem] flex-1 self-center rounded-full bg-[var(--color-alexander-border)]">
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-[var(--color-alexander-blue)] transition-[width] duration-300 ease-out"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export function OnboardingProgress({
  currentSection,
  completedSections,
  currentSectionProgress = 0,
}: Props) {
  const clampedProgress = Math.min(1, Math.max(0, currentSectionProgress));

  // Grid columns: [node] [connector] [node] [connector] ... [node]
  const gridTemplateColumns = ONBOARDING_SECTIONS.map((_, i) =>
    i === 0 ? "auto" : "1fr auto",
  ).join(" ");

  const currentLabel = ONBOARDING_SECTIONS.find((s) => s.id === currentSection)?.shortTitle;

  const overallPercent = Math.round(
    getOverallCompletionProgress({
      totalSections: TOTAL_SECTIONS,
      currentSection,
      completedSections,
      currentSectionProgress: clampedProgress,
    }) * 100,
  );

  return (
    <div className="w-full">
      <p className="mb-4 text-center text-sm text-[var(--color-alexander-muted)]">
        Progress: {completedSections.length} of {TOTAL_SECTIONS} sections complete
      </p>

      {/*
        Full 8-node + label rail needs real room: at md (768px) the two
        longest labels ("Emergencies", "Scheduling") crowd against their
        neighbors once padding/margins are subtracted. Reserve the full
        rail for lg (1024px)+ and use the compact single-bar treatment
        below that instead of a cramped node rail.
      */}
      <nav aria-label="Onboarding sections" className="hidden lg:block">
        <div
          className="grid items-center"
          style={{ gridTemplateColumns, gridTemplateRows: "2rem auto", rowGap: "0.5rem" }}
        >
          {ONBOARDING_SECTIONS.map((section, i) => {
            const state = getSectionNodeState(section.id, completedSections, currentSection);
            const nodeCol = i === 0 ? 1 : i * 2 + 1;
            const connectorFill = getConnectorFill(
              section.id,
              completedSections,
              currentSection,
              clampedProgress,
            );

            return (
              <Fragment key={section.id}>
                <div
                  style={{ gridColumn: nodeCol, gridRow: 1 }}
                  className="flex justify-center"
                >
                  <ProgressNodeCircle id={section.id} state={state} />
                </div>
                {i < ONBOARDING_SECTIONS.length - 1 && (
                  <div style={{ gridColumn: nodeCol + 1, gridRow: 1 }} className="px-1">
                    <ProgressConnectorTrack fill={connectorFill} />
                  </div>
                )}
                <div
                  style={{ gridColumn: nodeCol, gridRow: 2 }}
                  className={`whitespace-nowrap text-center text-xs leading-tight ${
                    state === "current"
                      ? "font-semibold text-[var(--color-alexander-blue)]"
                      : state === "completed"
                        ? "text-[var(--color-alexander-navy)]"
                        : "text-[var(--color-alexander-muted)]"
                  }`}
                >
                  {section.shortTitle}
                </div>
              </Fragment>
            );
          })}
        </div>
      </nav>

      {/* Below lg: compact single-bar variant — no crushed labels, no overflow */}
      <div className="lg:hidden">
        <p className="text-center text-sm font-medium text-[var(--color-alexander-navy)]">
          Section {currentSection} of {TOTAL_SECTIONS}
        </p>
        {currentLabel && (
          <p className="mt-0.5 text-center text-xs text-[var(--color-alexander-muted)]">
            {currentLabel}
          </p>
        )}
        <div
          className="mx-auto mt-3 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-[var(--color-alexander-border)]"
          role="progressbar"
          aria-label="Overall onboarding completion"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={overallPercent}
        >
          <div
            className="h-full rounded-full bg-[var(--color-alexander-blue)] transition-[width] duration-300 ease-out"
            style={{ width: `${overallPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
