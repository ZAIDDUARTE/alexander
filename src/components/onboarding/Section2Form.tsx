"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboarding } from "@/lib/onboarding/OnboardingContext";
import { QuestionCard, ConditionalPanel } from "./ui/Card";
import { TextField, TextareaField } from "./ui/Fields";
import { TokenListField } from "./ui/TokenListField";
import { RadioGroup } from "./ui/RadioGroup";
import { PrimaryButton, SecondaryButton } from "./ui/Buttons";
import { ServicePolicyChoice, ServicePolicyGroup } from "./ServicePolicy";
import { AreaConditionList } from "./AreaConditionList";
import { addCompletedSection } from "@/lib/onboarding/draft-utils";
import {
  CUSTOMER_PROPERTY_TYPES,
  DIAGNOSTIC_SERVICES,
  PLUMBING_SERVICES,
} from "@/lib/onboarding/section2Catalog";
import {
  AFTER_HOURS_AREA_OPTIONS,
  CUSTOMER_SERVE_LABELS,
  SERVICE_AREA_DEFINITION_OPTIONS,
  SERVICE_OFFER_LABELS,
  YES_NO_OPTIONS,
  YES_NO_POLICY_LABELS,
  matrixConditionErrors,
  validateSection2,
  type FieldErrors,
} from "@/lib/onboarding/validation/section2";

export function Section2Form({ mode = "form" }: { mode?: "form" | "review" }) {
  const { draft, updateSection2, saveDraftNow } = useOnboarding();
  const data = draft.section2;
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const readOnly = mode === "review";

  const plumbingConditionErrors = useMemo(
    () => (submitted ? matrixConditionErrors(errors, "plumbingServices") : {}),
    [errors, submitted],
  );
  const diagnosticConditionErrors = useMemo(
    () => (submitted ? matrixConditionErrors(errors, "diagnosticServices") : {}),
    [errors, submitted],
  );
  const customerConditionErrors = useMemo(
    () => (submitted ? matrixConditionErrors(errors, "customerPropertyTypes") : {}),
    [errors, submitted],
  );

  const handleContinue = async () => {
    const nextErrors = validateSection2(data);
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
        sectionId: 2,
        completedSections: addCompletedSection(draft.navigation.completedSections, 2),
      },
    };
    await saveDraftNow(finalDraft);
    router.push("/onboarding/sections/2/complete");
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-[var(--color-alexander-blue)]">Section 2 of 8</p>
        <h1 className="mt-2 font-serif text-2xl font-semibold text-[var(--color-alexander-navy)] sm:text-3xl">
          Your Services
        </h1>
        <p className="mt-2 text-sm text-[var(--color-alexander-muted)]">
          Tell Alexander which jobs your company accepts, who you serve, and where you work. This
          information helps him recognize the difference between a service your company routinely
          provides, a request that requires review, and a job your company does not accept.
        </p>
      </header>

      <QuestionCard title="Which plumbing services does your company provide?" required>
        <ServicePolicyGroup
          items={PLUMBING_SERVICES}
          value={data.plumbingServices}
          onChange={(id, entry) =>
            updateSection2(
              { plumbingServices: { ...data.plumbingServices, [id]: entry } },
              { immediate: true },
            )
          }
          labels={SERVICE_OFFER_LABELS}
          highlightIncomplete={submitted}
          groupError={submitted ? errors.plumbingServices : undefined}
          conditionErrors={plumbingConditionErrors}
        />
      </QuestionCard>

      <QuestionCard
        title="Which diagnostic, drain, and inspection services does your company provide?"
        required
      >
        <ServicePolicyGroup
          items={DIAGNOSTIC_SERVICES}
          value={data.diagnosticServices}
          onChange={(id, entry) =>
            updateSection2(
              { diagnosticServices: { ...data.diagnosticServices, [id]: entry } },
              { immediate: true },
            )
          }
          labels={SERVICE_OFFER_LABELS}
          highlightIncomplete={submitted}
          groupError={submitted ? errors.diagnosticServices : undefined}
          conditionErrors={diagnosticConditionErrors}
        />
      </QuestionCard>

      <QuestionCard title="Who does your company serve?" required>
        <ServicePolicyGroup
          items={CUSTOMER_PROPERTY_TYPES}
          value={data.customerPropertyTypes}
          onChange={(id, entry) =>
            updateSection2(
              { customerPropertyTypes: { ...data.customerPropertyTypes, [id]: entry } },
              { immediate: true },
            )
          }
          labels={CUSTOMER_SERVE_LABELS}
          highlightIncomplete={submitted}
          groupError={submitted ? errors.customerPropertyTypes : undefined}
          conditionErrors={customerConditionErrors}
        />
      </QuestionCard>

      <QuestionCard
        title="Will you install or work with fixtures, equipment, or materials supplied by the customer?"
        required
      >
        <ServicePolicyChoice
          name="customerSuppliedMaterialsPolicy"
          ariaLabel="Will you install or work with customer-supplied materials?"
          value={data.customerSuppliedMaterialsPolicy}
          onChange={(policy) =>
            updateSection2({ customerSuppliedMaterialsPolicy: policy }, { immediate: true })
          }
          labels={YES_NO_POLICY_LABELS}
          conditionLabel="What are the conditions?"
          conditionValue={data.customerSuppliedMaterialsCondition}
          onConditionChange={(v) => updateSection2({ customerSuppliedMaterialsCondition: v })}
          conditionPlaceholder="We can install customer-supplied faucets and fixtures, but not customer-supplied water heaters."
          error={submitted ? errors.customerSuppliedMaterialsPolicy : undefined}
          conditionError={submitted ? errors.customerSuppliedMaterialsCondition : undefined}
        />
      </QuestionCard>

      <QuestionCard
        title="Will your company repair, correct, or finish work another plumber started?"
        required
      >
        <ServicePolicyChoice
          name="correctiveWorkPolicy"
          ariaLabel="Will your company repair, correct, or finish work another plumber started?"
          value={data.correctiveWorkPolicy}
          onChange={(policy) => updateSection2({ correctiveWorkPolicy: policy }, { immediate: true })}
          labels={YES_NO_POLICY_LABELS}
          conditionLabel="What are the conditions?"
          conditionValue={data.correctiveWorkCondition}
          onConditionChange={(v) => updateSection2({ correctiveWorkCondition: v })}
          error={submitted ? errors.correctiveWorkPolicy : undefined}
          conditionError={submitted ? errors.correctiveWorkCondition : undefined}
        />
      </QuestionCard>

      <QuestionCard title="How do you normally define your service area?" required>
        <RadioGroup
          name="serviceAreaDefinitionMode"
          options={SERVICE_AREA_DEFINITION_OPTIONS}
          value={data.serviceAreaDefinitionMode}
          onChange={(v) => updateSection2({ serviceAreaDefinitionMode: v }, { immediate: true })}
          error={submitted ? errors.serviceAreaDefinitionMode : undefined}
        />
        {data.serviceAreaDefinitionMode && (
          <ConditionalPanel>
            <p className="mb-4 text-sm font-medium text-[var(--color-alexander-navy)]">
              Define your normal service area.
              <span className="ml-1 text-[var(--color-alexander-required)]" aria-hidden>*</span>
            </p>
            {data.serviceAreaDefinitionMode === "zip_codes" && (
              <TokenListField
                id="serviceAreaZipCodes"
                label="ZIP codes"
                required
                value={data.serviceAreaZipCodes}
                onChange={(v) => updateSection2({ serviceAreaZipCodes: v }, { immediate: true })}
                placeholder="Type a ZIP code and press Enter"
                error={submitted ? errors.serviceAreaZipCodes : undefined}
              />
            )}
            {data.serviceAreaDefinitionMode === "cities" && (
              <TokenListField
                id="serviceAreaCities"
                label="Cities / communities"
                required
                value={data.serviceAreaCities}
                onChange={(v) => updateSection2({ serviceAreaCities: v }, { immediate: true })}
                placeholder="Type a city or community and press Enter"
                error={submitted ? errors.serviceAreaCities : undefined}
              />
            )}
            {data.serviceAreaDefinitionMode === "distance" && (
              <div className="space-y-4">
                <TextField
                  id="serviceAreaDistanceAddress"
                  label="Business address"
                  required
                  value={data.serviceAreaDistance.address}
                  onChange={(v) =>
                    updateSection2({
                      serviceAreaDistance: { ...data.serviceAreaDistance, address: v },
                    })
                  }
                  error={submitted ? errors.serviceAreaDistanceAddress : undefined}
                />
                <TextField
                  id="serviceAreaDistanceRadius"
                  label="Service radius (miles)"
                  required
                  type="number"
                  value={data.serviceAreaDistance.radiusMiles}
                  onChange={(v) =>
                    updateSection2({
                      serviceAreaDistance: { ...data.serviceAreaDistance, radiusMiles: v },
                    })
                  }
                  error={submitted ? errors.serviceAreaDistanceRadius : undefined}
                />
              </div>
            )}
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard
        title="Are there any cities, ZIP codes, neighborhoods, or other areas Alexander should always decline?"
        optional
      >
        <TextareaField
          id="excludedTerritory"
          label=""
          value={data.excludedTerritory}
          onChange={(v) => updateSection2({ excludedTerritory: v })}
          placeholder="We do not service Edwards Air Force Base."
        />
      </QuestionCard>

      <QuestionCard
        title="Are there any areas you sometimes serve, but only under certain conditions?"
        required
      >
        <RadioGroup
          name="hasConditionalTerritory"
          options={YES_NO_OPTIONS}
          value={data.hasConditionalTerritory}
          onChange={(v) => updateSection2({ hasConditionalTerritory: v }, { immediate: true })}
          error={submitted ? errors.hasConditionalTerritory : undefined}
        />
        {data.hasConditionalTerritory === "yes" && (
          <ConditionalPanel>
            <p className="mb-4 text-sm font-medium text-[var(--color-alexander-navy)]">
              Which areas are conditional, and what are the conditions?
              <span className="ml-1 text-[var(--color-alexander-required)]" aria-hidden>*</span>
            </p>
            <AreaConditionList
              value={data.conditionalTerritories}
              onChange={(v) => updateSection2({ conditionalTerritories: v }, { immediate: true })}
              error={submitted ? errors.conditionalTerritories : undefined}
            />
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard title="When you are providing after-hours service, where will you go?" required>
        <RadioGroup
          name="afterHoursAreaMode"
          options={AFTER_HOURS_AREA_OPTIONS}
          value={data.afterHoursAreaMode}
          onChange={(v) => updateSection2({ afterHoursAreaMode: v }, { immediate: true })}
          error={submitted ? errors.afterHoursAreaMode : undefined}
        />
        {data.afterHoursAreaMode === "smaller" && (
          <ConditionalPanel>
            <TextareaField
              id="afterHoursServiceArea"
              label="What is your after-hours service area?"
              required
              value={data.afterHoursServiceArea}
              onChange={(v) => updateSection2({ afterHoursServiceArea: v })}
              error={submitted ? errors.afterHoursServiceArea : undefined}
            />
          </ConditionalPanel>
        )}
      </QuestionCard>

      {!readOnly && (
        <div className="flex flex-col gap-3 pt-4 sm:flex-row">
          <SecondaryButton
            className="sm:flex-1"
            onClick={() => router.push("/onboarding/sections/2/intro")}
          >
            Back
          </SecondaryButton>
          <PrimaryButton className="sm:flex-1" onClick={handleContinue}>
            Complete Section 2 →
          </PrimaryButton>
        </div>
      )}
    </div>
  );
}
