"use client";

import {
  NON_SERVICE_CALL_TYPE_ROWS,
  NON_SERVICE_DISPOSITION_OPTIONS,
} from "@/lib/onboarding/section6Catalog";
import type { Contact, NonServiceCallPolicyRow, NonServiceDisposition } from "@/lib/onboarding/types";
import { contactHasIdentity } from "@/lib/onboarding/types";
import { ContactCardEditor, type ContactCardErrors } from "./ContactCardEditor";
import { ContactPicker } from "./ContactPicker";
import { ConditionalPanel } from "./ui/Card";

function mapContactErrors(
  errors: Record<string, string | undefined>,
  rowId: string,
): ContactCardErrors | undefined {
  const prefix = `nonServiceCallPolicies.${rowId}.contact.`;
  const out: ContactCardErrors = {};
  let hasAny = false;
  for (const [key, msg] of Object.entries(errors)) {
    if (!msg || !key.startsWith(prefix)) continue;
    const field = key.slice(prefix.length);
    if (field === "nameOrRole" || field === "phone") {
      out[field] = msg;
      hasAny = true;
    }
  }
  return hasAny ? out : undefined;
}

function DispositionChoice({
  name,
  value,
  onChange,
  ariaLabel,
}: {
  name: string;
  value: NonServiceDisposition | "";
  onChange: (disposition: NonServiceDisposition) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="grid grid-cols-1 gap-2 sm:grid-cols-2"
    >
      {NON_SERVICE_DISPOSITION_OPTIONS.map((opt) => {
        const checked = value === opt.id;
        return (
          <label
            key={opt.id}
            className={`flex min-w-0 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--color-alexander-blue)] ${
              checked
                ? "border-[var(--color-alexander-blue)] bg-[var(--color-alexander-info-bg)]"
                : "border-[var(--color-alexander-border)] bg-white hover:border-[var(--color-alexander-blue)]/40"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={opt.id}
              checked={checked}
              onChange={() => onChange(opt.id)}
              className="h-4 w-4 shrink-0 accent-[var(--color-alexander-blue)]"
            />
            <span className="text-[var(--color-alexander-navy)]">{opt.label}</span>
          </label>
        );
      })}
    </div>
  );
}

export function NonServiceCallMatrix({
  policies,
  contacts,
  onPolicyChange,
  onAddContact,
  onContactSelect,
  onContactChange,
  errors = {},
  highlightIncomplete = false,
}: {
  policies: Record<string, NonServiceCallPolicyRow>;
  contacts: Contact[];
  onPolicyChange: (callTypeId: string, patch: Partial<NonServiceCallPolicyRow>) => void;
  onAddContact: (callTypeId: string) => void;
  onContactSelect: (callTypeId: string, contactId: string) => void;
  onContactChange: (contactId: string, patch: Partial<Contact>) => void;
  errors?: Record<string, string | undefined>;
  highlightIncomplete?: boolean;
}) {
  const identityContacts = contacts.filter((c) => contactHasIdentity(c));

  return (
    <div className="space-y-4">
      {NON_SERVICE_CALL_TYPE_ROWS.map((row) => {
        const policy = policies[row.id] ?? { disposition: "", contactId: "" };
        const rowError = errors[`nonServiceCallPolicies.${row.id}`];
        const contactError = errors[`nonServiceCallPolicies.${row.id}.contact`];
        const selectedContact = contacts.find((c) => c.id === policy.contactId);
        const showInlineEditor =
          policy.disposition === "send_specific" &&
          selectedContact &&
          !contactHasIdentity(selectedContact);

        return (
          <article
            key={row.id}
            className="min-w-0 rounded-lg border border-[var(--color-alexander-border)] bg-[var(--color-alexander-surface)] p-4"
            aria-labelledby={`non-service-${row.id}-title`}
          >
            <h3
              id={`non-service-${row.id}-title`}
              className="text-sm font-semibold text-[var(--color-alexander-navy)]"
            >
              {row.label}
            </h3>
            <div className="mt-3">
              <DispositionChoice
                name={`nonService-${row.id}`}
                value={policy.disposition}
                onChange={(disposition) => {
                  const patch: Partial<NonServiceCallPolicyRow> = { disposition };
                  if (disposition !== "send_specific") {
                    patch.contactId = policy.contactId;
                  }
                  onPolicyChange(row.id, patch);
                }}
                ariaLabel={`How to handle: ${row.label}`}
              />
            </div>
            {(rowError || (highlightIncomplete && !policy.disposition)) && (
              <p className="mt-2 text-sm text-[var(--color-alexander-required)]" role="alert">
                {rowError ?? "Select how Alexander should handle this call type."}
              </p>
            )}
            {policy.disposition === "send_specific" && (
              <ConditionalPanel>
                <p className="mb-2 text-sm font-medium text-[var(--color-alexander-navy)]">
                  Who should receive this call type?
                </p>
                <ContactPicker
                  name={`nonService-contact-${row.id}`}
                  contacts={identityContacts}
                  value={policy.contactId}
                  onSelect={(id) => onContactSelect(row.id, id)}
                  onAddNew={() => onAddContact(row.id)}
                  error={contactError}
                />
                {showInlineEditor && selectedContact && (
                  <div className="mt-4">
                    <ContactCardEditor
                      idPrefix={`non-service-${row.id}`}
                      contact={selectedContact}
                      profile="approver"
                      onChange={(patch) => onContactChange(selectedContact.id, patch)}
                      errors={mapContactErrors(errors, row.id)}
                    />
                  </div>
                )}
              </ConditionalPanel>
            )}
          </article>
        );
      })}
    </div>
  );
}
