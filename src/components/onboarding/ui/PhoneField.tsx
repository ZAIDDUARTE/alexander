"use client";

import { useEffect, useState } from "react";
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
  placeholder?: string;
};

/**
 * Shared phone input. While focused, renders a local buffer so draft reloads
 * cannot blank keystrokes. Blur commits normalizeToE164 back to the draft.
 */
export function PhoneField({ id, value, onChange, error, ariaLabel, placeholder }: Props) {
  const [focused, setFocused] = useState(false);
  const [local, setLocal] = useState(value);

  useEffect(() => {
    if (!focused) {
      setLocal(value);
    }
  }, [value, focused]);

  return (
    <div>
      <input
        id={id}
        name={id}
        type="tel"
        aria-label={ariaLabel}
        inputMode="tel"
        autoComplete="tel"
        value={focused ? local : value}
        onFocus={() => {
          setFocused(true);
          setLocal(value);
        }}
        onChange={(e) => {
          const next = sanitizePhoneInput(e.target.value);
          setLocal(next);
          onChange(next);
        }}
        onBlur={() => {
          setFocused(false);
          const trimmed = local.trim();
          if (!trimmed) {
            setLocal("");
            onChange("");
            return;
          }
          const normalized = normalizeToE164(local);
          setLocal(normalized);
          onChange(normalized);
        }}
        placeholder={placeholder ?? "+1 415 555 2671"}
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
