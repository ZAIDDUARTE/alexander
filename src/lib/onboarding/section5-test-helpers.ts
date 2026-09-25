import { FINANCIAL_REMEDY_ROWS, getVisitTypeMatrixServices } from "./section5Catalog";
import { getPricingDiscussEligibleServices } from "./pricingServices";
import {
  FIRST_JOB_SERVICE_ID,
  section2WithEligibleServices,
  validApproverContact,
} from "./section4-test-helpers";
import {
  createCustomFee,
  createDefaultSection5,
  createDefaultRemedyAuthority,
  createDefaultRemedyRules,
  createPromotionId,
  type Contact,
  type FeeRecord,
  type Section2Data,
  type Section5Data,
} from "./types";

export { FIRST_JOB_SERVICE_ID, section2WithEligibleServices, validApproverContact };

export const ELIGIBLE_SECTION2_FOR_PRICING = section2WithEligibleServices({
  [FIRST_JOB_SERVICE_ID]: "offered",
});

export function validQ68Fee(overrides: Partial<FeeRecord> = {}): FeeRecord {
  return {
    ...createCustomFee("Diagnostic visit fee"),
    amountKind: "fixed",
    amountFixed: "89.00",
    applicationRule: "Applies to all diagnostic visits.",
    quoteAuthority: "yes",
    creditTowardWork: "yes",
    waiverPolicy: "no",
    active: true,
    ...overrides,
  };
}

export function setAllVisitTypes(
  data: Section5Data,
  visitType: Section5Data["visitTypeByServiceId"][string] = "normal_service",
): void {
  for (const service of getVisitTypeMatrixServices()) {
    data.visitTypeByServiceId[service.id] = visitType;
  }
}

export function setEligibleServicePricingRules(
  data: Section5Data,
  section2: Section2Data,
  instruction: "quote_approved" | "do_not_discuss" = "do_not_discuss",
): void {
  for (const service of getPricingDiscussEligibleServices(section2)) {
    if (instruction === "quote_approved") {
      data.servicePricingRules[service.id] = {
        instruction: "quote_approved",
        approvedPriceMode: "exact",
        approvedPriceExact: "150",
        approvedPriceMin: "",
        approvedPriceMax: "",
        pricingConditions: "",
        linkedFeeIds: [],
        askTeamDetail: "",
      };
    } else {
      data.servicePricingRules[service.id] = {
        instruction: "do_not_discuss",
        approvedPriceMode: "",
        approvedPriceExact: "",
        approvedPriceMin: "",
        approvedPriceMax: "",
        pricingConditions: "",
        linkedFeeIds: [],
        askTeamDetail: "",
      };
    }
  }
}

/**
 * Minimum valid Section 5 answers. Uses noSeparateFees by default; pass fees
 * when tests need Q68 fee cards or Q73 fee links.
 */
export function fullyValidSection5(
  section2: Section2Data = ELIGIBLE_SECTION2_FOR_PRICING,
  contacts: Contact[] = [],
  fees: FeeRecord[] = [],
): Section5Data {
  void fees;
  const data = createDefaultSection5();

  data.pricingModels = ["flat_rate"];
  data.materialMarkupPolicy = "no";
  data.unknownPriceBehavior = "technician_after_evaluation";
  data.noSeparateFees = true;

  data.hasAreaTravelOrMinimum = "no";
  setAllVisitTypes(data, "normal_service");

  data.generalPricingAuthority = "after_evaluation";
  setEligibleServicePricingRules(data, section2, "do_not_discuss");

  data.hasPromotions = "no";
  data.paymentMethods = ["credit_card"];
  data.paymentDuePolicies = ["at_time_of_service"];
  data.offersFinancing = "no";

  const authority = createDefaultRemedyAuthority();
  const rules = createDefaultRemedyRules();
  for (const row of FINANCIAL_REMEDY_ROWS) {
    authority[row.id as keyof typeof authority] = "never";
    rules[row.id as keyof typeof rules] = "";
  }
  data.remedyAuthority = authority;
  data.remedyRules = rules;

  if (contacts.length === 0) {
    void contacts;
  }

  return data;
}

export function promotionOfferRow(name = "Spring special") {
  return {
    id: createPromotionId(),
    name,
    benefit: "10% off labor",
    eligibility: "New customers",
    qualifyingServiceIds: [FIRST_JOB_SERVICE_ID],
    expiration: "2026-12-31",
    proactiveUsePolicy: "Mention when customer asks about discounts.",
  };
}
