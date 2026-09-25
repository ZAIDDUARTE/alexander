import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeSection5 } from "./section5";
import {
  ELIGIBLE_SECTION2_FOR_PRICING,
  FIRST_JOB_SERVICE_ID,
  fullyValidSection5,
  validQ68Fee,
} from "../section5-test-helpers";
import { section2WithEligibleServices } from "../section4-test-helpers";

describe("normalizeSection5 — stale conditional branches", () => {
  it("nulls Q65 Other unless Other selected", () => {
    const data = fullyValidSection5();
    data.pricingModelOther = "stale";
    assert.equal(normalizeSection5(data, ELIGIBLE_SECTION2_FOR_PRICING, [], []).pricingModelOther, null);
  });

  it("nulls Q66 explanation when markup is No", () => {
    const data = fullyValidSection5();
    data.materialMarkupCustomerExplanation = "stale";
    const normalized = normalizeSection5(data, ELIGIBLE_SECTION2_FOR_PRICING, [], []);
    assert.equal(normalized.materialMarkup.customerExplanation, null);
  });

  it("nulls Q71 unless paid diagnostic visit applies", () => {
    const data = fullyValidSection5();
    data.paidDiagnosticExplanation = "stale";
    assert.equal(normalizeSection5(data, ELIGIBLE_SECTION2_FOR_PRICING, [], []).paidDiagnosticExplanation, null);
  });

  it("nulls Q82 contact when no remedy requires human approval", () => {
    const data = fullyValidSection5();
    data.financialApproverContactId = "stale-id";
    assert.equal(
      normalizeSection5(data, ELIGIBLE_SECTION2_FOR_PRICING, [], []).financialApproverContactId,
      null,
    );
  });
});

describe("normalizeSection5 — Q73 stale service refs", () => {
  it("drops pricing rules for services that are no longer eligible", () => {
    const s2 = section2WithEligibleServices({ [FIRST_JOB_SERVICE_ID]: "offered" });
    const data = fullyValidSection5(s2);
    data.servicePricingRules[FIRST_JOB_SERVICE_ID] = {
      instruction: "do_not_discuss",
      approvedPriceMode: "",
      approvedPriceExact: "",
      approvedPriceMin: "",
      approvedPriceMax: "",
      pricingConditions: "",
      linkedFeeIds: [],
      askTeamDetail: "",
    };

    const s2NotOffered = section2WithEligibleServices({ [FIRST_JOB_SERVICE_ID]: "not_offered" });
    const normalized = normalizeSection5(data, s2NotOffered, [], []);
    assert.equal(normalized.servicePricingRules.length, 0);
  });
});

describe("normalizeSection5 — Q68 active fees only", () => {
  it("excludes inactive fees and honors noSeparateFees", () => {
    const active = validQ68Fee();
    const inactive = validQ68Fee({ active: false, name: "Inactive fee" });
    const data = fullyValidSection5();
    data.noSeparateFees = false;
    const normalized = normalizeSection5(data, ELIGIBLE_SECTION2_FOR_PRICING, [], [active, inactive]);
    assert.equal(normalized.fees.length, 1);
    assert.equal(normalized.fees[0].id, active.id);

    data.noSeparateFees = true;
    const noFees = normalizeSection5(data, ELIGIBLE_SECTION2_FOR_PRICING, [], [active]);
    assert.deepEqual(noFees.fees, []);
  });
});

describe("normalizeSection5 — Q81 fee-waiver precedence vs Q68", () => {
  it("records non-waivable fee ids separately from general fee-waiver remedy authority", () => {
    const data = fullyValidSection5();
    data.remedyAuthority.fee_waiver = "within_rules";
    data.remedyRules.fee_waiver = "May waive up to $50 with manager approval.";
    const nonWaivable = validQ68Fee({ waiverPolicy: "no" });
    const waivable = validQ68Fee({ waiverPolicy: "yes", waiverRule: "One-time courtesy." });
    const normalized = normalizeSection5(data, ELIGIBLE_SECTION2_FOR_PRICING, [], [
      nonWaivable,
      waivable,
    ]);
    assert.deepEqual(normalized.feeWaiverPrecedence.nonWaivableFeeIds, [nonWaivable.id]);
    assert.equal(normalized.feeWaiverPrecedence.feeWaiverRemedyAuthority, "within_rules");
    assert.match(normalized.feeWaiverPrecedence.feeWaiverRemedyRule ?? "", /manager approval/i);
  });
});

describe("normalizeSection5 — Q70 keeps all services", () => {
  it("retains visit types for not_offered Section 2 services", () => {
    const s2 = section2WithEligibleServices({ [FIRST_JOB_SERVICE_ID]: "not_offered" });
    const data = fullyValidSection5(s2);
    data.visitTypeByServiceId[FIRST_JOB_SERVICE_ID] = "not_offered";
    const row = normalizeSection5(data, s2, [], []).visitTypes.find(
      (r) => r.serviceId === FIRST_JOB_SERVICE_ID,
    );
    assert.equal(row?.visitType, "not_offered");
  });
});
