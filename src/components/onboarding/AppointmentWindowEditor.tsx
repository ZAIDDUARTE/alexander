"use client";

import type { AppointmentWindow } from "@/lib/onboarding/types";
import { TIME_OPTIONS, formatTime12h } from "@/lib/onboarding/schedule";
import { TextField } from "./ui/Fields";
import { SecondaryButton } from "./ui/Buttons";

const selectClass =
  "mt-2 w-full rounded-lg border border-[var(--color-alexander-border)] bg-white px-3 py-2.5 text-sm text-[var(--color-alexander-navy)] focus:border-[var(--color-alexander-blue)] focus:outline-none focus:ring-2 focus:ring-[var(--color-alexander-blue)]/20";

function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function AppointmentWindowEditor({
  value,
  onChange,
  errors = {},
  groupError,
}: {
  value: AppointmentWindow[];
  onChange: (next: AppointmentWindow[]) => void;
  errors?: Record<string, string | undefined>;
  groupError?: string;
}) {
  const update = (id: string, patch: Partial<AppointmentWindow>) => {
    onChange(value.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  };

  return (
    <div className="space-y-4">
      {value.map((window, index) => {
        const timesError = errors[`appointmentWindows.${window.id}.times`];
        const overlapErrors = Object.entries(errors)
          .filter(([key]) => key.startsWith("appointmentWindows.overlap.") && key.includes(window.id))
          .map(([, msg]) => msg)
          .filter(Boolean);

        return (
          <div
            key={window.id}
            className="rounded-lg border border-[var(--color-alexander-border)] bg-white p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-[var(--color-alexander-navy)]">
                Window {index + 1}
              </p>
              <div className="flex flex-wrap gap-2">
                <SecondaryButton
                  fullWidth={false}
                  disabled={index === 0}
                  onClick={() => onChange(moveItem(value, index, index - 1))}
                  aria-label={`Move ${window.label || "window"} up`}
                >
                  Move up
                </SecondaryButton>
                <SecondaryButton
                  fullWidth={false}
                  disabled={index === value.length - 1}
                  onClick={() => onChange(moveItem(value, index, index + 1))}
                  aria-label={`Move ${window.label || "window"} down`}
                >
                  Move down
                </SecondaryButton>
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <TextField
                id={`window-label-${window.id}`}
                label="Window label"
                value={window.label}
                onChange={(v) => update(window.id, { label: v })}
              />
              <div className="flex items-end">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-alexander-navy)]">
                  <input
                    type="checkbox"
                    checked={window.enabled}
                    onChange={(e) => update(window.id, { enabled: e.target.checked })}
                    className="h-4 w-4 accent-[var(--color-alexander-blue)]"
                  />
                  Offer this window
                </label>
              </div>
            </div>

            {window.enabled && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor={`window-start-${window.id}`}
                    className="block text-sm font-medium text-[var(--color-alexander-navy)]"
                  >
                    Start time
                    <span className="ml-1 text-[var(--color-alexander-required)]" aria-hidden>*</span>
                  </label>
                  <select
                    id={`window-start-${window.id}`}
                    value={window.start}
                    onChange={(e) => update(window.id, { start: e.target.value })}
                    className={selectClass}
                  >
                    <option value="">Select…</option>
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {formatTime12h(t)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor={`window-end-${window.id}`}
                    className="block text-sm font-medium text-[var(--color-alexander-navy)]"
                  >
                    End time
                    <span className="ml-1 text-[var(--color-alexander-required)]" aria-hidden>*</span>
                  </label>
                  <select
                    id={`window-end-${window.id}`}
                    value={window.end}
                    onChange={(e) => update(window.id, { end: e.target.value })}
                    className={selectClass}
                  >
                    <option value="">Select…</option>
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {formatTime12h(t)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {timesError && (
              <p className="mt-2 text-sm text-[var(--color-alexander-required)]" role="alert">
                {timesError}
              </p>
            )}
            {overlapErrors.map((msg, i) => (
              <p key={i} className="mt-2 text-sm text-[var(--color-alexander-required)]" role="alert">
                {msg}
              </p>
            ))}
          </div>
        );
      })}
      {groupError && (
        <p className="text-sm text-[var(--color-alexander-required)]" role="alert">
          {groupError}
        </p>
      )}
    </div>
  );
}
