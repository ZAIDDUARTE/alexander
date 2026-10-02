import {
  FINANCIAL_REMEDY_ROWS,
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
import {
  approverContactIsValid,
  validateApproverContact,
} from "./section3";
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
import { contactHasIdentity, createDefaultSection2, createDefaultSection4 } from "../types";

export type FieldErrors = Partial<Record<string, string>>;

const PRICING_MODEL_IDS = new Set(PRICING_MODEL_OPTIONS.map((o) => o.id));
const UNKNOWN_PRICE_IDS = new Set(UNKNOWN_PRICE_OPTIONS.map((o) => o.id));
const PAYMENT_METHOD_IDS = new Set(PAYMENT_METHOD_OPTIONS.map((o) => o.id));
const PAYMENT_DUE_IDS = new Set(PAYMENT_DUE_OPTIONS.map((o) => o.id));
const REMEDY_IDS = new Set(FINANCIAL_REMEDY_ROWS.map((r) => r.id));
const VALID_REMEDY_AUTHORITIES = new Set(["within_rules", "human_approval", "never"]);

function remedyRequiresHumanApproval(data: Section5Data): boolean {
  for (const row of FINANCIAL_REMEDY_ROWS) {
    if (data.remedyAuthority[row.id as RemedyId] === "human_approval") return true;
  }
  return false;
}

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
  if (duePolicies.includes("deposit_required")) {
    if (!data.depositWorkDetail.trim()) {
      errors.depositWorkDetail = "Describe which work requires a deposit.";
    }
    if (!data.depositRule.trim()) {
      errors.depositRule = "Describe your deposit rule.";
    }
  }
  if (duePolicies.includes("progress_payments")) {
    if (!data.progressPaymentProjectsDetail.trim()) {
      errors.progressPaymentProjectsDetail = "Describe which projects use progress payments.";
    }
    if (!data.progressPaymentRule.trim()) {
      errors.progressPaymentRule = "Describe your progress-payment rule.";
    }
  }
  if (duePolicies.includes("invoice_after_service")) {
    if (!data.invoiceCustomersDetail.trim()) {
      errors.invoiceCustomersDetail = "Describe which customers may be invoiced.";
    }
    if (!data.invoiceTerms.trim()) {
      errors.invoiceTerms = "Describe your invoice terms.";
    }
  }
  if (duePolicies.includes("other") && !data.paymentDueOtherRule.trim()) {
    errors.paymentDueOtherRule = "Describe your other payment-due rule.";
  }

  // Q80
  if (!data.offersFinancing) {
    errors.offersFinancing = "Select yes or no.";
  } else if (data.offersFinancing === "yes") {
    if (!data.financingProviderTerms.trim()) {
      errors.financingProviderTerms = "Enter financing provider and terms.";
    }
  }

  // Q81
  let missingRemedyAuthority = false;
  for (const row of FINANCIAL_REMEDY_ROWS) {
    const remedyId = row.id as RemedyId;
    const authority = data.remedyAuthority[remedyId] ?? "";
    if (!authority) {
      missingRemedyAuthority = true;
      continue;
    }
    if (!VALID_REMEDY_AUTHORITIES.has(authority) || !REMEDY_IDS.has(remedyId)) {
      missingRemedyAuthority = true;
      continue;
    }
    if (authority === "within_rules" && !data.remedyRules[remedyId].trim()) {
      errors[`remedyRules.${remedyId}`] = "Describe the rules or limits for this remedy.";
    }
  }
  if (missingRemedyAuthority) {
    errors.remedyAuthority = "Select an authority for every financial remedy.";
  }

  // Q82
  if (remedyRequiresHumanApproval(data)) {
    if (!data.financialApproverContactId.trim()) {
      errors.financialApproverContactId =
        "Select who Alexander should contact for financial remedy approval.";
    } else {
      const approver = contacts.find((c) => c.id === data.financialApproverContactId);
      if (!approver || !contactHasIdentity(approver)) {
        errors.financialApproverContactId = "Select a valid contact.";
      } else if (!approverContactIsValid(approver)) {
        const approverErrors = validateApproverContact(approver);
        for (const [key, msg] of Object.entries(approverErrors)) {
          if (msg && typeof msg === "string") {
            errors[`financialApproverContact.${key}`] = msg;
          }
        }
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
