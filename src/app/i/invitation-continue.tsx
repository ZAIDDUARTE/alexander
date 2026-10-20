"use client";

import { useEffect, useState } from "react";
import { invitationTokenFromHash } from "@/lib/onboarding/invitation-link";

export function InvitationContinue() {
  const [token, setToken] = useState<string | null>(null);
  const [paste, setPaste] = useState("");
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const next = invitationTokenFromHash(window.location.hash);
    window.history.replaceState(null, "", "/i");
    setToken(next);
    setReady(true);
  }, []);

  async function continueInvitation(raw?: string) {
    const next = (raw ?? token ?? "").trim();
    if (!next || next.length < 32 || pending) return;
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/onboarding/invitations/redeem", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: next }),
      });
      if (!res.ok) {
        setMessage("This invitation can't be used.");
        setPending(false);
        return;
      }
      // Account ownership confirmation before the questionnaire (Preview + future Production).
      window.location.assign("/onboarding/account");
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
          ? "This page does not include an invitation in the link. Open the invitation from your email, or paste the invitation token below on this host."
          : "Continue to confirm who will manage your Alexander account, then complete the questionnaire."}
      </p>
      {!token ? (
        <label className="mt-6 block text-sm text-[var(--color-alexander-navy)]">
          Invitation token
          <input
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={paste}
            onChange={(e) => setPaste(e.target.value.trim())}
            className="mt-1 w-full rounded-lg border border-[var(--color-alexander-border)] px-3 py-2 font-mono text-sm"
            placeholder="Paste the token from your invitation email link"
          />
        </label>
      ) : null}
      <button
        type="button"
        className="mt-8 rounded-full bg-[var(--color-alexander-navy)] px-6 py-3 text-white disabled:opacity-50"
        disabled={pending || (!(token && token.length >= 32) && paste.length < 32)}
        onClick={() => {
          void continueInvitation(token || paste);
        }}
      >
        Continue
      </button>
      {message ? <p className="mt-4 text-sm text-[var(--color-alexander-muted)]">{message}</p> : null}
    </main>
  );
}
