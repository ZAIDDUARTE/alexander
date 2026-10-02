"use client";

import { useEffect } from "react";
import { getOfferedPricingServices } from "@/lib/onboarding/pricingServices";
import {
  ADDITIONAL_FEE_OPTIONS,
  ADDITIONAL_FEE_CREDIT_OPTIONS,
  AREA_FEE_OR_MINIMUM_PLACEHOLDER,
  FEE_APPLICABILITY_PLACEHOLDERS,
  FEE_CREDIT_WHEN_PLACEHOLDER,
  PRICING_MODEL_OPTIONS,
  QUOTE_PERMISSION_OPTIONS,
  SERVICE_PRICE_CONDITIONS_PLACEHOLDER,
  SERVICE_PRICE_MODE_OPTIONS,
  UNKNOWN_PRICE_OPTIONS,
} from "@/lib/onboarding/section5Catalog";
import { markupExplanationAfterPolicy } from "@/lib/onboarding/section5Pricing";
import {
  createAreaPricingRowId,
  createEmptyServicePrice,
  type AdditionalFeeCategory,
  type AdditionalFeeSelection,
  type AreaPricingRow,
  type MaterialMarkupPolicy,
  type PricingModelId,
  type QuotePermission,
  type Section2Data,
  type Section5Data,
  type ServicePriceMode,
  type UnknownPriceBehaviorId,
} from "@/lib/onboarding/types";
import { withServicePriceMode } from "@/lib/onboarding/section5Pricing";
import type { FieldErrors } from "@/lib/onboarding/validation/section5";
import { QuestionCard, ConditionalPanel } from "./ui/Card";
import { CheckboxGroup } from "./ui/CheckboxGroup";
import { TextField, TextareaField } from "./ui/Fields";
import { MoneyField } from "./ui/MoneyField";
import { RadioGroup } from "./ui/RadioGroup";
import { SecondaryButton } from "./ui/Buttons";

const YES_NO = [
  { value: "yes" as const, label: "Yes" },
  { value: "no" as const, label: "No" },
];

const MARKUP_OPTIONS: { value: MaterialMarkupPolicy; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "sometimes", label: "Sometimes" },
  { value: "no", label: "No" },
];

export function PricingCoreFields({
  data,
  section2,
  errors,
  submitted,
  areaSuggestions,
  onChange,
}: {
  data: Section5Data;
  section2: Section2Data;
  errors: FieldErrors;
  submitted: boolean;
  areaSuggestions: { value: string; label: string }[];
  onChange: (patch: Partial<Section5Data>, immediate?: boolean) => void;
}) {
  const offered = getOfferedPricingServices(section2);
  const showErrors = submitted;

  const addAreaRow = () => {
    const row: AreaPricingRow = {
      id: createAreaPricingRowId(),
      area: "",
      travelFee: "",
      minimumCharge: "",
      feeOrMinimum: "",
    };
    onChange({ areaPricingRows: [...data.areaPricingRows, row] }, true);
  };

  useEffect(() => {
    if (data.hasAreaTravelOrMinimum === "yes" && data.areaPricingRows.length === 0) {
      onChange(
        {
          areaPricingRows: [
            {
              id: createAreaPricingRowId(),
              area: "",
              travelFee: "",
              minimumCharge: "",
              feeOrMinimum: "",
            },
          ],
        },
        true,
      );
    }
    // Seed one row when the customer chooses Yes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.hasAreaTravelOrMinimum]);

  return (
    <>
      <QuestionCard title="How does your company normally determine what a customer pays?" required>
        <CheckboxGroup
          name="pricingModels"
          options={PRICING_MODEL_OPTIONS.map((option) => ({
            value: option.id as PricingModelId,
            label: option.label,
          }))}
          value={data.pricingModels}
          onChange={(value) =>
            onChange(
              {
                pricingModels: value,
                ...(!value.includes("other") ? { pricingModelOther: "" } : {}),
              },
              true,
            )
          }
          error={showErrors ? errors.pricingModels : undefined}
        />
        {data.pricingModels.includes("other") && (
          <ConditionalPanel>
            <TextField
              id="pricingModelOther"
              label="Describe your other pricing method"
              required
              value={data.pricingModelOther}
              onChange={(value) => onChange({ pricingModelOther: value })}
              error={showErrors ? errors.pricingModelOther : undefined}
            />
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard title="May Alexander quote prices for your services?" required>
        <RadioGroup
          name="mayQuoteServicePrices"
          options={QUOTE_PERMISSION_OPTIONS.map((option) => ({
            value: option.id as QuotePermission,
            label: option.label,
          }))}
          value={data.mayQuoteServicePrices}
          onChange={(value) => onChange({ mayQuoteServicePrices: value }, true)}
          error={showErrors ? errors.mayQuoteServicePrices : undefined}
        />
      </QuestionCard>

      {data.mayQuoteServicePrices === "allowed" && (
        <QuestionCard title="What service prices may Alexander quote?" optional>
          {offered.length === 0 ? (
            <p className="text-sm text-[var(--color-alexander-muted)]">
              Mark a service as “We offer this” in Services before adding a price.
            </p>
          ) : (
            <ul className="space-y-4">
              {offered.map((service) => {
                const record = data.servicePrices.find((item) => item.serviceId === service.id);
                if (!record) {
                  return (
                    <li key={service.id} className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-medium text-[var(--color-alexander-navy)]">{service.label}</p>
                      <SecondaryButton
                        fullWidth={false}
                        className="px-3 py-2 text-sm"
                        onClick={() =>
                          onChange(
                            { servicePrices: [...data.servicePrices, createEmptyServicePrice(service.id)] },
                            true,
                          )
                        }
                      >
                        + Add pricing
                      </SecondaryButton>
                    </li>
                  );
                }
                const prefix = `servicePrices.${service.id}`;
                return (
                  <li
                    key={service.id}
                    className="rounded-lg border border-[var(--color-alexander-border)] bg-white p-4"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-[var(--color-alexander-navy)]">{service.label}</p>
                      <SecondaryButton
                        fullWidth={false}
                        className="px-3 py-2 text-sm"
                        onClick={() =>
                          onChange(
                            {
                              servicePrices: data.servicePrices.filter(
                                (item) => item.serviceId !== service.id,
                              ),
                            },
                            true,
                          )
                        }
                      >
                        Remove pricing
                      </SecondaryButton>
                    </div>
                    <p className="text-sm font-medium text-[var(--color-alexander-navy)]">How is this priced?</p>
                    <RadioGroup
                      name={`service-price-${service.id}`}
                      options={SERVICE_PRICE_MODE_OPTIONS.map((option) => ({
                        value: option.id as ServicePriceMode,
                        label: option.label,
                      }))}
                      value={record.mode}
                      onChange={(mode) =>
                        onChange(
                          {
                            servicePrices: data.servicePrices.map((item) =>
                              item.serviceId === service.id ? withServicePriceMode(item, mode) : item,
                            ),
                          },
                          true,
                        )
                      }
                      error={showErrors ? errors[`${prefix}.mode`] : undefined}
                    />
                    {record.mode === "exact" && (
                      <div className="mt-3">
                        <MoneyField
                          id={`${prefix}-exact`}
                          label="Exact price"
                          required
                          value={record.exactAmount}
                          onChange={(value) =>
                            onChange({
                              servicePrices: data.servicePrices.map((item) =>
                                item.serviceId === service.id ? { ...item, exactAmount: value } : item,
                              ),
                            })
                          }
                          error={showErrors ? errors[`${prefix}.exactAmount`] : undefined}
                        />
                      </div>
                    )}
                    {record.mode === "starting_at" && (
                      <div className="mt-3">
                        <MoneyField
                          id={`${prefix}-starting`}
                          label="Starting at"
                          required
                          value={record.startingAmount}
                          onChange={(value) =>
                            onChange({
                              servicePrices: data.servicePrices.map((item) =>
                                item.serviceId === service.id ? { ...item, startingAmount: value } : item,
                              ),
                            })
                          }
                          error={showErrors ? errors[`${prefix}.startingAmount`] : undefined}
                        />
                      </div>
                    )}
                    {record.mode === "range" && (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <MoneyField
                          id={`${prefix}-min`}
                          label="Minimum"
                          required
                          value={record.rangeMin}
                          onChange={(value) =>
                            onChange({
                              servicePrices: data.servicePrices.map((item) =>
                                item.serviceId === service.id ? { ...item, rangeMin: value } : item,
                              ),
                            })
                          }
                          error={showErrors ? errors[`${prefix}.rangeMin`] : undefined}
                        />
                        <MoneyField
                          id={`${prefix}-max`}
                          label="Maximum"
                          required
                          value={record.rangeMax}
                          onChange={(value) =>
                            onChange({
                              servicePrices: data.servicePrices.map((item) =>
                                item.serviceId === service.id ? { ...item, rangeMax: value } : item,
                              ),
                            })
                          }
                          error={showErrors ? errors[`${prefix}.rangeMax`] : undefined}
                        />
                      </div>
                    )}
                    {record.mode === "hourly" && (
                      <div className="mt-3 flex items-end gap-2">
                        <div className="min-w-0 flex-1">
                          <MoneyField
                            id={`${prefix}-hourly`}
                            label="Hourly rate"
                            required
                            value={record.hourlyAmount}
                            onChange={(value) =>
                              onChange({
                                servicePrices: data.servicePrices.map((item) =>
                                  item.serviceId === service.id ? { ...item, hourlyAmount: value } : item,
                                ),
                              })
                            }
                            error={showErrors ? errors[`${prefix}.hourlyAmount`] : undefined}
                          />
                        </div>
                        <p className="pb-3 text-sm text-[var(--color-alexander-muted)]">/ hour</p>
                      </div>
                    )}
                    <div className="mt-3">
                      <TextareaField
                        id={`${prefix}-conditions`}
                        label="Any conditions or details Alexander should know?"
                        optional
                        rows={3}
                        placeholder={SERVICE_PRICE_CONDITIONS_PLACEHOLDER}
                        value={record.conditions}
                        onChange={(value) =>
                          onChange({
                            servicePrices: data.servicePrices.map((item) =>
                              item.serviceId === service.id ? { ...item, conditions: value } : item,
                            ),
                          })
                        }
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </QuestionCard>
      )}

      <QuestionCard title="What should Alexander do when he doesn't have an approved price?" required>
        <RadioGroup
          name="unknownPriceBehavior"
          options={UNKNOWN_PRICE_OPTIONS.map((option) => ({
            value: option.id as UnknownPriceBehaviorId,
            label: option.label,
          }))}
          value={data.unknownPriceBehavior}
          onChange={(value) => onChange({ unknownPriceBehavior: value, unknownPriceCustomRule: "" }, true)}
          error={showErrors ? errors.unknownPriceBehavior : undefined}
        />
      </QuestionCard>

      <QuestionCard title="Which additional fees does your company charge?" required>
        <CheckboxGroup
          name="additionalFeeSelection"
          options={ADDITIONAL_FEE_OPTIONS.map((option) => ({
            value: option.id as AdditionalFeeSelection,
            label: option.label,
          }))}
          value={data.additionalFeeSelection}
          onChange={(value) => onChange({ additionalFeeSelection: value }, true)}
          error={showErrors ? errors.additionalFeeSelection : undefined}
        />
        {data.additionalFeeSelection
          .filter((id): id is AdditionalFeeCategory => id !== "none")
          .map((category) => {
            const detail = data.additionalFeeDetails[category];
            const option = ADDITIONAL_FEE_OPTIONS.find((item) => item.id === category);
            const prefix = `additionalFeeDetails.${category}`;
            return (
              <ConditionalPanel key={category}>
                <div className="space-y-3 rounded-lg border border-[var(--color-alexander-border)] bg-white p-4">
                  <p className="text-sm font-medium text-[var(--color-alexander-navy)]">{option?.label}</p>
                  <MoneyField
                    id={`${prefix}-amount`}
                    label="Amount"
                    required
                    value={detail?.amount ?? ""}
                    onChange={(value) =>
                      onChange({
                        additionalFeeDetails: {
                          ...data.additionalFeeDetails,
                          [category]: { ...detail, amount: value },
                        },
                      })
                    }
                    error={showErrors ? errors[`${prefix}.amount`] : undefined}
                  />
                  <TextareaField
                    id={`${prefix}-applicability`}
                    label="When does it apply?"
                    required
                    rows={2}
                    placeholder={FEE_APPLICABILITY_PLACEHOLDERS[category]}
                    value={detail?.applicability ?? ""}
                    onChange={(value) =>
                      onChange({
                        additionalFeeDetails: {
                          ...data.additionalFeeDetails,
                          [category]: { ...detail, applicability: value },
                        },
                      })
                    }
                    error={showErrors ? errors[`${prefix}.applicability`] : undefined}
                  />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-alexander-navy)]">
                      Is it credited toward approved work?
                    </p>
                    <RadioGroup
                      name={`${prefix}-credit`}
                      options={ADDITIONAL_FEE_CREDIT_OPTIONS.map((item) => ({
                        value: item.id as "always" | "sometimes" | "never",
                        label: item.label,
                      }))}
                      value={detail?.credit ?? ""}
                      onChange={(value) =>
                        onChange(
                          {
                            additionalFeeDetails: {
                              ...data.additionalFeeDetails,
                              [category]: {
                                ...detail,
                                credit: value,
                                ...(value !== "sometimes" ? { creditWhen: "" } : {}),
                              },
                            },
                          },
                          true,
                        )
                      }
                      error={showErrors ? errors[`${prefix}.credit`] : undefined}
                    />
                  </div>
                  {detail?.credit === "sometimes" && (
                    <TextareaField
                      id={`${prefix}-credit-when`}
                      label="When is it credited?"
                      required
                      rows={2}
                      placeholder={FEE_CREDIT_WHEN_PLACEHOLDER}
                      value={detail.creditWhen}
                      onChange={(value) =>
                        onChange({
                          additionalFeeDetails: {
                            ...data.additionalFeeDetails,
                            [category]: { ...detail, creditWhen: value },
                          },
                        })
                      }
                      error={showErrors ? errors[`${prefix}.creditWhen`] : undefined}
                    />
                  )}
                </div>
              </ConditionalPanel>
            );
          })}
      </QuestionCard>

      <QuestionCard title="Do any areas have different travel fees or minimum charges?" required>
        <RadioGroup
          name="hasAreaTravelOrMinimum"
          options={YES_NO}
          value={data.hasAreaTravelOrMinimum}
          onChange={(value) => onChange({ hasAreaTravelOrMinimum: value }, true)}
          error={showErrors ? errors.hasAreaTravelOrMinimum : undefined}
        />
        {data.hasAreaTravelOrMinimum === "yes" && (
          <ConditionalPanel>
            <ul className="space-y-4">
              {data.areaPricingRows.map((row) => (
                <li
                  key={row.id}
                  className="rounded-lg border border-[var(--color-alexander-border)] bg-white p-4"
                >
                  <div className="mb-3 flex justify-end">
                    {data.areaPricingRows.length > 1 && (
                      <SecondaryButton
                        fullWidth={false}
                        className="px-3 py-2 text-sm"
                        onClick={() =>
                          onChange(
                            { areaPricingRows: data.areaPricingRows.filter((item) => item.id !== row.id) },
                            true,
                          )
                        }
                      >
                        Remove area
                      </SecondaryButton>
                    )}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField
                      id={`area-${row.id}`}
                      label="Area"
                      required
                      value={row.area}
                      list="pricing-area-suggestions"
                      onChange={(value) =>
                        onChange({
                          areaPricingRows: data.areaPricingRows.map((item) =>
                            item.id === row.id ? { ...item, area: value } : item,
                          ),
                        })
                      }
                      error={showErrors ? errors[`areaPricingRows.${row.id}`] : undefined}
                    />
                    <TextField
                      id={`area-fee-${row.id}`}
                      label="Fee or minimum"
                      required
                      placeholder={AREA_FEE_OR_MINIMUM_PLACEHOLDER}
                      value={row.feeOrMinimum ?? ""}
                      onChange={(value) =>
                        onChange({
                          areaPricingRows: data.areaPricingRows.map((item) =>
                            item.id === row.id ? { ...item, feeOrMinimum: value } : item,
                          ),
                        })
                      }
                    />
                  </div>
                </li>
              ))}
            </ul>
            <datalist id="pricing-area-suggestions">
              {areaSuggestions.map((choice) => (
                <option key={choice.value} value={choice.value} />
              ))}
            </datalist>
            <SecondaryButton className="mt-4" onClick={addAreaRow}>
              + Add another area
            </SecondaryButton>
            {showErrors && errors.areaPricingRows && (
              <p className="mt-2 text-sm text-[var(--color-alexander-required)]" role="alert">
                {errors.areaPricingRows}
              </p>
            )}
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard title="Does your company mark up parts or materials?" required>
        <RadioGroup
          name="materialMarkupPolicy"
          options={MARKUP_OPTIONS}
          value={data.materialMarkupPolicy}
          onChange={(value) => {
            onChange(
              {
                materialMarkupPolicy: value,
                materialMarkupCustomerExplanation: markupExplanationAfterPolicy(
                  value,
                  data.materialMarkupCustomerExplanation,
                ),
              },
              true,
            );
          }}
          error={showErrors ? errors.materialMarkupPolicy : undefined}
        />
        {(data.materialMarkupPolicy === "yes" || data.materialMarkupPolicy === "sometimes") && (
          <ConditionalPanel>
            <TextareaField
              id="materialMarkupCustomerExplanation"
              label="What may Alexander tell customers about material pricing?"
              required
              rows={3}
              value={data.materialMarkupCustomerExplanation}
              onChange={(value) => onChange({ materialMarkupCustomerExplanation: value })}
              error={showErrors ? errors.materialMarkupCustomerExplanation : undefined}
            />
          </ConditionalPanel>
        )}
      </QuestionCard>
    </>
  );
}
