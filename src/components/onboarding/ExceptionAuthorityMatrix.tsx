"use client";

import { EXCEPTION_TYPES } from "@/lib/onboarding/section4Catalog";
import { EXCEPTION_AUTHORITY_OPTIONS } from "@/lib/onboarding/validation/section4";
import type { Contact, ExceptionAuthority, ExceptionAuthorityState } from "@/lib/onboarding/types";
import { contactHasIdentity } from "@/lib/onboarding/types";
import { ContactCardEditor, type ContactCardErrors } from "./ContactCardEditor";
import { ContactPicker } from "./ContactPicker";
import { ConditionalPanel } from "./ui/Card";

const ALEXANDER_AUTHORITY_HELP =
  "Choosing Alexander means Alexander may approve only within rules explicitly provided elsewhere in your onboarding answers; it does not grant unlimited authority.";

function mapApproverContactErrors(
  errors: Record<string, string | undefined>,
  rowId: string,
): ContactCardErrors | undefined {
  const prefix = `exceptionApprover.${rowId}.`;
  let hasAny = false;
  const out: ContactCardErrors = {};
  for (const [key, msg] of Object.entries(errors)) {
    if (!msg) continue;
    if (key === `exceptionApprover.${rowId}`) continue;
    if (key.startsWith(prefix)) {
      const field = key.slice(prefix.length);
      if (field === "nameOrRole" || field === "phone") {
        out[field] = msg;
        hasAny = true;
      }
    }
  }
  return hasAny ? out : undefined;
}

function ExceptionAuthoritySegmented({
  name,
  value,
  onChange,
  ariaLabel,
}: {
  name: string;
  value: ExceptionAuthorityState;
  onChange: (authority: ExceptionAuthority) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap"
    >
      {EXCEPTION_AUTHORITY_OPTIONS.map((opt) => {
        const checked = value === opt.value;
        return (
          <label
            key={opt.value}
            className={`flex min-w-0 cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-center text-sm font-medium transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--color-alexander-blue)] lg:min-w-[8rem] lg:flex-1 ${
              checked
                ? "border-[var(--color-alexander-blue)] bg-[var(--color-alexander-blue)] text-white"
                : "border-[var(--color-alexander-border)] bg-white text-[var(--color-alexander-navy)] hover:border-[var(--color-alexander-blue)]/40"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={checked}
              onChange={() => onChange(opt.value)}
              className="sr-only"
            />
            <span>{opt.label}</span>
          </label>
        );
      })}
    </div>
  );
}

export function ExceptionAuthorityMatrix({
  value,
  approverContactIds,
  contacts,
  onAuthorityChange,
  onApproverSelect,
  onAddApprover,
  onApproverContactChange,
  errors = {},
  highlightIncomplete = false,
}: {
  value: Record<string, ExceptionAuthorityState>;
  approverContactIds: Record<string, string>;
  contacts: Contact[];
  onAuthorityChange: (exceptionTypeId: string, authority: ExceptionAuthority) => void;
  onApproverSelect: (exceptionTypeId: string, contactId: string) => void;
  onAddApprover: (exceptionTypeId: string) => void;
  onApproverContactChange: (contactId: string, patch: Partial<Contact>) => void;
  errors?: Record<string, string | undefined>;
  highlightIncomplete?: boolean;
}) {
  const identityContacts = contacts.filter((c) => contactHasIdentity(c));
  const groupError = errors.exceptionAuthority;

  return (
    <div>
      <p className="mb-4 text-sm text-[var(--color-alexander-muted)]">{ALEXANDER_AUTHORITY_HELP}</p>
      <ul className="space-y-4">
        {EXCEPTION_TYPES.map((row) => {
          const authority = value[row.id] ?? "";
          const incomplete = highlightIncomplete && !authority;
          const isAnotherPerson = authority === "another_person";
          const approverId = approverContactIds[row.id] ?? "";
          const approverContact = contacts.find((c) => c.id === approverId);
          const showApproverCard =
            isAnotherPerson && approverContact && !contactHasIdentity(approverContact);
          const pickerContacts = identityContacts;

          return (
            <li
              key={row.id}
              className={`rounded-lg border bg-white p-4 ${
                incomplete
                  ? "border-[var(--color-alexander-required)]/50"
                  : "border-[var(--color-alexander-border)]"
              }`}
            >
              <p className="mb-3 text-sm font-medium text-[var(--color-alexander-navy)]">{row.label}</p>
              <ExceptionAuthoritySegmented
                name={`exception-authority-${row.id}`}
                value={authority}
                ariaLabel={row.label}
                onChange={(a) => onAuthorityChange(row.id, a)}
              />
              {isAnotherPerson && (
                <ConditionalPanel>
                  <ContactPicker
                    name={`exception-approver-${row.id}`}
                    contacts={pickerContacts}
                    value={approverId}
                    onSelect={(id) => onApproverSelect(row.id, id)}
                    onAddNew={() => onAddApprover(row.id)}
                    error={errors[`exceptionApprover.${row.id}`]}
                  />
                  {showApproverCard && approverContact && (
                    <div className="mt-4 rounded-lg border border-[var(--color-alexander-border)] bg-white p-4">
                      <ContactCardEditor
                        idPrefix={`exception-approver-${row.id}`}
                        contact={approverContact}
                        profile="approver"
                        onChange={(patch) => onApproverContactChange(approverContact.id, patch)}
                        errors={mapApproverContactErrors(errors, row.id)}
                      />
                    </div>
                  )}
                </ConditionalPanel>
              )}
            </li>
          );
        })}
      </ul>
      {groupError && (
        <p className="mt-3 text-sm text-[var(--color-alexander-required)]" role="alert">
          {groupError}
        </p>
      )}
    </div>
  );
}
