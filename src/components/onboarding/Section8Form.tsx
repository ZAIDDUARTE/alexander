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
  FAILURE_CUSTOM_PLACEHOLDER,
  FAILURE_FALLBACK_OPTIONS,
  FINAL_NOTES_PLACEHOLDER,
  PHONE_OPTIONS,
  Q111_NOTICE_PARAGRAPHS,
  Q112_HELP,
  SCHEDULING_OPTIONS,
} from "@/lib/onboarding/section8Catalog";
import {
  applyCrmCustomNameChange,
  applyCrmProviderChange,
  applyPhoneCustomNameChange,
  applyPhoneProviderChange,
  applySchedulingCustomNameChange,
  applySchedulingProviderChange,
  schedulingSameAsCrmDisabled,
  toggleAdditionalCategory,
  updateAdditionalCard,
} from "@/lib/onboarding/section8FormLogic";
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
      <QuestionCard
        title="What software does your company use to manage customers and jobs?"
        required
      >
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
              label="What system do you use?"
              placeholder="Enter software name"
              value={data.crmFsmCustomName}
              onChange={(v) => applyDraft(applyCrmCustomNameChange(draft, v))}
              error={submitted ? errors.crmFsmCustomName : undefined}
            />
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard
        title="Where does your company manage appointment availability?"
        required
      >
        <RadioGroup
          name="schedulingProvider"
          options={schedulingOptions}
          value={data.schedulingProvider}
          onChange={(v) =>
            applyDraft(applySchedulingProviderChange(draft, v as typeof data.schedulingProvider))
          }
          error={submitted ? errors.schedulingProvider : undefined}
        />
        {data.schedulingProvider === "custom" && (
          <ConditionalPanel>
            <TextField
              id="schedulingCustomName"
              label="What scheduling system do you use?"
              placeholder="Enter software name"
              value={data.schedulingCustomName}
              onChange={(v) => applyDraft(applySchedulingCustomNameChange(draft, v))}
              error={submitted ? errors.schedulingCustomName : undefined}
            />
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard title="What phone system do you currently use?" required>
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
              label="What phone system do you use?"
              placeholder="Enter software name"
              value={data.phoneCustomName}
              onChange={(v) => applyDraft(applyPhoneCustomNameChange(draft, v))}
              error={submitted ? errors.phoneCustomName : undefined}
            />
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard
        title="Do you use any other software Alexander may need to work with?"
        required
      >
        <fieldset>
          <legend className="sr-only">Additional software categories</legend>
          <div className="space-y-2">
            {ADDITIONAL_SOFTWARE_CATEGORIES.map((cat) => {
              const checked = data.additionalSoftwareCategories.includes(cat.id);
              return (
                <div
                  key={cat.id}
                  className="flex items-center gap-3 rounded-lg border border-[var(--color-alexander-border)] px-4 py-3"
                >
                  <input
                    id={`additional-software-${cat.id}`}
                    name={`additional-software-${cat.id}`}
                    type="checkbox"
                    value={cat.id}
                    className="h-4 w-4 accent-[var(--color-alexander-blue)]"
                    checked={checked}
                    disabled={readOnly}
                    onChange={() => applyDraft(toggleAdditionalCategory(draft, cat.id))}
                  />
                  <label
                    htmlFor={`additional-software-${cat.id}`}
                    className="cursor-pointer text-sm text-[var(--color-alexander-navy)]"
                  >
                    {cat.label}
                  </label>
                </div>
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

      <QuestionCard title="Who can authorize Alexander to connect to these systems?" required>
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
            <p className="text-sm font-medium text-[var(--color-alexander-navy)]">Who should we work with?</p>
            <div className="space-y-4">
            <TextField
              id="connectionOwnerName"
              label="Name"
              placeholder="Enter name"
              value={data.connectionOwnerName}
              onChange={(v) => updateSection8({ connectionOwnerName: v })}
              error={submitted ? errors.connectionOwnerName : undefined}
            />
            <TextField
              id="connectionOwnerEmail"
              label="Email"
              placeholder="Enter email"
              type="email"
              value={data.connectionOwnerEmail}
              onChange={(v) => updateSection8({ connectionOwnerEmail: v })}
              error={submitted ? errors.connectionOwnerEmail : undefined}
            />
            <div>
              <label htmlFor="connectionOwnerPhone" className="text-sm font-medium text-[var(--color-alexander-navy)]">
                Phone (optional)
              </label>
              <PhoneField
                id="connectionOwnerPhone"
                placeholder="Enter phone number"
                value={data.connectionOwnerPhone}
                onChange={(v) => updateSection8({ connectionOwnerPhone: v })}
                error={submitted ? errors.connectionOwnerPhone : undefined}
              />
            </div>
            </div>
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard title="Software connection notice" required>
        <div className="mb-4 space-y-3 text-sm text-[var(--color-alexander-navy)]">
          {Q111_NOTICE_PARAGRAPHS.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <div className="flex items-start gap-3 rounded-lg border border-[var(--color-alexander-border)] px-4 py-3">
          <input
            id="connection-notice-acknowledged"
            name="connection-notice-acknowledged"
            type="checkbox"
            value="acknowledged"
            className="mt-0.5 h-5 w-5 accent-[var(--color-alexander-blue)]"
            checked={data.connectionNoticeAcknowledged}
            disabled={readOnly}
            onChange={(e) =>
              updateSection8({ connectionNoticeAcknowledged: e.target.checked }, { immediate: true })
            }
          />
          <label htmlFor="connection-notice-acknowledged" className="cursor-pointer text-sm text-[var(--color-alexander-navy)]">
            I understand
          </label>
        </div>
        {submitted && errors.connectionNoticeAcknowledged && (
          <p className="mt-2 text-sm text-[var(--color-alexander-error)]" role="alert">
            {errors.connectionNoticeAcknowledged}
          </p>
        )}
      </QuestionCard>

      <QuestionCard
        title="If Alexander can’t access a system or complete an action, what should he normally do?"
        required
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
              label="What should Alexander do?"
              placeholder={FAILURE_CUSTOM_PLACEHOLDER}
              rows={3}
              required
              value={data.failureFallbackCustom}
              onChange={(v) => updateSection8({ failureFallbackCustom: v })}
              error={submitted ? errors.failureFallbackCustom : undefined}
            />
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard
        title="Is there anything important about your company that we haven’t asked?"
        helpText="Anything else Alexander should know about how your company operates?"
        optional
      >
        <TextareaField
          id="finalOperatingNotes"
          label=""
          rows={5}
          placeholder={FINAL_NOTES_PLACEHOLDER}
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
