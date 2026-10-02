"use client";

const inputClass =
  "mt-2 w-full rounded-lg border border-[var(--color-alexander-border)] bg-white px-4 py-3 text-base text-[var(--color-alexander-navy)] placeholder:text-[var(--color-alexander-muted)]/60 focus:border-[var(--color-alexander-blue)] focus:outline-none focus:ring-2 focus:ring-[var(--color-alexander-blue)]/20";

export function TextField({
  id,
  label,
  value,
  onChange,
  required,
  optional,
  helpText,
  placeholder,
  error,
  type = "text",
  disabled = false,
  ariaLabel,
  autoComplete,
  list,
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
  type?: string;
  disabled?: boolean;
  ariaLabel?: string;
  autoComplete?: string;
  list?: string;
}) {
  return (
    <div>
      {label ? (
        <label htmlFor={id} className="block text-sm font-medium text-[var(--color-alexander-navy)]">
          {label}
          {required && (
            <span className="ml-1 text-[var(--color-alexander-required)]" aria-hidden>*</span>
          )}
          {optional && (
            <span className="ml-2 font-normal text-[var(--color-alexander-muted)]">(Optional)</span>
          )}
        </label>
      ) : null}
      {helpText && (
        <p className="mt-1 text-sm text-[var(--color-alexander-muted)]">{helpText}</p>
      )}
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        list={list}
        aria-label={label ? undefined : ariaLabel}
        className={`${inputClass} ${error ? "border-[var(--color-alexander-required)]" : ""} ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
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

export function TextareaField({
  id,
  label,
  value,
  onChange,
  required,
  optional,
  helpText,
  placeholder,
  error,
  rows = 4,
  ariaLabel,
  autoComplete,
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
  rows?: number;
  ariaLabel?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      {label ? (
        <label htmlFor={id} className="block text-sm font-medium text-[var(--color-alexander-navy)]">
          {label}
          {required && (
            <span className="ml-1 text-[var(--color-alexander-required)]" aria-hidden>*</span>
          )}
          {optional && (
            <span className="ml-2 font-normal text-[var(--color-alexander-muted)]">(Optional)</span>
          )}
        </label>
      ) : null}
      {helpText && (
        <p className="mt-1 text-sm text-[var(--color-alexander-muted)]">{helpText}</p>
      )}
      <textarea
        id={id}
        name={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-label={label ? undefined : ariaLabel}
        className={`${inputClass} resize-y min-h-[100px] ${error ? "border-[var(--color-alexander-required)]" : ""}`}
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
