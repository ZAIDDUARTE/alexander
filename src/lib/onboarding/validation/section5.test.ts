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
  validApproverContact,
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

describe("validateSection5 — C: Q67 custom behavior", () => {
  it("requires custom rule when Follow another rule is selected", () => {
    const data = fullyValidSection5();
    data.unknownPriceBehavior = "custom";
    data.unknownPriceCustomRule = "";
    assert.ok(validateSection5(data, ELIGIBLE_SECTION2_FOR_PRICING, [], []).unknownPriceCustomRule);
    data.unknownPriceCustomRule = "Offer a callback for pricing.";
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

describe("validateSection5 — H: Q68 waiver rule", () => {
  it("requires waiver rule when waiver is Yes or Sometimes", () => {
    const fee = validQ68Fee({ waiverPolicy: "sometimes", waiverRule: "" });
    const data = fullyValidSection5();
    data.noSeparateFees = false;
    const errors = validateSection5(data, ELIGIBLE_SECTION2_FOR_PRICING, [], [fee]);
    assert.ok(errors[`fees.${fee.id}.waiverRule`]);
    fee.waiverRule = "Manager approval only.";
    assert.equal(section5IsValid(data, ELIGIBLE_SECTION2_FOR_PRICING, [], [fee]), true);
  });
});

describe("validateSection5 — I: Q68 no-fees exclusivity", () => {
  it("rejects noSeparateFees when active fee records exist", () => {
    const fee = validQ68Fee();
    const data = fullyValidSection5();
    data.noSeparateFees = true;
    const errors = validateSection5(data, ELIGIBLE_SECTION2_FOR_PRICING, [], [fee]);
    assert.ok(errors.noSeparateFees);
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
    data.areaPricingRows = [{ id: "a1", area: "", travelFee: "", minimumCharge: "" }];
    assert.ok(validateSection5(data, ELIGIBLE_SECTION2_FOR_PRICING, [], [])["areaPricingRows.a1"]);
    data.areaPricingRows = [{ id: "a1", area: "North county", travelFee: "25", minimumCharge: "" }];
    assert.equal(section5IsValid(data, ELIGIBLE_SECTION2_FOR_PRICING, [], []), true);
  });
});

describe("validateSection5 — O/P: Q70 and Q71", () => {
  it("requires a visit type for every registry service", () => {
    const data = fullyValidSection5();
    data.visitTypeByServiceId[JOB_SERVICES[0].id] = "";
    assert.ok(validateSection5(data, ELIGIBLE_SECTION2_FOR_PRICING, [], [])[`visitTypeByServiceId.${JOB_SERVICES[0].id}`]);
  });

  it("requires paid diagnostic explanation only when applicable", () => {
    const data = fullyValidSection5();
    data.visitTypeByServiceId[FIRST_JOB_SERVICE_ID] = "paid_diagnostic";
    data.paidDiagnosticExplanation = "";
    assert.ok(validateSection5(data, ELIGIBLE_SECTION2_FOR_PRICING, [], []).paidDiagnosticExplanation);
    data.paidDiagnosticExplanation = "We charge a diagnostic fee that is explained from our fee list.";
    assert.equal(section5IsValid(data, ELIGIBLE_SECTION2_FOR_PRICING, [], []), true);
  });
});

describe("validateSection5 — R/S: Q73 eligibility", () => {
  it("requires pricing instruction for offered services", () => {
    const s2 = ELIGIBLE_SECTION2_FOR_PRICING;
    const data = fullyValidSection5(s2);
    delete data.servicePricingRules[FIRST_JOB_SERVICE_ID];
    const errors = validateSection5(data, s2, [], []);
    assert.ok(errors[`servicePricingRules.${FIRST_JOB_SERVICE_ID}.instruction`]);
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

  it("requires deposit detail when deposit policy selected", () => {
    const data = fullyValidSection5();
    data.paymentDuePolicies = ["deposit_required"];
    data.depositWorkDetail = "";
    assert.ok(validateSection5(data, ELIGIBLE_SECTION2_FOR_PRICING, [], []).depositWorkDetail);
    data.depositWorkDetail = "Large replacements";
    data.depositRule = "50% upfront";
    assert.equal(section5IsValid(data, ELIGIBLE_SECTION2_FOR_PRICING, [], []), true);
  });
});

describe("validateSection5 — AD/AE: Q81–Q82", () => {
  it("requires per-remedy rule when Alexander may approve within rules", () => {
    const data = fullyValidSection5();
    data.remedyAuthority.refund = "within_rules";
    data.remedyRules.refund = "";
    assert.ok(validateSection5(data, ELIGIBLE_SECTION2_FOR_PRICING, [], [])["remedyRules.refund"]);
    data.remedyRules.refund = "Up to $100 without manager.";
    assert.equal(section5IsValid(data, ELIGIBLE_SECTION2_FOR_PRICING, [], []), true);
  });

  it("requires financial approver when any remedy needs human approval", () => {
    const approver = validApproverContact({ nameOrRole: "Finance lead" });
    const data = fullyValidSection5();
    data.remedyAuthority.refund = "human_approval";
    data.financialApproverContactId = "";
    assert.ok(validateSection5(data, ELIGIBLE_SECTION2_FOR_PRICING, [approver], []).financialApproverContactId);
    data.financialApproverContactId = approver.id;
    assert.equal(section5IsValid(data, ELIGIBLE_SECTION2_FOR_PRICING, [approver], []), true);
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
