"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboarding } from "@/lib/onboarding/OnboardingContext";
import { QuestionCard, ConditionalPanel } from "./ui/Card";
import { TextField, TextareaField } from "./ui/Fields";
import { RadioGroup } from "./ui/RadioGroup";
import { CheckboxGroup } from "./ui/CheckboxGroup";
import { PrimaryButton, SecondaryButton } from "./ui/Buttons";
import { FinancialRemedyMatrix } from "./FinancialRemedyMatrix";
import { PricingCoreFields } from "./PricingCoreFields";
import { ContactCardEditor, type ContactCardErrors } from "./ContactCardEditor";
import { ContactPicker } from "./ContactPicker";
import { addCompletedSection } from "@/lib/onboarding/draft-utils";
import { PAYMENT_DUE_OPTIONS, PAYMENT_METHOD_OPTIONS } from "@/lib/onboarding/section5Catalog";
import {
  contactHasIdentity,
  type PaymentDueId,
  type PaymentMethodId,
  type Section2Data,
} from "@/lib/onboarding/types";
import { YES_NO_OPTIONS } from "@/lib/onboarding/validation/section4";
import { validateSection5, type FieldErrors } from "@/lib/onboarding/validation/section5";
import { validateApproverContact } from "@/lib/onboarding/validation/section3";

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

export function Section5Form({ mode = "form" }: { mode?: "form" | "review" }) {
  const { draft, updateSection5, addContact, updateContact, saveDraftNow } = useOnboarding();
  const data = draft.section5;
  const contacts = draft.contacts;
  const fees = draft.fees;
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const readOnly = mode === "review";

  const showFinancialApprover = useMemo(() => {
    for (const authority of Object.values(data.remedyAuthority)) {
      if (authority === "human_approval") return true;
    }
    return false;
  }, [data.remedyAuthority]);

  const identityContacts = useMemo(() => contacts.filter((c) => contactHasIdentity(c)), [contacts]);
  const financialApprover = contacts.find((c) => c.id === data.financialApproverContactId);
  const financialApproverIsNew =
    financialApprover && data.financialApproverContactId && !contactHasIdentity(financialApprover);

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
          onChange={(v) =>
            updateSection5(
              {
                paymentDuePolicies: v,
                ...(!v.includes("deposit_required") ? { depositWorkDetail: "", depositRule: "" } : {}),
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

      <QuestionCard title="Do you offer financing?" required>
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
            updateSection5({ remedyRules: { ...data.remedyRules, [remedyId]: rule } }, { immediate: true })
          }
          highlightIncomplete={submitted}
          errors={submitted ? errors : {}}
        />
      </QuestionCard>

      {showFinancialApprover && (
        <QuestionCard title="Who should Alexander contact when human approval is required?" required>
          <ContactPicker
            name="financialApproverContactId"
            contacts={identityContacts}
            value={data.financialApproverContactId}
            onSelect={(id) => updateSection5({ financialApproverContactId: id }, { immediate: true })}
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
                onChange={(patch) => updateContact(financialApprover.id, patch, { immediate: true })}
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
