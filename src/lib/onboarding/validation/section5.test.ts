import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateSection5, section5IsValid } from "./section5";
import { DEFAULT_FORBIDDEN_STATEMENT_IDS } from "../section5Catalog";
import { getVisitTypeMatrixServices } from "../section5Catalog";
import { getPricingDiscussEligibleServices } from "../pricingServices";
import { JOB_SERVICES } from "../section2Catalog";
import {
  createDefaultSection5,
  createDefaultDraft,
  createCustomFee,
} from "../types";
import {
  ELIGIBLE_SECTION2_FOR_PRICING,
  FIRST_JOB_SERVICE_ID,
  fullyValidSection5,
  promotionOfferRow,
  section2WithEligibleServices,
  setAllVisitTypes,
  setEligibleServicePricingRules,
  validQ68Fee,
} from "../section5-test-helpers";
import {
  validLateCancellationFee,
  validNoShowFee,
  upsertFeeByKey,
} from "../section4-test-helpers";
import { hasDraftContent } from "../draft-utils";
import { addCompletedSection } from "../draft-utils";

describe("validateSection5 — A: Q65 Other", () => {
  it("requires custom pricing method when Other is selected", () => {
    const data = fullyValidSection5();
    data.pricingModels = ["other"];
    data.pricingModelOther = "";
    assert.ok(validateSection5(data, ELIGIBLE_SECTION2_FOR_PRICING, [], []).pricingModelOther);
    data.pricingModelOther = "Membership pricing";
    assert.equal(section5IsValid(data, ELIGIBLE_SECTION2_FOR_PRICING, [], []), true);
  });
});

describe("validateSection5 — B: Q66 Yes/Sometimes detail", () => {
  it("requires customer explanation when markup is Yes or Sometimes", () => {
    const data = fullyValidSection5();
    data.materialMarkupPolicy = "yes";
    data.materialMarkupCustomerExplanation = "";
    assert.ok(validateSection5(data, ELIGIBLE_SECTION2_FOR_PRICING, [], []).materialMarkupCustomerExplanation);
    data.materialMarkupCustomerExplanation = "We do not disclose markup percentages.";
    assert.equal(section5IsValid(data, ELIGIBLE_SECTION2_FOR_PRICING, [], []), true);
  });
});

describe("validateSection5 — unknown price has two current choices", () => {
  it("rejects a removed legacy choice", () => {
    const data = fullyValidSection5();
    data.unknownPriceBehavior = "custom";
    assert.ok(validateSection5(data, ELIGIBLE_SECTION2_FOR_PRICING, [], []).unknownPriceBehavior);
    data.unknownPriceBehavior = "team_provides_pricing";
    assert.equal(section5IsValid(data, ELIGIBLE_SECTION2_FOR_PRICING, [], []), true);
  });
});

describe("validateSection5 — D–G: Q68 amount models", () => {
  it("validates fixed fee", () => {
    const fee = validQ68Fee();
    const data = fullyValidSection5();
    data.noSeparateFees = false;
    assert.equal(section5IsValid(data, ELIGIBLE_SECTION2_FOR_PRICING, [], [fee]), true);
  });

  it("validates range fee", () => {
    const fee = validQ68Fee({
      amountKind: "range",
      amountFixed: "",
      amountMin: "50",
      amountMax: "120",
    });
    const data = fullyValidSection5();
    data.noSeparateFees = false;
    assert.equal(section5IsValid(data, ELIGIBLE_SECTION2_FOR_PRICING, [], [fee]), true);
  });

  it("validates percentage fee", () => {
    const fee = validQ68Fee({
      amountKind: "percentage",
      amountFixed: "",
      amountPercentage: "15",
    });
    const data = fullyValidSection5();
    data.noSeparateFees = false;
    assert.equal(section5IsValid(data, ELIGIBLE_SECTION2_FOR_PRICING, [], [fee]), true);
  });

  it("validates varies / team confirm without invented amount", () => {
    const fee = validQ68Fee({
      amountKind: "varies",
      amountFixed: "",
    });
    const data = fullyValidSection5();
    data.noSeparateFees = false;
    assert.equal(section5IsValid(data, ELIGIBLE_SECTION2_FOR_PRICING, [], [fee]), true);
  });
});

describe("validateSection5 — additional fee credit", () => {
  it("requires a credit explanation only when credited sometimes", () => {
    const data = fullyValidSection5();
    data.additionalFeeSelection = ["service_diagnostic"];
    data.additionalFeeDetails.service_diagnostic = {
      amount: "89",
      applicability: "Standard residential service calls.",
      credit: "sometimes",
      creditWhen: "",
    };
    assert.ok(
      validateSection5(data, ELIGIBLE_SECTION2_FOR_PRICING, [], [])[
        "additionalFeeDetails.service_diagnostic.creditWhen"
      ],
    );
    data.additionalFeeDetails.service_diagnostic.credit = "always";
    assert.equal(section5IsValid(data, ELIGIBLE_SECTION2_FOR_PRICING, [], []), true);
  });
});

describe("validateSection5 — additional fee none exclusivity", () => {
  it("rejects none combined with another fee", () => {
    const data = fullyValidSection5();
    data.additionalFeeSelection = ["none", "travel"];
    assert.ok(validateSection5(data, ELIGIBLE_SECTION2_FOR_PRICING, [], []).additionalFeeSelection);
  });
});

describe("validateSection5 — J/K: Section 4 fee reuse", () => {
  it("accepts enriched late-cancellation fee from Section 4", () => {
    const fee = validLateCancellationFee({
      quoteAuthority: "yes",
      creditTowardWork: "no",
      waiverPolicy: "no",
      applicationRule: "Within 24 hours of appointment.",
    });
    const data = fullyValidSection5();
    data.noSeparateFees = false;
    assert.equal(section5IsValid(data, ELIGIBLE_SECTION2_FOR_PRICING, [], [fee]), true);
  });

  it("accepts enriched no-show fee from Section 4", () => {
    const fee = validNoShowFee({
      quoteAuthority: "yes",
      creditTowardWork: "no",
      waiverPolicy: "no",
      applicationRule: "Customer not home at arrival.",
    });
    const data = fullyValidSection5();
    data.noSeparateFees = false;
    assert.equal(section5IsValid(data, ELIGIBLE_SECTION2_FOR_PRICING, [], [fee]), true);
  });
});

describe("validateSection5 — N: Q69 area pricing", () => {
  it("requires meaningful rows when Yes", () => {
    const data = fullyValidSection5();
    data.hasAreaTravelOrMinimum = "yes";
    data.areaPricingRows = [{ id: "a1", area: "", travelFee: "", minimumCharge: "", feeOrMinimum: "" }];
    assert.ok(validateSection5(data, ELIGIBLE_SECTION2_FOR_PRICING, [], [])["areaPricingRows.a1"]);
    data.areaPricingRows = [
      {
        id: "a1",
        area: "North county",
        travelFee: "",
        minimumCharge: "",
        feeOrMinimum: "$100 travel fee and $250 minimum service charge",
      },
    ];
    assert.equal(section5IsValid(data, ELIGIBLE_SECTION2_FOR_PRICING, [], []), true);
  });
});

describe("validateSection5 — deleted visit questions are not current", () => {
  it("does not require visit types or paid-diagnostic copy", () => {
    const data = fullyValidSection5();
    data.visitTypeByServiceId[JOB_SERVICES[0].id] = "";
    data.paidDiagnosticExplanation = "";
    assert.equal(section5IsValid(data, ELIGIBLE_SECTION2_FOR_PRICING, [], []), true);
  });
});

describe("validateSection5 — R/S: Q73 eligibility", () => {
  it("does not require a price for every offered service", () => {
    const s2 = ELIGIBLE_SECTION2_FOR_PRICING;
    const data = fullyValidSection5(s2);
    data.mayQuoteServicePrices = "allowed";
    data.servicePrices = [];
    assert.equal(section5IsValid(data, s2, [], []), true);
  });

  it("does not validate not_offered services", () => {
    const s2 = section2WithEligibleServices({ [FIRST_JOB_SERVICE_ID]: "not_offered" });
    const data = fullyValidSection5(s2);
    setEligibleServicePricingRules(data, s2);
    const eligible = getPricingDiscussEligibleServices(s2);
    assert.equal(eligible.length, 0);
    assert.equal(section5IsValid(data, s2, [], []), true);
  });
});

describe("validateSection5 — U: Q74 defaults", () => {
  it("fresh default includes five approved forbidden statements", () => {
    const data = createDefaultSection5();
    assert.deepEqual(data.forbiddenStatements, DEFAULT_FORBIDDEN_STATEMENT_IDS);
    assert.equal(section5IsValid(fullyValidSection5()), true);
  });
});

describe("validateSection5 — V/W/X: promotions", () => {
  it("requires valid promotion cards when Q75 = Yes", () => {
    const data = fullyValidSection5();
    data.hasPromotions = "yes";
    data.promotions = [promotionOfferRow()];
    data.promotionStacking = "conditional";
    data.promotionStackingRule = "Cannot combine with other offers.";
    data.promotionModificationAuthority = "within_rules";
    data.promotionModificationRule = "Up to $50 without manager.";
    assert.equal(section5IsValid(data, ELIGIBLE_SECTION2_FOR_PRICING, [], []), true);
  });
});

describe("validateSection5 — Y/Z/AA/AB: Q78–Q79", () => {
  it("requires Other payment method detail", () => {
    const data = fullyValidSection5();
    data.paymentMethods = ["other"];
    data.paymentMethodOther = "";
    assert.ok(validateSection5(data, ELIGIBLE_SECTION2_FOR_PRICING, [], []).paymentMethodOther);
  });

  it("keeps a deposit policy valid without the old explain-the-rule fields", () => {
    const data = fullyValidSection5();
    data.paymentDuePolicies = ["deposit_required", "other"];
    data.depositWorkDetail = "";
    data.paymentDueOtherRule = "";
    assert.equal(validateSection5(data, ELIGIBLE_SECTION2_FOR_PRICING, [], []).depositWorkDetail, undefined);
    assert.equal(validateSection5(data, ELIGIBLE_SECTION2_FOR_PRICING, [], []).paymentDueOtherRule, undefined);
    assert.equal(section5IsValid(data, ELIGIBLE_SECTION2_FOR_PRICING, [], []), true);
  });
});

describe("validateSection5 — payment assistance, collection, remedies", () => {
  it("requires a rule only for each selected remedy", () => {
    const data = fullyValidSection5();
    data.financialRemedies = ["refund"];
    data.remedyRules.refund = "";
    data.remedyRules.fee_waiver = "stale waiver rule";
    assert.ok(validateSection5(data, ELIGIBLE_SECTION2_FOR_PRICING, [], [])["remedyRules.refund"]);
    data.remedyRules.refund = "Up to $100 without manager.";
    assert.equal(section5IsValid(data, ELIGIBLE_SECTION2_FOR_PRICING, [], []), true);
  });

  it("accepts None without per-remedy rules", () => {
    const data = fullyValidSection5();
    data.financialRemedies = ["none"];
    data.remedyRules.refund = "stale";
    assert.equal(section5IsValid(data, ELIGIBLE_SECTION2_FOR_PRICING, [], []), true);
  });

  it("rejects None combined with a remedy and requires collection Other text", () => {
    const data = fullyValidSection5();
    data.financialRemedies = ["none", "refund"];
    assert.ok(validateSection5(data, ELIGIBLE_SECTION2_FOR_PRICING, [], []).financialRemedies);
    data.financialRemedies = ["refund"];
    data.remedyRules.refund = "Duplicate charges up to $50.";
    data.paymentCollectionScope = ["other"];
    data.paymentCollectionOther = "";
    assert.ok(validateSection5(data, ELIGIBLE_SECTION2_FOR_PRICING, [], []).paymentCollectionOther);
  });
});

describe("validateSection5 — L/M: fee ID stability helpers", () => {
  it("upsertFeeByKey preserves fee ID on edit", () => {
    const { fees, id } = upsertFeeByKey([], "late_cancellation", { amountFixed: "75" });
    const second = upsertFeeByKey(fees, "late_cancellation", { amountFixed: "80" });
    assert.equal(second.id, id);
    assert.equal(second.fees.length, 1);
  });

  it("duplicate custom fee gets a new ID", () => {
    const original = validQ68Fee();
    const duplicate = { ...original, id: createCustomFee().id, name: `${original.name} (copy)` };
    assert.notEqual(duplicate.id, original.id);
  });
});

describe("hasDraftContent — AH: fresh draft", () => {
  it("createDefaultDraft still hasDraftContent === false with Q74 defaults", () => {
    const draft = createDefaultDraft();
    assert.deepEqual(draft.section5.forbiddenStatements.length, 5);
    assert.equal(hasDraftContent(draft), false);
  });
});

describe("completedSections — AI", () => {
  it("adds section 5 once without duplicates", () => {
    let completed = addCompletedSection([1, 2, 3, 4], 5);
    completed = addCompletedSection(completed, 5);
    assert.deepEqual(completed, [1, 2, 3, 4, 5]);
  });
});

describe("validateSection5 — O: Q70 includes all service states", () => {
  it("matrix services include full job registry", () => {
    const data = fullyValidSection5();
    setAllVisitTypes(data, "not_offered");
    assert.equal(getVisitTypeMatrixServices().length, JOB_SERVICES.length);
    assert.equal(section5IsValid(data, ELIGIBLE_SECTION2_FOR_PRICING, [], []), true);
  });
});
