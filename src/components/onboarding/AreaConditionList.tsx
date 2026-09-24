"use client";

import type { ConditionalTerritoryEntry } from "@/lib/onboarding/types";
import { TextField } from "./ui/Fields";
import { SecondaryButton } from "./ui/Buttons";

function createTerritoryId(): string {
  return `territory-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Repeatable "Area + Conditions" cards (Q23) — each rule stays bound to
 * the exact territory it modifies, rather than one generic notes box.
 */
export function AreaConditionList({
  value,
  onChange,
  error,
}: {
  value: ConditionalTerritoryEntry[];
  onChange: (next: ConditionalTerritoryEntry[]) => void;
  error?: string;
}) {
  const update = (id: string, patch: Partial<ConditionalTerritoryEntry>) => {
    onChange(value.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
  };

  const remove = (id: string) => {
    onChange(value.filter((entry) => entry.id !== id));
  };

  const add = () => {
    onChange([...value, { id: createTerritoryId(), area: "", condition: "" }]);
  };

  return (
    <div className="space-y-3">
      {value.map((entry, index) => (
        <div key={entry.id} className="rounded-lg border border-[var(--color-alexander-border)] bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[var(--color-alexander-navy)]">Area {index + 1}</p>
            <button
              type="button"
              onClick={() => remove(entry.id)}
              className="text-sm text-[var(--color-alexander-muted)] transition-colors hover:text-[var(--color-alexander-required)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-alexander-blue)]"
            >
              Remove
            </button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <TextField
              id={`territory-${entry.id}-area`}
              label="Area"
              value={entry.area}
              onChange={(v) => update(entry.id, { area: v })}
              placeholder="Rosamond"
            />
            <TextField
              id={`territory-${entry.id}-condition`}
              label="Condition"
              value={entry.condition}
              onChange={(v) => update(entry.id, { condition: v })}
              placeholder="$75 travel fee"
            />
          </div>
        </div>
      ))}
      <SecondaryButton fullWidth={false} onClick={add}>
        + Add area
      </SecondaryButton>
      {error && (
        <p className="text-sm text-[var(--color-alexander-required)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
