"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlexanderLogo } from "@/components/onboarding/AlexanderLogo";
import { ContentCard } from "@/components/onboarding/ui/Card";
import { PrimaryButton, SecondaryButton } from "@/components/onboarding/ui/Buttons";

type PortalAdminView = {
  billingEmail: string | null;
  portalAdminEmail: string | null;
  portalAdminStatus: string | null;
  confirmed: boolean;
  canBeginQuestionnaire: boolean;
};

type Mode = "checkout" | "alternate";

export default function AccountOwnershipPage() {
  const router = useRouter();
  const [view, setView] = useState<PortalAdminView | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [mode, setMode] = useState<Mode>("checkout");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [checkoutConfirmed, setCheckoutConfirmed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/onboarding/portal-admin", {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!res.ok) {
          if (!cancelled) {
            setError("Sign in with your invitation link to continue.");
            setLoading(false);
          }
          return;
        }
        const data = (await res.json()) as { ok?: boolean; view?: PortalAdminView };
        if (!cancelled && data.ok && data.view) {
          setView(data.view);
          if (data.view.confirmed) {
            router.replace("/onboarding");
            return;
          }
          if (data.view.billingEmail) {
            setEmail(data.view.billingEmail);
            setConfirmEmail(data.view.billingEmail);
          }
          if (data.view.portalAdminStatus === "pending_verification") {
            setMode("alternate");
            setMessage(
              "Check your inbox for a confirmation link before continuing to the questionnaire.",
            );
          }
        }
      } catch {
        if (!cancelled) setError("Unable to load account settings.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function submit() {
    if (pending) return;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const body =
        mode === "checkout"
          ? { mode: "checkout", confirm: checkoutConfirmed }
          : { mode: "alternate", email, confirmEmail };
      if (mode === "checkout" && !checkoutConfirmed) {
        setError("Confirm that this email will manage the account.");
        setPending(false);
        return;
      }
      const res = await fetch("/api/onboarding/portal-admin", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        reason?: string;
        view?: PortalAdminView;
        verificationEmailQueued?: boolean;
      };
      if (!res.ok || !data.ok) {
        setError(humanReason(data.reason));
        setPending(false);
        return;
      }
      if (data.view?.confirmed) {
        router.push("/onboarding");
        return;
      }
      setView(data.view || null);
      if (data.verificationEmailQueued) {
        setMessage(
          "We sent a confirmation link to that address. Open it to continue setup.",
        );
      }
      setPending(false);
    } catch {
      setError("Something went wrong. Try again.");
      setPending(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
        <p className="text-[var(--color-alexander-muted)]">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
      <div className="mb-8 flex justify-center">
        <AlexanderLogo className="text-3xl" />
      </div>
      <ContentCard>
        <h1 className="font-serif text-3xl font-semibold text-[var(--color-alexander-navy)]">
          Who will manage your Alexander account?
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[var(--color-alexander-muted)]">
          We&apos;ll send your account invitation to this email address.
        </p>

        {error ? (
          <p className="mt-4 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mt-4 text-sm text-[var(--color-alexander-navy)]">{message}</p>
        ) : null}

        <fieldset className="mt-8 space-y-4">
          <legend className="sr-only">Account administrator email</legend>
          <label className="flex cursor-pointer gap-3 rounded-lg border border-[var(--color-alexander-border)] p-4">
            <input
              type="radio"
              name="admin-mode"
              checked={mode === "checkout"}
              onChange={() => {
                setMode("checkout");
                setCheckoutConfirmed(false);
              }}
              className="mt-1"
            />
            <span>
              <span className="block font-medium text-[var(--color-alexander-navy)]">
                Use the email from checkout
              </span>
              <span className="mt-1 block text-sm text-[var(--color-alexander-muted)]">
                {view?.billingEmail || "No checkout email on file"}
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer gap-3 rounded-lg border border-[var(--color-alexander-border)] p-4">
            <input
              type="radio"
              name="admin-mode"
              checked={mode === "alternate"}
              onChange={() => {
                setMode("alternate");
                setCheckoutConfirmed(false);
                setEmail("");
                setConfirmEmail("");
              }}
              className="mt-1"
            />
            <span className="font-medium text-[var(--color-alexander-navy)]">
              Use a different email address
            </span>
          </label>
        </fieldset>

        {mode === "checkout" ? (
          <label className="mt-6 flex items-start gap-3 text-sm text-[var(--color-alexander-navy)]">
            <input
              type="checkbox"
              checked={checkoutConfirmed}
              onChange={(e) => setCheckoutConfirmed(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              I confirm that <strong>{view?.billingEmail || "this email"}</strong> will manage
              this Alexander account.
            </span>
          </label>
        ) : (
          <div className="mt-6 space-y-4">
            <label className="block text-sm text-[var(--color-alexander-navy)]">
              Account email
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--color-alexander-border)] px-3 py-2"
              />
            </label>
            <label className="block text-sm text-[var(--color-alexander-navy)]">
              Confirm account email
              <input
                type="email"
                autoComplete="email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--color-alexander-border)] px-3 py-2"
              />
            </label>
            <p className="text-sm text-[var(--color-alexander-muted)]">
              We&apos;ll email a confirmation link to that address before questionnaire access.
            </p>
          </div>
        )}

        <div className="mt-8 space-y-3">
          <PrimaryButton
            disabled={pending || (mode === "checkout" && !view?.billingEmail)}
            onClick={() => void submit()}
          >
            {mode === "alternate" ? "Send confirmation email" : "Continue"}
          </PrimaryButton>
          {view?.confirmed ? (
            <SecondaryButton onClick={() => router.push("/onboarding")}>
              Go to questionnaire
            </SecondaryButton>
          ) : null}
        </div>
      </ContentCard>
    </main>
  );
}

function humanReason(reason?: string): string {
  switch (reason) {
    case "invalid_email":
      return "Enter a valid email address.";
    case "email_mismatch":
      return "The email addresses do not match.";
    case "confirmation_required":
      return "Confirm that this email will manage the account.";
    case "missing_billing_email":
      return "Checkout email is missing. Choose a different address or contact support.";
    case "email_in_use":
      return "That email is already linked to another Alexander account.";
    case "payment_not_confirmed":
      return "Payment must be verified before setting the account email.";
    case "rejected":
      return "Sign in with your invitation link to continue.";
    default:
      return "Unable to save. Try again.";
  }
}
