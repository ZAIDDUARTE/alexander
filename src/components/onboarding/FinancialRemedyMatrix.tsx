"use client";

import {
  FINANCIAL_REMEDY_ROWS,
  REMEDY_AUTHORITY_OPTIONS,
} from "@/lib/onboarding/section5Catalog";
import type { RemedyAuthority, RemedyId } from "@/lib/onboarding/types";
import { ConditionalPanel } from "./ui/Card";
import { TextareaField } from "./ui/Fields";

function RemedyAuthoritySegmented({
  name,
  value,
  onChange,
  ariaLabel,
}: {
  name: string;
  value: RemedyAuthority | "";
  onChange: (authority: RemedyAuthority) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="grid min-w-0 grid-cols-1 gap-2 lg:grid-cols-3"
    >
      {REMEDY_AUTHORITY_OPTIONS.map((opt) => {
        const checked = value === opt.id;
        return (
          <label
            key={opt.id}
            className={`flex min-w-0 cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-center text-sm font-medium transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--color-alexander-blue)] ${
              checked
                ? "border-[var(--color-alexander-blue)] bg-[var(--color-alexander-blue)] text-white"
                : "border-[var(--color-alexander-border)] bg-white text-[var(--color-alexander-navy)] hover:border-[var(--color-alexander-blue)]/40"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={opt.id}
              checked={checked}
              onChange={() => onChange(opt.id as RemedyAuthority)}
              className="sr-only"
            />
            <span className="min-w-0">{opt.label}</span>
          </label>
        );
      })}
    </div>
  );
}

export function FinancialRemedyMatrix({
  remedyAuthority,
  remedyRules,
  onAuthorityChange,
  onRuleChange,
  highlightIncomplete = false,
  errors = {},
}: {
  remedyAuthority: Record<RemedyId, RemedyAuthority | "">;
  remedyRules: Record<RemedyId, string>;
  onAuthorityChange: (remedyId: RemedyId, authority: RemedyAuthority) => void;
  onRuleChange: (remedyId: RemedyId, rule: string) => void;
  highlightIncomplete?: boolean;
  errors?: Record<string, string | undefined>;
}) {
  const groupError = errors.remedyAuthority;

  return (
    <div className="min-w-0">
      <ul className="min-w-0 space-y-4">
        {FINANCIAL_REMEDY_ROWS.map((row) => {
          const remedyId = row.id as RemedyId;
          const authority = remedyAuthority[remedyId] ?? "";
          const incomplete = highlightIncomplete && !authority;
          const ruleError = errors[`remedyRules.${remedyId}`];

          return (
            <li
              key={row.id}
              className={`min-w-0 rounded-lg border bg-white p-4 ${
                incomplete
                  ? "border-[var(--color-alexander-required)]/50"
                  : "border-[var(--color-alexander-border)]"
              }`}
            >
              <p className="mb-3 text-sm font-medium text-[var(--color-alexander-navy)]">
                {row.label}
              </p>
              <RemedyAuthoritySegmented
                name={`remedy-authority-${row.id}`}
                value={authority}
                ariaLabel={row.label}
                onChange={(a) => onAuthorityChange(remedyId, a)}
              />
              {authority === "within_rules" && (
                <ConditionalPanel>
                  <TextareaField
                    id={`remedy-rule-${row.id}`}
                    label="Rules or limits for this remedy"
                    required
                    rows={2}
                    value={remedyRules[remedyId] ?? ""}
                    onChange={(v) => onRuleChange(remedyId, v)}
                    error={ruleError}
                  />
                </ConditionalPanel>
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
