"use client";

import { useEffect, useState } from "react";
import { invitationTokenFromHash } from "@/lib/onboarding/invitation-link";

export function InvitationContinue() {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const next = invitationTokenFromHash(window.location.hash);
    window.history.replaceState(null, "", "/i");
    setToken(next);
    setReady(true);
  }, []);

  async function continueInvitation() {
    if (!token || pending) return;
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/onboarding/invitations/redeem", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        setMessage("This invitation can't be used.");
        setPending(false);
        return;
      }
      window.location.assign("/onboarding");
    } catch {
      setMessage("This invitation can't be used.");
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
      <h1 className="font-serif text-3xl font-semibold text-[var(--color-alexander-navy)]">
        Continue onboarding
      </h1>
      <p className="mt-4 text-base leading-relaxed text-[var(--color-alexander-muted)]">
        {ready && !token
          ? "This link does not include an invitation. Open the link from your email again."
          : "Continue to the questionnaire for this invitation."}
      </p>
      <button
        type="button"
        className="mt-8 rounded-full bg-[var(--color-alexander-navy)] px-6 py-3 text-white disabled:opacity-50"
        disabled={!token || pending}
        onClick={() => {
          void continueInvitation();
        }}
      >
        Continue
      </button>
      {message ? <p className="mt-4 text-sm text-[var(--color-alexander-muted)]">{message}</p> : null}
    </main>
  );
}
