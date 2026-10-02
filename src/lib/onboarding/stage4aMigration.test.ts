import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mergeWithDefaults } from "./draft-utils";
import { isPositiveMoney } from "./money";
import { normalizeSection5 } from "./normalize/section5";
import { getOfferedPricingServices } from "./pricingServices";
import { PLUMBING_SERVICES } from "./section2Catalog";
import {
  ADDITIONAL_FEE_OPTIONS,
  PRICING_MODEL_OPTIONS,
  UNKNOWN_PRICE_OPTIONS,
} from "./section5Catalog";
import {
  MATERIAL_PRICING_PREFILL,
  markupExplanationAfterPolicy,
  servicePriceRecordErrors,
  withServicePriceMode,
} from "./section5Pricing";
import { section2WithEligibleServices } from "./section4-test-helpers";
import { fullyValidSection5 } from "./section5-test-helpers";
import {
  createCustomFee,
  createDefaultDraft,
  createDefaultSection5,
  createEmptyFee,
  createEmptyServicePrice,
  type Section5Data,
} from "./types";
import { section5IsValid, validateSection5 } from "./validation/section5";

const [offered, withConditions, askTeam, notOffered, unsure] = PLUMBING_SERVICES;

describe("Stage 4A pricing model", () => {
  it("keeps the October 1 choices and the existing after-diagnosis key", () => {
    assert.deepEqual(
      PRICING_MODEL_OPTIONS.map((option) => option.label),
      [
        "Flat-rate / upfront pricing",
        "Hourly labor + materials",
        "Fixed prices for certain services",
        "Price determined after the technician evaluates the job",
        "Estimate or quote required for larger work",
        "Other",
      ],
    );
    assert.equal(PRICING_MODEL_OPTIONS[3].id, "after_diagnosis");
    const data = fullyValidSection5();
    data.pricingModels = ["after_diagnosis", "other"];
    data.pricingModelOther = "Seasonal pricing";
    assert.equal(section5IsValid(data), true);
  });
});

describe("Stage 4A quote permission", () => {
  it("defaults a new questionnaire to No", () => {
    assert.equal(createDefaultSection5().mayQuoteServicePrices, "not_allowed");
  });

  it("preserves a saved current answer", () => {
    const draft = createDefaultDraft();
    draft.section5.mayQuoteServicePrices = "allowed";
    const migrated = mergeWithDefaults(draft);
    assert.equal(migrated.section5.mayQuoteServicePrices, "allowed");
    assert.equal(
      migrated.stage2Migration?.some((note) => note.path === "section5.mayQuoteServicePrices"),
      undefined,
    );
  });

  it("defaults a legacy questionnaire to No and flags it", () => {
    const draft = createDefaultDraft();
    const section5 = { ...draft.section5 } as Partial<Section5Data>;
    delete section5.mayQuoteServicePrices;
    section5.servicePricingRules = {
      [offered.id]: {
        instruction: "quote_approved",
        approvedPriceMode: "exact",
        approvedPriceExact: "350-550",
        approvedPriceMin: "",
        approvedPriceMax: "",
        pricingConditions: "",
        linkedFeeIds: [],
        askTeamDetail: "",
      },
    };
    const migrated = mergeWithDefaults({ ...draft, section5: section5 as Section5Data });
    assert.equal(migrated.section5.mayQuoteServicePrices, "not_allowed");
    assert.equal(migrated.section5.servicePrices.length, 0);
    const note = migrated.stage2Migration?.find((item) => item.path === "section5.mayQuoteServicePrices");
    assert.equal(note?.status, "DEFAULTED_FROM_LEGACY");
    const priceNote = migrated.stage2Migration?.find(
      (item) => item.path === `section5.legacyServicePricing.${offered.id}`,
    );
    assert.equal(priceNote?.status, "NEEDS_QA");
  });
});

describe("Stage 4A service eligibility and pricing modes", () => {
  it("lists only services marked We offer this", () => {
    const section2 = section2WithEligibleServices({
      [offered.id]: "offered",
      [withConditions.id]: "with_conditions",
      [askTeam.id]: "ask_team",
      [notOffered.id]: "not_offered",
      [unsure.id]: "",
    });
    const ids = getOfferedPricingServices(section2).map((service) => service.id);
    assert.deepEqual(ids, [offered.id]);
    assert.equal(getOfferedPricingServices(section2)[0].label, offered.label);
  });

  it("validates each pricing mode and ignores inactive amounts", () => {
    const section2 = section2WithEligibleServices({ [offered.id]: "offered" });
    const data = fullyValidSection5(section2);
    data.mayQuoteServicePrices = "allowed";
    const exact = { ...createEmptyServicePrice(offered.id), mode: "exact" as const, exactAmount: "" };
    data.servicePrices = [exact];
    assert.ok(validateSection5(data, section2)[`servicePrices.${offered.id}.exactAmount`]);
    exact.exactAmount = "149";
    assert.equal(section5IsValid(data, section2), true);

    const starting = withServicePriceMode({ ...exact, startingAmount: "" }, "starting_at");
    assert.equal(starting.exactAmount, "");
    data.servicePrices = [{ ...starting, startingAmount: "89" }];
    assert.equal(section5IsValid(data, section2), true);

    data.servicePrices = [
      { ...createEmptyServicePrice(offered.id), mode: "range", rangeMin: "200", rangeMax: "100" },
    ];
    assert.ok(validateSection5(data, section2)[`servicePrices.${offered.id}.rangeMax`]);
    data.servicePrices[0].rangeMax = "200";
    assert.equal(section5IsValid(data, section2), true);
    data.servicePrices[0].rangeMax = "240";
    assert.equal(section5IsValid(data, section2), true);

    data.servicePrices = [{ ...createEmptyServicePrice(offered.id), mode: "hourly", hourlyAmount: "95" }];
    assert.equal(section5IsValid(data, section2), true);

    data.servicePrices = [
      {
        ...createEmptyServicePrice(offered.id),
        mode: "estimate",
        exactAmount: "999",
        rangeMin: "1",
        rangeMax: "2",
      },
    ];
    assert.equal(Object.keys(servicePriceRecordErrors(data.servicePrices[0], offered.label)).length, 0);
    assert.equal(section5IsValid(data, section2), true);
    const normalized = normalizeSection5(data, section2);
    assert.equal(normalized.servicePrices[0].mode, "estimate");
    assert.equal(normalized.servicePrices[0].exactAmount, null);
  });

  it("does not submit pricing for a service that is no longer offered", () => {
    const offeredSection = section2WithEligibleServices({ [offered.id]: "offered" });
    const data = fullyValidSection5(offeredSection);
    data.mayQuoteServicePrices = "allowed";
    data.servicePrices = [{ ...createEmptyServicePrice(offered.id), mode: "exact", exactAmount: "149" }];
    const hidden = section2WithEligibleServices({ [offered.id]: "with_conditions" });
    const normalized = normalizeSection5(data, hidden);
    assert.equal(normalized.servicePrices.length, 0);
    assert.equal(data.servicePrices.length, 1);
    assert.equal(section5IsValid(data, hidden), true);
  });
});

describe("Stage 4A unknown price and fees", () => {
  it("has exactly two choices and maps only the safe legacy values", () => {
    assert.deepEqual(UNKNOWN_PRICE_OPTIONS.map((option) => option.id), [
      "technician_after_evaluation",
      "team_provides_pricing",
    ]);
    assert.equal(createDefaultSection5().unknownPriceBehavior, "technician_after_evaluation");

    const team = createDefaultDraft();
    team.section5.unknownPriceBehavior = "team_provides_pricing";
    assert.equal(mergeWithDefaults(team).section5.unknownPriceBehavior, "team_provides_pricing");

    const legacy = createDefaultDraft();
    legacy.section5.unknownPriceBehavior = "approved_price_or_range";
    const migrated = mergeWithDefaults(legacy);
    assert.equal(migrated.section5.unknownPriceBehavior, "technician_after_evaluation");
    assert.equal(
      migrated.stage2Migration?.find((note) => note.path === "section5.unknownPriceBehavior")?.status,
      "NEEDS_QA",
    );
  });

  it("uses nine mutually exclusive fee choices and requires credit detail only for Sometimes", () => {
    assert.equal(ADDITIONAL_FEE_OPTIONS.length, 9);
    assert.equal(ADDITIONAL_FEE_OPTIONS.at(-1)?.id, "none");
    const data = fullyValidSection5();
    data.additionalFeeSelection = ["service_diagnostic", "travel"];
    data.additionalFeeDetails.service_diagnostic = {
      amount: "89",
      applicability: "Standard residential service calls.",
      credit: "never",
      creditWhen: "should not be required",
    };
    data.additionalFeeDetails.travel = {
      amount: "25",
      applicability: "Outside the primary service area.",
      credit: "sometimes",
      creditWhen: "",
    };
    assert.ok(validateSection5(data)["additionalFeeDetails.travel.creditWhen"]);
    data.additionalFeeDetails.travel.creditWhen = "Credited when the repair is approved.";
    assert.equal(section5IsValid(data), true);
    data.additionalFeeSelection = ["none", "travel"];
    assert.ok(validateSection5(data).additionalFeeSelection);
  });
});

describe("Stage 4A scheduling amount move and area fees", () => {
  it("moves cancellation and no-show amounts into pricing and keeps scheduling policy", () => {
    const draft = createDefaultDraft();
    const late = createEmptyFee("late_cancellation", "Late cancellation fee");
    late.amountFixed = "50";
    late.noticeRequired = "24 hours";
    late.applicationRule = "Less than 24 hours before the appointment.";
    late.waiverPolicy = "sometimes";
    late.waiverRule = "Manager may waive it.";
    const noShow = createEmptyFee("no_show", "No-show fee");
    noShow.amountFixed = "40";
    noShow.applicationRule = "Customer could not be reached.";
    draft.section4.lateCancellationFeeMode = "yes";
    draft.section4.lateCancellationFeeId = late.id;
    draft.section4.noShowFeeMode = "conditional";
    draft.section4.noShowFeeId = noShow.id;
    draft.section4.cancellationExceptions = "Weather emergencies.";
    draft.fees = [late, noShow];
    draft.section5.paymentMethods = ["credit_card"];
    draft.section5.paymentDuePolicies = ["at_time_of_service"];
    const section5 = { ...draft.section5 } as Partial<Section5Data>;
    delete section5.mayQuoteServicePrices;
    delete section5.additionalFeeSelection;
    const migrated = mergeWithDefaults({ ...draft, section5: section5 as Section5Data });
    assert.ok(migrated.section5.additionalFeeSelection.includes("cancellation"));
    assert.ok(migrated.section5.additionalFeeSelection.includes("no_show"));
    assert.equal(migrated.section5.additionalFeeSelection.includes("none"), false);
    assert.equal(migrated.section5.additionalFeeDetails.cancellation.amount, "50");
    assert.equal(
      migrated.section5.additionalFeeDetails.cancellation.applicability,
      "Less than 24 hours before the appointment.",
    );
    assert.equal(migrated.section5.additionalFeeDetails.no_show.amount, "40");
    assert.equal(migrated.section4.lateCancellationFeeMode, "yes");
    assert.equal(migrated.section4.noShowFeeMode, "conditional");
    assert.equal(migrated.section4.cancellationExceptions, "Weather emergencies.");
    const movedLate = migrated.fees.find((fee) => fee.id === late.id);
    const movedNoShow = migrated.fees.find((fee) => fee.id === noShow.id);
    assert.equal(movedLate?.noticeRequired, "24 hours");
    assert.equal(movedLate?.amountFixed, "");
    assert.equal(movedNoShow?.amountFixed, "");
    assert.equal(movedLate?.applicationRule, "Less than 24 hours before the appointment.");
    assert.deepEqual(migrated.section5.paymentMethods, ["credit_card"]);
    assert.deepEqual(migrated.section5.paymentDuePolicies, ["at_time_of_service"]);
    assert.equal(migrated.section3.capacityMode, draft.section3.capacityMode);
  });

  it("accepts area fee text and does not treat it as money", () => {
    assert.equal(createDefaultSection5().hasAreaTravelOrMinimum, "no");
    const prose = "$100 travel fee and $250 minimum service charge";
    assert.equal(isPositiveMoney(prose), false);
    const data = fullyValidSection5();
    data.hasAreaTravelOrMinimum = "yes";
    data.areaPricingRows = [
      { id: "a1", area: "North county", travelFee: "", minimumCharge: "", feeOrMinimum: prose },
    ];
    assert.equal(section5IsValid(data), true);
  });

  it("prefills material pricing only when the explanation is empty", () => {
    assert.equal(markupExplanationAfterPolicy("yes", ""), MATERIAL_PRICING_PREFILL);
    assert.equal(markupExplanationAfterPolicy("sometimes", ""), MATERIAL_PRICING_PREFILL);
    assert.equal(markupExplanationAfterPolicy("no", "kept"), "");
    const custom = "We quote materials at retail.";
    assert.equal(markupExplanationAfterPolicy("yes", custom), custom);
    assert.equal(markupExplanationAfterPolicy("sometimes", custom), custom);
  });
});

describe("Stage 4A legacy hydration", () => {
  it("preserves safe answers, flags unsafe prices and fees, and leaves payment questions", () => {
    const draft = createDefaultDraft();
    draft.section1.customerFacingName = "Kept Plumbing";
    draft.section5.pricingModels = ["flat_rate"];
    draft.section5.materialMarkupPolicy = "yes";
    draft.section5.materialMarkupCustomerExplanation = "Custom markup wording.";
    draft.section5.unknownPriceBehavior = "fee_plus_separate_quote";
    draft.section5.servicePricingRules = {
      [offered.id]: {
        instruction: "quote_approved",
        approvedPriceMode: "range",
        approvedPriceExact: "",
        approvedPriceMin: "350",
        approvedPriceMax: "550",
        pricingConditions: "Do not parse this.",
        linkedFeeIds: [],
        askTeamDetail: "",
      },
    };
    draft.section5.hasPromotions = "yes";
    draft.section5.paymentMethods = ["check", "invoice"];
    draft.section5.paymentDuePolicies = ["invoice_after_service"];
    draft.section5.invoiceCustomersDetail = "Commercial accounts";
    draft.section5.invoiceTerms = "Net 15";
    const diagnostic = createCustomFee("Diagnostic visit");
    diagnostic.categoryTemplate = "diagnostic_service_call";
    diagnostic.amountKind = "fixed";
    diagnostic.amountFixed = "89";
    diagnostic.applicationRule = "Standard residential service calls.";
    diagnostic.creditTowardWork = "yes";
    diagnostic.waiverPolicy = "yes";
    diagnostic.waiverRule = "Must not drive the new model.";
    const combined = createCustomFee("Cancellation or no-show");
    combined.categoryTemplate = "cancellation_no_show";
    combined.amountKind = "fixed";
    combined.amountFixed = "25";
    combined.applicationRule = "Do not guess which fee.";
    draft.fees = [diagnostic, combined];
    const section5 = { ...draft.section5 } as Partial<Section5Data>;
    delete section5.mayQuoteServicePrices;
    delete section5.additionalFeeSelection;
    const migrated = mergeWithDefaults({ ...draft, section5: section5 as Section5Data });
    assert.equal(migrated.section1.customerFacingName, "Kept Plumbing");
    assert.deepEqual(migrated.section5.pricingModels, ["flat_rate"]);
    assert.equal(migrated.section5.materialMarkupCustomerExplanation, "Custom markup wording.");
    assert.equal(migrated.section5.unknownPriceBehavior, "technician_after_evaluation");
    assert.equal(migrated.section5.servicePrices.length, 0);
    assert.equal(migrated.section5.additionalFeeDetails.service_diagnostic.amount, "89");
    assert.equal(migrated.section5.additionalFeeDetails.service_diagnostic.credit, "always");
    assert.equal(migrated.section5.additionalFeeSelection.includes("cancellation"), false);
    assert.equal(migrated.section5.additionalFeeSelection.includes("no_show"), false);
    assert.ok(
      migrated.stage2Migration?.some((note) => note.path === `section5.legacyFees.${combined.id}`),
    );
    assert.equal(migrated.section5.hasPromotions, "");
    assert.deepEqual(migrated.section5.paymentMethods, ["check", "invoice"]);
    assert.deepEqual(migrated.section5.paymentDuePolicies, ["invoice_after_service"]);
    assert.equal(migrated.section5.invoiceTerms, "Net 15");
    const again = mergeWithDefaults(migrated);
    assert.equal(again.section5.mayQuoteServicePrices, "not_allowed");
    assert.equal(again.section5.additionalFeeDetails.service_diagnostic.amount, "89");
  });
});
