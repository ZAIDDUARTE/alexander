import {
  PAYMENT_ASSISTANCE_OPTIONS,
  PAYMENT_COLLECTION_OPTIONS,
  PAYMENT_DUE_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  PRICING_MODEL_OPTIONS,
  UNKNOWN_PRICE_OPTIONS,
} from "../section5Catalog";
import { getOfferedPricingServices, pricingServiceLabel } from "../pricingServices";
import {
  activeServicePrices,
  additionalFeeDetailErrors,
  additionalFeeSelectionConflict,
  servicePriceRecordErrors,
} from "../section5Pricing";
import type {
  Contact,
  FeeRecord,
  AdditionalFeeCategory,
  PricingModelId,
  RemedyId,
  Section2Data,
  Section4Data,
  Section5Data,
} from "../types";
import { createDefaultSection2, createDefaultSection4 } from "../types";

export type FieldErrors = Partial<Record<string, string>>;

const PRICING_MODEL_IDS = new Set(PRICING_MODEL_OPTIONS.map((o) => o.id));
const UNKNOWN_PRICE_IDS = new Set(UNKNOWN_PRICE_OPTIONS.map((o) => o.id));
const PAYMENT_METHOD_IDS = new Set(PAYMENT_METHOD_OPTIONS.map((o) => o.id));
const PAYMENT_DUE_IDS = new Set(PAYMENT_DUE_OPTIONS.map((o) => o.id));
const ASSISTANCE_IDS = new Set(PAYMENT_ASSISTANCE_OPTIONS.map((option) => option.id));
const COLLECTION_IDS = new Set(PAYMENT_COLLECTION_OPTIONS.map((option) => option.id));

function validateAreaPricingRows(data: Section5Data, errors: FieldErrors): void {
  if (data.areaPricingRows.length === 0) {
    errors.areaPricingRows = "Add at least one area.";
    return;
  }
  let complete = 0;
  for (const row of data.areaPricingRows) {
    const area = row.area.trim();
    const feeOrMinimum = (row.feeOrMinimum ?? "").trim();
    if (!area || !feeOrMinimum) {
      errors[`areaPricingRows.${row.id}`] = "Enter the area and the fee or minimum.";
      continue;
    }
    complete += 1;
  }
  if (complete === 0) errors.areaPricingRows = "Add at least one area.";
}

/**
 * Section 5 ("Pricing and Payments") validation (Q65–Q82).
 *
 * Hidden / inapplicable branches are not validated (Q66 explanation when
 * No, Q68 fee cards when noSeparateFees, Q69 rows when No, Q71 unless
 * paid diagnostic visit, Q75–Q77 when no promotions, Q79 conditionals
 * when policy not selected, Q80 when No financing, Q81 rules unless
 * within_rules, Q82 unless human approval on Q81, etc.).
 */
export function validateSection5(
  data: Section5Data,
  section2: Section2Data = createDefaultSection2(),
  contacts: Contact[] = [],
  fees: FeeRecord[] = [],
  section4: Section4Data = createDefaultSection4(),
): FieldErrors {
  const errors: FieldErrors = {};
  void fees;
  void section4;
  void contacts;

  // Q65
  const models = data.pricingModels.filter((id) => PRICING_MODEL_IDS.has(id));
  if (models.length === 0) {
    errors.pricingModels = "Select at least one pricing model.";
  } else if (models.length !== data.pricingModels.length) {
    errors.pricingModels = "Remove invalid pricing model selections.";
  }
  if (models.includes("other" as PricingModelId) && !data.pricingModelOther.trim()) {
    errors.pricingModelOther = "Describe your other pricing method.";
  }

  // Q66
  if (!data.materialMarkupPolicy) {
    errors.materialMarkupPolicy = "Select an option.";
  } else if (
    (data.materialMarkupPolicy === "yes" || data.materialMarkupPolicy === "sometimes") &&
    !data.materialMarkupCustomerExplanation.trim()
  ) {
    errors.materialMarkupCustomerExplanation =
      "Describe what Alexander may tell customers about material pricing.";
  }

  if (data.mayQuoteServicePrices !== "allowed" && data.mayQuoteServicePrices !== "not_allowed") {
    errors.mayQuoteServicePrices = "Select whether Alexander may quote service prices.";
  } else if (data.mayQuoteServicePrices === "allowed") {
    const offered = getOfferedPricingServices(section2);
    const offeredIds = new Set(offered.map((service) => service.id));
    const active = activeServicePrices(data.servicePrices, offeredIds);
    const seen = new Set<string>();
    for (const record of active) {
      if (seen.has(record.serviceId)) {
        errors[`servicePrices.${record.serviceId}`] = "This service already has pricing.";
        continue;
      }
      seen.add(record.serviceId);
      Object.assign(
        errors,
        servicePriceRecordErrors(record, pricingServiceLabel(record.serviceId)),
      );
    }
  }

  if (!data.unknownPriceBehavior || !UNKNOWN_PRICE_IDS.has(data.unknownPriceBehavior)) {
    errors.unknownPriceBehavior = "Select an option.";
  }

  if (data.additionalFeeSelection.length === 0) {
    errors.additionalFeeSelection = "Select at least one option.";
  } else if (additionalFeeSelectionConflict(data.additionalFeeSelection)) {
    errors.additionalFeeSelection = "“We don’t charge additional fees” cannot be combined with a fee.";
  } else if (!data.additionalFeeSelection.includes("none")) {
    for (const category of data.additionalFeeSelection) {
      if (category === "none") continue;
      Object.assign(
        errors,
        additionalFeeDetailErrors(category as AdditionalFeeCategory, data.additionalFeeDetails[category as AdditionalFeeCategory]),
      );
    }
  }

  if (!data.hasAreaTravelOrMinimum) {
    errors.hasAreaTravelOrMinimum = "Select yes or no.";
  } else if (data.hasAreaTravelOrMinimum === "yes") {
    validateAreaPricingRows(data, errors);
  }

  // Q78
  const methods = data.paymentMethods.filter((id) => PAYMENT_METHOD_IDS.has(id));
  if (methods.length === 0) {
    errors.paymentMethods = "Select at least one payment method.";
  }
  if (methods.includes("other") && !data.paymentMethodOther.trim()) {
    errors.paymentMethodOther = "Describe the other payment method.";
  }

  // Q79
  const duePolicies = data.paymentDuePolicies.filter((id) => PAYMENT_DUE_IDS.has(id));
  if (duePolicies.length === 0) {
    errors.paymentDuePolicies = "Select at least one payment-due policy.";
  }
  if (!ASSISTANCE_IDS.has(data.paymentAssistance)) {
    errors.paymentAssistance = "Select whether Alexander may help customers make a payment.";
  }

  const scope = data.paymentCollectionScope.filter((id) => COLLECTION_IDS.has(id));
  if (scope.length === 0) {
    errors.paymentCollectionScope = "Select at least one type of payment.";
  }
  if (scope.includes("other") && !data.paymentCollectionOther.trim()) {
    errors.paymentCollectionOther = "Describe the other payment Alexander may collect.";
  }

  const remedies = data.financialRemedies;
  const hasNone = remedies.includes("none");
  const actual = remedies.filter((id): id is RemedyId => id !== "none");
  if (remedies.length === 0) {
    errors.financialRemedies = "Select at least one option.";
  } else if (hasNone && actual.length > 0) {
    errors.financialRemedies = "“None - human approval is required” cannot be combined with a remedy.";
  } else if (!hasNone) {
    for (const remedyId of actual) {
      if (!data.remedyRules[remedyId]?.trim()) {
        errors[`remedyRules.${remedyId}`] = "Describe Alexander’s rules or limits for this remedy.";
      }
    }
  }

  return errors;
}

export function section5IsValid(
  data: Section5Data,
  section2: Section2Data = createDefaultSection2(),
  contacts: Contact[] = [],
  fees: FeeRecord[] = [],
  section4: Section4Data = createDefaultSection4(),
): boolean {
  return Object.keys(validateSection5(data, section2, contacts, fees, section4)).length === 0;
}
