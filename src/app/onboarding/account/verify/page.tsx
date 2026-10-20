"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlexanderLogo } from "@/components/onboarding/AlexanderLogo";
import { ContentCard } from "@/components/onboarding/ui/Card";
import { PrimaryButton } from "@/components/onboarding/ui/Buttons";

export default function PortalAdminVerifyPage() {
  const [status, setStatus] = useState<"working" | "ok" | "failed">("working");
  const [message, setMessage] = useState("Confirming your account email…");

  useEffect(() => {
    const raw = window.location.hash.replace(/^#/, "").trim();
    window.history.replaceState(null, "", "/onboarding/account/verify");
    if (!raw || raw.length < 32) {
      setStatus("failed");
      setMessage("This confirmation link is incomplete. Open the link from your email again.");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/onboarding/portal-admin/verify", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: raw }),
        });
        if (cancelled) return;
        if (!res.ok) {
          setStatus("failed");
          setMessage("This confirmation link is invalid or has expired.");
          return;
        }
        setStatus("ok");
        setMessage("Your account email is confirmed. You can continue onboarding.");
      } catch {
        if (!cancelled) {
          setStatus("failed");
          setMessage("Unable to confirm this email right now. Try again shortly.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
      <div className="mb-8 flex justify-center">
        <AlexanderLogo className="text-3xl" />
      </div>
      <ContentCard>
        <h1 className="font-serif text-3xl font-semibold text-[var(--color-alexander-navy)]">
          Account email
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[var(--color-alexander-muted)]">
          {message}
        </p>
        {status === "ok" ? (
          <div className="mt-8">
            <Link href="/onboarding">
              <PrimaryButton>Continue to questionnaire</PrimaryButton>
            </Link>
          </div>
        ) : null}
      </ContentCard>
    </main>
  );
}
