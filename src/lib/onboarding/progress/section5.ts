import { PAYMENT_ASSISTANCE_OPTIONS, PAYMENT_COLLECTION_OPTIONS } from "../section5Catalog";
import { getOfferedPricingServices, pricingServiceLabel } from "../pricingServices";
import {
  activeServicePrices,
  additionalFeeDetailErrors,
  additionalFeeSelectionConflict,
  servicePriceRecordErrors,
} from "../section5Pricing";
import type { Contact, FeeRecord, RemedyId, Section2Data, Section5Data } from "../types";
import { createDefaultSection2 } from "../types";

type ProgressUnit = { applicable: boolean; complete: boolean };

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

const ASSISTANCE_IDS = new Set(PAYMENT_ASSISTANCE_OPTIONS.map((option) => option.id));
const COLLECTION_IDS = new Set(PAYMENT_COLLECTION_OPTIONS.map((option) => option.id));

function remediesComplete(data: Section5Data): boolean {
  const remedies = data.financialRemedies;
  if (remedies.length === 0) return false;
  const actual = remedies.filter((id): id is RemedyId => id !== "none");
  if (remedies.includes("none") && actual.length > 0) return false;
  if (remedies.includes("none")) return true;
  return actual.every((id) => Boolean(data.remedyRules[id]?.trim()));
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
  void contacts;
  const showServicePrices = data.mayQuoteServicePrices === "allowed";
  const showAreaRows = data.hasAreaTravelOrMinimum === "yes";
  const showMarkupExplanation =
    data.materialMarkupPolicy === "yes" || data.materialMarkupPolicy === "sometimes";
  const collection = data.paymentCollectionScope.filter((id) => COLLECTION_IDS.has(id));

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
    // Payment methods through financial remedies.
    {
      applicable: true,
      complete:
        data.paymentMethods.length > 0 &&
        (!data.paymentMethods.includes("other") || Boolean(data.paymentMethodOther.trim())),
    },
    // Q79
    {
      applicable: true,
      complete: data.paymentDuePolicies.length > 0,
    },
    {
      applicable: true,
      complete: ASSISTANCE_IDS.has(data.paymentAssistance),
    },
    {
      applicable: true,
      complete:
        collection.length > 0 &&
        (!collection.includes("other") || Boolean(data.paymentCollectionOther.trim())),
    },
    { applicable: true, complete: remediesComplete(data) },
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
