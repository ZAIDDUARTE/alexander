"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboarding } from "@/lib/onboarding/OnboardingContext";
import { QuestionCard, ConditionalPanel } from "./ui/Card";
import { TextField, TextareaField } from "./ui/Fields";
import { RadioGroup } from "./ui/RadioGroup";
import { CheckboxGroup } from "./ui/CheckboxGroup";
import { PrimaryButton, SecondaryButton } from "./ui/Buttons";
import { FeeCardEditor } from "./FeeCardEditor";
import { VisitTypeMatrix } from "./VisitTypeMatrix";
import { ServicePricingCards } from "./ServicePricingCards";
import { FinancialRemedyMatrix } from "./FinancialRemedyMatrix";
import { ContactCardEditor, type ContactCardErrors } from "./ContactCardEditor";
import { ContactPicker } from "./ContactPicker";
import { addCompletedSection } from "@/lib/onboarding/draft-utils";
import { getPricingDiscussEligibleServices } from "@/lib/onboarding/pricingServices";
import { getTerritorySuggestions } from "@/lib/onboarding/territorySuggestions";
import {
  FINANCING_PERMISSION_OPTIONS,
  FORBIDDEN_PRICING_STATEMENT_OPTIONS,
  GENERAL_PRICING_AUTHORITY_OPTIONS,
  PAYMENT_DUE_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  PRICING_MODEL_OPTIONS,
  PROMOTION_MODIFICATION_OPTIONS,
  PROMOTION_STACKING_OPTIONS,
  UNKNOWN_PRICE_OPTIONS,
} from "@/lib/onboarding/section5Catalog";
import {
  contactHasIdentity,
  createAreaPricingRowId,
  createPromotionId,
  type AreaPricingRow,
  type FinancingPermissionId,
  type ForbiddenStatementId,
  type GeneralPricingAuthorityId,
  type MaterialMarkupPolicy,
  type PaymentDueId,
  type PaymentMethodId,
  type PricingModelId,
  type PromotionModificationId,
  type PromotionOffer,
  type PromotionStackingId,
  type UnknownPriceBehaviorId,
} from "@/lib/onboarding/types";
import {
  YES_NO_OPTIONS,
} from "@/lib/onboarding/validation/section4";
import {
  validateSection5,
  type FieldErrors,
} from "@/lib/onboarding/validation/section5";
import { validateApproverContact } from "@/lib/onboarding/validation/section3";

const MATERIAL_MARKUP_OPTIONS: { value: MaterialMarkupPolicy; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "sometimes", label: "Sometimes" },
  { value: "no", label: "No" },
];

const FINANCING_HELP = "Alexander must not promise financing approval.";

function mapFinancialApproverErrors(errors: FieldErrors): ContactCardErrors | undefined {
  const out: ContactCardErrors = {};
  if (errors["financialApproverContact.nameOrRole"]) {
    out.nameOrRole = errors["financialApproverContact.nameOrRole"];
  }
  if (errors["financialApproverContact.phone"]) {
    out.phone = errors["financialApproverContact.phone"];
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function PromotionCard({
  promo,
  eligibleServiceOptions,
  showErrors,
  errors,
  onChange,
  onRemove,
}: {
  promo: PromotionOffer;
  eligibleServiceOptions: { value: string; label: string }[];
  showErrors: boolean;
  errors: FieldErrors;
  onChange: (patch: Partial<PromotionOffer>) => void;
  onRemove: () => void;
}) {
  const prefix = `promotions.${promo.id}`;
  return (
    <li className="min-w-0 rounded-lg border border-[var(--color-alexander-border)] bg-white p-4">
      <div className="mb-3 flex min-w-0 items-start justify-between gap-2">
        <p className="text-sm font-medium text-[var(--color-alexander-navy)]">Offer</p>
        <SecondaryButton fullWidth={false} className="px-3 py-2 text-sm" onClick={onRemove}>
          Remove
        </SecondaryButton>
      </div>
      <div className="min-w-0 space-y-4">
        <TextField
          id={`promo-name-${promo.id}`}
          label="Offer name"
          required
          value={promo.name}
          onChange={(v) => onChange({ name: v })}
          error={showErrors ? errors[`${prefix}.name`] : undefined}
        />
        <TextareaField
          id={`promo-benefit-${promo.id}`}
          label="Benefit"
          required
          rows={2}
          value={promo.benefit}
          onChange={(v) => onChange({ benefit: v })}
          error={showErrors ? errors[`${prefix}.benefit`] : undefined}
        />
        <TextareaField
          id={`promo-eligibility-${promo.id}`}
          label="Who is eligible"
          required
          rows={2}
          value={promo.eligibility}
          onChange={(v) => onChange({ eligibility: v })}
          error={showErrors ? errors[`${prefix}.eligibility`] : undefined}
        />
        {eligibleServiceOptions.length > 0 && (
          <CheckboxGroup
            name={`promo-services-${promo.id}`}
            options={eligibleServiceOptions}
            value={promo.qualifyingServiceIds}
            onChange={(ids) => onChange({ qualifyingServiceIds: ids })}
          />
        )}
        <TextField
          id={`promo-expiration-${promo.id}`}
          label="Expiration (optional)"
          optional
          value={promo.expiration}
          onChange={(v) => onChange({ expiration: v })}
        />
        <TextareaField
          id={`promo-proactive-${promo.id}`}
          label="When may Alexander mention this offer proactively? (optional)"
          optional
          rows={2}
          value={promo.proactiveUsePolicy}
          onChange={(v) => onChange({ proactiveUsePolicy: v })}
        />
      </div>
    </li>
  );
}

export function Section5Form({ mode = "form" }: { mode?: "form" | "review" }) {
  const {
    draft,
    updateSection5,
    addFee,
    removeFee,
    duplicateFee,
    updateFee,
    addContact,
    updateContact,
    saveDraftNow,
  } = useOnboarding();
  const data = draft.section5;
  const contacts = draft.contacts;
  const fees = draft.fees;
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const readOnly = mode === "review";

  const territorySuggestions = useMemo(
    () => getTerritorySuggestions(draft.section2),
    [draft.section2],
  );
  const pricingEligibleServices = useMemo(
    () => getPricingDiscussEligibleServices(draft.section2),
    [draft.section2],
  );
  const promoServiceOptions = pricingEligibleServices.map((s) => ({
    value: s.id,
    label: s.label,
  }));

  const showPaidDiagnostic = useMemo(
    () => Object.values(data.visitTypeByServiceId).some((v) => v === "paid_diagnostic"),
    [data.visitTypeByServiceId],
  );

  const showFinancialApprover = useMemo(() => {
    for (const authority of Object.values(data.remedyAuthority)) {
      if (authority === "human_approval") return true;
    }
    return false;
  }, [data.remedyAuthority]);

  const identityContacts = useMemo(() => contacts.filter((c) => contactHasIdentity(c)), [contacts]);
  const financialApprover = contacts.find((c) => c.id === data.financialApproverContactId);
  const financialApproverIsNew =
    financialApprover &&
    data.financialApproverContactId &&
    !contactHasIdentity(financialApprover);

  const visitTypeRowErrors: Record<string, string | undefined> = {};
  for (const [key, msg] of Object.entries(errors)) {
    if (key.startsWith("visitTypeByServiceId.") && key !== "visitTypeByServiceId") {
      const serviceId = key.slice("visitTypeByServiceId.".length);
      visitTypeRowErrors[serviceId] = msg;
    }
  }

  const handleContinue = async () => {
    const nextErrors = validateSection5(
      data,
      draft.section2,
      contacts,
      fees,
      draft.section4,
    );
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

  const updateServiceRule = (serviceId: string, patch: Partial<(typeof data.servicePricingRules)[string]>) => {
    const current = data.servicePricingRules[serviceId] ?? {
      instruction: "",
      approvedPriceMode: "",
      approvedPriceExact: "",
      approvedPriceMin: "",
      approvedPriceMax: "",
      pricingConditions: "",
      linkedFeeIds: [],
      askTeamDetail: "",
    };
    updateSection5(
      {
        servicePricingRules: {
          ...data.servicePricingRules,
          [serviceId]: { ...current, ...patch },
        },
      },
      { immediate: true },
    );
  };

  const addAreaRow = () => {
    const row: AreaPricingRow = {
      id: createAreaPricingRowId(),
      area: "",
      travelFee: "",
      minimumCharge: "",
    };
    updateSection5({ areaPricingRows: [...data.areaPricingRows, row] }, { immediate: true });
  };

  const updateAreaRow = (id: string, patch: Partial<AreaPricingRow>) => {
    updateSection5(
      {
        areaPricingRows: data.areaPricingRows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      },
      { immediate: true },
    );
  };

  const removeAreaRow = (id: string) => {
    updateSection5(
      { areaPricingRows: data.areaPricingRows.filter((r) => r.id !== id) },
      { immediate: true },
    );
  };

  const addPromotion = () => {
    const promo: PromotionOffer = {
      id: createPromotionId(),
      name: "",
      benefit: "",
      eligibility: "",
      qualifyingServiceIds: [],
      expiration: "",
      proactiveUsePolicy: "",
    };
    updateSection5({ promotions: [...data.promotions, promo] }, { immediate: true });
  };

  const updatePromotion = (id: string, patch: Partial<PromotionOffer>) => {
    updateSection5(
      {
        promotions: data.promotions.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      },
      { immediate: true },
    );
  };

  const removePromotion = (id: string) => {
    updateSection5(
      { promotions: data.promotions.filter((p) => p.id !== id) },
      { immediate: true },
    );
  };

  useEffect(() => {
    if (data.hasAreaTravelOrMinimum === "yes" && data.areaPricingRows.length === 0) {
      addAreaRow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed one row when user selects Yes
  }, [data.hasAreaTravelOrMinimum]);

  const pricingModelOptions = PRICING_MODEL_OPTIONS.map((o) => ({
    value: o.id as PricingModelId,
    label: o.label,
  }));
  const unknownPriceOptions = UNKNOWN_PRICE_OPTIONS.map((o) => ({
    value: o.id as UnknownPriceBehaviorId,
    label: o.label,
  }));
  const generalAuthorityOptions = GENERAL_PRICING_AUTHORITY_OPTIONS.map((o) => ({
    value: o.id as GeneralPricingAuthorityId,
    label: o.label,
  }));
  const forbiddenOptions = FORBIDDEN_PRICING_STATEMENT_OPTIONS.map((o) => ({
    value: o.id as ForbiddenStatementId,
    label: o.label,
  }));
  const paymentMethodOptions = PAYMENT_METHOD_OPTIONS.map((o) => ({
    value: o.id as PaymentMethodId,
    label: o.label,
  }));
  const paymentDueOptions = PAYMENT_DUE_OPTIONS.map((o) => ({
    value: o.id as PaymentDueId,
    label: o.label,
  }));
  const stackingOptions = PROMOTION_STACKING_OPTIONS.map((o) => ({
    value: o.id as PromotionStackingId,
    label: o.label,
  }));
  const modificationOptions = PROMOTION_MODIFICATION_OPTIONS.map((o) => ({
    value: o.id as PromotionModificationId,
    label: o.label,
  }));
  const financingPermissionOptions = FINANCING_PERMISSION_OPTIONS.map((o) => ({
    value: o.id as FinancingPermissionId,
    label: o.label,
  }));

  const due = data.paymentDuePolicies;

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

      <QuestionCard
        title="How does your company normally determine what a customer pays?"
        required
      >
        <CheckboxGroup
          name="pricingModels"
          options={pricingModelOptions}
          value={data.pricingModels}
          onChange={(v) =>
            updateSection5(
              {
                pricingModels: v,
                ...(!v.includes("other") ? { pricingModelOther: "" } : {}),
              },
              { immediate: true },
            )
          }
          error={submitted ? errors.pricingModels : undefined}
        />
        {data.pricingModels.includes("other") && (
          <ConditionalPanel>
            <TextField
              id="pricingModelOther"
              label="Describe your other pricing method"
              required
              value={data.pricingModelOther}
              onChange={(v) => updateSection5({ pricingModelOther: v })}
              error={submitted ? errors.pricingModelOther : undefined}
            />
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard title="Does your company add a markup to parts or materials?" required>
        <RadioGroup
          name="materialMarkupPolicy"
          options={MATERIAL_MARKUP_OPTIONS}
          value={data.materialMarkupPolicy}
          onChange={(v) =>
            updateSection5(
              {
                materialMarkupPolicy: v,
                ...(v === "no" ? { materialMarkupCustomerExplanation: "" } : {}),
              },
              { immediate: true },
            )
          }
          error={submitted ? errors.materialMarkupPolicy : undefined}
        />
        {(data.materialMarkupPolicy === "yes" || data.materialMarkupPolicy === "sometimes") && (
          <ConditionalPanel>
            <TextareaField
              id="materialMarkupCustomerExplanation"
              label="What is Alexander allowed to tell customers about your material pricing?"
              required
              rows={3}
              value={data.materialMarkupCustomerExplanation}
              onChange={(v) => updateSection5({ materialMarkupCustomerExplanation: v })}
              error={submitted ? errors.materialMarkupCustomerExplanation : undefined}
            />
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard
        title="If Alexander does not know the exact price, what should he normally tell the customer?"
        required
      >
        <RadioGroup
          name="unknownPriceBehavior"
          options={unknownPriceOptions}
          value={data.unknownPriceBehavior}
          onChange={(v) =>
            updateSection5(
              {
                unknownPriceBehavior: v,
                ...(v !== "custom" ? { unknownPriceCustomRule: "" } : {}),
              },
              { immediate: true },
            )
          }
          error={submitted ? errors.unknownPriceBehavior : undefined}
        />
        {data.unknownPriceBehavior === "custom" && (
          <ConditionalPanel>
            <TextareaField
              id="unknownPriceCustomRule"
              label="Describe the rule Alexander should follow"
              required
              rows={2}
              value={data.unknownPriceCustomRule}
              onChange={(v) => updateSection5({ unknownPriceCustomRule: v })}
              error={submitted ? errors.unknownPriceCustomRule : undefined}
            />
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard title="What fees does your company charge?" required>
        <FeeCardEditor
          fees={fees}
          section4={draft.section4}
          noSeparateFees={data.noSeparateFees}
          onNoSeparateFeesChange={(v) => updateSection5({ noSeparateFees: v }, { immediate: true })}
          onAddFee={() => addFee({ immediate: true })}
          onRemoveFee={(id) => removeFee(id, { immediate: true })}
          onDuplicateFee={(id) => duplicateFee(id, { immediate: true })}
          onUpdateFee={(id, patch) => updateFee(id, patch, { immediate: true })}
          showErrors={submitted}
          errors={errors}
          groupError={errors.fees}
          noSeparateFeesError={errors.noSeparateFees}
        />
      </QuestionCard>

      <QuestionCard title="Do any areas have a travel fee or minimum charge?" required>
        <RadioGroup
          name="hasAreaTravelOrMinimum"
          options={YES_NO_OPTIONS}
          value={data.hasAreaTravelOrMinimum}
          onChange={(v) =>
            updateSection5(
              {
                hasAreaTravelOrMinimum: v,
                ...(v === "no" ? { areaPricingRows: [] } : {}),
              },
              { immediate: true },
            )
          }
          error={submitted ? errors.hasAreaTravelOrMinimum : undefined}
        />
        {data.hasAreaTravelOrMinimum === "yes" && (
          <ConditionalPanel>
            <ul className="min-w-0 space-y-4">
              {data.areaPricingRows.map((row) => (
                <li
                  key={row.id}
                  className="min-w-0 rounded-lg border border-[var(--color-alexander-border)] bg-white p-4"
                >
                  <div className="mb-3 flex justify-end">
                    {data.areaPricingRows.length > 1 && (
                      <SecondaryButton
                        fullWidth={false}
                        className="px-3 py-2 text-sm"
                        onClick={() => removeAreaRow(row.id)}
                      >
                        Remove area
                      </SecondaryButton>
                    )}
                  </div>
                  <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-3">
                    <TextField
                      id={`area-${row.id}`}
                      label="Area"
                      value={row.area}
                      onChange={(v) => updateAreaRow(row.id, { area: v })}
                      placeholder="City, ZIP, or region"
                      error={submitted ? errors[`areaPricingRows.${row.id}`] : undefined}
                    />
                    <TextField
                      id={`travel-${row.id}`}
                      label="Travel fee ($)"
                      optional
                      value={row.travelFee}
                      onChange={(v) => updateAreaRow(row.id, { travelFee: v })}
                      error={submitted ? errors[`areaPricingRows.${row.id}.travelFee`] : undefined}
                    />
                    <TextField
                      id={`minimum-${row.id}`}
                      label="Minimum charge ($)"
                      optional
                      value={row.minimumCharge}
                      onChange={(v) => updateAreaRow(row.id, { minimumCharge: v })}
                      error={
                        submitted ? errors[`areaPricingRows.${row.id}.minimumCharge`] : undefined
                      }
                    />
                  </div>
                </li>
              ))}
            </ul>
            {territorySuggestions.length > 0 && (
              <datalist id="territory-suggestions">
                {territorySuggestions.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            )}
            <SecondaryButton className="mt-4" onClick={addAreaRow}>
              + Add another area
            </SecondaryButton>
            {submitted && errors.areaPricingRows && (
              <p className="mt-2 text-sm text-[var(--color-alexander-required)]" role="alert">
                {errors.areaPricingRows}
              </p>
            )}
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard title="How should Alexander handle these types of visits?" required>
        <VisitTypeMatrix
          value={data.visitTypeByServiceId}
          onChange={(serviceId, visitType) =>
            updateSection5(
              {
                visitTypeByServiceId: {
                  ...data.visitTypeByServiceId,
                  [serviceId]: visitType,
                },
              },
              { immediate: true },
            )
          }
          highlightIncomplete={submitted}
          rowErrors={visitTypeRowErrors}
          groupError={submitted ? errors.visitTypeByServiceId : undefined}
        />
      </QuestionCard>

      {showPaidDiagnostic && (
        <QuestionCard
          title="What should Alexander tell customers about paid diagnostic visits?"
          required
        >
          <TextareaField
            id="paidDiagnosticExplanation"
            label="Approved customer explanation"
            required
            rows={3}
            value={data.paidDiagnosticExplanation}
            onChange={(v) => updateSection5({ paidDiagnosticExplanation: v })}
            helpText="Reference your fee records from the fee list above — do not re-enter diagnostic amounts here."
            error={submitted ? errors.paidDiagnosticExplanation : undefined}
          />
        </QuestionCard>
      )}

      <QuestionCard
        title='When a customer asks “How much will this cost?”, what is Alexander normally allowed to do?'
        required
      >
        <RadioGroup
          name="generalPricingAuthority"
          options={generalAuthorityOptions}
          value={data.generalPricingAuthority}
          onChange={(v) =>
            updateSection5(
              { generalPricingAuthority: v as GeneralPricingAuthorityId },
              { immediate: true },
            )
          }
          error={submitted ? errors.generalPricingAuthority : undefined}
        />
      </QuestionCard>

      <QuestionCard title="Which service prices may Alexander discuss with customers?" required>
        <ServicePricingCards
          section2={draft.section2}
          rules={data.servicePricingRules}
          fees={fees}
          onRuleChange={updateServiceRule}
          showErrors={submitted}
          errors={errors}
        />
      </QuestionCard>

      <QuestionCard title="What should Alexander never say about pricing?" required>
        <CheckboxGroup
          name="forbiddenStatements"
          options={forbiddenOptions}
          value={data.forbiddenStatements}
          onChange={(v) =>
            updateSection5(
              {
                forbiddenStatements: v,
                ...(!v.includes("other") ? { forbiddenStatementOther: "" } : {}),
              },
              { immediate: true },
            )
          }
          error={submitted ? errors.forbiddenStatements : undefined}
        />
        {data.forbiddenStatements.includes("other") && (
          <ConditionalPanel>
            <TextareaField
              id="forbiddenStatementOther"
              label="Other prohibited pricing statement"
              required
              rows={2}
              value={data.forbiddenStatementOther}
              onChange={(v) => updateSection5({ forbiddenStatementOther: v })}
              error={submitted ? errors.forbiddenStatementOther : undefined}
            />
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard
        title="Does your company currently offer discounts, coupons, or promotions?"
        required
      >
        <RadioGroup
          name="hasPromotions"
          options={YES_NO_OPTIONS}
          value={data.hasPromotions}
          onChange={(v) =>
            updateSection5(
              {
                hasPromotions: v,
                ...(v === "no"
                  ? {
                      promotions: [],
                      promotionStacking: "",
                      promotionStackingRule: "",
                      promotionModificationAuthority: "",
                      promotionModificationRule: "",
                    }
                  : {}),
              },
              { immediate: true },
            )
          }
          error={submitted ? errors.hasPromotions : undefined}
        />
        {data.hasPromotions === "yes" && (
          <ConditionalPanel>
            <ul className="min-w-0 space-y-4">
              {data.promotions.map((promo) => (
                <PromotionCard
                  key={promo.id}
                  promo={promo}
                  eligibleServiceOptions={promoServiceOptions}
                  showErrors={submitted}
                  errors={errors}
                  onChange={(patch) => updatePromotion(promo.id, patch)}
                  onRemove={() => removePromotion(promo.id)}
                />
              ))}
            </ul>
            <SecondaryButton className="mt-4" onClick={addPromotion}>
              + Add promotion
            </SecondaryButton>
            {submitted && errors.promotions && typeof errors.promotions === "string" && (
              <p className="mt-2 text-sm text-[var(--color-alexander-required)]" role="alert">
                {errors.promotions}
              </p>
            )}
          </ConditionalPanel>
        )}
      </QuestionCard>

      {data.hasPromotions === "yes" && (
        <>
          <QuestionCard title="Can discounts or promotions be combined?" required>
            <RadioGroup
              name="promotionStacking"
              options={stackingOptions}
              value={data.promotionStacking}
              onChange={(v) =>
                updateSection5(
                  {
                    promotionStacking: v,
                    ...(v !== "conditional" ? { promotionStackingRule: "" } : {}),
                  },
                  { immediate: true },
                )
              }
              error={submitted ? errors.promotionStacking : undefined}
            />
            {data.promotionStacking === "conditional" && (
              <ConditionalPanel>
                <TextareaField
                  id="promotionStackingRule"
                  label="When may promotions be combined?"
                  required
                  rows={2}
                  value={data.promotionStackingRule}
                  onChange={(v) => updateSection5({ promotionStackingRule: v })}
                  error={submitted ? errors.promotionStackingRule : undefined}
                />
              </ConditionalPanel>
            )}
          </QuestionCard>

          <QuestionCard title="May Alexander waive or modify a fee or discount?" required>
            <RadioGroup
              name="promotionModificationAuthority"
              options={modificationOptions}
              value={data.promotionModificationAuthority}
              onChange={(v) =>
                updateSection5(
                  {
                    promotionModificationAuthority: v,
                    ...(v !== "within_rules" ? { promotionModificationRule: "" } : {}),
                  },
                  { immediate: true },
                )
              }
              error={submitted ? errors.promotionModificationAuthority : undefined}
            />
            {data.promotionModificationAuthority === "within_rules" && (
              <ConditionalPanel>
                <TextareaField
                  id="promotionModificationRule"
                  label="Rules or limits for promotion or discount changes"
                  required
                  rows={2}
                  value={data.promotionModificationRule}
                  onChange={(v) => updateSection5({ promotionModificationRule: v })}
                  error={submitted ? errors.promotionModificationRule : undefined}
                />
              </ConditionalPanel>
            )}
          </QuestionCard>
        </>
      )}

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
          onChange={(v) =>
            updateSection5(
              {
                paymentDuePolicies: v,
                ...(!v.includes("deposit_required")
                  ? { depositWorkDetail: "", depositRule: "" }
                  : {}),
                ...(!v.includes("progress_payments")
                  ? { progressPaymentProjectsDetail: "", progressPaymentRule: "" }
                  : {}),
                ...(!v.includes("invoice_after_service")
                  ? { invoiceCustomersDetail: "", invoiceTerms: "" }
                  : {}),
                ...(!v.includes("other") ? { paymentDueOtherRule: "" } : {}),
              },
              { immediate: true },
            )
          }
          error={submitted ? errors.paymentDuePolicies : undefined}
        />
        {due.includes("deposit_required") && (
          <ConditionalPanel>
            <TextareaField
              id="depositWorkDetail"
              label="Which work requires a deposit?"
              required
              rows={2}
              value={data.depositWorkDetail}
              onChange={(v) => updateSection5({ depositWorkDetail: v })}
              error={submitted ? errors.depositWorkDetail : undefined}
            />
            <TextareaField
              id="depositRule"
              label="Deposit rule"
              required
              rows={2}
              value={data.depositRule}
              onChange={(v) => updateSection5({ depositRule: v })}
              error={submitted ? errors.depositRule : undefined}
            />
          </ConditionalPanel>
        )}
        {due.includes("progress_payments") && (
          <ConditionalPanel>
            <TextareaField
              id="progressPaymentProjectsDetail"
              label="Which projects use progress payments?"
              required
              rows={2}
              value={data.progressPaymentProjectsDetail}
              onChange={(v) => updateSection5({ progressPaymentProjectsDetail: v })}
              error={submitted ? errors.progressPaymentProjectsDetail : undefined}
            />
            <TextareaField
              id="progressPaymentRule"
              label="Progress-payment rule"
              required
              rows={2}
              value={data.progressPaymentRule}
              onChange={(v) => updateSection5({ progressPaymentRule: v })}
              error={submitted ? errors.progressPaymentRule : undefined}
            />
          </ConditionalPanel>
        )}
        {due.includes("invoice_after_service") && (
          <ConditionalPanel>
            <TextareaField
              id="invoiceCustomersDetail"
              label="Which customers may be invoiced?"
              required
              rows={2}
              value={data.invoiceCustomersDetail}
              onChange={(v) => updateSection5({ invoiceCustomersDetail: v })}
              error={submitted ? errors.invoiceCustomersDetail : undefined}
            />
            <TextareaField
              id="invoiceTerms"
              label="Invoice terms"
              required
              rows={2}
              value={data.invoiceTerms}
              onChange={(v) => updateSection5({ invoiceTerms: v })}
              error={submitted ? errors.invoiceTerms : undefined}
            />
          </ConditionalPanel>
        )}
        {due.includes("other") && (
          <ConditionalPanel>
            <TextareaField
              id="paymentDueOtherRule"
              label="Other payment-due rule"
              required
              rows={2}
              value={data.paymentDueOtherRule}
              onChange={(v) => updateSection5({ paymentDueOtherRule: v })}
              error={submitted ? errors.paymentDueOtherRule : undefined}
            />
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard title="Do you offer financing?" required helpText={FINANCING_HELP}>
        <RadioGroup
          name="offersFinancing"
          options={YES_NO_OPTIONS}
          value={data.offersFinancing}
          onChange={(v) =>
            updateSection5(
              {
                offersFinancing: v,
                ...(v === "no"
                  ? {
                      financingProviderTerms: "",
                      financingPermissions: [],
                      financingPermissionOtherDetail: "",
                      financingEligibilityStatement: "",
                    }
                  : {}),
              },
              { immediate: true },
            )
          }
          error={submitted ? errors.offersFinancing : undefined}
        />
        {data.offersFinancing === "yes" && (
          <ConditionalPanel>
            <TextareaField
              id="financingProviderTerms"
              label="Financing provider and terms"
              required
              rows={2}
              value={data.financingProviderTerms}
              onChange={(v) => updateSection5({ financingProviderTerms: v })}
              error={submitted ? errors.financingProviderTerms : undefined}
            />
            <CheckboxGroup
              name="financingPermissions"
              options={financingPermissionOptions}
              value={data.financingPermissions}
              onChange={(v) =>
                updateSection5(
                  {
                    financingPermissions: v,
                    ...(!v.includes("other") ? { financingPermissionOtherDetail: "" } : {}),
                  },
                  { immediate: true },
                )
              }
              error={submitted ? errors.financingPermissions : undefined}
            />
            {data.financingPermissions.includes("other") && (
              <TextField
                id="financingPermissionOtherDetail"
                label="Other financing permission"
                required
                value={data.financingPermissionOtherDetail}
                onChange={(v) => updateSection5({ financingPermissionOtherDetail: v })}
                error={submitted ? errors.financingPermissionOtherDetail : undefined}
              />
            )}
            <TextareaField
              id="financingEligibilityStatement"
              label="Approved eligibility statement Alexander may use"
              required
              rows={2}
              value={data.financingEligibilityStatement}
              onChange={(v) => updateSection5({ financingEligibilityStatement: v })}
              error={submitted ? errors.financingEligibilityStatement : undefined}
            />
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard title="What financial remedies may Alexander approve?" required>
        <FinancialRemedyMatrix
          remedyAuthority={data.remedyAuthority}
          remedyRules={data.remedyRules}
          onAuthorityChange={(remedyId, authority) =>
            updateSection5(
              {
                remedyAuthority: { ...data.remedyAuthority, [remedyId]: authority },
                ...(authority !== "within_rules"
                  ? { remedyRules: { ...data.remedyRules, [remedyId]: "" } }
                  : {}),
              },
              { immediate: true },
            )
          }
          onRuleChange={(remedyId, rule) =>
            updateSection5(
              { remedyRules: { ...data.remedyRules, [remedyId]: rule } },
              { immediate: true },
            )
          }
          highlightIncomplete={submitted}
          errors={submitted ? errors : {}}
        />
      </QuestionCard>

      {showFinancialApprover && (
        <QuestionCard
          title="Who should Alexander contact when human approval is required for a financial remedy?"
          required
        >
          <ContactPicker
            name="financialApproverContactId"
            contacts={identityContacts}
            value={data.financialApproverContactId}
            onSelect={(id) =>
              updateSection5({ financialApproverContactId: id }, { immediate: true })
            }
            onAddNew={() => {
              const id = addContact();
              updateSection5({ financialApproverContactId: id }, { immediate: true });
            }}
            error={submitted ? errors.financialApproverContactId : undefined}
          />
          {financialApproverIsNew && financialApprover && (
            <ConditionalPanel>
              <ContactCardEditor
                idPrefix="financial-approver"
                contact={financialApprover}
                profile="approver"
                onChange={(patch) =>
                  updateContact(financialApprover.id, patch, { immediate: true })
                }
                errors={
                  submitted
                    ? mapFinancialApproverErrors(errors) ??
                      (() => {
                        const approverErrors = validateApproverContact(financialApprover);
                        const out: ContactCardErrors = {};
                        if (approverErrors.nameOrRole) out.nameOrRole = approverErrors.nameOrRole;
                        if (approverErrors.phone) out.phone = approverErrors.phone;
                        return Object.keys(out).length > 0 ? out : undefined;
                      })()
                    : undefined
                }
              />
            </ConditionalPanel>
          )}
        </QuestionCard>
      )}

      {!readOnly && (
        <div className="flex flex-col gap-3 pt-4 sm:flex-row">
          <SecondaryButton
            className="sm:flex-1"
            onClick={() => router.push("/onboarding/sections/5/intro")}
          >
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
