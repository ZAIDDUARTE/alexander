import {
  FINANCIAL_REMEDY_ROWS,
  FORBIDDEN_PRICING_STATEMENT_OPTIONS,
  getVisitTypeMatrixServices,
} from "../section5Catalog";
import { getPricingDiscussEligibleServices } from "../pricingServices";
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
  unknownPrice: {
    behavior: Section5Data["unknownPriceBehavior"] | null;
    customRule: string | null;
  };
  noSeparateFees: boolean;
  fees: NormalizedFeeRecord[];
  areaTravelOrMinimum: {
    hasPolicy: YesNo | null;
    rows: AreaPricingRow[] | null;
  };
  visitTypes: NormalizedVisitTypeRow[];
  paidDiagnosticExplanation: string | null;
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

const FORBIDDEN_LABELS = new Map(
  FORBIDDEN_PRICING_STATEMENT_OPTIONS.map((o) => [o.id, o.label]),
);

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

function normalizeServicePricingRules(
  data: Section5Data,
  section2: Section2Data,
  fees: FeeRecord[],
): NormalizedServicePricingRule[] {
  const eligible = getPricingDiscussEligibleServices(section2);
  const activeFeeIds = new Set(activeMeaningfulFees(fees).map((f) => f.id));
  const out: NormalizedServicePricingRule[] = [];

  for (const service of eligible) {
    const rule = data.servicePricingRules[service.id];
    if (!rule?.instruction) continue;

    const instruction = rule.instruction;
    const base: NormalizedServicePricingRule = {
      serviceId: service.id,
      serviceName: service.label,
      instruction,
      approvedPriceMode: null,
      approvedPriceExact: null,
      approvedPriceMin: null,
      approvedPriceMax: null,
      pricingConditions: null,
      linkedFeeIds: [],
      askTeamDetail: null,
    };

    if (instruction === "quote_approved") {
      base.approvedPriceMode = rule.approvedPriceMode || null;
      if (rule.approvedPriceMode === "exact") {
        base.approvedPriceExact = rule.approvedPriceExact.trim() || null;
      } else if (rule.approvedPriceMode === "range") {
        base.approvedPriceMin = rule.approvedPriceMin.trim() || null;
        base.approvedPriceMax = rule.approvedPriceMax.trim() || null;
      }
      base.pricingConditions = rule.pricingConditions.trim() || null;
    } else if (instruction === "explain_fee_only") {
      base.linkedFeeIds = rule.linkedFeeIds.filter((id) => activeFeeIds.has(id));
    } else if (instruction === "ask_team") {
      base.askTeamDetail = rule.askTeamDetail.trim() || null;
    }

    out.push(base);
  }

  return out;
}

function normalizeVisitTypes(data: Section5Data): NormalizedVisitTypeRow[] {
  const out: NormalizedVisitTypeRow[] = [];
  for (const service of getVisitTypeMatrixServices()) {
    const visitType = data.visitTypeByServiceId[service.id];
    if (!visitType) continue;
    out.push({
      serviceId: service.id,
      serviceName: service.label,
      visitType,
    });
  }
  return out;
}

function normalizeAreaRows(data: Section5Data): AreaPricingRow[] | null {
  if (data.hasAreaTravelOrMinimum !== "yes") return null;
  const rows: AreaPricingRow[] = [];
  for (const row of data.areaPricingRows) {
    const area = row.area.trim();
    const travel = row.travelFee.trim();
    const minimum = row.minimumCharge.trim();
    if (!area && !travel && !minimum) continue;
    rows.push({
      id: row.id,
      area,
      travelFee: travel,
      minimumCharge: minimum,
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

function hasPaidDiagnosticVisit(data: Section5Data): boolean {
  return Object.values(data.visitTypeByServiceId).some((v) => v === "paid_diagnostic");
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
  const showPromotions = data.hasPromotions === "yes";

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

  const nonWaivableFeeIds = activeMeaningfulFees(fees)
    .filter((f) => f.waiverPolicy === "no")
    .map((f) => f.id);
  const feeWaiverAuthority = data.remedyAuthority.fee_waiver || null;
  const feeWaiverPrecedence: FeeWaiverPrecedence = {
    nonWaivableFeeIds,
    feeWaiverRemedyAuthority: feeWaiverAuthority,
    feeWaiverRemedyRule:
      feeWaiverAuthority === "within_rules"
        ? data.remedyRules.fee_waiver.trim() || null
        : null,
  };

  const forbidden = data.forbiddenStatements.filter((id) => FORBIDDEN_LABELS.has(id));

  return {
    pricingModels: models,
    pricingModelOther: models.includes("other") ? data.pricingModelOther.trim() || null : null,
    materialMarkup: {
      policy: data.materialMarkupPolicy || null,
      customerExplanation: showMarkupExplanation
        ? data.materialMarkupCustomerExplanation.trim() || null
        : null,
    },
    unknownPrice: {
      behavior: data.unknownPriceBehavior || null,
      customRule:
        data.unknownPriceBehavior === "custom" ? data.unknownPriceCustomRule.trim() || null : null,
    },
    noSeparateFees: data.noSeparateFees,
    fees: normalizeFees(fees, data.noSeparateFees),
    areaTravelOrMinimum: {
      hasPolicy: data.hasAreaTravelOrMinimum || null,
      rows: normalizeAreaRows(data),
    },
    visitTypes: normalizeVisitTypes(data),
    paidDiagnosticExplanation:
      hasPaidDiagnosticVisit(data) ? data.paidDiagnosticExplanation.trim() || null : null,
    generalPricingAuthority: data.generalPricingAuthority || null,
    servicePricingRules: normalizeServicePricingRules(data, section2, fees),
    forbiddenStatements: forbidden,
    forbiddenStatementOther: forbidden.includes("other")
      ? data.forbiddenStatementOther.trim() || null
      : null,
    promotions: {
      hasPromotions: data.hasPromotions || null,
      offers: showPromotions ? data.promotions : null,
      stacking: showPromotions ? data.promotionStacking || null : null,
      stackingRule:
        showPromotions && data.promotionStacking === "conditional"
          ? data.promotionStackingRule.trim() || null
          : null,
      modificationAuthority: showPromotions ? data.promotionModificationAuthority || null : null,
      modificationRule:
        showPromotions && data.promotionModificationAuthority === "within_rules"
          ? data.promotionModificationRule.trim() || null
          : null,
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
      permissions: showFinancing ? [...data.financingPermissions] : [],
      permissionOtherDetail:
        showFinancing && data.financingPermissions.includes("other")
          ? data.financingPermissionOtherDetail.trim() || null
          : null,
      eligibilityStatement: showFinancing ? data.financingEligibilityStatement.trim() || null : null,
    },
    remedies,
    feeWaiverPrecedence,
    financialApproverContactId,
    contacts: meaningfulContacts,
  };
}
