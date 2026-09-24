"use client";

import { CALLER_TYPES } from "@/lib/onboarding/section4Catalog";
import { CALLER_PERMISSION_OPTIONS } from "@/lib/onboarding/validation/section4";
import type { CallerPermission } from "@/lib/onboarding/types";

export function CallerAuthorizationMatrix({
  value,
  onChange,
  highlightIncomplete = false,
  groupError,
  rowErrors = {},
}: {
  value: Record<string, CallerPermission[]>;
  onChange: (callerTypeId: string, permissions: CallerPermission[]) => void;
  highlightIncomplete?: boolean;
  groupError?: string;
  rowErrors?: Record<string, string | undefined>;
}) {
  const togglePermission = (callerTypeId: string, permission: CallerPermission) => {
    const current = value[callerTypeId] ?? [];
    if (permission === "not_allowed") {
      onChange(callerTypeId, current.includes("not_allowed") ? [] : ["not_allowed"]);
      return;
    }
    let next = current.filter((p) => p !== "not_allowed");
    if (next.includes(permission)) {
      next = next.filter((p) => p !== permission);
    } else {
      next = [...next, permission];
    }
    onChange(callerTypeId, next);
  };

  return (
    <div>
      <ul className="space-y-4">
        {CALLER_TYPES.map((row) => {
          const permissions = value[row.id] ?? [];
          const incomplete = highlightIncomplete && permissions.length === 0;
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
              <p className="mb-3 text-sm font-medium text-[var(--color-alexander-navy)]">{row.label}</p>
              <ul className="space-y-2" role="group" aria-label={row.label}>
                {CALLER_PERMISSION_OPTIONS.map((opt) => {
                  const checked = permissions.includes(opt.value);
                  return (
                    <li key={opt.value}>
                      <label
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                          checked
                            ? "border-[var(--color-alexander-blue)] bg-[var(--color-alexander-info-bg)]"
                            : "border-[var(--color-alexander-border)] bg-white hover:border-[var(--color-alexander-blue)]/40"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePermission(row.id, opt.value)}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-alexander-blue)]"
                        />
                        <span className="text-sm text-[var(--color-alexander-navy)]">{opt.label}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
              {rowError && (
                <p className="mt-2 text-sm text-[var(--color-alexander-required)]" role="alert">
                  {rowError}
                </p>
              )}
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
