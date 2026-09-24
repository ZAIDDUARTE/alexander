"use client";

import { useState } from "react";

/**
 * Structured tokenized list input (Q20 ZIP codes / cities). Trims
 * duplicates and blank values per the MD's validation rule. Deliberately
 * NOT a generic freeform textarea — the value stays a real string[] so
 * downstream normalization/validation can address each token.
 */
export function TokenListField({
  id,
  label,
  value,
  onChange,
  required,
  placeholder,
  error,
  helpText,
}: {
  id: string;
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  required?: boolean;
  placeholder?: string;
  error?: string;
  helpText?: string;
}) {
  const [draft, setDraft] = useState("");

  const commit = (raw: string) => {
    const trimmed = raw.trim();
    setDraft("");
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
  };

  const remove = (token: string) => {
    onChange(value.filter((v) => v !== token));
  };

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-[var(--color-alexander-navy)]">
        {label}
        {required && (
          <span className="ml-1 text-[var(--color-alexander-required)]" aria-hidden>
            *
          </span>
        )}
      </label>
      {helpText && <p className="mt-1 text-sm text-[var(--color-alexander-muted)]">{helpText}</p>}
      {value.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {value.map((token) => (
            <li
              key={token}
              className="flex items-center gap-1.5 rounded-full border border-[var(--color-alexander-border)] bg-[var(--color-alexander-info-bg)] px-3 py-1 text-sm text-[var(--color-alexander-navy)]"
            >
              {token}
              <button
                type="button"
                onClick={() => remove(token)}
                aria-label={`Remove ${token}`}
                className="text-[var(--color-alexander-muted)] transition-colors hover:text-[var(--color-alexander-required)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-alexander-blue)]"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        id={id}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit(draft);
          }
        }}
        onBlur={() => commit(draft)}
        placeholder={placeholder}
        className={`mt-2 w-full rounded-lg border bg-white px-4 py-3 text-base text-[var(--color-alexander-navy)] placeholder:text-[var(--color-alexander-muted)]/60 focus:border-[var(--color-alexander-blue)] focus:outline-none focus:ring-2 focus:ring-[var(--color-alexander-blue)]/20 ${
          error ? "border-[var(--color-alexander-required)]" : "border-[var(--color-alexander-border)]"
        }`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <p id={`${id}-error`} className="mt-2 text-sm text-[var(--color-alexander-required)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
