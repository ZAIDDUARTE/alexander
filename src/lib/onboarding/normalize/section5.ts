import { FINANCIAL_REMEDY_ROWS } from "../section5Catalog";
import { getOfferedPricingServices, pricingServiceLabel } from "../pricingServices";
import { activeMeaningfulFees } from "../validation/feeRecord";
import { normalizeContact, type NormalizedContact } from "./section3";
import type {
  AreaPricingRow,
  Contact,
  FeeRecord,
  ForbiddenStatementId,
  MaterialMarkupPolicy,
  PricingModelId,
  PromotionOffer,
  PromotionModificationId,
  PromotionStackingId,
  RemedyAuthority,
  RemedyId,
  Section2Data,
  Section5Data,
  ServicePricingRule,
  VisitTypeId,
  YesNo,
} from "../types";
import { contactHasIdentity, createDefaultSection2 } from "../types";

export type NormalizedFeeRecord = {
  id: string;
  feeKey: string;
  name: string;
  amountKind: string;
  amountFixed: string;
  amountMin: string;
  amountMax: string;
  amountPercentage: string;
  applicationRule: string;
  noticeRequired: string | null;
  quoteAuthority: string;
  creditTowardWork: string;
  waiverPolicy: string;
  waiverRule: string | null;
  categoryTemplate: string | null;
  sourceSection: number;
};

export type NormalizedVisitTypeRow = {
  serviceId: string;
  serviceName: string;
  visitType: VisitTypeId;
};

export type NormalizedServicePricingRule = {
  serviceId: string;
  serviceName: string;
  instruction: ServicePricingRule["instruction"];
  approvedPriceMode: ServicePricingRule["approvedPriceMode"] | null;
  approvedPriceExact: string | null;
  approvedPriceMin: string | null;
  approvedPriceMax: string | null;
  pricingConditions: string | null;
  linkedFeeIds: string[];
  askTeamDetail: string | null;
};

export type NormalizedRemedyRow = {
  id: RemedyId;
  label: string;
  authority: RemedyAuthority;
  rule: string | null;
};

/** Fee-specific Q68 waiver policy overrides general Q81 fee-waiver authority. */
export type FeeWaiverPrecedence = {
  nonWaivableFeeIds: string[];
  feeWaiverRemedyAuthority: RemedyAuthority | null;
  feeWaiverRemedyRule: string | null;
};

export type NormalizedSection5 = {
  pricingModels: PricingModelId[];
  pricingModelOther: string | null;
  materialMarkup: {
    policy: MaterialMarkupPolicy | null;
    customerExplanation: string | null;
  };
  mayQuoteServicePrices: Section5Data["mayQuoteServicePrices"];
  servicePrices: {
    serviceId: string;
    serviceName: string;
    mode: string;
    exactAmount: string | null;
    startingAmount: string | null;
    rangeMin: string | null;
    rangeMax: string | null;
    hourlyAmount: string | null;
    conditions: string | null;
  }[];
  unknownPrice: {
    behavior: Section5Data["unknownPriceBehavior"] | null;
    customRule: string | null;
  };
  additionalFees: {
    selection: Section5Data["additionalFeeSelection"];
    details: Partial<
      Record<
        string,
        {
          amount: string;
          applicability: string | null;
          credit: string | null;
          creditWhen: string | null;
        }
      >
    >;
  };
  noSeparateFees: boolean;
  fees: NormalizedFeeRecord[];
  areaTravelOrMinimum: {
    hasPolicy: YesNo | null;
    rows: AreaPricingRow[] | null;
  };
  visitTypes: NormalizedVisitTypeRow[];
  paidDiagnosticExplanation: string | null;
  paidDiagnosticFeeId: string | null;
  generalPricingAuthority: Section5Data["generalPricingAuthority"] | null;
  servicePricingRules: NormalizedServicePricingRule[];
  forbiddenStatements: ForbiddenStatementId[];
  forbiddenStatementOther: string | null;
  promotions: {
    hasPromotions: YesNo | null;
    offers: PromotionOffer[] | null;
    stacking: PromotionStackingId | null;
    stackingRule: string | null;
    modificationAuthority: PromotionModificationId | null;
    modificationRule: string | null;
  };
  paymentMethods: Section5Data["paymentMethods"];
  paymentMethodOther: string | null;
  paymentDue: {
    policies: Section5Data["paymentDuePolicies"];
    depositWorkDetail: string | null;
    depositRule: string | null;
    progressPaymentProjectsDetail: string | null;
    progressPaymentRule: string | null;
    invoiceCustomersDetail: string | null;
    invoiceTerms: string | null;
    otherRule: string | null;
  };
  financing: {
    offersFinancing: YesNo | null;
    providerTerms: string | null;
    permissions: Section5Data["financingPermissions"];
    permissionOtherDetail: string | null;
    eligibilityStatement: string | null;
  };
  remedies: NormalizedRemedyRow[];
  feeWaiverPrecedence: FeeWaiverPrecedence;
  financialApproverContactId: string | null;
  contacts: NormalizedContact[];
};

function normalizeFees(fees: FeeRecord[], noSeparateFees: boolean): NormalizedFeeRecord[] {
  if (noSeparateFees) return [];
  return activeMeaningfulFees(fees).map((fee) => ({
    id: fee.id,
    feeKey: fee.feeKey,
    name: fee.name.trim(),
    amountKind: fee.amountKind,
    amountFixed: fee.amountFixed.trim(),
    amountMin: fee.amountMin.trim(),
    amountMax: fee.amountMax.trim(),
    amountPercentage: fee.amountPercentage.trim(),
    applicationRule: fee.applicationRule.trim(),
    noticeRequired: fee.noticeRequired.trim() ? fee.noticeRequired.trim() : null,
    quoteAuthority: fee.quoteAuthority,
    creditTowardWork: fee.creditTowardWork,
    waiverPolicy: fee.waiverPolicy,
    waiverRule:
      fee.waiverPolicy === "yes" || fee.waiverPolicy === "sometimes"
        ? fee.waiverRule.trim() || null
        : null,
    categoryTemplate: fee.categoryTemplate.trim() || null,
    sourceSection: fee.sourceSection,
  }));
}

function normalizeAreaRows(data: Section5Data): AreaPricingRow[] | null {
  if (data.hasAreaTravelOrMinimum !== "yes") return null;
  const rows: AreaPricingRow[] = [];
  for (const row of data.areaPricingRows) {
    const area = row.area.trim();
    const feeOrMinimum = (row.feeOrMinimum ?? "").trim();
    if (!area && !feeOrMinimum) continue;
    rows.push({
      id: row.id,
      area,
      travelFee: "",
      minimumCharge: "",
      feeOrMinimum,
    });
  }
  return rows;
}

function remedyRequiresHumanApproval(data: Section5Data): boolean {
  for (const row of FINANCIAL_REMEDY_ROWS) {
    if (data.remedyAuthority[row.id as RemedyId] === "human_approval") return true;
  }
  return false;
}

/**
 * Section 5 ("Pricing and Payments") normalization — Company Truth for Q65–Q82.
 */
export function normalizeSection5(
  data: Section5Data,
  section2: Section2Data = createDefaultSection2(),
  contacts: Contact[] = [],
  fees: FeeRecord[] = [],
): NormalizedSection5 {
  const meaningfulContacts = contacts
    .map(normalizeContact)
    .filter((c): c is NormalizedContact => c !== null);

  const models = data.pricingModels.filter(Boolean);
  const showMarkupExplanation =
    data.materialMarkupPolicy === "yes" || data.materialMarkupPolicy === "sometimes";

  const due = data.paymentDuePolicies;
  const showDeposit = due.includes("deposit_required");
  const showProgress = due.includes("progress_payments");
  const showInvoice = due.includes("invoice_after_service");
  const showDueOther = due.includes("other");

  const showFinancing = data.offersFinancing === "yes";

  let financialApproverContactId: string | null = null;
  if (remedyRequiresHumanApproval(data) && data.financialApproverContactId.trim()) {
    const raw = contacts.find((c) => c.id === data.financialApproverContactId);
    if (raw && contactHasIdentity(raw)) financialApproverContactId = raw.id;
  }

  const remedies: NormalizedRemedyRow[] = [];
  for (const row of FINANCIAL_REMEDY_ROWS) {
    const id = row.id as RemedyId;
    const authority = data.remedyAuthority[id];
    if (!authority) continue;
    remedies.push({
      id,
      label: row.label,
      authority,
      rule: authority === "within_rules" ? data.remedyRules[id].trim() || null : null,
    });
  }

  const nonWaivableFeeIds: string[] = [];
  const feeWaiverAuthority = data.remedyAuthority.fee_waiver || null;
  const feeWaiverPrecedence: FeeWaiverPrecedence = {
    nonWaivableFeeIds,
    feeWaiverRemedyAuthority: feeWaiverAuthority,
    feeWaiverRemedyRule:
      feeWaiverAuthority === "within_rules"
        ? data.remedyRules.fee_waiver.trim() || null
        : null,
  };

  const offeredIds = new Set(getOfferedPricingServices(section2).map((service) => service.id));
  const quoting = data.mayQuoteServicePrices === "allowed";
  const additionalDetails: NormalizedSection5["additionalFees"]["details"] = {};
  if (!data.additionalFeeSelection.includes("none")) {
    for (const category of data.additionalFeeSelection) {
      if (category === "none") continue;
      const detail = data.additionalFeeDetails[category];
      if (!detail) continue;
      additionalDetails[category] = {
        amount: detail.amount.trim(),
        applicability: detail.applicability.trim() || null,
        credit: detail.credit || null,
        creditWhen: detail.credit === "sometimes" ? detail.creditWhen.trim() || null : null,
      };
    }
  }

  return {
    pricingModels: models,
    pricingModelOther: models.includes("other") ? data.pricingModelOther.trim() || null : null,
    materialMarkup: {
      policy: data.materialMarkupPolicy || null,
      customerExplanation: showMarkupExplanation
        ? data.materialMarkupCustomerExplanation.trim() || null
        : null,
    },
    mayQuoteServicePrices: data.mayQuoteServicePrices,
    servicePrices: quoting
      ? data.servicePrices
          .filter((record) => offeredIds.has(record.serviceId))
          .map((record) => ({
            serviceId: record.serviceId,
            serviceName: pricingServiceLabel(record.serviceId),
            mode: record.mode,
            exactAmount: record.mode === "exact" ? record.exactAmount.trim() || null : null,
            startingAmount: record.mode === "starting_at" ? record.startingAmount.trim() || null : null,
            rangeMin: record.mode === "range" ? record.rangeMin.trim() || null : null,
            rangeMax: record.mode === "range" ? record.rangeMax.trim() || null : null,
            hourlyAmount: record.mode === "hourly" ? record.hourlyAmount.trim() || null : null,
            conditions: record.conditions.trim() || null,
          }))
      : [],
    unknownPrice: {
      behavior: data.unknownPriceBehavior || null,
      customRule: null,
    },
    additionalFees: {
      selection: data.additionalFeeSelection.includes("none")
        ? ["none"]
        : data.additionalFeeSelection.filter((id) => id !== "none"),
      details: additionalDetails,
    },
    noSeparateFees: false,
    fees: normalizeFees(
      fees.filter((fee) => fee.feeKey === "late_cancellation" || fee.feeKey === "no_show"),
      false,
    ),
    areaTravelOrMinimum: {
      hasPolicy: data.hasAreaTravelOrMinimum || null,
      rows: normalizeAreaRows(data),
    },
    visitTypes: [],
    paidDiagnosticExplanation: null,
    paidDiagnosticFeeId: null,
    generalPricingAuthority: null,
    servicePricingRules: [],
    forbiddenStatements: [],
    forbiddenStatementOther: null,
    promotions: {
      hasPromotions: null,
      offers: null,
      stacking: null,
      stackingRule: null,
      modificationAuthority: null,
      modificationRule: null,
    },
    paymentMethods: [...data.paymentMethods],
    paymentMethodOther: data.paymentMethods.includes("other")
      ? data.paymentMethodOther.trim() || null
      : null,
    paymentDue: {
      policies: [...due],
      depositWorkDetail: showDeposit ? data.depositWorkDetail.trim() || null : null,
      depositRule: showDeposit ? data.depositRule.trim() || null : null,
      progressPaymentProjectsDetail: showProgress
        ? data.progressPaymentProjectsDetail.trim() || null
        : null,
      progressPaymentRule: showProgress ? data.progressPaymentRule.trim() || null : null,
      invoiceCustomersDetail: showInvoice ? data.invoiceCustomersDetail.trim() || null : null,
      invoiceTerms: showInvoice ? data.invoiceTerms.trim() || null : null,
      otherRule: showDueOther ? data.paymentDueOtherRule.trim() || null : null,
    },
    financing: {
      offersFinancing: data.offersFinancing || null,
      providerTerms: showFinancing ? data.financingProviderTerms.trim() || null : null,
      permissions: [],
      permissionOtherDetail: null,
      eligibilityStatement: null,
    },
    remedies,
    feeWaiverPrecedence,
    financialApproverContactId,
    contacts: meaningfulContacts,
  };
}
