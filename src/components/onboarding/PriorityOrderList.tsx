"use client";

import { NO_AVAILABILITY_FALLBACK_OPTIONS } from "@/lib/onboarding/section4Catalog";
import type { NoAvailabilityFallbackId } from "@/lib/onboarding/types";
import { SecondaryButton } from "./ui/Buttons";

function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function PriorityOrderList({
  value,
  onChange,
  error,
}: {
  value: NoAvailabilityFallbackId[];
  onChange: (next: NoAvailabilityFallbackId[]) => void;
  error?: string;
}) {
  const inOrder = new Set(value);
  const pool = NO_AVAILABILITY_FALLBACK_OPTIONS.filter((o) => !inOrder.has(o.id as NoAvailabilityFallbackId));

  const add = (id: NoAvailabilityFallbackId) => {
    onChange([...value, id]);
  };

  const remove = (id: NoAvailabilityFallbackId) => {
    onChange(value.filter((v) => v !== id));
  };

  const labelFor = (id: NoAvailabilityFallbackId) =>
    NO_AVAILABILITY_FALLBACK_OPTIONS.find((o) => o.id === id)?.label ?? id;

  return (
    <div className="space-y-6">
      {pool.length > 0 && (
        <div>
          <p className="text-sm font-medium text-[var(--color-alexander-navy)]">Add to priority order</p>
          <ul className="mt-2 flex flex-col gap-2">
            {pool.map((opt) => (
              <li key={opt.id}>
                <SecondaryButton fullWidth={false} onClick={() => add(opt.id as NoAvailabilityFallbackId)}>
                  + {opt.label}
                </SecondaryButton>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="text-sm font-medium text-[var(--color-alexander-navy)]">Priority order (first = highest)</p>
        {value.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--color-alexander-muted)]">
            Add options above to set your fallback priority.
          </p>
        ) : (
          <ol className="mt-3 space-y-2">
            {value.map((id, index) => (
              <li
                key={id}
                className="flex flex-col gap-2 rounded-lg border border-[var(--color-alexander-border)] bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="text-sm text-[var(--color-alexander-navy)]">
                  <span className="font-medium text-[var(--color-alexander-muted)]">{index + 1}.</span>{" "}
                  {labelFor(id)}
                </span>
                <div className="flex flex-wrap gap-2">
                  <SecondaryButton
                    fullWidth={false}
                    disabled={index === 0}
                    onClick={() => onChange(moveItem(value, index, index - 1))}
                    aria-label={`Move ${labelFor(id)} up`}
                  >
                    Move up
                  </SecondaryButton>
                  <SecondaryButton
                    fullWidth={false}
                    disabled={index === value.length - 1}
                    onClick={() => onChange(moveItem(value, index, index + 1))}
                    aria-label={`Move ${labelFor(id)} down`}
                  >
                    Move down
                  </SecondaryButton>
                  <button
                    type="button"
                    onClick={() => remove(id)}
                    className="rounded-lg px-3 py-2 text-sm text-[var(--color-alexander-muted)] transition-colors hover:text-[var(--color-alexander-required)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-alexander-blue)]"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {error && (
        <p className="text-sm text-[var(--color-alexander-required)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
