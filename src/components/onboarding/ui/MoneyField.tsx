"use client";

import { normalizeMoneyInput, sanitizeMoneyInput } from "@/lib/onboarding/money";

const inputClass =
  "w-full rounded-lg border border-[var(--color-alexander-border)] bg-white py-3 pr-4 pl-8 text-base text-[var(--color-alexander-navy)] placeholder:text-[var(--color-alexander-muted)]/60 focus:border-[var(--color-alexander-blue)] focus:outline-none focus:ring-2 focus:ring-[var(--color-alexander-blue)]/20";

export function MoneyField({
  id,
  label,
  value,
  onChange,
  required,
  optional,
  helpText,
  placeholder,
  error,
  disabled = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  optional?: boolean;
  helpText?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      {label ? (
        <label htmlFor={id} className="block text-sm font-medium text-[var(--color-alexander-navy)]">
          {label}
          {required && (
            <span className="ml-1 text-[var(--color-alexander-required)]" aria-hidden>
              *
            </span>
          )}
          {optional && (
            <span className="ml-2 font-normal text-[var(--color-alexander-muted)]">(Optional)</span>
          )}
        </label>
      ) : null}
      {helpText && <p className="mt-1 text-sm text-[var(--color-alexander-muted)]">{helpText}</p>}
      <div className="relative mt-2">
        <span
          className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-base text-[var(--color-alexander-navy)]"
          aria-hidden
        >
          $
        </span>
        <input
          id={id}
          name={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(sanitizeMoneyInput(e.target.value))}
          onBlur={() => {
            const normalized = normalizeMoneyInput(value);
            if (normalized !== value) onChange(normalized);
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={`${inputClass} ${error ? "border-[var(--color-alexander-required)]" : ""} ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        />
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-2 text-sm text-[var(--color-alexander-required)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
