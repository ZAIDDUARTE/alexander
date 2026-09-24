export function RequiredBadge() {
  return (
    <span className="text-sm font-normal text-[var(--color-alexander-required)]" aria-hidden>
      *
    </span>
  );
}

export function OptionalLabel() {
  return (
    <span className="text-sm font-normal text-[var(--color-alexander-muted)]">(Optional)</span>
  );
}
