"use client";

import type { Contact, ContactCategory } from "@/lib/onboarding/types";
import type { DayKey } from "@/lib/onboarding/schedule";
import { TextField } from "./ui/Fields";
import { PhoneField } from "./ui/PhoneField";
import { CheckboxGroup } from "./ui/CheckboxGroup";
import { OfficeWeeklySchedule } from "./WeeklySchedule";
import { ConditionalPanel } from "./ui/Card";

export const CONTACT_CATEGORY_OPTIONS: { value: ContactCategory; label: string }[] = [
  { value: "emergencies", label: "Emergencies" },
  { value: "urgent_calls", label: "Urgent calls" },
  { value: "scheduling_exceptions", label: "Scheduling exceptions" },
  { value: "pricing_exceptions", label: "Pricing or fee exceptions" },
  { value: "customer_complaints", label: "Customer complaints" },
  // Source transcript said "Warranty/callback issues" — removed from
  // the final MVP per the MD; use this wording instead.
  { value: "callback_previous_work", label: "Callback / previous-work issues" },
  { value: "other", label: "Other" },
];

export type ContactCardErrors = {
  nameOrRole?: string;
  phone?: string;
  callCategories?: string;
  otherCategory?: string;
  scheduleDay?: Partial<Record<DayKey, string>>;
  schedule?: string;
};

/**
 * Contact card profiles:
 * - "escalation" (Q31/Q32): full profile — name/role, phone, weekly
 *   availability, call categories.
 * - "approver" (Q38 new contact): core identity only — name/role +
 *   E.164 phone. Writes into the same shared registry without forcing
 *   unrelated emergency availability/categories.
 */
export type ContactCardProfile = "escalation" | "approver";

/**
 * Composite contact card. Writes into the shared contact registry via
 * `onChange` — the caller is responsible for routing that patch to the
 * correct registry entry by id.
 */
export function ContactCardEditor({
  idPrefix,
  contact,
  onChange,
  errors,
  profile = "escalation",
}: {
  idPrefix: string;
  contact: Contact;
  onChange: (patch: Partial<Contact>) => void;
  errors?: ContactCardErrors;
  profile?: ContactCardProfile;
}) {
  const showEscalationFields = profile === "escalation";
  const showOtherCategory = contact.callCategories.includes("other");

  return (
    <div className="space-y-4">
      <TextField
        id={`${idPrefix}-name`}
        label="Person or role"
        required
        value={contact.nameOrRole}
        onChange={(v) => onChange({ nameOrRole: v })}
        placeholder="Jamie Rivera, Dispatch Manager"
        error={errors?.nameOrRole}
      />

      <div>
        <label
          htmlFor={`${idPrefix}-phone`}
          className="block text-sm font-medium text-[var(--color-alexander-navy)]"
        >
          Phone number
          <span className="ml-1 text-[var(--color-alexander-required)]" aria-hidden>*</span>
        </label>
        <PhoneField
          id={`${idPrefix}-phone`}
          value={contact.phone}
          onChange={(v) => onChange({ phone: v })}
          error={errors?.phone}
        />
      </div>

      {showEscalationFields && (
        <>
          <div>
            <p className="text-sm font-medium text-[var(--color-alexander-navy)]">
              Weekly availability
              <span className="ml-1 text-[var(--color-alexander-required)]" aria-hidden>*</span>
            </p>
            <div className="mt-2">
              <OfficeWeeklySchedule
                schedule={contact.availability}
                onChange={(s) => onChange({ availability: s })}
                dayError={errors?.scheduleDay}
              />
            </div>
            {errors?.schedule && (
              <p className="mt-2 text-sm text-[var(--color-alexander-required)]" role="alert">
                {errors.schedule}
              </p>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-[var(--color-alexander-navy)]">
              Call categories
              <span className="ml-1 text-[var(--color-alexander-required)]" aria-hidden>*</span>
            </p>
            <CheckboxGroup
              name={`${idPrefix}-categories`}
              options={CONTACT_CATEGORY_OPTIONS}
              value={contact.callCategories}
              onChange={(v) => onChange({ callCategories: v })}
              error={errors?.callCategories}
            />
            {showOtherCategory && (
              <ConditionalPanel>
                <TextField
                  id={`${idPrefix}-other-category`}
                  label="What else should route to this contact?"
                  required
                  value={contact.otherCategory}
                  onChange={(v) => onChange({ otherCategory: v })}
                  error={errors?.otherCategory}
                />
              </ConditionalPanel>
            )}
          </div>
        </>
      )}
    </div>
  );
}
