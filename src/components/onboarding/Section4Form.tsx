"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboarding } from "@/lib/onboarding/OnboardingContext";
import { QuestionCard, ConditionalPanel } from "./ui/Card";
import { TextField, TextareaField } from "./ui/Fields";
import { RadioGroup } from "./ui/RadioGroup";
import { CheckboxGroup } from "./ui/CheckboxGroup";
import { PrimaryButton, SecondaryButton } from "./ui/Buttons";
import { ExceptionAuthorityMatrix } from "./ExceptionAuthorityMatrix";
import { CallerAuthorizationMatrix } from "./CallerAuthorizationMatrix";
import { AppointmentWindowEditor } from "./AppointmentWindowEditor";
import { PriorityOrderList } from "./PriorityOrderList";
import { ContactCardEditor, type ContactCardErrors } from "./ContactCardEditor";
import { ContactPicker } from "./ContactPicker";
import { addCompletedSection } from "@/lib/onboarding/draft-utils";
import { getSchedulingEligibleServices } from "@/lib/onboarding/schedulingServices";
import {
  CALLER_TYPES,
  CAPACITY_POLICY_ROWS,
  CONFIRMATION_INFO_OPTIONS,
} from "@/lib/onboarding/section4Catalog";
import {
  contactHasIdentity,
  createServiceRuleId,
  createSpendingLimitId,
  createTechnicianAssignmentId,
  type CapacityOfferEntry,
  type CapacityOfferPolicy,
  type ConfirmationInfoId,
  type Contact,
  type FeeChargeMode,
  type NoAvailabilityFallbackId,
  type TechnicianAssignment,
} from "@/lib/onboarding/types";
import {
  AI_REFUSAL_OPTIONS,
  APPROVER_UNAVAILABLE_OPTIONS,
  CALLBACK_NUMBER_OPTIONS,
  CAPACITY_OFFER_OPTIONS,
  CHANGE_AUTHORITY_OPTIONS,
  DEFAULT_BOOKING_OPTIONS,
  EMERGENCY_AUTH_OPTIONS,
  FEE_CHARGE_OPTIONS,
  HUMAN_REQUEST_OPTIONS,
  MULTI_ISSUE_OPTIONS,
  SPECIFIC_TECH_OPTIONS,
  YES_NO_OPTIONS,
  validateSection4,
  type FieldErrors,
} from "@/lib/onboarding/validation/section4";

const CONFIRMATION_HELP_TEXT =
  "Alexander may repeat only information confirmed by the scheduling system or company team. He must not promise a specific technician, exact arrival time, immediate dispatch, or anything that was not confirmed.";

function CapacityOfferSegmented({
  name,
  value,
  onChange,
  ariaLabel,
}: {
  name: string;
  value: CapacityOfferEntry["policy"];
  onChange: (policy: CapacityOfferPolicy) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap"
    >
      {CAPACITY_OFFER_OPTIONS.map((opt) => {
        const checked = value === opt.value;
        return (
          <label
            key={opt.value}
            className={`flex min-w-0 cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-center text-sm font-medium transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--color-alexander-blue)] lg:min-w-[7.5rem] lg:flex-1 ${
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
            {opt.label}
          </label>
        );
      })}
    </div>
  );
}

function mapCallbackOwnerErrors(errors: FieldErrors): ContactCardErrors | undefined {
  const out: ContactCardErrors = {};
  if (errors["callbackOwnerContact.nameOrRole"]) out.nameOrRole = errors["callbackOwnerContact.nameOrRole"];
  if (errors["callbackOwnerContact.phone"]) out.phone = errors["callbackOwnerContact.phone"];
  return Object.keys(out).length > 0 ? out : undefined;
}

export function Section4Form({ mode = "form" }: { mode?: "form" | "review" }) {
  const {
    draft,
    updateSection4,
    addContact,
    updateContact,
    saveDraftNow,
    upsertFeeByKey,
    updateFee,
  } = useOnboarding();
  const data = draft.section4;
  const contacts = draft.contacts;
  const fees = draft.fees;
  const eligibleServices = useMemo(
    () => getSchedulingEligibleServices(draft.section2),
    [draft.section2],
  );
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const readOnly = mode === "review";

  const identityContacts = useMemo(() => contacts.filter((c) => contactHasIdentity(c)), [contacts]);

  const lateFee = fees.find((f) => f.id === data.lateCancellationFeeId);
  const noShowFee = fees.find((f) => f.id === data.noShowFeeId);

  const callbackOwner = contacts.find((c) => c.id === data.callbackOwnerContactId);
  const callbackOwnerIsNew =
    callbackOwner && data.callbackOwnerContactId && !contactHasIdentity(callbackOwner);

  const confirmationOptions = CONFIRMATION_INFO_OPTIONS.map((o) => ({
    value: o.id as ConfirmationInfoId,
    label: o.label,
  }));

  const separateIssueOptions = [
    ...eligibleServices.map((s) => ({ value: s.id, label: s.label })),
    { value: "other-separate-issue", label: "Other" },
  ];

  const handleFeeModeChange = (
    kind: "late" | "no_show",
    mode: FeeChargeMode,
  ) => {
    const feeKey = kind === "late" ? "late_cancellation" : "no_show";
    const idField = kind === "late" ? "lateCancellationFeeId" : "noShowFeeId";
    const modeField = kind === "late" ? "lateCancellationFeeMode" : "noShowFeeMode";
    const existingId = kind === "late" ? data.lateCancellationFeeId : data.noShowFeeId;

    if (mode === "yes" || mode === "conditional") {
      const id = upsertFeeByKey(feeKey, { active: true }, { immediate: true });
      updateSection4({ [modeField]: mode, [idField]: id }, { immediate: true });
    } else {
      if (existingId) {
        updateFee(existingId, { active: false }, { immediate: true });
      }
      updateSection4({ [modeField]: mode }, { immediate: true });
    }
  };

  const handleContinue = async () => {
    const nextErrors = validateSection4(data, contacts, fees, draft.section2);
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
        sectionId: 4,
        completedSections: addCompletedSection(draft.navigation.completedSections, 4),
      },
    };
    await saveDraftNow(finalDraft);
    router.push("/onboarding/sections/4/complete");
  };

  const callerRowErrors: Record<string, string | undefined> = {};
  for (const row of CALLER_TYPES) {
    const key = `callerPermissions.${row.id}`;
    if (errors[key]) callerRowErrors[row.id] = errors[key];
  }

  const updateCapacityRow = (rowId: string, entry: CapacityOfferEntry) => {
    updateSection4(
      { capacityPolicies: { ...data.capacityPolicies, [rowId]: entry } },
      { immediate: true },
    );
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-[var(--color-alexander-blue)]">Section 4 of 8</p>
        <h1 className="mt-2 font-serif text-2xl font-semibold text-[var(--color-alexander-navy)] sm:text-3xl">
          Scheduling
        </h1>
        <p className="mt-2 text-sm text-[var(--color-alexander-muted)]">
          Tell Alexander when and how your company can accept appointments. This section defines
          booking authority, appointment windows, authorization, capacity rules, rescheduling,
          cancellation policy, technician assignment, and exceptions.
        </p>
      </header>

      <QuestionCard title="If a caller asks to speak with a person, what should Alexander do?" required>
        <RadioGroup
          name="humanRequestPolicy"
          options={HUMAN_REQUEST_OPTIONS}
          value={data.humanRequestPolicy}
          onChange={(v) => updateSection4({ humanRequestPolicy: v }, { immediate: true })}
          error={submitted ? errors.humanRequestPolicy : undefined}
        />
        {data.humanRequestPolicy === "custom" && (
          <ConditionalPanel>
            <TextareaField
              id="humanRequestCustomRule"
              label="What rule should Alexander follow?"
              rows={2}
              value={data.humanRequestCustomRule}
              onChange={(v) => updateSection4({ humanRequestCustomRule: v })}
              error={submitted ? errors.humanRequestCustomRule : undefined}
            />
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard
        title="If someone says they do not want to speak with an AI, what should Alexander do?"
        required
      >
        <RadioGroup
          name="aiRefusalPolicy"
          options={AI_REFUSAL_OPTIONS}
          value={data.aiRefusalPolicy}
          onChange={(v) => updateSection4({ aiRefusalPolicy: v }, { immediate: true })}
          error={submitted ? errors.aiRefusalPolicy : undefined}
        />
        {data.aiRefusalPolicy === "custom" && (
          <ConditionalPanel>
            <TextareaField
              id="aiRefusalCustomRule"
              label="What rule should Alexander follow?"
              rows={2}
              value={data.aiRefusalCustomRule}
              onChange={(v) => updateSection4({ aiRefusalCustomRule: v })}
              error={submitted ? errors.aiRefusalCustomRule : undefined}
            />
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard title="Who has authority to approve each type of exception?" required>
        <ExceptionAuthorityMatrix
          value={data.exceptionAuthority}
          approverContactIds={data.exceptionApproverContactIds}
          contacts={contacts}
          highlightIncomplete={submitted}
          errors={submitted ? errors : {}}
          onAuthorityChange={(rowId, authority) => {
            const next = { ...data.exceptionAuthority, [rowId]: authority };
            const patch: Partial<typeof data> = { exceptionAuthority: next };
            if (authority !== "another_person") {
              const ids = { ...data.exceptionApproverContactIds };
              delete ids[rowId];
              patch.exceptionApproverContactIds = ids;
            }
            updateSection4(patch, { immediate: true });
          }}
          onApproverSelect={(rowId, contactId) =>
            updateSection4(
              {
                exceptionApproverContactIds: {
                  ...data.exceptionApproverContactIds,
                  [rowId]: contactId,
                },
              },
              { immediate: true },
            )
          }
          onAddApprover={(rowId) => {
            const id = addContact();
            updateSection4(
              {
                exceptionApproverContactIds: {
                  ...data.exceptionApproverContactIds,
                  [rowId]: id,
                },
              },
              { immediate: true },
            );
          }}
          onApproverContactChange={(contactId, patch) =>
            updateContact(contactId, patch, { immediate: true })
          }
        />
      </QuestionCard>

      <QuestionCard
        title="What should Alexander do if the person who must approve an exception is not available?"
        required
      >
        <RadioGroup
          name="approverUnavailablePolicy"
          options={APPROVER_UNAVAILABLE_OPTIONS}
          value={data.approverUnavailablePolicy}
          onChange={(v) => updateSection4({ approverUnavailablePolicy: v }, { immediate: true })}
          error={submitted ? errors.approverUnavailablePolicy : undefined}
        />
        {data.approverUnavailablePolicy === "other" && (
          <ConditionalPanel>
            <TextareaField
              id="approverUnavailableCustomRule"
              label="What should Alexander do?"
              required
              rows={2}
              value={data.approverUnavailableCustomRule}
              onChange={(v) => updateSection4({ approverUnavailableCustomRule: v })}
              error={submitted ? errors.approverUnavailableCustomRule : undefined}
            />
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard title="What can different types of callers authorize?" required>
        <CallerAuthorizationMatrix
          value={data.callerPermissions}
          highlightIncomplete={submitted}
          groupError={submitted ? errors.callerPermissions : undefined}
          rowErrors={submitted ? callerRowErrors : {}}
          onChange={(callerTypeId, permissions) =>
            updateSection4(
              { callerPermissions: { ...data.callerPermissions, [callerTypeId]: permissions } },
              { immediate: true },
            )
          }
        />
      </QuestionCard>

      <QuestionCard title="Do any callers have a maximum amount they are allowed to approve?" required>
        <RadioGroup
          name="hasSpendingLimits"
          options={YES_NO_OPTIONS}
          value={data.hasSpendingLimits}
          onChange={(v) => updateSection4({ hasSpendingLimits: v }, { immediate: true })}
          error={submitted ? errors.hasSpendingLimits : undefined}
        />
        {data.hasSpendingLimits === "yes" && (
          <ConditionalPanel>
            <div className="space-y-3">
              {data.spendingLimits.map((row, index) => (
                <div
                  key={row.id}
                  className="rounded-lg border border-[var(--color-alexander-border)] bg-white p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-medium text-[var(--color-alexander-navy)]">
                      Limit {index + 1}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        updateSection4(
                          {
                            spendingLimits: data.spendingLimits.filter((r) => r.id !== row.id),
                          },
                          { immediate: true },
                        )
                      }
                      className="text-sm text-[var(--color-alexander-muted)] hover:text-[var(--color-alexander-required)]"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor={`spending-caller-${row.id}`}
                        className="block text-sm font-medium text-[var(--color-alexander-navy)]"
                      >
                        Caller type
                        <span className="ml-1 text-[var(--color-alexander-required)]" aria-hidden>*</span>
                      </label>
                      <select
                        id={`spending-caller-${row.id}`}
                        value={row.callerTypeId}
                        onChange={(e) =>
                          updateSection4(
                            {
                              spendingLimits: data.spendingLimits.map((r) =>
                                r.id === row.id ? { ...r, callerTypeId: e.target.value } : r,
                              ),
                            },
                            { immediate: true },
                          )
                        }
                        className="mt-2 w-full rounded-lg border border-[var(--color-alexander-border)] bg-white px-3 py-2.5 text-sm"
                      >
                        <option value="">Select…</option>
                        {CALLER_TYPES.map((c) => (
                          <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                      </select>
                      {submitted && errors[`spendingLimits.${row.id}.callerTypeId`] && (
                        <p className="mt-2 text-sm text-[var(--color-alexander-required)]" role="alert">
                          {errors[`spendingLimits.${row.id}.callerTypeId`]}
                        </p>
                      )}
                    </div>
                    <TextField
                      id={`spending-amount-${row.id}`}
                      label="Maximum amount ($)"
                      required
                      value={row.maxAmount}
                      onChange={(v) =>
                        updateSection4({
                          spendingLimits: data.spendingLimits.map((r) =>
                            r.id === row.id ? { ...r, maxAmount: v } : r,
                          ),
                        })
                      }
                      error={submitted ? errors[`spendingLimits.${row.id}.maxAmount`] : undefined}
                    />
                  </div>
                </div>
              ))}
              <SecondaryButton
                fullWidth={false}
                onClick={() =>
                  updateSection4(
                    {
                      spendingLimits: [
                        ...data.spendingLimits,
                        { id: createSpendingLimitId(), callerTypeId: "", maxAmount: "" },
                      ],
                    },
                    { immediate: true },
                  )
                }
              >
                + Add spending limit
              </SecondaryButton>
              {submitted && errors.spendingLimits && (
                <p className="text-sm text-[var(--color-alexander-required)]" role="alert">
                  {errors.spendingLimits}
                </p>
              )}
            </div>
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard
        title="When there is an emergency, do the same authorization rules still apply?"
        required
      >
        <RadioGroup
          name="emergencyAuthMode"
          options={EMERGENCY_AUTH_OPTIONS}
          value={data.emergencyAuthMode}
          onChange={(v) => updateSection4({ emergencyAuthMode: v }, { immediate: true })}
          error={submitted ? errors.emergencyAuthMode : undefined}
        />
        {data.emergencyAuthMode === "special_rules" && (
          <ConditionalPanel>
            <TextareaField
              id="emergencyAuthSpecialRules"
              label="How does emergency authorization differ?"
              required
              rows={3}
              value={data.emergencyAuthSpecialRules}
              onChange={(v) => updateSection4({ emergencyAuthSpecialRules: v })}
              error={submitted ? errors.emergencyAuthSpecialRules : undefined}
            />
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard
        title="When an eligible customer wants service, what may Alexander normally do?"
        required
      >
        <RadioGroup
          name="defaultBookingMode"
          options={DEFAULT_BOOKING_OPTIONS}
          value={data.defaultBookingMode}
          onChange={(v) => updateSection4({ defaultBookingMode: v }, { immediate: true })}
          error={submitted ? errors.defaultBookingMode : undefined}
        />
      </QuestionCard>

      <QuestionCard title="How far into the future may Alexander book?" required>
        <div className="space-y-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-alexander-navy)]">
            <input
              type="checkbox"
              checked={data.bookingHorizonNoMaximum}
              onChange={(e) => {
                const checked = e.target.checked;
                updateSection4(
                  {
                    bookingHorizonNoMaximum: checked,
                    ...(checked ? { bookingHorizonDays: "" } : {}),
                  },
                  { immediate: true },
                );
              }}
              className="h-4 w-4 accent-[var(--color-alexander-blue)]"
            />
            No maximum
          </label>
          {!data.bookingHorizonNoMaximum && (
            <TextField
              id="bookingHorizonDays"
              label="Maximum days ahead"
              required
              type="number"
              value={data.bookingHorizonDays}
              onChange={(v) =>
                updateSection4({ bookingHorizonDays: v, bookingHorizonNoMaximum: false })
              }
              error={submitted ? errors.bookingHorizonDays : undefined}
            />
          )}
          {data.bookingHorizonNoMaximum && submitted && errors.bookingHorizonDays && (
            <p className="text-sm text-[var(--color-alexander-required)]" role="alert">
              {errors.bookingHorizonDays}
            </p>
          )}
        </div>
      </QuestionCard>

      <QuestionCard title="What appointment windows may Alexander offer customers?" required>
        <AppointmentWindowEditor
          value={data.appointmentWindows}
          onChange={(windows) => updateSection4({ appointmentWindows: windows }, { immediate: true })}
          errors={submitted ? errors : {}}
          groupError={submitted ? errors.appointmentWindows : undefined}
        />
      </QuestionCard>

      <QuestionCard
        title="When an appointment is successfully confirmed, what information may Alexander repeat to the customer?"
        required
        helpText={CONFIRMATION_HELP_TEXT}
      >
        <CheckboxGroup
          name="confirmationInfo"
          options={confirmationOptions}
          value={data.confirmationInfo}
          onChange={(v) => updateSection4({ confirmationInfo: v }, { immediate: true })}
          error={submitted ? errors.confirmationInfo : undefined}
        />
      </QuestionCard>

      <QuestionCard title="Do any types of jobs follow different booking rules?" required>
        <RadioGroup
          name="hasServiceBookingRules"
          options={YES_NO_OPTIONS}
          value={data.hasServiceBookingRules}
          onChange={(v) => updateSection4({ hasServiceBookingRules: v }, { immediate: true })}
          error={submitted ? errors.hasServiceBookingRules : undefined}
        />
        {data.hasServiceBookingRules === "yes" && (
          <ConditionalPanel>
            {eligibleServices.length === 0 ? (
              <p className="text-sm text-[var(--color-alexander-muted)]">
                No eligible services are configured yet. In Section 2, mark at least one plumbing or
                diagnostic service as offered, with conditions, or ask-our-team. Or choose No above.
              </p>
            ) : (
            <div className="space-y-3">
              {data.serviceBookingRules.map((rule, index) => {
                const usedElsewhere = new Set(
                  data.serviceBookingRules
                    .filter((r) => r.id !== rule.id)
                    .map((r) => r.serviceId)
                    .filter(Boolean),
                );
                return (
                  <div
                    key={rule.id}
                    className="rounded-lg border border-[var(--color-alexander-border)] bg-white p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-medium text-[var(--color-alexander-navy)]">
                        Rule {index + 1}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          updateSection4(
                            {
                              serviceBookingRules: data.serviceBookingRules.filter(
                                (r) => r.id !== rule.id,
                              ),
                            },
                            { immediate: true },
                          )
                        }
                        className="text-sm text-[var(--color-alexander-muted)] hover:text-[var(--color-alexander-required)]"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label
                          htmlFor={`service-rule-${rule.id}`}
                          className="block text-sm font-medium text-[var(--color-alexander-navy)]"
                        >
                          Service / job
                          <span className="ml-1 text-[var(--color-alexander-required)]" aria-hidden>
                            *
                          </span>
                        </label>
                        <select
                          id={`service-rule-${rule.id}`}
                          className="mt-1 w-full rounded-lg border border-[var(--color-alexander-border)] bg-white px-3 py-2 text-sm"
                          value={rule.serviceId}
                          onChange={(e) =>
                            updateSection4(
                              {
                                serviceBookingRules: data.serviceBookingRules.map((r) =>
                                  r.id === rule.id ? { ...r, serviceId: e.target.value } : r,
                                ),
                              },
                              { immediate: true },
                            )
                          }
                        >
                          <option value="">Select a service…</option>
                          {eligibleServices.map((s) => (
                            <option
                              key={s.id}
                              value={s.id}
                              disabled={usedElsewhere.has(s.id) && s.id !== rule.serviceId}
                            >
                              {s.label}
                            </option>
                          ))}
                        </select>
                        {submitted && errors[`serviceBookingRules.${rule.id}.serviceId`] && (
                          <p className="mt-1 text-sm text-[var(--color-alexander-required)]" role="alert">
                            {errors[`serviceBookingRules.${rule.id}.serviceId`]}
                          </p>
                        )}
                      </div>
                      <TextareaField
                        id={`service-rule-text-${rule.id}`}
                        label="Special booking rule"
                        required
                        rows={2}
                        value={rule.rule}
                        onChange={(v) =>
                          updateSection4(
                            {
                              serviceBookingRules: data.serviceBookingRules.map((r) =>
                                r.id === rule.id ? { ...r, rule: v } : r,
                              ),
                            },
                          )
                        }
                        error={submitted ? errors[`serviceBookingRules.${rule.id}.rule`] : undefined}
                      />
                    </div>
                  </div>
                );
              })}
              <SecondaryButton
                fullWidth={false}
                onClick={() =>
                  updateSection4(
                    {
                      serviceBookingRules: [
                        ...data.serviceBookingRules,
                        { id: createServiceRuleId(), serviceId: "", rule: "" },
                      ],
                    },
                    { immediate: true },
                  )
                }
              >
                + Add booking rule
              </SecondaryButton>
              {submitted && errors.serviceBookingRules && (
                <p className="text-sm text-[var(--color-alexander-required)]" role="alert">
                  {errors.serviceBookingRules}
                </p>
              )}
            </div>
            )}
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard title="When may Alexander offer same-day or holiday appointments?" required>
        <ul className="space-y-4">
          {CAPACITY_POLICY_ROWS.map((row) => {
            const entry = data.capacityPolicies[row.id] ?? { policy: "", condition: "" };
            return (
              <li
                key={row.id}
                className="rounded-lg border border-[var(--color-alexander-border)] bg-white p-4"
              >
                <p className="mb-3 text-sm font-medium text-[var(--color-alexander-navy)]">{row.label}</p>
                <CapacityOfferSegmented
                  name={`capacity-${row.id}`}
                  value={entry.policy}
                  ariaLabel={row.label}
                  onChange={(policy) => updateCapacityRow(row.id, { ...entry, policy })}
                />
                {entry.policy === "with_conditions" && (
                  <ConditionalPanel>
                    <TextareaField
                      id={`capacity-condition-${row.id}`}
                      label="Conditions"
                      required
                      rows={2}
                      value={entry.condition}
                      onChange={(v) => updateCapacityRow(row.id, { ...entry, condition: v })}
                      error={submitted ? errors[`capacityPolicies.${row.id}.condition`] : undefined}
                    />
                  </ConditionalPanel>
                )}
              </li>
            );
          })}
        </ul>
        {submitted && errors.capacityPolicies && (
          <p className="mt-3 text-sm text-[var(--color-alexander-required)]" role="alert">
            {errors.capacityPolicies}
          </p>
        )}
      </QuestionCard>

      <QuestionCard title="What may Alexander do when a customer wants to reschedule?" required>
        <RadioGroup
          name="rescheduleAuthority"
          options={CHANGE_AUTHORITY_OPTIONS}
          value={data.rescheduleAuthority}
          onChange={(v) => updateSection4({ rescheduleAuthority: v }, { immediate: true })}
          error={submitted ? errors.rescheduleAuthority : undefined}
        />
        {data.rescheduleAuthority === "conditional" && (
          <ConditionalPanel>
            <TextareaField
              id="rescheduleCondition"
              label="When may Alexander reschedule?"
              required
              rows={2}
              value={data.rescheduleCondition}
              onChange={(v) => updateSection4({ rescheduleCondition: v })}
              error={submitted ? errors.rescheduleCondition : undefined}
            />
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard title="What may Alexander do when a customer wants to cancel?" required>
        <RadioGroup
          name="cancellationAuthority"
          options={CHANGE_AUTHORITY_OPTIONS}
          value={data.cancellationAuthority}
          onChange={(v) => updateSection4({ cancellationAuthority: v }, { immediate: true })}
          error={submitted ? errors.cancellationAuthority : undefined}
        />
        {data.cancellationAuthority === "conditional" && (
          <ConditionalPanel>
            <TextareaField
              id="cancellationCondition"
              label="When may Alexander cancel?"
              required
              rows={2}
              value={data.cancellationCondition}
              onChange={(v) => updateSection4({ cancellationCondition: v })}
              error={submitted ? errors.cancellationCondition : undefined}
            />
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard title="Do you charge a late-cancellation fee?" required>
        <RadioGroup
          name="lateCancellationFeeMode"
          options={FEE_CHARGE_OPTIONS}
          value={data.lateCancellationFeeMode}
          onChange={(v) => handleFeeModeChange("late", v)}
          error={submitted ? errors.lateCancellationFeeMode : undefined}
        />
        {(data.lateCancellationFeeMode === "yes" || data.lateCancellationFeeMode === "conditional") &&
          lateFee && (
            <ConditionalPanel>
              <div className="space-y-3">
                <TextField
                  id="lateFeeAmount"
                  label="Fee amount ($)"
                  required
                  value={lateFee.amountFixed}
                  onChange={(v) => updateFee(data.lateCancellationFeeId, { amountFixed: v })}
                  error={submitted ? errors["lateCancellationFee.amountFixed"] : undefined}
                />
                <TextField
                  id="lateFeeNotice"
                  label="Notice required before cancellation"
                  required
                  value={lateFee.noticeRequired}
                  onChange={(v) => updateFee(data.lateCancellationFeeId, { noticeRequired: v })}
                  error={submitted ? errors["lateCancellationFee.noticeRequired"] : undefined}
                />
                {data.lateCancellationFeeMode === "conditional" && (
                  <TextareaField
                    id="lateFeeRule"
                    label="When does this fee apply?"
                    required
                    rows={2}
                    value={lateFee.applicationRule}
                    onChange={(v) => updateFee(data.lateCancellationFeeId, { applicationRule: v })}
                    error={submitted ? errors["lateCancellationFee.applicationRule"] : undefined}
                  />
                )}
                {submitted && errors.lateCancellationFee && (
                  <p className="text-sm text-[var(--color-alexander-required)]" role="alert">
                    {errors.lateCancellationFee}
                  </p>
                )}
              </div>
            </ConditionalPanel>
          )}
      </QuestionCard>

      <QuestionCard title="Do you charge a no-show fee?" required>
        <RadioGroup
          name="noShowFeeMode"
          options={FEE_CHARGE_OPTIONS}
          value={data.noShowFeeMode}
          onChange={(v) => handleFeeModeChange("no_show", v)}
          error={submitted ? errors.noShowFeeMode : undefined}
        />
        {(data.noShowFeeMode === "yes" || data.noShowFeeMode === "conditional") && noShowFee && (
          <ConditionalPanel>
            <div className="space-y-3">
              <TextField
                id="noShowFeeAmount"
                label="Fee amount ($)"
                required
                value={noShowFee.amountFixed}
                onChange={(v) => updateFee(data.noShowFeeId, { amountFixed: v })}
                error={submitted ? errors["noShowFee.amountFixed"] : undefined}
              />
              {data.noShowFeeMode === "conditional" && (
                <TextareaField
                  id="noShowFeeRule"
                  label="When does this fee apply?"
                  required
                  rows={2}
                  value={noShowFee.applicationRule}
                  onChange={(v) => updateFee(data.noShowFeeId, { applicationRule: v })}
                  error={submitted ? errors["noShowFee.applicationRule"] : undefined}
                />
              )}
              {submitted && errors.noShowFee && (
                <p className="text-sm text-[var(--color-alexander-required)]" role="alert">
                  {errors.noShowFee}
                </p>
              )}
            </div>
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard
        title="Are there situations where Alexander should not apply the normal cancellation or no-show rule?"
      >
        <TextareaField
          id="cancellationExceptions"
          label="Exceptions (optional)"
          optional
          rows={3}
          value={data.cancellationExceptions}
          onChange={(v) => updateSection4({ cancellationExceptions: v })}
        />
      </QuestionCard>

      <QuestionCard
        title="What should Alexander do if the customer needs service but there are no appropriate appointments available?"
        required
      >
        <PriorityOrderList
          value={data.noAvailabilityPriority}
          onChange={(v) =>
            updateSection4({ noAvailabilityPriority: v as NoAvailabilityFallbackId[] }, { immediate: true })
          }
          error={submitted ? errors.noAvailabilityPriority : undefined}
        />
      </QuestionCard>

      <QuestionCard title="May Alexander arrange a callback when no appointment is available?" required>
        <RadioGroup
          name="mayArrangeCallback"
          options={YES_NO_OPTIONS}
          value={data.mayArrangeCallback}
          onChange={(v) => {
            const patch: Partial<typeof data> = { mayArrangeCallback: v };
            if (v === "yes" && !data.callbackNumberPolicy) {
              patch.callbackNumberPolicy = "calling_from";
            }
            updateSection4(patch, { immediate: true });
          }}
          error={submitted ? errors.mayArrangeCallback : undefined}
        />
      </QuestionCard>

      {data.mayArrangeCallback === "yes" && (
        <>
          <QuestionCard title="What phone number should Alexander use for the callback?" required>
            <RadioGroup
              name="callbackNumberPolicy"
              options={CALLBACK_NUMBER_OPTIONS}
              value={data.callbackNumberPolicy}
              onChange={(v) => updateSection4({ callbackNumberPolicy: v }, { immediate: true })}
              error={submitted ? errors.callbackNumberPolicy : undefined}
            />
          </QuestionCard>

          <QuestionCard title="Who should receive or handle scheduling callbacks?" required>
            <ContactPicker
              name="callbackOwnerContactId"
              contacts={identityContacts}
              value={data.callbackOwnerContactId}
              onSelect={(id) => updateSection4({ callbackOwnerContactId: id }, { immediate: true })}
              onAddNew={() => {
                const id = addContact();
                updateSection4({ callbackOwnerContactId: id }, { immediate: true });
              }}
              error={submitted ? errors.callbackOwnerContactId : undefined}
            />
            {callbackOwnerIsNew && callbackOwner && (
              <ConditionalPanel>
                <ContactCardEditor
                  idPrefix="callback-owner"
                  contact={callbackOwner}
                  profile="approver"
                  onChange={(patch) => updateContact(callbackOwner.id, patch, { immediate: true })}
                  errors={submitted ? mapCallbackOwnerErrors(errors) : undefined}
                />
              </ConditionalPanel>
            )}
          </QuestionCard>
        </>
      )}

      <QuestionCard title="Are there any jobs that require a particular technician?" required>
        <RadioGroup
          name="hasTechnicianAssignments"
          options={YES_NO_OPTIONS}
          value={data.hasTechnicianAssignments}
          onChange={(v) => updateSection4({ hasTechnicianAssignments: v }, { immediate: true })}
          error={submitted ? errors.hasTechnicianAssignments : undefined}
        />
        {data.hasTechnicianAssignments === "yes" && (
          <ConditionalPanel>
            <div className="space-y-3">
              {data.technicianAssignments.map((row, index) => (
                <TechnicianAssignmentCard
                  key={row.id}
                  row={row}
                  index={index}
                  eligibleServices={eligibleServices}
                  contacts={identityContacts}
                  submitted={submitted}
                  errors={errors}
                  onChange={(patch) =>
                    updateSection4(
                      {
                        technicianAssignments: data.technicianAssignments.map((r) =>
                          r.id === row.id ? { ...r, ...patch } : r,
                        ),
                      },
                      { immediate: true },
                    )
                  }
                  onRemove={() =>
                    updateSection4(
                      {
                        technicianAssignments: data.technicianAssignments.filter(
                          (r) => r.id !== row.id,
                        ),
                      },
                      { immediate: true },
                    )
                  }
                  onAddTechnicianContact={() => {
                    const id = addContact();
                    updateSection4(
                      {
                        technicianAssignments: data.technicianAssignments.map((r) =>
                          r.id === row.id
                            ? {
                                ...r,
                                technicianSource: "contact",
                                technicianContactId: id,
                                technicianName: "",
                              }
                            : r,
                        ),
                      },
                      { immediate: true },
                    );
                  }}
                  updateContact={(id, patch) => updateContact(id, patch, { immediate: true })}
                />
              ))}
              <SecondaryButton
                fullWidth={false}
                onClick={() =>
                  updateSection4(
                    {
                      technicianAssignments: [
                        ...data.technicianAssignments,
                        {
                          id: createTechnicianAssignmentId(),
                          serviceId: "",
                          otherJobName: "",
                          technicianSource: "",
                          technicianContactId: "",
                          technicianName: "",
                        },
                      ],
                    },
                    { immediate: true },
                  )
                }
              >
                + Add assignment
              </SecondaryButton>
              {submitted && errors.technicianAssignments && (
                <p className="text-sm text-[var(--color-alexander-required)]" role="alert">
                  {errors.technicianAssignments}
                </p>
              )}
            </div>
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard title="What should Alexander do if a customer asks for a specific technician?" required>
        <RadioGroup
          name="specificTechnicianRequest"
          options={SPECIFIC_TECH_OPTIONS}
          value={data.specificTechnicianRequest}
          onChange={(v) => updateSection4({ specificTechnicianRequest: v }, { immediate: true })}
          error={submitted ? errors.specificTechnicianRequest : undefined}
        />
      </QuestionCard>

      <QuestionCard
        title="If a customer wants help with more than one plumbing problem, what should Alexander normally do?"
        required
      >
        <RadioGroup
          name="multiIssueMode"
          options={MULTI_ISSUE_OPTIONS}
          value={data.multiIssueMode}
          onChange={(v) => updateSection4({ multiIssueMode: v }, { immediate: true })}
          error={submitted ? errors.multiIssueMode : undefined}
        />
        {data.multiIssueMode === "separate_issues" && (
          <ConditionalPanel>
            {eligibleServices.length === 0 && (
              <p className="mb-3 text-sm text-[var(--color-alexander-muted)]">
                No registered services from Section 2 are currently eligible. You can still describe
                other work below, or configure offered services in Section 2.
              </p>
            )}
            <CheckboxGroup
              name="separateIssueServiceIds"
              options={separateIssueOptions}
              value={[
                ...data.separateIssueServiceIds,
                ...(data.separateIssueOther ? ["other-separate-issue"] : []),
              ]}
              onChange={(selected) => {
                const hasOther = selected.includes("other-separate-issue");
                const serviceIds = selected.filter((id) => id !== "other-separate-issue");
                updateSection4(
                  {
                    separateIssueServiceIds: serviceIds,
                    separateIssueOther: hasOther,
                    ...(!hasOther ? { separateIssueOtherDetail: "" } : {}),
                  },
                  { immediate: true },
                );
              }}
              error={submitted ? errors.separateIssueSelection : undefined}
            />
            {data.separateIssueOther && (
              <TextareaField
                id="separateIssueOtherDetail"
                label="Describe other work that needs its own appointment"
                required
                rows={2}
                value={data.separateIssueOtherDetail}
                onChange={(v) => updateSection4({ separateIssueOtherDetail: v })}
                error={submitted ? errors.separateIssueOtherDetail : undefined}
              />
            )}
          </ConditionalPanel>
        )}
      </QuestionCard>

      {!readOnly && (
        <div className="flex flex-col gap-3 pt-4 sm:flex-row">
          <SecondaryButton
            className="sm:flex-1"
            onClick={() => router.push("/onboarding/sections/4/intro")}
          >
            Back
          </SecondaryButton>
          <PrimaryButton className="sm:flex-1" onClick={handleContinue}>
            Complete Section 4 →
          </PrimaryButton>
        </div>
      )}
    </div>
  );
}

function TechnicianAssignmentCard({
  row,
  index,
  eligibleServices,
  contacts,
  submitted,
  errors,
  onChange,
  onRemove,
  onAddTechnicianContact,
  updateContact,
}: {
  row: TechnicianAssignment;
  index: number;
  eligibleServices: { id: string; label: string }[];
  contacts: Contact[];
  submitted: boolean;
  errors: FieldErrors;
  onChange: (patch: Partial<TechnicianAssignment>) => void;
  onRemove: () => void;
  onAddTechnicianContact: () => void;
  updateContact: (id: string, patch: Partial<Contact>) => void;
}) {
  const [otherJobMode, setOtherJobMode] = useState(Boolean(row.otherJobName) && !row.serviceId);
  useEffect(() => {
    if (row.serviceId) setOtherJobMode(false);
    else if (row.otherJobName) setOtherJobMode(true);
  }, [row.serviceId, row.otherJobName]);
  const jobSelectValue = row.serviceId || (otherJobMode || row.otherJobName ? "__other__" : "");
  const showOtherJobField = jobSelectValue === "__other__";
  const techContact = contacts.find((c) => c.id === row.technicianContactId);
  const allContacts = techContact && !contacts.some((c) => c.id === techContact.id)
    ? [...contacts, techContact]
    : contacts;
  const showTechCard = techContact && !contactHasIdentity(techContact);
  const techSource =
    row.technicianSource ||
    (row.technicianName ? "name" : row.technicianContactId ? "contact" : "");

  return (
    <div className="rounded-lg border border-[var(--color-alexander-border)] bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-[var(--color-alexander-navy)]">Assignment {index + 1}</p>
        <button
          type="button"
          onClick={onRemove}
          className="text-sm text-[var(--color-alexander-muted)] hover:text-[var(--color-alexander-required)]"
        >
          Remove
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-[var(--color-alexander-navy)]">
            Job or service
            <span className="ml-1 text-[var(--color-alexander-required)]" aria-hidden>*</span>
          </label>
          <select
            value={jobSelectValue}
            onChange={(e) => {
              if (e.target.value === "__other__") {
                setOtherJobMode(true);
                onChange({ serviceId: "", otherJobName: row.otherJobName });
              } else {
                setOtherJobMode(false);
                onChange({ serviceId: e.target.value, otherJobName: "" });
              }
            }}
            className="mt-2 w-full rounded-lg border border-[var(--color-alexander-border)] bg-white px-3 py-2.5 text-sm"
          >
            <option value="">Select a service…</option>
            {eligibleServices.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
            <option value="__other__">Other job</option>
          </select>
          {showOtherJobField && (
            <TextField
              id={`tech-other-job-${row.id}`}
              label="Other job description"
              required
              value={row.otherJobName}
              onChange={(v) => onChange({ otherJobName: v, serviceId: "" })}
              error={submitted ? errors[`technicianAssignments.${row.id}.job`] : undefined}
            />
          )}
          {submitted &&
            errors[`technicianAssignments.${row.id}.job`] &&
            !showOtherJobField &&
            !row.serviceId && (
              <p className="mt-2 text-sm text-[var(--color-alexander-required)]" role="alert">
                {errors[`technicianAssignments.${row.id}.job`]}
              </p>
            )}
          {submitted && errors[`technicianAssignments.${row.id}.serviceId`] && (
            <p className="mt-2 text-sm text-[var(--color-alexander-required)]" role="alert">
              {errors[`technicianAssignments.${row.id}.serviceId`]}
            </p>
          )}
        </div>

        <div>
          <p className="text-sm font-medium text-[var(--color-alexander-navy)]">Required technician</p>
          <RadioGroup
            name={`tech-source-${row.id}`}
            options={[
              { value: "contact" as const, label: "Select from contacts" },
              { value: "name" as const, label: "Enter technician name" },
            ]}
            value={techSource}
            onChange={(v) => {
              if (v === "name") {
                onChange({ technicianSource: v, technicianContactId: "" });
              } else {
                onChange({ technicianSource: v, technicianName: "" });
              }
            }}
          />
          {techSource === "contact" ? (
            <div className="mt-3">
              <ContactPicker
                name={`tech-contact-${row.id}`}
                contacts={allContacts.filter((c) => contactHasIdentity(c) || c.id === row.technicianContactId)}
                value={row.technicianContactId}
                onSelect={(id) => onChange({ technicianContactId: id, technicianSource: "contact" })}
                onAddNew={onAddTechnicianContact}
              />
              {showTechCard && techContact && (
                <div className="mt-4 rounded-lg border border-[var(--color-alexander-border)] p-4">
                  <ContactCardEditor
                    idPrefix={`tech-${row.id}`}
                    contact={techContact}
                    profile="approver"
                    onChange={(patch) => updateContact(techContact.id, patch)}
                  />
                </div>
              )}
            </div>
          ) : techSource === "name" ? (
            <TextField
              id={`tech-name-${row.id}`}
              label="Technician name"
              required
              value={row.technicianName}
              onChange={(v) => onChange({ technicianName: v, technicianSource: "name" })}
              error={submitted ? errors[`technicianAssignments.${row.id}.technician`] : undefined}
            />
          ) : null}
          {submitted &&
            errors[`technicianAssignments.${row.id}.technician`] &&
            techSource !== "name" &&
            !row.technicianName && (
              <p className="mt-2 text-sm text-[var(--color-alexander-required)]" role="alert">
                {errors[`technicianAssignments.${row.id}.technician`]}
              </p>
            )}
        </div>
      </div>
    </div>
  );
}
