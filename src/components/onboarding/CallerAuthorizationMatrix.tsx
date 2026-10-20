"use client";

import { CALLER_TYPES } from "@/lib/onboarding/section4Catalog";
import { CALLER_AUTHORITY_OPTIONS } from "@/lib/onboarding/stage3Migration";
import type { CallerAuthority } from "@/lib/onboarding/types";
import { RadioGroup } from "./ui/RadioGroup";

export function CallerAuthorizationMatrix({
  value,
  onChange,
  highlightIncomplete = false,
  groupError,
  rowErrors = {},
}: {
  value: Record<string, CallerAuthority | "">;
  onChange: (callerTypeId: string, authority: CallerAuthority) => void;
  highlightIncomplete?: boolean;
  groupError?: string;
  rowErrors?: Record<string, string | undefined>;
}) {
  return (
    <div>
      <ul className="space-y-4">
        {CALLER_TYPES.map((row) => {
          const authority = value[row.id] ?? "";
          const incomplete = highlightIncomplete && authority === "";
          const rowError = rowErrors[row.id];

          return (
            <li
              key={row.id}
              className={`rounded-lg border bg-white p-4 ${
                incomplete
                  ? "border-[var(--color-alexander-required)]/50"
                  : "border-[var(--color-alexander-border)]"
              }`}
            >
              <p className="mb-1 text-sm font-medium text-[var(--color-alexander-navy)]">{row.label}</p>
              <RadioGroup
                name={`caller-authority-${row.id}`}
                options={CALLER_AUTHORITY_OPTIONS}
                value={authority}
                onChange={(next) => onChange(row.id, next)}
                error={rowError}
              />
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
