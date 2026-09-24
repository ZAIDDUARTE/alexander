"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboarding } from "@/lib/onboarding/OnboardingContext";
import { QuestionCard, ConditionalPanel } from "./ui/Card";
import { TextareaField } from "./ui/Fields";
import { RadioGroup } from "./ui/RadioGroup";
import { CheckboxGroup } from "./ui/CheckboxGroup";
import { PrimaryButton, SecondaryButton } from "./ui/Buttons";
import { EmergencyClassificationGroup } from "./EmergencyClassification";
import { AfterHoursDispositionMatrix } from "./AfterHoursDispositionMatrix";
import { ContactCardEditor } from "./ContactCardEditor";
import { ContactPicker } from "./ContactPicker";
import { OfficeWeeklySchedule } from "./WeeklySchedule";
import { addCompletedSection } from "@/lib/onboarding/draft-utils";
import { EMERGENCY_SCENARIOS } from "@/lib/onboarding/section3Catalog";
import { DAYS } from "@/lib/onboarding/schedule";
import type { DayKey } from "@/lib/onboarding/schedule";
import {
  contactHasIdentity,
  type AfterHoursDispositionOption,
  type EmergencyClassification,
} from "@/lib/onboarding/types";
import {
  CAPACITY_MODE_OPTIONS,
  EMERGENCY_SERVICE_MODE_OPTIONS,
  HAS_BACKUP_CONTACT_OPTIONS,
  NOBODY_RESPONDS_OPTIONS,
  RETRY_RULE_OPTIONS,
  validateSection3,
  type FieldErrors,
} from "@/lib/onboarding/validation/section3";

const DISPATCH_APPROVAL_HELP_TEXT =
  "Alexander can still recognize the emergency and take appropriate safety steps. This setting controls whether a person must approve the dispatch commitment.";

const NOBODY_RESPONDS_HELP_TEXT =
  "Alexander will never tell the customer that someone has been reached, dispatched, or is handling the situation unless that action has actually been confirmed.";

function mapScheduleErrors(errors: FieldErrors, prefix: string): Partial<Record<DayKey, string>> {
  const out: Partial<Record<DayKey, string>> = {};
  for (const day of DAYS) {
    const key = `${prefix}.${day}`;
    if (errors[key]) out[day] = errors[key];
  }
  return out;
}

/** Pull `primaryContact.*` / `backupContact.*` / `approverContact.*` errors into a ContactCardErrors shape. */
function mapContactErrors(errors: FieldErrors, prefix: string) {
  const scheduleDay: Partial<Record<string, string>> = {};
  for (const day of DAYS) {
    const key = `${prefix}.scheduleDay.${day}`;
    if (errors[key]) scheduleDay[day] = errors[key];
  }
  return {
    nameOrRole: errors[`${prefix}.nameOrRole`],
    phone: errors[`${prefix}.phone`],
    callCategories: errors[`${prefix}.callCategories`],
    otherCategory: errors[`${prefix}.otherCategory`],
    schedule: errors[`${prefix}.schedule`],
    scheduleDay: Object.keys(scheduleDay).length > 0 ? scheduleDay : undefined,
  };
}

export function Section3Form({ mode = "form" }: { mode?: "form" | "review" }) {
  const { draft, updateSection3, addContact, updateContact, saveDraftNow } = useOnboarding();
  const data = draft.section3;
  const contacts = draft.contacts;
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const readOnly = mode === "review";

  const emergencyScheduleDayErrors = useMemo(
    () => (submitted ? mapScheduleErrors(errors, "emergencyServiceSchedule") : {}),
    [errors, submitted],
  );
  const primaryContactErrors = useMemo(
    () => (submitted ? mapContactErrors(errors, "primaryContact") : {}),
    [errors, submitted],
  );
  const backupContactErrors = useMemo(
    () => (submitted ? mapContactErrors(errors, "backupContact") : {}),
    [errors, submitted],
  );
  const approverContactErrors = useMemo(
    () => (submitted ? mapContactErrors(errors, "approverContact") : {}),
    [errors, submitted],
  );

  const primaryContact = contacts.find((c) => c.id === data.primaryContactId);
  const backupContact = contacts.find((c) => c.id === data.backupContactId);
  const showBackupCard = data.hasBackupContact === "yes";
  const showApproverPicker = data.capacityMode === "authorized_approval";

  // Q38 existing-contact list: only contacts with meaningful identity
  // (empty createDefaultDraft placeholders never appear). Includes the
  // primary, the backup (only while Q32 = Yes), and the current
  // approver when that person was added specifically for Q38.
  const pickerContacts = contacts.filter(
    (c) =>
      contactHasIdentity(c) &&
      (c.id === data.primaryContactId ||
        (showBackupCard && c.id === data.backupContactId) ||
        c.id === data.approverContactId),
  );
  const approverIsNewContact =
    data.approverContactId &&
    data.approverContactId !== data.primaryContactId &&
    !(showBackupCard && data.approverContactId === data.backupContactId);
  const approverContact = contacts.find((c) => c.id === data.approverContactId);

  const dispatchApprovalOptions = [
    ...EMERGENCY_SCENARIOS.map((s) => ({ value: s.id, label: s.label })),
    { value: "other", label: "Other" },
    { value: "none", label: "None" },
  ];

  const handleContinue = async () => {
    const nextErrors = validateSection3(data, contacts);
    setErrors(nextErrors);
    setSubmitted(true);
    if (Object.keys(nextErrors).length > 0) {
      const first = document.querySelector("[role='alert']");
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const finalDraft = {
      ...draft,
      updatedAt: new Date().toISOString(),
      navigation: {
        ...draft.navigation,
        stage: "section-complete" as const,
        sectionId: 3,
        completedSections: addCompletedSection(draft.navigation.completedSections, 3),
      },
    };
    await saveDraftNow(finalDraft);
    router.push("/onboarding/sections/3/complete");
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-[var(--color-alexander-blue)]">Section 3 of 8</p>
        <h1 className="mt-2 font-serif text-2xl font-semibold text-[var(--color-alexander-navy)] sm:text-3xl">
          Emergencies
        </h1>
        <p className="mt-2 text-sm text-[var(--color-alexander-muted)]">
          Tell Alexander which situations require immediate attention and what should happen when
          your team needs to step in. This establishes your emergency rules, after-hours response,
          approval requirements, escalation contacts, retry process, and fallback behavior.
        </p>
      </header>

      <QuestionCard title="How should Alexander treat each of these situations?" required>
        <EmergencyClassificationGroup
          scenarios={EMERGENCY_SCENARIOS}
          value={data.emergencyClassifications}
          onChange={(scenarioId: string, classification: EmergencyClassification) =>
            updateSection3(
              {
                emergencyClassifications: {
                  ...data.emergencyClassifications,
                  [scenarioId]: classification,
                },
              },
              { immediate: true },
            )
          }
          highlightIncomplete={submitted}
          groupError={submitted ? errors.emergencyClassifications : undefined}
        />
      </QuestionCard>

      <QuestionCard
        title="Are there any emergencies where someone on your team must approve emergency dispatch?"
        required
        helpText={DISPATCH_APPROVAL_HELP_TEXT}
      >
        <CheckboxGroup
          name="dispatchApproval"
          options={dispatchApprovalOptions}
          value={data.dispatchApproval}
          onChange={(v) => updateSection3({ dispatchApproval: v }, { immediate: true })}
          error={submitted ? errors.dispatchApproval : undefined}
        />
        {data.dispatchApproval.includes("other") && (
          <ConditionalPanel>
            <TextareaField
              id="dispatchApprovalOtherDetail"
              label="Which situations?"
              required
              rows={2}
              value={data.dispatchApprovalOtherDetail}
              onChange={(v) => updateSection3({ dispatchApprovalOtherDetail: v })}
              error={submitted ? errors.dispatchApprovalOtherDetail : undefined}
            />
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard
        title="What should Alexander do when someone calls outside your normal office hours?"
        required
      >
        <AfterHoursDispositionMatrix
          value={data.afterHoursDisposition}
          onChange={(row, option: AfterHoursDispositionOption) =>
            updateSection3(
              { afterHoursDisposition: { ...data.afterHoursDisposition, [row]: option } },
              { immediate: true },
            )
          }
          highlightIncomplete={submitted}
          groupError={submitted ? errors.afterHoursDisposition : undefined}
        />
      </QuestionCard>

      <QuestionCard
        title="When can your company actually send someone out for an after-hours emergency?"
        required
      >
        <RadioGroup
          name="emergencyServiceMode"
          options={EMERGENCY_SERVICE_MODE_OPTIONS}
          value={data.emergencyServiceMode}
          onChange={(v) => updateSection3({ emergencyServiceMode: v }, { immediate: true })}
          error={submitted ? errors.emergencyServiceMode : undefined}
        />
        {data.emergencyServiceMode === "certain_hours" && (
          <ConditionalPanel>
            <p className="mb-4 text-sm font-medium text-[var(--color-alexander-navy)]">
              When can your company provide after-hours emergency service?
              <span className="ml-1 text-[var(--color-alexander-required)]" aria-hidden>*</span>
            </p>
            <OfficeWeeklySchedule
              schedule={data.emergencyServiceSchedule}
              onChange={(s) => updateSection3({ emergencyServiceSchedule: s }, { immediate: true })}
              dayError={submitted ? emergencyScheduleDayErrors : undefined}
            />
            {submitted && errors.emergencyServiceSchedule && (
              <p className="mt-3 text-sm text-[var(--color-alexander-required)]" role="alert">
                {errors.emergencyServiceSchedule}
              </p>
            )}
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard
        title="Who should Alexander contact first when a call requires immediate human attention?"
        required
      >
        {primaryContact && (
          <ContactCardEditor
            idPrefix="primary-contact"
            contact={primaryContact}
            onChange={(patch) => updateContact(primaryContact.id, patch, { immediate: true })}
            errors={submitted ? primaryContactErrors : undefined}
          />
        )}
      </QuestionCard>

      <QuestionCard title="If the first person does not respond, should Alexander contact someone else?" required>
        <RadioGroup
          name="hasBackupContact"
          options={HAS_BACKUP_CONTACT_OPTIONS}
          value={data.hasBackupContact}
          onChange={(v) => {
            if (v === "yes" && !data.backupContactId) {
              const id = addContact();
              updateSection3({ hasBackupContact: v, backupContactId: id }, { immediate: true });
            } else {
              updateSection3({ hasBackupContact: v }, { immediate: true });
            }
          }}
          error={submitted ? errors.hasBackupContact : undefined}
        />
        {showBackupCard && backupContact && (
          <ConditionalPanel>
            <ContactCardEditor
              idPrefix="backup-contact"
              contact={backupContact}
              onChange={(patch) => updateContact(backupContact.id, patch, { immediate: true })}
              errors={submitted ? backupContactErrors : undefined}
            />
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard
        title="If Alexander cannot reach anyone on your team, what should he do?"
        required
        helpText={NOBODY_RESPONDS_HELP_TEXT}
      >
        <RadioGroup
          name="nobodyRespondsFallback"
          options={NOBODY_RESPONDS_OPTIONS}
          value={data.nobodyRespondsFallback}
          onChange={(v) => updateSection3({ nobodyRespondsFallback: v }, { immediate: true })}
          error={submitted ? errors.nobodyRespondsFallback : undefined}
        />
        {data.nobodyRespondsFallback === "custom" && (
          <ConditionalPanel>
            <TextareaField
              id="nobodyRespondsCustomRule"
              label="What rule should Alexander follow?"
              required
              rows={2}
              value={data.nobodyRespondsCustomRule}
              onChange={(v) => updateSection3({ nobodyRespondsCustomRule: v })}
              error={submitted ? errors.nobodyRespondsCustomRule : undefined}
            />
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard title="If an urgent escalation is not answered, how should Alexander retry?" required>
        <RadioGroup
          name="retryRule"
          options={RETRY_RULE_OPTIONS}
          value={data.retryRule}
          onChange={(v) => updateSection3({ retryRule: v }, { immediate: true })}
          error={submitted ? errors.retryRule : undefined}
        />
        {data.retryRule === "custom" && (
          <ConditionalPanel>
            <TextareaField
              id="retryCustomRule"
              label="What retry rule should Alexander follow?"
              required
              rows={2}
              value={data.retryCustomRule}
              onChange={(v) => updateSection3({ retryCustomRule: v })}
              error={submitted ? errors.retryCustomRule : undefined}
            />
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard
        title="If an emergency comes in when your normal schedule is already full, what should Alexander do?"
        required
      >
        <RadioGroup
          name="capacityMode"
          options={CAPACITY_MODE_OPTIONS}
          value={data.capacityMode}
          onChange={(v) => updateSection3({ capacityMode: v }, { immediate: true })}
          error={submitted ? errors.capacityMode : undefined}
        />
        {data.capacityMode === "reserved_capacity" && (
          <ConditionalPanel>
            <TextareaField
              id="reservedCapacityText"
              label="How much capacity do you normally protect for emergencies?"
              required
              rows={2}
              value={data.reservedCapacityText}
              onChange={(v) => updateSection3({ reservedCapacityText: v })}
              placeholder="Keep one same-day appointment available whenever possible."
              error={submitted ? errors.reservedCapacityText : undefined}
            />
          </ConditionalPanel>
        )}
        {data.capacityMode === "emergency_override" && (
          <ConditionalPanel>
            <TextareaField
              id="overrideConditionsText"
              label="When may Alexander use an emergency override?"
              required
              rows={3}
              value={data.overrideConditionsText}
              onChange={(v) => updateSection3({ overrideConditionsText: v })}
              error={submitted ? errors.overrideConditionsText : undefined}
            />
          </ConditionalPanel>
        )}
        {showApproverPicker && (
          <ConditionalPanel>
            <p className="mb-4 text-sm font-medium text-[var(--color-alexander-navy)]">
              Who can approve an emergency scheduling exception?
              <span className="ml-1 text-[var(--color-alexander-required)]" aria-hidden>*</span>
            </p>
            <ContactPicker
              name="approverContactId"
              contacts={pickerContacts}
              value={data.approverContactId}
              onSelect={(id) => updateSection3({ approverContactId: id }, { immediate: true })}
              onAddNew={() => {
                const id = addContact();
                updateSection3({ approverContactId: id }, { immediate: true });
              }}
              error={submitted ? errors.approverContactId : undefined}
            />
            {approverIsNewContact && approverContact && (
              <div className="mt-4 rounded-lg border border-[var(--color-alexander-border)] bg-white p-4">
                <ContactCardEditor
                  idPrefix="approver-contact"
                  contact={approverContact}
                  profile="approver"
                  onChange={(patch) => updateContact(approverContact.id, patch, { immediate: true })}
                  errors={submitted ? approverContactErrors : undefined}
                />
              </div>
            )}
          </ConditionalPanel>
        )}
      </QuestionCard>

      {!readOnly && (
        <div className="flex flex-col gap-3 pt-4 sm:flex-row">
          <SecondaryButton
            className="sm:flex-1"
            onClick={() => router.push("/onboarding/sections/3/intro")}
          >
            Back
          </SecondaryButton>
          <PrimaryButton className="sm:flex-1" onClick={handleContinue}>
            Complete Section 3 →
          </PrimaryButton>
        </div>
      )}
    </div>
  );
}
