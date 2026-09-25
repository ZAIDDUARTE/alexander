import { FINANCIAL_REMEDY_ROWS, getVisitTypeMatrixServices } from "../section5Catalog";
import { getPricingDiscussEligibleServices } from "../pricingServices";
import {
  activeMeaningfulFees,
  feeCardStarted,
  isPositiveMoney,
  validateFeeCard,
} from "../validation/feeRecord";
import { approverContactIsValid } from "../validation/section3";
import type { Contact, FeeRecord, RemedyId, Section2Data, Section5Data } from "../types";
import { contactHasIdentity, createDefaultSection2 } from "../types";

type ProgressUnit = { applicable: boolean; complete: boolean };

function hasPaidDiagnosticVisit(data: Section5Data): boolean {
  return Object.values(data.visitTypeByServiceId).some((v) => v === "paid_diagnostic");
}

function remedyRequiresHumanApproval(data: Section5Data): boolean {
  for (const row of FINANCIAL_REMEDY_ROWS) {
    if (data.remedyAuthority[row.id as RemedyId] === "human_approval") return true;
  }
  return false;
}

function q68Complete(data: Section5Data, fees: FeeRecord[]): boolean {
  const meaningfulActive = activeMeaningfulFees(fees);
  if (data.noSeparateFees) return meaningfulActive.length === 0;
  if (meaningfulActive.length === 0) {
    if (!fees.some((f) => f.active && feeCardStarted(f))) return false;
  }
  const errors: Record<string, string> = {};
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
  return Object.keys(errors).length === 0 && meaningfulActive.length > 0;
}

function areaRowsComplete(data: Section5Data): boolean {
  if (data.areaPricingRows.length === 0) return false;
  return data.areaPricingRows.every((row) => {
    const area = row.area.trim();
    const travel = row.travelFee.trim();
    const minimum = row.minimumCharge.trim();
    const hasTravel = travel && isPositiveMoney(travel);
    const hasMinimum = minimum && isPositiveMoney(minimum);
    if (!area && !hasTravel && !hasMinimum) return false;
    if (travel && !isPositiveMoney(travel)) return false;
    if (minimum && !isPositiveMoney(minimum)) return false;
    return true;
  });
}

function visitTypesComplete(data: Section5Data): boolean {
  for (const service of getVisitTypeMatrixServices()) {
    if (!data.visitTypeByServiceId[service.id]) return false;
  }
  return true;
}

function servicePricingComplete(
  data: Section5Data,
  section2: Section2Data,
  fees: FeeRecord[],
): boolean {
  const eligible = getPricingDiscussEligibleServices(section2);
  if (eligible.length === 0) return true;
  const activeFeeIds = new Set(activeMeaningfulFees(fees).map((f) => f.id));
  for (const service of eligible) {
    const rule = data.servicePricingRules[service.id];
    if (!rule?.instruction) return false;
    if (rule.instruction === "quote_approved") {
      if (rule.approvedPriceMode === "exact") {
        if (!isPositiveMoney(rule.approvedPriceExact)) return false;
      } else if (rule.approvedPriceMode === "range") {
        if (!isPositiveMoney(rule.approvedPriceMin) || !isPositiveMoney(rule.approvedPriceMax)) {
          return false;
        }
        if (parseFloat(rule.approvedPriceMin) > parseFloat(rule.approvedPriceMax)) return false;
      } else {
        return false;
      }
    } else if (rule.instruction === "explain_fee_only") {
      if (!rule.linkedFeeIds.some((id) => activeFeeIds.has(id))) return false;
    } else if (rule.instruction === "ask_team") {
      if (!rule.askTeamDetail.trim()) return false;
    }
  }
  return true;
}

function promotionsComplete(data: Section5Data): boolean {
  if (data.promotions.length === 0) return false;
  return data.promotions.every(
    (p) => p.name.trim() && p.benefit.trim() && p.eligibility.trim(),
  );
}

function remediesComplete(data: Section5Data): boolean {
  for (const row of FINANCIAL_REMEDY_ROWS) {
    const id = row.id as RemedyId;
    const authority = data.remedyAuthority[id];
    if (!authority) return false;
    if (authority === "within_rules" && !data.remedyRules[id].trim()) return false;
  }
  return true;
}

/**
 * Deterministic Section 5 completion units — one per top-level MD question (Q65–Q82).
 */
export function getSection5ProgressUnits(
  data: Section5Data,
  section2: Section2Data = createDefaultSection2(),
  contacts: Contact[] = [],
  fees: FeeRecord[] = [],
): ProgressUnit[] {
  const showPaidDiagnostic = hasPaidDiagnosticVisit(data);
  const showPromotions = data.hasPromotions === "yes";
  const showStacking = showPromotions;
  const showModification = showPromotions;
  const showAreaRows = data.hasAreaTravelOrMinimum === "yes";
  const showFinancing = data.offersFinancing === "yes";
  const showFinancialApprover = remedyRequiresHumanApproval(data);

  const showMarkupExplanation =
    data.materialMarkupPolicy === "yes" || data.materialMarkupPolicy === "sometimes";

  const due = data.paymentDuePolicies;
  const depositComplete =
    !due.includes("deposit_required") ||
    (Boolean(data.depositWorkDetail.trim()) && Boolean(data.depositRule.trim()));
  const progressComplete =
    !due.includes("progress_payments") ||
    (Boolean(data.progressPaymentProjectsDetail.trim()) &&
      Boolean(data.progressPaymentRule.trim()));
  const invoiceComplete =
    !due.includes("invoice_after_service") ||
    (Boolean(data.invoiceCustomersDetail.trim()) && Boolean(data.invoiceTerms.trim()));
  const dueOtherComplete =
    !due.includes("other") || Boolean(data.paymentDueOtherRule.trim());

  const financialApproverComplete =
    showFinancialApprover &&
    Boolean(data.financialApproverContactId.trim()) &&
    (() => {
      const approver = contacts.find((c) => c.id === data.financialApproverContactId);
      return Boolean(approver && contactHasIdentity(approver) && approverContactIsValid(approver));
    })();

  const forbiddenComplete =
    data.forbiddenStatements.length > 0 &&
    (!data.forbiddenStatements.includes("other") || Boolean(data.forbiddenStatementOther.trim()));

  return [
    // Q65
    {
      applicable: true,
      complete:
        data.pricingModels.length > 0 &&
        (!data.pricingModels.includes("other") || Boolean(data.pricingModelOther.trim())),
    },
    // Q66
    {
      applicable: true,
      complete:
        data.materialMarkupPolicy !== "" &&
        (!showMarkupExplanation || Boolean(data.materialMarkupCustomerExplanation.trim())),
    },
    // Q67
    {
      applicable: true,
      complete:
        data.unknownPriceBehavior !== "" &&
        (data.unknownPriceBehavior !== "custom" || Boolean(data.unknownPriceCustomRule.trim())),
    },
    // Q68
    { applicable: true, complete: q68Complete(data, fees) },
    // Q69
    {
      applicable: true,
      complete:
        data.hasAreaTravelOrMinimum !== "" && (!showAreaRows || areaRowsComplete(data)),
    },
    // Q70
    { applicable: true, complete: visitTypesComplete(data) },
    // Q71
    {
      applicable: showPaidDiagnostic,
      complete: showPaidDiagnostic && Boolean(data.paidDiagnosticExplanation.trim()),
    },
    // Q72
    { applicable: true, complete: data.generalPricingAuthority !== "" },
    // Q73
    {
      applicable: true,
      complete: servicePricingComplete(data, section2, fees),
    },
    // Q74 — MD default five may pre-complete; Other still conditional
    { applicable: true, complete: forbiddenComplete },
    // Q75
    {
      applicable: true,
      complete: data.hasPromotions !== "" && (!showPromotions || promotionsComplete(data)),
    },
    // Q76
    {
      applicable: showStacking,
      complete:
        showStacking &&
        data.promotionStacking !== "" &&
        (data.promotionStacking !== "conditional" || Boolean(data.promotionStackingRule.trim())),
    },
    // Q77
    {
      applicable: showModification,
      complete:
        showModification &&
        data.promotionModificationAuthority !== "" &&
        (data.promotionModificationAuthority !== "within_rules" ||
          Boolean(data.promotionModificationRule.trim())),
    },
    // Q78
    {
      applicable: true,
      complete:
        data.paymentMethods.length > 0 &&
        (!data.paymentMethods.includes("other") || Boolean(data.paymentMethodOther.trim())),
    },
    // Q79
    {
      applicable: true,
      complete:
        data.paymentDuePolicies.length > 0 &&
        depositComplete &&
        progressComplete &&
        invoiceComplete &&
        dueOtherComplete,
    },
    // Q80
    {
      applicable: true,
      complete:
        data.offersFinancing !== "" &&
        (!showFinancing ||
          (Boolean(data.financingProviderTerms.trim()) &&
            data.financingPermissions.length > 0 &&
            Boolean(data.financingEligibilityStatement.trim()) &&
            (!data.financingPermissions.includes("other") ||
              Boolean(data.financingPermissionOtherDetail.trim())))),
    },
    // Q81
    { applicable: true, complete: remediesComplete(data) },
    // Q82
    { applicable: showFinancialApprover, complete: financialApproverComplete },
  ];
}

/** Fraction (0–1) of applicable Section 5 questions that are currently complete. */
export function getSection5Progress(
  data: Section5Data,
  section2: Section2Data = createDefaultSection2(),
  contacts: Contact[] = [],
  fees: FeeRecord[] = [],
): number {
  const units = getSection5ProgressUnits(data, section2, contacts, fees).filter((u) => u.applicable);
  if (units.length === 0) return 0;
  const completed = units.filter((u) => u.complete).length;
  return completed / units.length;
}
