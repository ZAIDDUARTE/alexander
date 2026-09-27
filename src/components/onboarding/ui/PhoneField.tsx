"use client";

import {
  normalizeToE164,
  sanitizePhoneInput,
} from "@/lib/onboarding/phone";

const inputClass =
  "mt-2 w-full rounded-lg border border-[var(--color-alexander-border)] bg-white px-4 py-3 text-base text-[var(--color-alexander-navy)] placeholder:text-[var(--color-alexander-muted)]/60 focus:border-[var(--color-alexander-blue)] focus:outline-none focus:ring-2 focus:ring-[var(--color-alexander-blue)]/20";

type Props = {
  id: string;
  value: string;
  onChange: (e164OrEmpty: string) => void;
  error?: string;
  ariaLabel?: string;
};

export function PhoneField({ id, value, onChange, error, ariaLabel }: Props) {
  return (
    <div>
      <input
        id={id}
        name={id}
        type="tel"
        aria-label={ariaLabel}
        inputMode="tel"
        autoComplete="tel"
        value={value}
        onChange={(e) => onChange(sanitizePhoneInput(e.target.value))}
        onBlur={() => {
          if (!value.trim()) return;
          onChange(normalizeToE164(value));
        }}
        placeholder="+1 415 555 2671"
        className={`${inputClass} ${error ? "border-[var(--color-alexander-required)]" : ""}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <p
          id={`${id}-error`}
          className="mt-2 text-sm text-[var(--color-alexander-required)]"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
