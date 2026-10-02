import { isPositiveMoney } from "./money";
import type {
  AdditionalFeeCategory,
  AdditionalFeeDetail,
  AdditionalFeeSelection,
  ServicePriceMode,
  ServicePriceRecord,
} from "./types";

export const CURRENT_UNKNOWN_PRICE = new Set<string>([
  "technician_after_evaluation",
  "team_provides_pricing",
]);

export const DEFAULT_UNKNOWN_PRICE = "technician_after_evaluation";

export const MATERIAL_PRICING_PREFILL =
  "Our quoted prices may include parts and materials. Do not discuss our internal costs or markup percentages.";

export function markupExplanationAfterPolicy(policy: string, explanation: string): string {
  if (policy === "no") return "";
  if ((policy === "yes" || policy === "sometimes") && explanation.trim() === "") {
    return MATERIAL_PRICING_PREFILL;
  }
  return explanation;
}

const LEGACY_UNKNOWN_UNMAPPED = new Set<string>([
  "approved_price_or_range",
  "fee_plus_separate_quote",
  "custom",
]);

export function isLegacyUnmappedUnknownPrice(value: string): boolean {
  return LEGACY_UNKNOWN_UNMAPPED.has(value) || (value !== "" && !CURRENT_UNKNOWN_PRICE.has(value));
}

export function activeServicePrices(
  records: ServicePriceRecord[],
  offeredIds: Set<string>,
): ServicePriceRecord[] {
  return records.filter((record) => offeredIds.has(record.serviceId));
}

export function withServicePriceMode(
  record: ServicePriceRecord,
  mode: ServicePriceMode,
): ServicePriceRecord {
  return {
    ...record,
    mode,
    exactAmount: mode === "exact" ? record.exactAmount : "",
    startingAmount: mode === "starting_at" ? record.startingAmount : "",
    rangeMin: mode === "range" ? record.rangeMin : "",
    rangeMax: mode === "range" ? record.rangeMax : "",
    hourlyAmount: mode === "hourly" ? record.hourlyAmount : "",
  };
}

export function servicePriceRecordErrors(
  record: ServicePriceRecord,
  serviceName: string,
): Record<string, string> {
  const prefix = `servicePrices.${record.serviceId}`;
  const errors: Record<string, string> = {};
  if (!record.mode) {
    errors[`${prefix}.mode`] = `Select how ${serviceName} is priced.`;
    return errors;
  }
  if (record.mode === "exact" && !isPositiveMoney(record.exactAmount)) {
    errors[`${prefix}.exactAmount`] = `Enter an exact price for ${serviceName}.`;
  }
  if (record.mode === "starting_at" && !isPositiveMoney(record.startingAmount)) {
    errors[`${prefix}.startingAmount`] = `Enter a starting price for ${serviceName}.`;
  }
  if (record.mode === "hourly" && !isPositiveMoney(record.hourlyAmount)) {
    errors[`${prefix}.hourlyAmount`] = `Enter an hourly rate for ${serviceName}.`;
  }
  if (record.mode === "range") {
    const minOk = isPositiveMoney(record.rangeMin);
    const maxOk = isPositiveMoney(record.rangeMax);
    if (!minOk) errors[`${prefix}.rangeMin`] = `Enter a minimum price for ${serviceName}.`;
    if (!maxOk) errors[`${prefix}.rangeMax`] = `Enter a maximum price for ${serviceName}.`;
    if (minOk && maxOk && parseFloat(record.rangeMin) > parseFloat(record.rangeMax)) {
      errors[`${prefix}.rangeMax`] = `Maximum must be greater than or equal to minimum for ${serviceName}.`;
    }
  }
  return errors;
}

export function additionalFeeDetailErrors(
  category: AdditionalFeeCategory,
  detail: AdditionalFeeDetail | undefined,
): Record<string, string> {
  const prefix = `additionalFeeDetails.${category}`;
  const errors: Record<string, string> = {};
  const current = detail ?? { amount: "", applicability: "", credit: "", creditWhen: "" };
  if (!isPositiveMoney(current.amount)) {
    errors[`${prefix}.amount`] = "Enter a fee amount greater than zero.";
  }
  if (!current.applicability.trim()) {
    errors[`${prefix}.applicability`] = "Describe when this fee applies.";
  }
  if (!current.credit) {
    errors[`${prefix}.credit`] = "Select whether this fee is credited toward approved work.";
  } else if (current.credit === "sometimes" && !current.creditWhen.trim()) {
    errors[`${prefix}.creditWhen`] = "Describe when this fee is credited.";
  }
  return errors;
}

export function additionalFeeSelectionConflict(selection: AdditionalFeeSelection[]): boolean {
  return selection.includes("none") && selection.some((id) => id !== "none");
}
