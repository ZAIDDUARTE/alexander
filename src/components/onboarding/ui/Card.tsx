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

/**
 * Question-level card. Prefer leaving `error` unset when a child
 * control (TextField, RadioGroup, CheckboxGroup, PhoneField,
 * ServicePolicyGroup, etc.) already owns and renders the same
 * validation message — otherwise the alert appears twice with
 * duplicate `role="alert"`. Use `error` only for genuinely
 * question-level cross-field states that no leaf renders.
 */
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
    <div
      className="question-card rounded-xl border border-[var(--color-alexander-border)] bg-white p-5 sm:p-6"
    >
      <fieldset className="min-w-0 border-0 p-0">
        <legend className="float-none mb-3 block w-full text-base font-semibold leading-snug text-[var(--color-alexander-navy)]">
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
          <p className="mb-4 text-sm leading-relaxed text-[var(--color-alexander-muted)]">{helpText}</p>
        )}
        <div className="min-w-0 space-y-4">{children}</div>
        {error && (
          <p className="mt-3 text-sm text-[var(--color-alexander-required)]" role="alert">
            {error}
          </p>
        )}
      </fieldset>
    </div>
  );
}

export function ConditionalPanel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mt-5 rounded-lg border border-[var(--color-alexander-blue)]/20 bg-[var(--color-alexander-info-bg)] p-4 sm:p-5"
    >
      {children}
    </div>
  );
}
