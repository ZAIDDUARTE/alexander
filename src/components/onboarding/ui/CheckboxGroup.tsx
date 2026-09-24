"use client";

type Option<T extends string> = { value: T; label: string };

export function CheckboxGroup<T extends string>({
  name,
  options,
  value,
  onChange,
  error,
}: {
  name: string;
  options: Option<T>[];
  value: T[];
  onChange: (next: T[]) => void;
  error?: string;
}) {
  const toggle = (opt: T) => {
    if (opt === ("none" as T)) {
      onChange(value.includes("none" as T) ? [] : [opt]);
      return;
    }
    let next = value.filter((v) => v !== ("none" as T));
    if (next.includes(opt)) {
      next = next.filter((v) => v !== opt);
    } else {
      next = [...next, opt];
    }
    onChange(next);
  };

  return (
    <div role="group" aria-labelledby={`${name}-legend`}>
      <ul className="mt-3 space-y-2">
        {options.map((opt) => {
          const checked = value.includes(opt.value);
          return (
            <li key={opt.value}>
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-colors ${
                  checked
                    ? "border-[var(--color-alexander-blue)] bg-[var(--color-alexander-info-bg)]"
                    : "border-[var(--color-alexander-border)] bg-white hover:border-[var(--color-alexander-blue)]/40"
                }`}
              >
                <input
                  type="checkbox"
                  name={name}
                  value={opt.value}
                  checked={checked}
                  onChange={() => toggle(opt.value)}
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
