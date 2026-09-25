"use client";

import { getPricingDiscussEligibleServices } from "@/lib/onboarding/pricingServices";
import { SERVICE_PRICING_INSTRUCTION_OPTIONS } from "@/lib/onboarding/section5Catalog";
import { activeMeaningfulFees } from "@/lib/onboarding/validation/feeRecord";
import type {
  FeeRecord,
  Section2Data,
  ServicePricingInstructionId,
  ServicePricingRule,
} from "@/lib/onboarding/types";
import { ConditionalPanel } from "./ui/Card";
import { TextField, TextareaField } from "./ui/Fields";
import { RadioGroup } from "./ui/RadioGroup";
import { CheckboxGroup } from "./ui/CheckboxGroup";

function emptyRule(): ServicePricingRule {
  return {
    instruction: "",
    approvedPriceMode: "",
    approvedPriceExact: "",
    approvedPriceMin: "",
    approvedPriceMax: "",
    pricingConditions: "",
    linkedFeeIds: [],
    askTeamDetail: "",
  };
}

export function ServicePricingCards({
  section2,
  rules,
  fees,
  onRuleChange,
  showErrors = false,
  errors = {},
}: {
  section2: Section2Data;
  rules: Record<string, ServicePricingRule>;
  fees: FeeRecord[];
  onRuleChange: (serviceId: string, patch: Partial<ServicePricingRule>) => void;
  showErrors?: boolean;
  errors?: Record<string, string | undefined>;
}) {
  const services = getPricingDiscussEligibleServices(section2);
  const instructionOptions = SERVICE_PRICING_INSTRUCTION_OPTIONS.map((o) => ({
    value: o.id as ServicePricingInstructionId,
    label: o.label,
  }));
  const activeFees = activeMeaningfulFees(fees);
  const feeOptions = activeFees.map((f) => ({
    value: f.id,
    label: f.name.trim() || "Unnamed fee",
  }));

  if (services.length === 0) {
    return (
      <p className="text-sm text-[var(--color-alexander-muted)]">
        No services from Section 2 are currently eligible for pricing discussion. Configure offered,
        conditional, or ask-team services in Section 2, or skip if not applicable.
      </p>
    );
  }

  return (
    <ul className="min-w-0 space-y-4">
      {services.map((service) => {
        const rule = rules[service.id] ?? emptyRule();
        const prefix = `servicePricingRules.${service.id}`;
        const instructionError = errors[`${prefix}.instruction`];

        return (
          <li
            key={service.id}
            className="min-w-0 rounded-lg border border-[var(--color-alexander-border)] bg-white p-4 sm:p-5"
          >
            <p className="mb-3 text-sm font-semibold text-[var(--color-alexander-navy)]">
              {service.label}
            </p>
            <RadioGroup
              name={`service-pricing-${service.id}`}
              options={instructionOptions}
              value={rule.instruction}
              onChange={(v) =>
                onRuleChange(service.id, {
                  instruction: v,
                  ...(v !== "quote_approved"
                    ? {
                        approvedPriceMode: "",
                        approvedPriceExact: "",
                        approvedPriceMin: "",
                        approvedPriceMax: "",
                        pricingConditions: "",
                      }
                    : {}),
                  ...(v !== "explain_fee_only" ? { linkedFeeIds: [] } : {}),
                  ...(v !== "ask_team" ? { askTeamDetail: "" } : {}),
                })
              }
              error={showErrors ? instructionError : undefined}
            />

            {rule.instruction === "quote_approved" && (
              <ConditionalPanel>
                <RadioGroup
                  name={`approved-price-mode-${service.id}`}
                  options={[
                    { value: "exact" as const, label: "Approved exact price" },
                    { value: "range" as const, label: "Approved price range" },
                  ]}
                  value={rule.approvedPriceMode}
                  onChange={(mode) => onRuleChange(service.id, { approvedPriceMode: mode })}
                  error={showErrors ? errors[`${prefix}.approvedPriceMode`] : undefined}
                />
                {rule.approvedPriceMode === "exact" && (
                  <TextField
                    id={`approved-exact-${service.id}`}
                    label="Approved price ($)"
                    required
                    value={rule.approvedPriceExact}
                    onChange={(v) => onRuleChange(service.id, { approvedPriceExact: v })}
                    error={showErrors ? errors[`${prefix}.approvedPriceExact`] : undefined}
                  />
                )}
                {rule.approvedPriceMode === "range" && (
                  <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                    <TextField
                      id={`approved-min-${service.id}`}
                      label="Minimum ($)"
                      required
                      value={rule.approvedPriceMin}
                      onChange={(v) => onRuleChange(service.id, { approvedPriceMin: v })}
                      error={showErrors ? errors[`${prefix}.approvedPriceMin`] : undefined}
                    />
                    <TextField
                      id={`approved-max-${service.id}`}
                      label="Maximum ($)"
                      required
                      value={rule.approvedPriceMax}
                      onChange={(v) => onRuleChange(service.id, { approvedPriceMax: v })}
                      error={showErrors ? errors[`${prefix}.approvedPriceMax`] : undefined}
                    />
                    {showErrors && errors[`${prefix}.approvedPriceRange`] && (
                      <p
                        className="sm:col-span-2 text-sm text-[var(--color-alexander-required)]"
                        role="alert"
                      >
                        {errors[`${prefix}.approvedPriceRange`]}
                      </p>
                    )}
                  </div>
                )}
                <TextareaField
                  id={`pricing-conditions-${service.id}`}
                  label="Pricing conditions (optional)"
                  optional
                  rows={2}
                  value={rule.pricingConditions}
                  onChange={(v) => onRuleChange(service.id, { pricingConditions: v })}
                />
              </ConditionalPanel>
            )}

            {rule.instruction === "explain_fee_only" && (
              <ConditionalPanel>
                {feeOptions.length === 0 ? (
                  <p className="text-sm text-[var(--color-alexander-muted)]">
                    Add at least one active fee in the fee list (Q68) to link here.
                  </p>
                ) : (
                  <CheckboxGroup
                    name={`linked-fees-${service.id}`}
                    options={feeOptions}
                    value={rule.linkedFeeIds}
                    onChange={(ids) => onRuleChange(service.id, { linkedFeeIds: ids })}
                    error={showErrors ? errors[`${prefix}.linkedFeeIds`] : undefined}
                  />
                )}
              </ConditionalPanel>
            )}

            {rule.instruction === "ask_team" && (
              <ConditionalPanel>
                <TextareaField
                  id={`ask-team-${service.id}`}
                  label="What pricing information should Alexander ask the team to confirm?"
                  required
                  rows={2}
                  value={rule.askTeamDetail}
                  onChange={(v) => onRuleChange(service.id, { askTeamDetail: v })}
                  error={showErrors ? errors[`${prefix}.askTeamDetail`] : undefined}
                />
              </ConditionalPanel>
            )}
          </li>
        );
      })}
    </ul>
  );
}
