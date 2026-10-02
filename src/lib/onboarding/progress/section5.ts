import { FINANCIAL_REMEDY_ROWS } from "../section5Catalog";
import { getOfferedPricingServices, pricingServiceLabel } from "../pricingServices";
import {
  activeServicePrices,
  additionalFeeDetailErrors,
  additionalFeeSelectionConflict,
  servicePriceRecordErrors,
} from "../section5Pricing";
import { approverContactIsValid } from "../validation/section3";
import type { Contact, FeeRecord, RemedyId, Section2Data, Section5Data } from "../types";
import { contactHasIdentity, createDefaultSection2 } from "../types";

type ProgressUnit = { applicable: boolean; complete: boolean };

function remedyRequiresHumanApproval(data: Section5Data): boolean {
  for (const row of FINANCIAL_REMEDY_ROWS) {
    if (data.remedyAuthority[row.id as RemedyId] === "human_approval") return true;
  }
  return false;
}

function areaRowsComplete(data: Section5Data): boolean {
  if (data.areaPricingRows.length === 0) return false;
  return data.areaPricingRows.every((row) => row.area.trim() && (row.feeOrMinimum ?? "").trim());
}

function servicePricesComplete(data: Section5Data, section2: Section2Data): boolean {
  const offeredIds = new Set(getOfferedPricingServices(section2).map((service) => service.id));
  const active = activeServicePrices(data.servicePrices, offeredIds);
  const seen = new Set<string>();
  for (const record of active) {
    if (seen.has(record.serviceId)) return false;
    seen.add(record.serviceId);
    if (
      Object.keys(servicePriceRecordErrors(record, pricingServiceLabel(record.serviceId))).length > 0
    ) {
      return false;
    }
  }
  return true;
}

function additionalFeesComplete(data: Section5Data): boolean {
  if (data.additionalFeeSelection.length === 0) return false;
  if (additionalFeeSelectionConflict(data.additionalFeeSelection)) return false;
  if (data.additionalFeeSelection.includes("none")) return true;
  for (const category of data.additionalFeeSelection) {
    if (category === "none") continue;
    if (
      Object.keys(additionalFeeDetailErrors(category, data.additionalFeeDetails[category])).length > 0
    ) {
      return false;
    }
  }
  return true;
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
  void fees;
  const showServicePrices = data.mayQuoteServicePrices === "allowed";
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

  return [
    {
      applicable: true,
      complete:
        data.pricingModels.length > 0 &&
        (!data.pricingModels.includes("other") || Boolean(data.pricingModelOther.trim())),
    },
    {
      applicable: true,
      complete: data.mayQuoteServicePrices === "allowed" || data.mayQuoteServicePrices === "not_allowed",
    },
    {
      applicable: showServicePrices,
      complete: showServicePrices && servicePricesComplete(data, section2),
    },
    {
      applicable: true,
      complete:
        data.unknownPriceBehavior === "technician_after_evaluation" ||
        data.unknownPriceBehavior === "team_provides_pricing",
    },
    { applicable: true, complete: additionalFeesComplete(data) },
    {
      applicable: true,
      complete: data.hasAreaTravelOrMinimum !== "" && (!showAreaRows || areaRowsComplete(data)),
    },
    {
      applicable: true,
      complete:
        data.materialMarkupPolicy !== "" &&
        (!showMarkupExplanation || Boolean(data.materialMarkupCustomerExplanation.trim())),
    },
    // Payment methods and everything after them stay in place for Stage 4B.
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
        (!showFinancing || Boolean(data.financingProviderTerms.trim())),
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
