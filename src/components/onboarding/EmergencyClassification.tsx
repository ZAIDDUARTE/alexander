"use client";

import type { EmergencyScenario } from "@/lib/onboarding/section3Catalog";
import type { EmergencyClassification, EmergencyClassificationState } from "@/lib/onboarding/types";

export type EmergencyClassificationLabels = Record<EmergencyClassification, string>;

const CLASSIFICATION_ORDER: EmergencyClassification[] = [
  "emergency",
  "urgent",
  "routine",
  "human_review",
];

export const EMERGENCY_CLASSIFICATION_LABELS: EmergencyClassificationLabels = {
  emergency: "Emergency",
  urgent: "Urgent, not emergency",
  routine: "Routine",
  human_review: "Human review required",
};

/**
 * Accessible 4-state control for Q26. Native radio inputs grouped by
 * `name`. Stacks to one column on mobile and wraps at `sm` and above.
 */
export function EmergencyClassificationSegmented({
  name,
  value,
  onChange,
  ariaLabel,
}: {
  name: string;
  value: EmergencyClassificationState;
  onChange: (classification: EmergencyClassification) => void;
  ariaLabel: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
      {CLASSIFICATION_ORDER.map((classification) => {
        const checked = value === classification;
        return (
          <label
            key={classification}
            className={`flex min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-center text-sm font-medium transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--color-alexander-blue)] sm:flex-1 sm:min-w-[8rem] ${
              checked
                ? "border-[var(--color-alexander-blue)] bg-[var(--color-alexander-blue)] text-white"
                : "border-[var(--color-alexander-border)] bg-white text-[var(--color-alexander-navy)] hover:border-[var(--color-alexander-blue)]/40"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={classification}
              checked={checked}
              onChange={() => onChange(classification)}
              className="sr-only"
            />
            <span>{EMERGENCY_CLASSIFICATION_LABELS[classification]}</span>
          </label>
        );
      })}
    </div>
  );
}

function EmergencyScenarioRow({
  scenario,
  value,
  onChange,
  highlightIncomplete,
}: {
  scenario: EmergencyScenario;
  value: EmergencyClassificationState;
  onChange: (classification: EmergencyClassification) => void;
  highlightIncomplete: boolean;
}) {
  const incomplete = highlightIncomplete && value === "";
  return (
    <li
      className={`rounded-lg border bg-white p-4 ${
        incomplete ? "border-[var(--color-alexander-required)]/50" : "border-[var(--color-alexander-border)]"
      }`}
    >
      <p className="mb-3 text-sm font-medium text-[var(--color-alexander-navy)]">{scenario.label}</p>
      <EmergencyClassificationSegmented
        name={`classification-${scenario.id}`}
        value={value}
        ariaLabel={scenario.label}
        onChange={onChange}
      />
    </li>
  );
}

/**
 * Q26 — full emergency-classification matrix. Each scenario is its own
 * card so long catalogs stack cleanly at every viewport (no horizontal
 * scrolling, no cramped desktop table). Owns its own group-level
 * validation message so QuestionCard does not duplicate the alert.
 */
export function EmergencyClassificationGroup({
  scenarios,
  value,
  onChange,
  highlightIncomplete = false,
  groupError,
}: {
  scenarios: readonly EmergencyScenario[];
  value: Record<string, EmergencyClassificationState>;
  onChange: (scenarioId: string, classification: EmergencyClassification) => void;
  highlightIncomplete?: boolean;
  groupError?: string;
}) {
  return (
    <div>
      <ul className="space-y-3">
        {scenarios.map((scenario) => (
          <EmergencyScenarioRow
            key={scenario.id}
            scenario={scenario}
            value={value[scenario.id] ?? ""}
            onChange={(classification) => onChange(scenario.id, classification)}
            highlightIncomplete={highlightIncomplete}
          />
        ))}
      </ul>
      {groupError && (
        <p className="mt-3 text-sm text-[var(--color-alexander-required)]" role="alert">
          {groupError}
        </p>
      )}
    </div>
  );
}
