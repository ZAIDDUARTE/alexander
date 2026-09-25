"use client";

import { getVisitTypeMatrixServices, VISIT_TYPE_OPTIONS } from "@/lib/onboarding/section5Catalog";
import type { VisitTypeId } from "@/lib/onboarding/types";

export function VisitTypeMatrix({
  value,
  onChange,
  highlightIncomplete = false,
  rowErrors = {},
  groupError,
}: {
  value: Record<string, VisitTypeId | "">;
  onChange: (serviceId: string, visitType: VisitTypeId) => void;
  highlightIncomplete?: boolean;
  rowErrors?: Record<string, string | undefined>;
  groupError?: string;
}) {
  const services = getVisitTypeMatrixServices();
  const options = VISIT_TYPE_OPTIONS.map((o) => ({
    value: o.id as VisitTypeId,
    label: o.label,
  }));

  return (
    <div className="min-w-0">
      <ul className="min-w-0 space-y-4">
        {services.map((service) => {
          const selected = value[service.id] ?? "";
          const incomplete = highlightIncomplete && !selected;
          const rowError = rowErrors[service.id];

          return (
            <li
              key={service.id}
              className={`min-w-0 rounded-lg border bg-white p-4 ${
                incomplete
                  ? "border-[var(--color-alexander-required)]/50"
                  : "border-[var(--color-alexander-border)]"
              }`}
            >
              <p className="mb-3 text-sm font-medium text-[var(--color-alexander-navy)]">
                {service.label}
              </p>
              <ul className="min-w-0 space-y-2" role="radiogroup" aria-label={service.label}>
                {options.map((opt) => {
                  const checked = selected === opt.value;
                  return (
                    <li key={opt.value}>
                      <label
                        className={`flex min-w-0 cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                          checked
                            ? "border-[var(--color-alexander-blue)] bg-[var(--color-alexander-info-bg)]"
                            : "border-[var(--color-alexander-border)] bg-white hover:border-[var(--color-alexander-blue)]/40"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`visit-type-${service.id}`}
                          value={opt.value}
                          checked={checked}
                          onChange={() => onChange(service.id, opt.value)}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-alexander-blue)]"
                        />
                        <span className="min-w-0 text-sm text-[var(--color-alexander-navy)]">
                          {opt.label}
                        </span>
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
