"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboarding } from "@/lib/onboarding/OnboardingContext";
import { QuestionCard, ConditionalPanel } from "./ui/Card";
import { TextField, TextareaField } from "./ui/Fields";
import { RadioGroup } from "./ui/RadioGroup";
import { PrimaryButton, SecondaryButton } from "./ui/Buttons";
import { PhoneField } from "./ui/PhoneField";
import { AdditionalSoftwareCardEditor } from "./AdditionalSoftwareCardEditor";
import {
  ADDITIONAL_SOFTWARE_CATEGORIES,
  CONNECTION_OWNER_OPTIONS,
  CRM_FSM_OPTIONS,
  DISPATCH_OPTIONS,
  FAILURE_FALLBACK_OPTIONS,
  INTEGRATION_CAPABILITY_OPTIONS,
  PHONE_OPTIONS,
  Q109_HELP,
  Q111_NOTICE,
  Q112_HELP,
  SCHEDULING_OPTIONS,
} from "@/lib/onboarding/section8Catalog";
import {
  applyCrmCustomNameChange,
  applyCrmProviderChange,
  applyDispatchCustomNameChange,
  applyDispatchProviderChange,
  applyPhoneCustomNameChange,
  applyPhoneProviderChange,
  applySchedulingCustomNameChange,
  applySchedulingProviderChange,
  schedulingSameAsCrmDisabled,
  toggleAdditionalCategory,
  toggleCapability,
  updateAdditionalCard,
} from "@/lib/onboarding/section8FormLogic";
import { crmAllowsSchedulingSameAs } from "@/lib/onboarding/softwareRegistry";
import { validateSection8, type FieldErrors } from "@/lib/onboarding/validation/section8";

type Props = { mode?: "form" | "review" };

export function Section8Form({ mode = "form" }: Props) {
  const { draft, saveDraftNow, updateSection8 } = useOnboarding();
  const router = useRouter();
  const readOnly = mode === "review";
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const data = draft.section8;

  const applyDraft = (next: typeof draft) => {
    void saveDraftNow(next);
  };

  const handleContinue = () => {
    const nextErrors = validateSection8(draft.section8, draft.systems);
    setErrors(nextErrors);
    setSubmitted(true);
    if (Object.keys(nextErrors).length > 0) return;
    router.push("/onboarding/sections/8/complete");
  };

  const schedulingOptions = SCHEDULING_OPTIONS.map((o) => ({
    value: o.id,
    label: o.label,
    disabled: o.id === "same_as_crm" && schedulingSameAsCrmDisabled(data),
  }));

  return (
    <div className="space-y-8">
      <QuestionCard title="What system do you use to manage customers, jobs, or field-service operations?">
        <RadioGroup
          name="crmFsmProvider"
          options={CRM_FSM_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
          value={data.crmFsmProvider}
          onChange={(v) => applyDraft(applyCrmProviderChange(draft, v as typeof data.crmFsmProvider))}
          error={submitted ? errors.crmFsmProvider : undefined}
        />
        {data.crmFsmProvider === "custom" && (
          <ConditionalPanel>
            <TextField
              id="crmFsmCustomName"
              label="System name"
              value={data.crmFsmCustomName}
              onChange={(v) => applyDraft(applyCrmCustomNameChange(draft, v))}
              error={submitted ? errors.crmFsmCustomName : undefined}
            />
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard title="Where does your company manage appointments and availability?">
        <RadioGroup
          name="schedulingProvider"
          options={schedulingOptions}
          value={data.schedulingProvider}
          onChange={(v) =>
            applyDraft(applySchedulingProviderChange(draft, v as typeof data.schedulingProvider))
          }
          error={submitted ? errors.schedulingProvider : undefined}
        />
        {!crmAllowsSchedulingSameAs(data) && (
          <p className="mt-2 text-xs text-[var(--color-alexander-muted)]">
            “Same system selected above” is unavailable when you do not use a CRM/field-service system.
          </p>
        )}
        {data.schedulingProvider === "custom" && (
          <ConditionalPanel>
            <TextField
              id="schedulingCustomName"
              label="Scheduling system name"
              value={data.schedulingCustomName}
              onChange={(v) => applyDraft(applySchedulingCustomNameChange(draft, v))}
              error={submitted ? errors.schedulingCustomName : undefined}
            />
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard title="Where does your team manage technician schedules or dispatch?">
        <RadioGroup
          name="dispatchProvider"
          options={DISPATCH_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
          value={data.dispatchProvider}
          onChange={(v) =>
            applyDraft(applyDispatchProviderChange(draft, v as typeof data.dispatchProvider))
          }
          error={submitted ? errors.dispatchProvider : undefined}
        />
        <p className="mt-2 text-xs text-[var(--color-alexander-muted)]">
          “Same system selected above” refers to the software resolved from your appointment/scheduling
          answer (which may itself reference your CRM).
        </p>
        {data.dispatchProvider === "custom" && (
          <ConditionalPanel>
            <TextField
              id="dispatchCustomName"
              label="Dispatch system name"
              value={data.dispatchCustomName}
              onChange={(v) => applyDraft(applyDispatchCustomNameChange(draft, v))}
              error={submitted ? errors.dispatchCustomName : undefined}
            />
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard title="What system currently handles your business phone calls?">
        <RadioGroup
          name="phoneProvider"
          options={PHONE_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
          value={data.phoneProvider}
          onChange={(v) => applyDraft(applyPhoneProviderChange(draft, v as typeof data.phoneProvider))}
          error={submitted ? errors.phoneProvider : undefined}
        />
        {data.phoneProvider === "custom" && (
          <ConditionalPanel>
            <TextField
              id="phoneCustomName"
              label="Phone system name"
              value={data.phoneCustomName}
              onChange={(v) => applyDraft(applyPhoneCustomNameChange(draft, v))}
              error={submitted ? errors.phoneCustomName : undefined}
            />
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard
        title="Do you use any other software Alexander may need to work with?"
        optional
      >
        <fieldset>
          <legend className="sr-only">Additional software categories</legend>
          <div className="space-y-2">
            {ADDITIONAL_SOFTWARE_CATEGORIES.map((cat) => {
              const checked = data.additionalSoftwareCategories.includes(cat.id);
              return (
                <label
                  key={cat.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--color-alexander-border)] px-4 py-3"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[var(--color-alexander-blue)]"
                    checked={checked}
                    disabled={readOnly}
                    onChange={() => applyDraft(toggleAdditionalCategory(draft, cat.id))}
                  />
                  <span className="text-sm text-[var(--color-alexander-navy)]">{cat.label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
        {submitted && errors.additionalSoftwareCategories && (
          <p className="mt-2 text-sm text-[var(--color-alexander-error)]" role="alert">
            {errors.additionalSoftwareCategories}
          </p>
        )}
        <div className="mt-4 space-y-4">
          {data.additionalSoftwareCategories
            .filter((c) => c !== "none")
            .map((catId) => {
              const card = data.additionalSoftwareCards.find((c) => c.categoryId === catId);
              const label = ADDITIONAL_SOFTWARE_CATEGORIES.find((c) => c.id === catId)?.label ?? catId;
              if (!card) return null;
              return (
                <AdditionalSoftwareCardEditor
                  key={catId}
                  categoryLabel={label}
                  card={card}
                  errors={errors}
                  submitted={submitted}
                  onChange={(patch) => applyDraft(updateAdditionalCard(draft, catId, patch))}
                />
              );
            })}
        </div>
      </QuestionCard>

      <QuestionCard
        title="Which of these should Alexander be able to do when your software supports it?"
        helpText={Q109_HELP}
      >
        <fieldset>
          <legend className="sr-only">Authorized software capabilities</legend>
          <div className="space-y-2">
            {INTEGRATION_CAPABILITY_OPTIONS.map((cap) => (
              <label
                key={cap.id}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--color-alexander-border)] px-4 py-3"
              >
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-[var(--color-alexander-blue)]"
                  checked={data.authorizedCapabilities.includes(cap.id)}
                  disabled={readOnly}
                  onChange={() => {
                    updateSection8({
                      authorizedCapabilities: toggleCapability(data, cap.id).authorizedCapabilities,
                    });
                  }}
                />
                <span className="text-sm text-[var(--color-alexander-navy)]">{cap.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {data.authorizedCapabilities.includes("other") && (
          <ConditionalPanel>
            <TextField
              id="authorizedCapabilityOther"
              label="Other capability"
              value={data.authorizedCapabilityOther}
              onChange={(v) => updateSection8({ authorizedCapabilityOther: v })}
              error={submitted ? errors.authorizedCapabilityOther : undefined}
            />
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard title="Are you an administrator or authorized person for these systems?">
        <RadioGroup
          name="connectionOwnerMode"
          options={CONNECTION_OWNER_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
          value={data.connectionOwnerMode}
          onChange={(v) =>
            updateSection8({ connectionOwnerMode: v as typeof data.connectionOwnerMode })
          }
          error={submitted ? errors.connectionOwnerMode : undefined}
        />
        {data.connectionOwnerMode === "someone_else" && (
          <ConditionalPanel>
            <div className="space-y-4">
            <TextField
              id="connectionOwnerName"
              label="Name"
              value={data.connectionOwnerName}
              onChange={(v) => updateSection8({ connectionOwnerName: v })}
              error={submitted ? errors.connectionOwnerName : undefined}
            />
            <TextField
              id="connectionOwnerEmail"
              label="Email"
              type="email"
              value={data.connectionOwnerEmail}
              onChange={(v) => updateSection8({ connectionOwnerEmail: v })}
              error={submitted ? errors.connectionOwnerEmail : undefined}
            />
            <div>
              <label htmlFor="connectionOwnerPhone" className="text-sm font-medium text-[var(--color-alexander-navy)]">
                Phone
              </label>
              <PhoneField
                id="connectionOwnerPhone"
                value={data.connectionOwnerPhone}
                onChange={(v) => updateSection8({ connectionOwnerPhone: v })}
                error={submitted ? errors.connectionOwnerPhone : undefined}
              />
            </div>
            </div>
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard title="Software connection notice">
        <p className="mb-4 text-sm text-[var(--color-alexander-muted)]">{Q111_NOTICE}</p>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--color-alexander-border)] px-4 py-3">
          <input
            type="checkbox"
            className="mt-0.5 h-5 w-5 accent-[var(--color-alexander-blue)]"
            checked={data.connectionNoticeAcknowledged}
            disabled={readOnly}
            onChange={(e) =>
              updateSection8({ connectionNoticeAcknowledged: e.target.checked }, { immediate: true })
            }
          />
          <span className="text-sm text-[var(--color-alexander-navy)]">I understand</span>
        </label>
        {submitted && errors.connectionNoticeAcknowledged && (
          <p className="mt-2 text-sm text-[var(--color-alexander-error)]" role="alert">
            {errors.connectionNoticeAcknowledged}
          </p>
        )}
      </QuestionCard>

      <QuestionCard
        title="If Alexander temporarily cannot access information or complete an action through your software, what should he normally do?"
        helpText={Q112_HELP}
      >
        <RadioGroup
          name="failureFallback"
          options={FAILURE_FALLBACK_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
          value={data.failureFallback}
          onChange={(v) =>
            updateSection8({ failureFallback: v as typeof data.failureFallback })
          }
          error={submitted ? errors.failureFallback : undefined}
        />
        {data.failureFallback === "custom" && (
          <ConditionalPanel>
            <TextareaField
              id="failureFallbackCustom"
              label="Custom fallback rule"
              rows={3}
              value={data.failureFallbackCustom}
              onChange={(v) => updateSection8({ failureFallbackCustom: v })}
            />
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard
        title="Anything else Alexander should know about how your company operates?"
        optional
      >
        <TextareaField
          id="finalOperatingNotes"
          label=""
          rows={5}
          value={data.finalOperatingNotes}
          onChange={(v) => updateSection8({ finalOperatingNotes: v })}
        />
      </QuestionCard>

      {!readOnly && (
        <div className="flex flex-col gap-3 pt-4 sm:flex-row">
          <SecondaryButton className="sm:flex-1" onClick={() => router.push("/onboarding/sections/8/intro")}>
            Back
          </SecondaryButton>
          <PrimaryButton className="sm:flex-1" onClick={handleContinue}>
            Complete Section 8 →
          </PrimaryButton>
        </div>
      )}
    </div>
  );
}
