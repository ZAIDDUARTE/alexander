import {
  FINANCIAL_REMEDY_ROWS,
  GENERAL_PRICING_AUTHORITY_OPTIONS,
  PAYMENT_DUE_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  PRICING_MODEL_OPTIONS,
  PROMOTION_MODIFICATION_OPTIONS,
  PROMOTION_STACKING_OPTIONS,
  SERVICE_PRICING_INSTRUCTION_OPTIONS,
  UNKNOWN_PRICE_OPTIONS,
  VISIT_TYPE_OPTIONS,
  getVisitTypeMatrixServices,
} from "../section5Catalog";
import { getPricingDiscussEligibleServices } from "../pricingServices";
import { hasActiveSection4LinkedFeePolicies } from "../section4FeeLinks";
import {
  activeMeaningfulFees,
  feeCardStarted,
  isPositiveMoney,
  validateFeeCard,
} from "./feeRecord";
import {
  approverContactIsValid,
  validateApproverContact,
} from "./section3";
import type {
  Contact,
  FeeRecord,
  ForbiddenStatementId,
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
const VISIT_TYPE_IDS = new Set(VISIT_TYPE_OPTIONS.map((o) => o.id));
const GENERAL_AUTHORITY_IDS = new Set(GENERAL_PRICING_AUTHORITY_OPTIONS.map((o) => o.id));
const INSTRUCTION_IDS = new Set(SERVICE_PRICING_INSTRUCTION_OPTIONS.map((o) => o.id));
const PAYMENT_METHOD_IDS = new Set(PAYMENT_METHOD_OPTIONS.map((o) => o.id));
const PAYMENT_DUE_IDS = new Set(PAYMENT_DUE_OPTIONS.map((o) => o.id));
const STACKING_IDS = new Set(PROMOTION_STACKING_OPTIONS.map((o) => o.id));
const MODIFICATION_IDS = new Set(PROMOTION_MODIFICATION_OPTIONS.map((o) => o.id));
const REMEDY_IDS = new Set(FINANCIAL_REMEDY_ROWS.map((r) => r.id));
const VALID_REMEDY_AUTHORITIES = new Set(["within_rules", "human_approval", "never"]);

function hasPaidDiagnosticVisit(data: Section5Data): boolean {
  for (const visitType of Object.values(data.visitTypeByServiceId)) {
    if (visitType === "paid_diagnostic") return true;
  }
  return false;
}

function remedyRequiresHumanApproval(data: Section5Data): boolean {
  for (const row of FINANCIAL_REMEDY_ROWS) {
    if (data.remedyAuthority[row.id as RemedyId] === "human_approval") return true;
  }
  return false;
}

function validateAreaPricingRows(data: Section5Data, errors: FieldErrors): void {
  if (data.areaPricingRows.length === 0) {
    errors.areaPricingRows = "Add at least one area with a travel fee or minimum charge.";
    return;
  }
  for (const row of data.areaPricingRows) {
    const area = row.area.trim();
    const travel = row.travelFee.trim();
    const minimum = row.minimumCharge.trim();
    const hasTravel = travel && isPositiveMoney(travel);
    const hasMinimum = minimum && isPositiveMoney(minimum);
    if (!area && !hasTravel && !hasMinimum) {
      errors[`areaPricingRows.${row.id}`] =
        "Enter an area name, travel fee, or minimum charge for this row.";
    }
    if (travel && !isPositiveMoney(travel)) {
      errors[`areaPricingRows.${row.id}.travelFee`] = "Enter a valid travel fee amount.";
    }
    if (minimum && !isPositiveMoney(minimum)) {
      errors[`areaPricingRows.${row.id}.minimumCharge`] = "Enter a valid minimum charge amount.";
    }
  }
}

function validateServicePricingRule(
  serviceId: string,
  rule: Section5Data["servicePricingRules"][string] | undefined,
  fees: FeeRecord[],
  errors: FieldErrors,
): void {
  const prefix = `servicePricingRules.${serviceId}`;
  const instruction = rule?.instruction ?? "";
  if (!instruction || !INSTRUCTION_IDS.has(instruction)) {
    errors[`${prefix}.instruction`] = "Select how Alexander may discuss pricing for this service.";
    return;
  }

  if (instruction === "quote_approved") {
    const mode = rule?.approvedPriceMode ?? "";
    if (mode !== "exact" && mode !== "range") {
      errors[`${prefix}.approvedPriceMode`] = "Select an approved price or range.";
      return;
    }
    if (mode === "exact") {
      if (!isPositiveMoney(rule?.approvedPriceExact ?? "")) {
        errors[`${prefix}.approvedPriceExact`] = "Enter a valid approved price greater than zero.";
      }
    } else {
      if (!isPositiveMoney(rule?.approvedPriceMin ?? "")) {
        errors[`${prefix}.approvedPriceMin`] = "Enter a valid minimum price.";
      }
      if (!isPositiveMoney(rule?.approvedPriceMax ?? "")) {
        errors[`${prefix}.approvedPriceMax`] = "Enter a valid maximum price.";
      }
      if (
        isPositiveMoney(rule?.approvedPriceMin ?? "") &&
        isPositiveMoney(rule?.approvedPriceMax ?? "") &&
        parseFloat(rule!.approvedPriceMin) > parseFloat(rule!.approvedPriceMax)
      ) {
        errors[`${prefix}.approvedPriceRange`] = "Minimum must be less than or equal to maximum.";
      }
    }
  } else if (instruction === "explain_fee_only") {
    const linked = rule?.linkedFeeIds ?? [];
    const validLinked = linked.filter((id) => {
      const fee = fees.find((f) => f.id === id);
      return Boolean(fee && fee.active);
    });
    if (validLinked.length === 0) {
      errors[`${prefix}.linkedFeeIds`] = "Link at least one active fee from your fee list.";
    }
  } else if (instruction === "ask_team") {
    if (!rule?.askTeamDetail.trim()) {
      errors[`${prefix}.askTeamDetail`] =
        "Describe what pricing information Alexander should ask the team to confirm.";
    }
  }
}

function validatePromotionOffer(
  promo: Section5Data["promotions"][number],
  errors: FieldErrors,
): void {
  const prefix = `promotions.${promo.id}`;
  if (!promo.name.trim()) {
    errors[`${prefix}.name`] = "Enter an offer name.";
  }
  if (!promo.benefit.trim()) {
    errors[`${prefix}.benefit`] = "Describe the benefit of this offer.";
  }
  if (!promo.eligibility.trim()) {
    errors[`${prefix}.eligibility`] = "Describe who is eligible.";
  }
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
  const eligibleServices = getPricingDiscussEligibleServices(section2);
  const matrixServices = getVisitTypeMatrixServices();

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

  // Q67
  if (!data.unknownPriceBehavior) {
    errors.unknownPriceBehavior = "Select an option.";
  } else if (!UNKNOWN_PRICE_IDS.has(data.unknownPriceBehavior)) {
    errors.unknownPriceBehavior = "Select a valid option.";
  } else if (data.unknownPriceBehavior === "custom" && !data.unknownPriceCustomRule.trim()) {
    errors.unknownPriceCustomRule = "Describe the rule Alexander should follow.";
  }

  // Q68
  const meaningfulActive = activeMeaningfulFees(fees);
  const section4LinkedFees = hasActiveSection4LinkedFeePolicies(section4, fees);
  if (
    data.noSeparateFees &&
    (meaningfulActive.length > 0 || section4LinkedFees)
  ) {
    errors.noSeparateFees = section4LinkedFees
      ? "Cancellation and no-show fees are configured in Scheduling (Section 4). Change those policies there before selecting no separate fees."
      : "Remove active fee records or turn off “no separate fees” — these choices cannot both apply.";
    errors.fees = "Resolve the conflict between fee cards and “no separate fees”.";
  } else if (!data.noSeparateFees) {
    if (meaningfulActive.length === 0) {
      const anyStarted = fees.some((f) => f.active && feeCardStarted(f));
      if (!anyStarted) {
        errors.fees =
          "Add at least one fee, or select that your company does not charge separate fees.";
      }
    }
    for (const fee of fees) {
      if (!fee.active && !feeCardStarted(fee)) continue;
      if (!fee.active && feeCardStarted(fee)) {
        validateFeeCard(fee, errors, `fees.${fee.id}`, {
          requireNotice: fee.feeKey === "late_cancellation",
        });
        continue;
      }
      if (fee.active) {
        validateFeeCard(fee, errors, `fees.${fee.id}`, {
          requireNotice: fee.feeKey === "late_cancellation",
        });
      }
    }
  }

  // Q69
  if (!data.hasAreaTravelOrMinimum) {
    errors.hasAreaTravelOrMinimum = "Select yes or no.";
  } else if (data.hasAreaTravelOrMinimum === "yes") {
    validateAreaPricingRows(data, errors);
  }

  // Q70
  let missingVisitType = false;
  for (const service of matrixServices) {
    const visitType = data.visitTypeByServiceId[service.id] ?? "";
    if (!visitType) {
      missingVisitType = true;
      errors[`visitTypeByServiceId.${service.id}`] = "Select a visit type for this service.";
    } else if (!VISIT_TYPE_IDS.has(visitType)) {
      missingVisitType = true;
      errors[`visitTypeByServiceId.${service.id}`] = "Select a valid visit type.";
    }
  }
  if (missingVisitType && !errors.visitTypeByServiceId) {
    errors.visitTypeByServiceId = "Select a visit type for every service.";
  }

  // Q71
  if (hasPaidDiagnosticVisit(data) && !data.paidDiagnosticExplanation.trim()) {
    errors.paidDiagnosticExplanation =
      "Explain what Alexander should tell customers about paid diagnostic visits.";
  }

  // Q72
  if (!data.generalPricingAuthority) {
    errors.generalPricingAuthority = "Select an option.";
  } else if (!GENERAL_AUTHORITY_IDS.has(data.generalPricingAuthority)) {
    errors.generalPricingAuthority = "Select a valid option.";
  }

  // Q73
  for (const service of eligibleServices) {
    validateServicePricingRule(
      service.id,
      data.servicePricingRules[service.id],
      fees,
      errors,
    );
  }

  // Q74
  if (data.forbiddenStatements.length === 0) {
    errors.forbiddenStatements = "Select at least one rule Alexander must never say.";
  }
  if (
    data.forbiddenStatements.includes("other" as ForbiddenStatementId) &&
    !data.forbiddenStatementOther.trim()
  ) {
    errors.forbiddenStatementOther = "Describe the other prohibited pricing statement.";
  }

  // Q75
  if (!data.hasPromotions) {
    errors.hasPromotions = "Select yes or no.";
  } else if (data.hasPromotions === "yes") {
    if (data.promotions.length === 0) {
      errors.promotions = "Add at least one discount, coupon, or promotion.";
    }
    for (const promo of data.promotions) {
      validatePromotionOffer(promo, errors);
    }
  }

  // Q76
  if (data.hasPromotions === "yes") {
    if (!data.promotionStacking) {
      errors.promotionStacking = "Select whether promotions may be combined.";
    } else if (!STACKING_IDS.has(data.promotionStacking)) {
      errors.promotionStacking = "Select a valid option.";
    } else if (data.promotionStacking === "conditional" && !data.promotionStackingRule.trim()) {
      errors.promotionStackingRule = "Describe when promotions may be combined.";
    }
  }

  // Q77
  if (data.hasPromotions === "yes") {
    if (!data.promotionModificationAuthority) {
      errors.promotionModificationAuthority =
        "Select whether Alexander may waive or modify a fee or discount.";
    } else if (!MODIFICATION_IDS.has(data.promotionModificationAuthority)) {
      errors.promotionModificationAuthority = "Select a valid option.";
    } else if (
      data.promotionModificationAuthority === "within_rules" &&
      !data.promotionModificationRule.trim()
    ) {
      errors.promotionModificationRule =
        "Describe the rules or limits for promotion or discount changes.";
    }
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
    if (data.financingPermissions.length === 0) {
      errors.financingPermissions = "Select at least one permission for Alexander.";
    }
    if (
      data.financingPermissions.includes("other") &&
      !data.financingPermissionOtherDetail.trim()
    ) {
      errors.financingPermissionOtherDetail = "Describe the other financing permission.";
    }
    if (!data.financingEligibilityStatement.trim()) {
      errors.financingEligibilityStatement =
        "Enter the approved eligibility statement Alexander may use.";
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
