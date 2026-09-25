"use client";

type Option<T extends string> = { value: T; label: string; disabled?: boolean };

export function RadioGroup<T extends string>({
  name,
  options,
  value,
  onChange,
  error,
}: {
  name: string;
  options: Option<T>[];
  value: T | "";
  onChange: (v: T) => void;
  error?: string;
}) {
  return (
    <div role="radiogroup" aria-label={name}>
      <ul className="mt-3 space-y-2">
        {options.map((opt) => {
          const checked = value === opt.value;
          const disabled = Boolean(opt.disabled);
          return (
            <li key={opt.value}>
              <label
                className={`flex items-start gap-3 rounded-lg border px-4 py-3 transition-colors ${
                  disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                } ${
                  checked
                    ? "border-[var(--color-alexander-blue)] bg-[var(--color-alexander-info-bg)]"
                    : "border-[var(--color-alexander-border)] bg-white hover:border-[var(--color-alexander-blue)]/40"
                }`}
              >
                <input
                  type="radio"
                  name={name}
                  value={opt.value}
                  checked={checked}
                  disabled={disabled}
                  onChange={() => {
                    if (!disabled) onChange(opt.value);
                  }}
                  className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-alexander-blue)]"
                />
                <span className="text-sm text-[var(--color-alexander-navy)]">{opt.label}</span>
              </label>
            </li>
          );
        })}
      </ul>
      {error && (
        <p className="mt-3 text-sm text-[var(--color-alexander-required)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
