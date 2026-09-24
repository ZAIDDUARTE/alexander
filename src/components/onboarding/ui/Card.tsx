export function ContentCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-[var(--color-alexander-border)] bg-white px-6 py-8 sm:px-10 sm:py-10 ${className}`}
    >
      {children}
    </div>
  );
}

export function QuestionCard({
  title,
  required,
  optional,
  helpText,
  error,
  children,
}: {
  title: string;
  required?: boolean;
  optional?: boolean;
  helpText?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="rounded-xl border border-[var(--color-alexander-border)] bg-white p-5 sm:p-6">
      <legend className="mb-1 text-base font-semibold text-[var(--color-alexander-navy)]">
        {title}
        {required && (
          <span className="ml-1 text-[var(--color-alexander-required)]" aria-hidden>
            *
          </span>
        )}
        {optional && (
          <span className="ml-2 text-sm font-normal text-[var(--color-alexander-muted)]">
            (Optional)
          </span>
        )}
      </legend>
      {helpText && (
        <p className="mb-4 text-sm text-[var(--color-alexander-muted)]">{helpText}</p>
      )}
      {children}
      {error && (
        <p className="mt-3 text-sm text-[var(--color-alexander-required)]" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}

export function ConditionalPanel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mt-4 rounded-lg border border-[var(--color-alexander-blue)]/20 bg-[var(--color-alexander-info-bg)] p-4"
    >
      {children}
    </div>
  );
}
