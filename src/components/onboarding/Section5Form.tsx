"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboarding } from "@/lib/onboarding/OnboardingContext";
import { QuestionCard, ConditionalPanel } from "./ui/Card";
import { TextField, TextareaField } from "./ui/Fields";
import { RadioGroup } from "./ui/RadioGroup";
import { CheckboxGroup } from "./ui/CheckboxGroup";
import { PrimaryButton, SecondaryButton } from "./ui/Buttons";
import { PricingCoreFields } from "./PricingCoreFields";
import { addCompletedSection } from "@/lib/onboarding/draft-utils";
import {
  FINANCIAL_REMEDY_OPTIONS,
  FINANCIAL_REMEDY_ROWS,
  PAYMENT_ASSISTANCE_OPTIONS,
  PAYMENT_COLLECTION_OPTIONS,
  PAYMENT_DUE_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  REMEDY_RULE_LABELS,
  REMEDY_RULE_PLACEHOLDERS,
} from "@/lib/onboarding/section5Catalog";
import {
  type FinancialRemedySelection,
  type PaymentAssistanceAuthority,
  type PaymentCollectionScopeId,
  type PaymentDueId,
  type PaymentMethodId,
  type RemedyId,
  type Section2Data,
} from "@/lib/onboarding/types";
import { validateSection5, type FieldErrors } from "@/lib/onboarding/validation/section5";

function geographyChoices(section2: Section2Data) {
  const seen = new Set<string>();
  const out: { value: string; label: string }[] = [];
  const push = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    out.push({ value: trimmed, label: trimmed });
  };
  for (const zip of section2.serviceAreaZipCodes) push(zip);
  for (const city of section2.serviceAreaCities) push(city);
  for (const territory of section2.conditionalTerritories) push(territory.area);
  for (const zip of section2.afterHoursZipCodes) push(zip);
  for (const city of section2.afterHoursCities) push(city);
  if (section2.serviceAreaDefinitionMode === "distance") {
    const address = section2.serviceAreaDistance.address.trim();
    if (address) push(`${address} (${section2.serviceAreaDistance.radiusMiles} miles)`);
  }
  if (section2.afterHoursDefinitionMode === "distance") {
    const address = section2.afterHoursDistance.address.trim();
    if (address) push(`${address} (${section2.afterHoursDistance.radiusMiles} miles)`);
  }
  return out;
}

export function Section5Form({ mode = "form" }: { mode?: "form" | "review" }) {
  const { draft, updateSection5, saveDraftNow } = useOnboarding();
  const data = draft.section5;
  const contacts = draft.contacts;
  const fees = draft.fees;
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const readOnly = mode === "review";

  const handleContinue = async () => {
    const nextErrors = validateSection5(data, draft.section2, contacts, fees, draft.section4);
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
        sectionId: 5,
        completedSections: addCompletedSection(draft.navigation.completedSections, 5),
      },
    };
    await saveDraftNow(finalDraft);
    router.push("/onboarding/sections/5/complete");
  };

  const paymentMethodOptions = PAYMENT_METHOD_OPTIONS.map((o) => ({
    value: o.id as PaymentMethodId,
    label: o.label,
  }));
  const paymentDueOptions = PAYMENT_DUE_OPTIONS.map((o) => ({
    value: o.id as PaymentDueId,
    label: o.label,
  }));
  const paymentAssistanceOptions = PAYMENT_ASSISTANCE_OPTIONS.map((o) => ({
    value: o.id as PaymentAssistanceAuthority,
    label: o.label,
  }));
  const paymentCollectionOptions = PAYMENT_COLLECTION_OPTIONS.map((o) => ({
    value: o.id as PaymentCollectionScopeId,
    label: o.label,
  }));
  const financialRemedyOptions = FINANCIAL_REMEDY_OPTIONS.map((o) => ({
    value: o.id as FinancialRemedySelection,
    label: o.label,
  }));
  const selectedRemedies = data.financialRemedies.filter((id): id is RemedyId => id !== "none");

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-[var(--color-alexander-blue)]">Section 5 of 8</p>
        <h1 className="mt-2 font-serif text-2xl font-semibold text-[var(--color-alexander-navy)] sm:text-3xl">
          Pricing and Payments
        </h1>
        <p className="mt-2 text-sm text-[var(--color-alexander-muted)]">
          Tell Alexander what he may explain about fees, estimates, payments, and financial policies.
          You decide whether Alexander may share specific prices, explain service fees, provide
          approved ranges, or send financial questions to your team.
        </p>
      </header>

      <PricingCoreFields
        data={data}
        section2={draft.section2}
        errors={errors}
        submitted={submitted}
        areaSuggestions={geographyChoices(draft.section2)}
        onChange={(patch, immediate) => updateSection5(patch, immediate ? { immediate: true } : undefined)}
      />

      <QuestionCard title="What payment methods do you accept?" required>
        <CheckboxGroup
          name="paymentMethods"
          options={paymentMethodOptions}
          value={data.paymentMethods}
          onChange={(v) =>
            updateSection5(
              {
                paymentMethods: v,
                ...(!v.includes("other") ? { paymentMethodOther: "" } : {}),
              },
              { immediate: true },
            )
          }
          error={submitted ? errors.paymentMethods : undefined}
        />
        {data.paymentMethods.includes("other") && (
          <ConditionalPanel>
            <TextField
              id="paymentMethodOther"
              label="Other payment method"
              required
              value={data.paymentMethodOther}
              onChange={(v) => updateSection5({ paymentMethodOther: v })}
              error={submitted ? errors.paymentMethodOther : undefined}
            />
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard title="When is payment normally due?" required>
        <CheckboxGroup
          name="paymentDuePolicies"
          options={paymentDueOptions}
          value={data.paymentDuePolicies}
          onChange={(v) => updateSection5({ paymentDuePolicies: v }, { immediate: true })}
          error={submitted ? errors.paymentDuePolicies : undefined}
        />
      </QuestionCard>

      <QuestionCard title="Can Alexander help customers make a payment?" required>
        <RadioGroup
          name="paymentAssistance"
          options={paymentAssistanceOptions}
          value={data.paymentAssistance}
          onChange={(v) => updateSection5({ paymentAssistance: v }, { immediate: true })}
          error={submitted ? errors.paymentAssistance : undefined}
        />
      </QuestionCard>

      <QuestionCard title="What may Alexander help collect payment for?" required>
        <CheckboxGroup
          name="paymentCollectionScope"
          options={paymentCollectionOptions}
          value={data.paymentCollectionScope}
          onChange={(v) =>
            updateSection5(
              {
                paymentCollectionScope: v,
                ...(!v.includes("other") ? { paymentCollectionOther: "" } : {}),
              },
              { immediate: true },
            )
          }
          error={submitted ? errors.paymentCollectionScope : undefined}
        />
        {data.paymentCollectionScope.includes("other") && (
          <ConditionalPanel>
            <TextField
              id="paymentCollectionOther"
              label="Other payment"
              required
              value={data.paymentCollectionOther}
              onChange={(v) => updateSection5({ paymentCollectionOther: v })}
              error={submitted ? errors.paymentCollectionOther : undefined}
            />
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard
        title="What financial remedies may Alexander approve without human approval?"
        required
      >
        <CheckboxGroup
          name="financialRemedies"
          options={financialRemedyOptions}
          value={data.financialRemedies}
          onChange={(v) => {
            const nextRules = { ...data.remedyRules };
            for (const row of FINANCIAL_REMEDY_ROWS) {
              if (!v.includes(row.id as RemedyId)) nextRules[row.id as RemedyId] = "";
            }
            updateSection5({ financialRemedies: v, remedyRules: nextRules }, { immediate: true });
          }}
          error={submitted ? errors.financialRemedies : undefined}
        />
        {selectedRemedies.map((remedyId) => (
          <ConditionalPanel key={remedyId}>
            <TextareaField
              id={`remedyRules.${remedyId}`}
              label={REMEDY_RULE_LABELS[remedyId] ?? "Rules or limits"}
              required
              rows={3}
              placeholder={REMEDY_RULE_PLACEHOLDERS[remedyId]}
              value={data.remedyRules[remedyId]}
              onChange={(v) =>
                updateSection5({ remedyRules: { ...data.remedyRules, [remedyId]: v } })
              }
              error={submitted ? errors[`remedyRules.${remedyId}`] : undefined}
            />
          </ConditionalPanel>
        ))}
      </QuestionCard>

      {!readOnly && (
        <div className="flex flex-col gap-3 pt-4 sm:flex-row">
          <SecondaryButton className="sm:flex-1" onClick={() => router.push("/onboarding/sections/5/intro")}>
            Back
          </SecondaryButton>
          <PrimaryButton className="sm:flex-1" onClick={handleContinue}>
            Complete Section 5 →
          </PrimaryButton>
        </div>
      )}
    </div>
  );
}
