import { isPositiveMoney } from "./money";
import { LEGACY_FEE_CATEGORY_MAP } from "./section5Catalog";
import {
  DEFAULT_UNKNOWN_PRICE,
  isLegacyUnmappedUnknownPrice,
} from "./section5Pricing";
import type { Stage2MigrationNote } from "./stage2Migration";
import {
  ADDITIONAL_FEE_CATEGORIES,
  createDefaultAdditionalFeeDetails,
  createDefaultForbiddenStatements,
  createDefaultVisitTypeByService,
  createEmptyAdditionalFeeDetail,
  type AdditionalFeeCategory,
  type AdditionalFeeCredit,
  type AdditionalFeeDetail,
  type AdditionalFeeSelection,
  type FeeRecord,
  type OnboardingDraft,
  type Section5Data,
} from "./types";

/**
 * Stage 4A pricing migration.
 *
 * Current answers are kept. Legacy pricing that has no exact structural
 * equivalent is flagged and is not turned into a guessed price type.
 * Customer-facing fields never include these notes.
 */

const QUOTE_VALUES = new Set(["allowed", "not_allowed"]);

function creditFromLegacy(value: string): AdditionalFeeCredit | "" {
  if (value === "yes") return "always";
  if (value === "no") return "never";
  if (value === "sometimes") return "sometimes";
  return "";
}

function completeFeeDetails(
  details: Partial<Record<AdditionalFeeCategory, AdditionalFeeDetail>> | undefined,
): Record<AdditionalFeeCategory, AdditionalFeeDetail> {
  const base = createDefaultAdditionalFeeDetails();
  for (const category of ADDITIONAL_FEE_CATEGORIES) {
    base[category] = {
      ...createEmptyAdditionalFeeDetail(),
      ...(details?.[category] ?? {}),
    };
  }
  return base;
}

function legacyAreaText(travelFee: string, minimumCharge: string): string {
  return [travelFee, minimumCharge].map((value) => value.trim()).filter(Boolean).join(" / ");
}

function feeCategory(fee: FeeRecord): AdditionalFeeCategory | null {
  if (fee.feeKey === "late_cancellation") return "cancellation";
  if (fee.feeKey === "no_show") return "no_show";
  const mapped = LEGACY_FEE_CATEGORY_MAP[fee.categoryTemplate];
  return mapped ? (mapped as AdditionalFeeCategory) : null;
}

function schedulingApplies(mode: string): boolean {
  return mode === "yes" || mode === "conditional";
}

export function migrateStage4aPricing(
  draft: OnboardingDraft,
  rawSection5?: Partial<Section5Data> | null,
): { draft: OnboardingDraft } {
  const notes: Stage2MigrationNote[] = [];
  const section5: Section5Data = {
    ...draft.section5,
    additionalFeeDetails: completeFeeDetails(draft.section5.additionalFeeDetails),
    servicePrices: Array.isArray(draft.section5.servicePrices) ? draft.section5.servicePrices : [],
    additionalFeeSelection: Array.isArray(draft.section5.additionalFeeSelection)
      ? [...draft.section5.additionalFeeSelection]
      : [],
  };

  if (rawSection5 && !("mayQuoteServicePrices" in rawSection5)) {
    section5.mayQuoteServicePrices = "not_allowed";
    notes.push({
      path: "section5.mayQuoteServicePrices",
      from: "",
      to: "not_allowed",
      status: "DEFAULTED_FROM_LEGACY",
    });
  } else if (
    rawSection5 &&
    "mayQuoteServicePrices" in rawSection5 &&
    !QUOTE_VALUES.has(String(rawSection5.mayQuoteServicePrices ?? ""))
  ) {
    section5.mayQuoteServicePrices = "not_allowed";
    notes.push({
      path: "section5.mayQuoteServicePrices",
      from: String(rawSection5.mayQuoteServicePrices ?? ""),
      to: "not_allowed",
      status: "DEFAULTED_FROM_UNKNOWN",
    });
  }

  if (rawSection5 && "unknownPriceBehavior" in rawSection5) {
    const from = String(rawSection5.unknownPriceBehavior ?? "");
    if (from === "") {
      section5.unknownPriceBehavior = DEFAULT_UNKNOWN_PRICE;
    } else if (isLegacyUnmappedUnknownPrice(from)) {
      section5.unknownPriceBehavior = DEFAULT_UNKNOWN_PRICE;
      section5.unknownPriceCustomRule = "";
      notes.push({
        path: "section5.unknownPriceBehavior",
        from,
        to: DEFAULT_UNKNOWN_PRICE,
        status: "NEEDS_QA",
      });
    }
  }

  const areaRows = section5.areaPricingRows.map((row) => {
    const feeOrMinimum = (row.feeOrMinimum ?? "").trim();
    if (feeOrMinimum) {
      return { ...row, feeOrMinimum, travelFee: "", minimumCharge: "" };
    }
    const joined = legacyAreaText(row.travelFee ?? "", row.minimumCharge ?? "");
    if (!joined) return { ...row, feeOrMinimum: "" };
    notes.push({
      path: `section5.areaPricingRows.${row.id}`,
      from: joined,
      to: joined,
      status: "MAPPED",
    });
    return { ...row, feeOrMinimum: joined, travelFee: "", minimumCharge: "" };
  });
  section5.areaPricingRows = areaRows;
  if (!section5.hasAreaTravelOrMinimum) {
    const hasRow = areaRows.some((row) => row.area.trim() || row.feeOrMinimum.trim());
    section5.hasAreaTravelOrMinimum = hasRow ? "yes" : "no";
  }

  for (const [serviceId, rule] of Object.entries(section5.servicePricingRules)) {
    const hasRule =
      Boolean(rule?.instruction) ||
      Boolean(rule?.approvedPriceExact?.trim()) ||
      Boolean(rule?.approvedPriceMin?.trim()) ||
      Boolean(rule?.approvedPriceMax?.trim()) ||
      Boolean(rule?.pricingConditions?.trim());
    if (!hasRule) continue;
    notes.push({
      path: `section5.legacyServicePricing.${serviceId}`,
      from: rule.instruction || "unstructured",
      to: "",
      status: "NEEDS_QA",
    });
  }

  const fees = draft.fees.map((fee) => ({ ...fee }));
  const selection = new Set<AdditionalFeeSelection>(section5.additionalFeeSelection);
  const details = section5.additionalFeeDetails;
  const selectionIsCurrent = Boolean(rawSection5 && "additionalFeeSelection" in rawSection5);

  const activate = (
    category: AdditionalFeeCategory,
    patch: Partial<AdditionalFeeDetail>,
    from: string,
    status: Stage2MigrationNote["status"],
  ) => {
    selection.delete("none");
    const current = details[category];
    const next = { ...current };
    let changed = !selection.has(category);
    selection.add(category);
    if (patch.amount && !current.amount.trim()) {
      next.amount = patch.amount;
      changed = true;
    }
    if (patch.applicability && !current.applicability.trim()) {
      next.applicability = patch.applicability;
      changed = true;
    }
    if (patch.credit && !current.credit) {
      next.credit = patch.credit;
      changed = true;
    }
    details[category] = next;
    if (changed) {
      notes.push({
        path: `section5.additionalFees.${category}`,
        from,
        to: category,
        status,
      });
    }
  };

  for (const fee of fees) {
    const category = feeCategory(fee);
    const fromLabel = fee.categoryTemplate || fee.feeKey || fee.name || fee.id;
    const schedulingCategory =
      (fee.feeKey === "late_cancellation" &&
        schedulingApplies(draft.section4.lateCancellationFeeMode)) ||
      (fee.feeKey === "no_show" && schedulingApplies(draft.section4.noShowFeeMode));
    const section5Card = fee.sourceSection === 5 && fee.active && !fee.feeKey;

    if (fee.feeKey === "late_cancellation" && !schedulingApplies(draft.section4.lateCancellationFeeMode)) {
      continue;
    }
    if (fee.feeKey === "no_show" && !schedulingApplies(draft.section4.noShowFeeMode)) {
      continue;
    }
    if (selectionIsCurrent && !isPositiveMoney(fee.amountFixed)) continue;

    if (!category || (section5Card && !LEGACY_FEE_CATEGORY_MAP[fee.categoryTemplate] && !fee.feeKey)) {
      if (section5Card && (fee.name.trim() || fee.amountFixed.trim() || fee.categoryTemplate)) {
        notes.push({
          path: `section5.legacyFees.${fee.id}`,
          from: fromLabel,
          to: "",
          status: "NEEDS_QA",
        });
      }
      continue;
    }

    if (!schedulingCategory && !section5Card && !fee.feeKey) continue;

    const fixedAmount =
      (fee.amountKind === "fixed" || fee.amountKind === "") && isPositiveMoney(fee.amountFixed)
        ? fee.amountFixed.trim()
        : "";
    const amountNeedsQa =
      !fixedAmount &&
      (fee.amountKind === "range" ||
        fee.amountKind === "percentage" ||
        fee.amountKind === "varies" ||
        Boolean(fee.amountMin.trim() || fee.amountMax.trim() || fee.amountPercentage.trim()));

    activate(
      category,
      {
        amount: fixedAmount,
        applicability: fee.applicationRule.trim(),
        credit: creditFromLegacy(fee.creditTowardWork),
      },
      fixedAmount ? `${fromLabel}:${fixedAmount}` : fromLabel,
      amountNeedsQa ? "NEEDS_QA" : "MAPPED",
    );
    if (amountNeedsQa) {
      notes.push({
        path: `section5.legacyFees.${fee.id}.amount`,
        from: fee.amountKind || "unstructured",
        to: "",
        status: "NEEDS_QA",
      });
    }
    if (fixedAmount && (schedulingCategory || section5Card)) {
      fee.amountFixed = "";
      fee.amountMin = "";
      fee.amountMax = "";
      fee.amountPercentage = "";
    }
  }

  if (section5.noSeparateFees && ![...selection].some((id) => id !== "none")) {
    if (!selection.has("none")) {
      selection.clear();
      selection.add("none");
      notes.push({
        path: "section5.additionalFees.none",
        from: "noSeparateFees",
        to: "none",
        status: "MAPPED",
      });
    }
  } else if (section5.noSeparateFees && [...selection].some((id) => id !== "none")) {
    notes.push({
      path: "section5.noSeparateFees",
      from: "true",
      to: "",
      status: "NEEDS_QA",
    });
  }

  section5.additionalFeeSelection = [...selection];
  section5.additionalFeeDetails = details;
  section5.noSeparateFees = false;

  const defaultForbidden = [...createDefaultForbiddenStatements()].sort().join(",");
  const currentForbidden = [...section5.forbiddenStatements].sort().join(",");
  const obsolete =
    Object.values(section5.visitTypeByServiceId).some(Boolean) ||
    Object.keys(section5.servicePricingRules).length > 0 ||
    section5.promotions.length > 0 ||
    Boolean(section5.hasPromotions) ||
    Boolean(section5.promotionStacking) ||
    Boolean(section5.promotionModificationAuthority) ||
    Boolean(section5.paidDiagnosticExplanation.trim()) ||
    Boolean(section5.forbiddenStatementOther.trim()) ||
    currentForbidden !== defaultForbidden;
  if (obsolete) {
    notes.push({
      path: "section5.obsoletePricingBlock",
      from: "legacy-pricing-block",
      to: "",
      status: "DROPPED_OBSOLETE",
    });
  }
  section5.visitTypeByServiceId = createDefaultVisitTypeByService();
  section5.servicePricingRules = {};
  section5.paidDiagnosticExplanation = "";
  section5.paidDiagnosticFeeId = "";
  section5.generalPricingAuthority = "";
  section5.hasPromotions = "";
  section5.promotions = [];
  section5.promotionStacking = "";
  section5.promotionStackingRule = "";
  section5.promotionModificationAuthority = "";
  section5.promotionModificationRule = "";
  section5.forbiddenStatements = createDefaultForbiddenStatements();
  section5.forbiddenStatementOther = "";
  if (section5.unknownPriceBehavior !== "custom") section5.unknownPriceCustomRule = "";

  const previous = draft.stage2Migration ?? [];
  const newPaths = new Set(notes.map((note) => note.path));
  const mergedNotes =
    notes.length > 0
      ? [...previous.filter((note) => !newPaths.has(note.path)), ...notes]
      : draft.stage2Migration;

  const next: OnboardingDraft = {
    ...draft,
    section5,
    fees,
  };
  if (mergedNotes && mergedNotes.length > 0) next.stage2Migration = mergedNotes;
  else delete next.stage2Migration;
  return { draft: next };
}
