"use client";

import type { Contact } from "@/lib/onboarding/types";
import { SecondaryButton } from "./ui/Buttons";

/**
 * Reusable existing-contact selector (Q38 here; suitable for future
 * sections). Shows only the contacts relevant/active in the current
 * context (caller decides which subset of the registry to pass in —
 * e.g. excluding a backup contact that Q32 currently answers "No").
 * "+ Add another contact" is a deliberate, explicit action — it does
 * not create anything on its own; the caller's `onAddNew` decides.
 */
export function ContactPicker({
  name,
  contacts,
  value,
  onSelect,
  onAddNew,
  error,
}: {
  name: string;
  contacts: Contact[];
  value: string;
  onSelect: (contactId: string) => void;
  onAddNew: () => void;
  error?: string;
}) {
  return (
    <div>
      <div role="radiogroup" aria-label={name}>
        <ul className="space-y-2">
          {contacts.map((contact) => {
            const checked = value === contact.id;
            return (
              <li key={contact.id}>
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                    checked
                      ? "border-[var(--color-alexander-blue)] bg-[var(--color-alexander-info-bg)]"
                      : "border-[var(--color-alexander-border)] bg-white hover:border-[var(--color-alexander-blue)]/40"
                  }`}
                >
                  <input
                    type="radio"
                    name={name}
                    value={contact.id}
                    checked={checked}
                    onChange={() => onSelect(contact.id)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-alexander-blue)]"
                  />
                  <span className="text-sm text-[var(--color-alexander-navy)]">
                    <span className="font-medium">
                      {contact.nameOrRole.trim() || "Unnamed contact"}
                    </span>
                    {contact.phone.trim() && (
                      <span className="text-[var(--color-alexander-muted)]"> — {contact.phone}</span>
                    )}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="mt-3">
        <SecondaryButton fullWidth={false} onClick={onAddNew}>
          + Add another contact
        </SecondaryButton>
      </div>
      {error && (
        <p className="mt-3 text-sm text-[var(--color-alexander-required)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
