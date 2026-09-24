"use client";

import type { SaveStatus as Status } from "@/lib/onboarding/persistence";

type Props = {
  status: Status;
  lastSavedAt: Date | null;
};

export function SaveStatusIndicator({ status, lastSavedAt }: Props) {
  if (status === "idle") return null;

  let text = "Saving…";
  if (status === "saved" && lastSavedAt) {
    text = `Saved just now`;
  } else if (status === "server-pending") {
    text = "Not saved to server yet";
  } else if (status === "error") {
    text = "Could not save";
  }

  return (
    <p
      className="text-xs text-[var(--color-alexander-muted)]"
      role="status"
      aria-live="polite"
    >
      {text}
    </p>
  );
}
