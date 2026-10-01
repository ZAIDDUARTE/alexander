"use client";

import type {
  AfterHoursCallClass,
  AfterHoursDisposition,
  AfterHoursDispositionOption,
} from "@/lib/onboarding/types";

const ROW_ORDER: AfterHoursCallClass[] = ["emergency", "urgent_contained", "routine"];

export const AFTER_HOURS_CALL_CLASS_LABELS: Record<AfterHoursCallClass, string> = {
  emergency: "Emergency",
  urgent_contained: "Urgent, but not an emergency",
  routine: "Routine / non-urgent",
};

export const AFTER_HOURS_DISPOSITION_OPTIONS: { value: AfterHoursDispositionOption; label: string }[] = [
  { value: "contact_on_call", label: "Contact our on-call team" },
  { value: "schedule_service", label: "Schedule service" },
  { value: "take_message", label: "Take a message for follow-up" },
];

const selectClass =
  "mt-2 w-full rounded-lg border border-[var(--color-alexander-border)] bg-white px-3 py-2.5 text-sm text-[var(--color-alexander-navy)] focus:border-[var(--color-alexander-blue)] focus:outline-none focus:ring-2 focus:ring-[var(--color-alexander-blue)]/20";

/**
 * Q28 — three-row dropdown matrix. The MD explicitly corrected this
 * question away from wide radio-button rows to one dropdown per row,
 * so this deliberately does NOT reuse the segmented/radio pattern used
 * elsewhere in Section 2/3.
 */
export function AfterHoursDispositionMatrix({
  value,
  onChange,
  highlightIncomplete = false,
  groupError,
}: {
  value: AfterHoursDisposition;
  onChange: (row: AfterHoursCallClass, option: AfterHoursDispositionOption) => void;
  highlightIncomplete?: boolean;
  groupError?: string;
}) {
  return (
    <div>
      <ul className="space-y-3">
        {ROW_ORDER.map((row) => {
          const rowValue = value[row];
          const incomplete = highlightIncomplete && rowValue === "";
          return (
            <li
              key={row}
              className={`rounded-lg border bg-white p-4 ${
                incomplete
                  ? "border-[var(--color-alexander-required)]/50"
                  : "border-[var(--color-alexander-border)]"
              }`}
            >
              <label
                htmlFor={`after-hours-${row}`}
                className="block text-sm font-medium text-[var(--color-alexander-navy)]"
              >
                {AFTER_HOURS_CALL_CLASS_LABELS[row]}
              </label>
              <select
                id={`after-hours-${row}`}
                value={rowValue}
                onChange={(e) => onChange(row, e.target.value as AfterHoursDispositionOption)}
                className={selectClass}
              >
                {AFTER_HOURS_DISPOSITION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </li>
          );
        })}
      </ul>
      {groupError && (
        <p className="mt-3 text-sm text-[var(--color-alexander-required)]" role="alert">
          {groupError}
        </p>
      )}
    </div>
  );
}
