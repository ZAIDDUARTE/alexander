import Link from "next/link";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  fullWidth?: boolean;
};

export function PrimaryButton({
  children,
  fullWidth = true,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-lg bg-[var(--color-alexander-blue)] px-6 py-3.5 text-base font-medium text-white transition-all duration-150 hover:bg-[var(--color-alexander-blue-hover)] hover:shadow-md active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-alexander-blue)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none disabled:active:scale-100 ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  fullWidth = true,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-lg border border-[var(--color-alexander-border)] bg-white px-6 py-3.5 text-base font-medium text-[var(--color-alexander-navy)] transition-all duration-150 hover:border-[var(--color-alexander-blue)]/40 hover:bg-gray-50 hover:shadow-sm active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-alexander-blue)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none disabled:active:scale-100 ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function PrimaryLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex w-full items-center justify-center rounded-lg bg-[var(--color-alexander-blue)] px-6 py-3.5 text-center text-base font-medium text-white transition-all duration-150 hover:bg-[var(--color-alexander-blue-hover)] hover:shadow-md active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-alexander-blue)] ${className}`}
    >
      {children}
    </Link>
  );
}

export function SecondaryLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex w-full items-center justify-center rounded-lg border border-[var(--color-alexander-border)] bg-white px-6 py-3.5 text-center text-base font-medium text-[var(--color-alexander-navy)] transition-all duration-150 hover:border-[var(--color-alexander-blue)]/40 hover:bg-gray-50 hover:shadow-sm active:scale-[0.99] ${className}`}
    >
      {children}
    </Link>
  );
}
