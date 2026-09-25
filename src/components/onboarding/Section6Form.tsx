"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboarding } from "@/lib/onboarding/OnboardingContext";
import { QuestionCard, ConditionalPanel } from "./ui/Card";
import { TextareaField } from "./ui/Fields";
import { RadioGroup } from "./ui/RadioGroup";
import { CheckboxGroup } from "./ui/CheckboxGroup";
import { PrimaryButton, SecondaryButton } from "./ui/Buttons";
import { NonServiceCallMatrix } from "./NonServiceCallMatrix";
import { addCompletedSection } from "@/lib/onboarding/draft-utils";
import {
  ADDITIONAL_SERVICE_HELP,
  ADDITIONAL_SERVICE_POLICY_OPTIONS,
  CUSTOMER_HISTORY_HELP,
  CUSTOMER_HISTORY_POLICY_OPTIONS,
  ESCALATION_TRIGGER_OPTIONS,
  FORBIDDEN_UNHAPPY_PROMISE_OPTIONS,
  PREVIOUS_WORK_INITIAL_ACTION_OPTIONS,
  REPEAT_CALLBACK_ACTION_OPTIONS,
  RESTRICTED_INFORMATION_OPTIONS,
  type NonServiceCallTypeId,
} from "@/lib/onboarding/section6Catalog";
import type {
  EscalationTriggerId,
  ForbiddenUnhappyPromiseId,
  RestrictedInformationId,
} from "@/lib/onboarding/types";
import { validateSection6, type FieldErrors } from "@/lib/onboarding/validation/section6";

// Re-export catalog options for radio/checkbox (value/label shape)
const PREVIOUS_WORK_OPTIONS = PREVIOUS_WORK_INITIAL_ACTION_OPTIONS.map((o) => ({
  value: o.id,
  label: o.label,
}));
const REPEAT_CALLBACK_OPTIONS = REPEAT_CALLBACK_ACTION_OPTIONS.map((o) => ({
  value: o.id,
  label: o.label,
}));
const ESCALATION_OPTIONS = ESCALATION_TRIGGER_OPTIONS.map((o) => ({
  value: o.id,
  label: o.label,
}));
const FORBIDDEN_OPTIONS = FORBIDDEN_UNHAPPY_PROMISE_OPTIONS.map((o) => ({
  value: o.id,
  label: o.label,
}));
const HISTORY_OPTIONS = CUSTOMER_HISTORY_POLICY_OPTIONS.map((o) => ({
  value: o.id,
  label: o.label,
}));
const RESTRICTED_OPTIONS = RESTRICTED_INFORMATION_OPTIONS.map((o) => ({
  value: o.id,
  label: o.label,
}));
const SALES_OPTIONS = ADDITIONAL_SERVICE_POLICY_OPTIONS.map((o) => ({
  value: o.id,
  label: o.label,
}));

export function Section6Form({ mode = "form" }: { mode?: "form" | "review" }) {
  const { draft, updateSection6, updateContact, addContact, saveDraftNow } = useOnboarding();
  const router = useRouter();
  const data = draft.section6;
  const contacts = draft.contacts;
  const readOnly = mode === "review";
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const handleContinue = async () => {
    const nextErrors = validateSection6(data, contacts);
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
        sectionId: 6,
        completedSections: addCompletedSection(draft.navigation.completedSections, 6),
      },
    };
    await saveDraftNow(finalDraft);
    router.push("/onboarding/sections/6/complete");
  };

  const q84SchedulesReturn = data.repeatCallbackAction === "schedule_another_return";
  const q83ShowsReturnEditor = data.previousWorkInitialAction === "schedule_return_visit";
  const returnRuleFilled = Boolean(data.returnVisitEligibilityRule.trim());

  return (
    <div className="space-y-6">
      <QuestionCard
        title="When a customer calls about a problem with previous work, what should Alexander normally do first?"
        required
      >
        <RadioGroup
          name="previousWorkInitialAction"
          options={PREVIOUS_WORK_OPTIONS}
          value={data.previousWorkInitialAction}
          onChange={(v) =>
            updateSection6({ previousWorkInitialAction: v }, { immediate: true })
          }
          error={submitted ? errors.previousWorkInitialAction : undefined}
        />
        {data.previousWorkInitialAction === "schedule_return_visit" && (
          <ConditionalPanel>
            <TextareaField
              id="returnVisitEligibilityRule"
              label="When is a return visit allowed?"
              rows={3}
              required
              value={data.returnVisitEligibilityRule}
              onChange={(v) => updateSection6({ returnVisitEligibilityRule: v })}
              error={submitted ? errors.returnVisitEligibilityRule : undefined}
            />
          </ConditionalPanel>
        )}
        {data.previousWorkInitialAction === "custom" && (
          <ConditionalPanel>
            <TextareaField
              id="previousWorkCustomRule"
              label="What rule should Alexander follow?"
              rows={3}
              value={data.previousWorkCustomRule}
              onChange={(v) => updateSection6({ previousWorkCustomRule: v })}
            />
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard
        title="What should Alexander do if the customer has already called back about the same problem?"
        required
      >
        <RadioGroup
          name="repeatCallbackAction"
          options={REPEAT_CALLBACK_OPTIONS}
          value={data.repeatCallbackAction}
          onChange={(v) => updateSection6({ repeatCallbackAction: v }, { immediate: true })}
          error={submitted ? errors.repeatCallbackAction : undefined}
        />
        {q84SchedulesReturn && (
          <ConditionalPanel>
            {q83ShowsReturnEditor && returnRuleFilled ? (
              <>
                <p className="text-sm text-[var(--color-alexander-muted)]">
                  Alexander will reuse this return-visit eligibility rule:
                </p>
                <p className="mt-2 text-sm font-medium text-[var(--color-alexander-navy)]">
                  {data.returnVisitEligibilityRule}
                </p>
              </>
            ) : (
              !q83ShowsReturnEditor && (
                <TextareaField
                  id="returnVisitEligibilityRule-q84"
                  label="When is a return visit allowed?"
                  rows={3}
                  required
                  value={data.returnVisitEligibilityRule}
                  onChange={(v) => updateSection6({ returnVisitEligibilityRule: v })}
                  error={submitted ? errors.returnVisitEligibilityRule : undefined}
                />
              )
            )}
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard title="When should Alexander escalate an unhappy customer to your team?" required>
        <CheckboxGroup
          name="escalationTriggers"
          options={ESCALATION_OPTIONS}
          value={data.escalationTriggers}
          onChange={(v) =>
            updateSection6({ escalationTriggers: v as EscalationTriggerId[] }, { immediate: true })
          }
          error={submitted ? errors.escalationTriggers : undefined}
        />
        {data.escalationTriggers.includes("other") && (
          <ConditionalPanel>
            <TextareaField
              id="escalationTriggerOther"
              label="Describe the other escalation trigger"
              rows={2}
              value={data.escalationTriggerOther}
              onChange={(v) => updateSection6({ escalationTriggerOther: v })}
              error={submitted ? errors.escalationTriggerOther : undefined}
            />
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard title="What should Alexander never promise an unhappy customer?" required>
        <CheckboxGroup
          name="forbiddenUnhappyPromises"
          options={FORBIDDEN_OPTIONS}
          value={data.forbiddenUnhappyPromises}
          onChange={(v) =>
            updateSection6(
              { forbiddenUnhappyPromises: v as ForbiddenUnhappyPromiseId[] },
              { immediate: true },
            )
          }
          error={submitted ? errors.forbiddenUnhappyPromises : undefined}
        />
        {data.forbiddenUnhappyPromises.includes("other") && (
          <ConditionalPanel>
            <TextareaField
              id="forbiddenUnhappyPromiseOther"
              label="Describe the other prohibited promise"
              rows={2}
              value={data.forbiddenUnhappyPromiseOther}
              onChange={(v) => updateSection6({ forbiddenUnhappyPromiseOther: v })}
              error={submitted ? errors.forbiddenUnhappyPromiseOther : undefined}
            />
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard title="How should Alexander handle these types of calls?" required>
        <NonServiceCallMatrix
          policies={data.nonServiceCallPolicies}
          contacts={contacts}
          errors={submitted ? errors : {}}
          highlightIncomplete={submitted}
          onPolicyChange={(callTypeId, patch) => {
            const id = callTypeId as NonServiceCallTypeId;
            const current = data.nonServiceCallPolicies[id];
            updateSection6(
              {
                nonServiceCallPolicies: {
                  ...data.nonServiceCallPolicies,
                  [id]: { ...current, ...patch },
                },
              },
              { immediate: true },
            );
          }}
          onContactSelect={(callTypeId, contactId) => {
            const id = callTypeId as NonServiceCallTypeId;
            updateSection6(
              {
                nonServiceCallPolicies: {
                  ...data.nonServiceCallPolicies,
                  [id]: {
                    ...data.nonServiceCallPolicies[id],
                    contactId,
                  },
                },
              },
              { immediate: true },
            );
          }}
          onAddContact={(callTypeId) => {
            const id = callTypeId as NonServiceCallTypeId;
            const newContactId = addContact();
            updateSection6(
              {
                nonServiceCallPolicies: {
                  ...data.nonServiceCallPolicies,
                  [id]: {
                    ...data.nonServiceCallPolicies[id],
                    disposition: "send_specific",
                    contactId: newContactId,
                  },
                },
              },
              { immediate: true },
            );
          }}
          onContactChange={(contactId, patch) =>
            updateContact(contactId, patch, { immediate: true })
          }
        />
      </QuestionCard>

      <QuestionCard
        title="What customer information may Alexander use when helping an existing customer?"
        required
        helpText={CUSTOMER_HISTORY_HELP}
      >
        <RadioGroup
          name="customerHistoryPolicy"
          options={HISTORY_OPTIONS}
          value={data.customerHistoryPolicy}
          onChange={(v) => updateSection6({ customerHistoryPolicy: v }, { immediate: true })}
          error={submitted ? errors.customerHistoryPolicy : undefined}
        />
        {data.customerHistoryPolicy === "custom" && (
          <ConditionalPanel>
            <TextareaField
              id="customerHistoryCustomRule"
              label="What rule should Alexander follow?"
              rows={3}
              value={data.customerHistoryCustomRule}
              onChange={(v) => updateSection6({ customerHistoryCustomRule: v })}
            />
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard
        title="Are there customer records or documents Alexander should never disclose?"
        required
      >
        <CheckboxGroup
          name="restrictedInformation"
          options={RESTRICTED_OPTIONS}
          value={data.restrictedInformation}
          onChange={(v) =>
            updateSection6(
              { restrictedInformation: v as RestrictedInformationId[] },
              { immediate: true },
            )
          }
          error={submitted ? errors.restrictedInformation : undefined}
        />
        {data.restrictedInformation.includes("other") && (
          <ConditionalPanel>
            <TextareaField
              id="restrictedInformationOther"
              label="Describe other restricted information"
              rows={2}
              value={data.restrictedInformationOther}
              onChange={(v) => updateSection6({ restrictedInformationOther: v })}
              error={submitted ? errors.restrictedInformationOther : undefined}
            />
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard
        title="How proactive should Alexander be about recommending additional services?"
        required
        helpText={ADDITIONAL_SERVICE_HELP}
      >
        <RadioGroup
          name="additionalServicePolicy"
          options={SALES_OPTIONS}
          value={data.additionalServicePolicy}
          onChange={(v) => updateSection6({ additionalServicePolicy: v }, { immediate: true })}
          error={submitted ? errors.additionalServicePolicy : undefined}
        />
        {data.additionalServicePolicy === "custom" && (
          <ConditionalPanel>
            <TextareaField
              id="additionalServiceCustomRule"
              label="What sales-boundary rule should Alexander follow?"
              rows={3}
              value={data.additionalServiceCustomRule}
              onChange={(v) => updateSection6({ additionalServiceCustomRule: v })}
            />
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard
        title="Is there anything else Alexander should know about calls that do not fit your normal service process?"
        optional
      >
        <TextareaField
          id="unusualCallNotes"
          label=""
          rows={4}
          value={data.unusualCallNotes}
          onChange={(v) => updateSection6({ unusualCallNotes: v })}
        />
      </QuestionCard>

      {!readOnly && (
        <div className="flex flex-col gap-3 pt-4 sm:flex-row">
          <SecondaryButton
            className="sm:flex-1"
            onClick={() => router.push("/onboarding/sections/6/intro")}
          >
            Back
          </SecondaryButton>
          <PrimaryButton className="sm:flex-1" onClick={handleContinue}>
            Complete Section 6 →
          </PrimaryButton>
        </div>
      )}
    </div>
  );
}
