import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizeSection5 } from "../normalize/section5";
import { createDefaultDraft, createDefaultSection2, type OnboardingDraft } from "../types";
import { QUESTION_REGISTRY_BY_ID, QUESTION_REGISTRY_V1 } from "./registry";
import { serializeQuestionnaireAnswersV1 } from "./serialize";

function draftWithDormantFees(): OnboardingDraft {
  const draft = createDefaultDraft();
  draft.section5.additionalFeeSelection = ["none"];
  draft.section5.additionalFeeDetails.service_diagnostic = {
    amount: "89",
    applicability: "Dormant diagnostic fee",
    credit: "sometimes",
    creditWhen: "Should not appear in clean answers",
  };
  draft.section5.additionalFeeDetails.travel = {
    amount: "25",
    applicability: "Dormant travel fee",
    credit: "never",
    creditWhen: "Also dormant",
  };
  draft.section5.financialRemedies = ["none"];
  draft.section5.remedyRules.fee_waiver = "STALE fee waiver rule";
  draft.section5.mayQuoteServicePrices = "allowed";
  draft.section5.servicePrices = [
    {
      serviceId: "toilet-repair-replacement",
      mode: "exact",
      exactAmount: "150",
      startingAmount: "STALE starting",
      rangeMin: "STALE min",
      rangeMax: "STALE max",
      hourlyAmount: "STALE hourly",
      conditions: "Active condition",
    },
  ];
  draft.section5.hasAreaTravelOrMinimum = "yes";
  draft.section5.areaPricingRows = [
    {
      id: "area-1",
      area: "North county",
      feeOrMinimum: "$40 travel",
      travelFee: "LEGACY travel",
      minimumCharge: "LEGACY minimum",
    },
  ];
  draft.section4.multiIssueMode = "separate_issues";
  draft.section4.separateIssueServiceIds = ["toilet-repair-replacement"];
  draft.section4.separateIssueOther = false;
  draft.section4.separateIssueOtherDetail = "STALE other issue";
  draft.section2.afterHoursAreaMode = "smaller";
  draft.section2.afterHoursDefinitionMode = "cities";
  draft.section2.afterHoursCities = ["Austin"];
  draft.section2.afterHoursZipCodes = ["78701"];
  draft.section2.afterHoursDistance = { address: "STALE address", radiusMiles: "15" };
  return draft;
}

describe("clean questionnaire answers omit inactive branches", () => {
  it("A/B/D: raw keeps dormant fee details; clean Q56 none omits them", () => {
    const draft = draftWithDormantFees();
    const raw = JSON.stringify(draft);
    assert.match(raw, /Dormant diagnostic fee/);
    assert.match(raw, /Should not appear in clean answers/);
    assert.deepEqual(draft.section5.additionalFeeSelection, ["none"]);

    const q56 = serializeQuestionnaireAnswersV1(draft).sections.S5.answers.Q56.value as {
      selection: string[];
      details: Record<string, unknown>;
    };
    assert.deepEqual(q56.selection, ["none"]);
    assert.deepEqual(q56.details, {});
    assert.equal(JSON.stringify(q56).includes("Dormant"), false);
    assert.equal(JSON.stringify(q56).includes("Should not appear"), false);
  });

  it("keeps selected fee details and drops unselected plus inactive creditWhen", () => {
    const draft = draftWithDormantFees();
    draft.section5.additionalFeeSelection = ["service_diagnostic"];
    const q56 = serializeQuestionnaireAnswersV1(draft).sections.S5.answers.Q56.value as {
      selection: string[];
      details: Record<string, { amount?: string; creditWhen?: string }>;
    };
    assert.deepEqual(q56.selection, ["service_diagnostic"]);
    assert.equal(q56.details.service_diagnostic?.amount, "89");
    assert.equal(q56.details.service_diagnostic?.creditWhen, "Should not appear in clean answers");
    assert.equal(q56.details.travel, undefined);

    draft.section5.additionalFeeDetails.service_diagnostic.credit = "always";
    const always = serializeQuestionnaireAnswersV1(draft).sections.S5.answers.Q56.value as {
      details: Record<string, { creditWhen?: string }>;
    };
    assert.equal(always.details.service_diagnostic?.creditWhen, undefined);
  });

  it("omits inactive service-price amounts, legacy area fields, and unselected multi-issue text", () => {
    const draft = draftWithDormantFees();
    const answers = serializeQuestionnaireAnswersV1(draft);
    const price = (
      answers.sections.S5.answers.Q54A.value as { fields: Record<string, unknown> }[]
    )[0].fields;
    assert.equal(price.exactAmount, "150");
    assert.equal(price.conditions, "Active condition");
    assert.equal(price.startingAmount, undefined);
    assert.equal(price.hourlyAmount, undefined);

    const area = (answers.sections.S5.answers.Q57A.value as { fields: Record<string, unknown> }[])[0]
      .fields;
    assert.equal(area.area, "North county");
    assert.equal(area.feeOrMinimum, "$40 travel");
    assert.equal(area.travelFee, undefined);
    assert.equal(area.minimumCharge, undefined);

    const q52 = answers.sections.S4.answers.Q52A.value as Record<string, unknown>;
    assert.equal(q52.separateIssueOther, false);
    assert.equal(q52.separateIssueOtherDetail, undefined);
    assert.match(JSON.stringify(draft.section4), /STALE other issue/);

    const q20 = answers.sections.S2.answers.Q20.value as {
      geography?: { cities?: string[]; zipCodes?: string[]; distance?: unknown };
    };
    assert.deepEqual(q20.geography?.cities, ["Austin"]);
    assert.equal(q20.geography?.zipCodes, undefined);
    assert.equal(q20.geography?.distance, undefined);

    const q63 = answers.sections.S5.answers.Q63.value as { rules: Record<string, string> };
    assert.deepEqual(q63.rules, {});
    assert.match(JSON.stringify(draft.section5.remedyRules), /STALE fee waiver rule/);
  });

  it("C: normalized additional fees stay active-only", () => {
    const draft = draftWithDormantFees();
    const normalized = normalizeSection5(draft.section5, createDefaultSection2(), [], []);
    assert.deepEqual(normalized.additionalFees.selection, ["none"]);
    assert.deepEqual(normalized.additionalFees.details, {});
  });

  it("E: permanent Q-IDs are unchanged", () => {
    assert.equal(QUESTION_REGISTRY_V1.length, 137);
    assert.equal(QUESTION_REGISTRY_BY_ID.get("Q1")?.questionId, "Q1");
    assert.equal(QUESTION_REGISTRY_BY_ID.get("Q56")?.questionId, "Q56");
    assert.equal(QUESTION_REGISTRY_BY_ID.get("Q93")?.questionId, "Q93");
    assert.equal([...QUESTION_REGISTRY_BY_ID.keys()].filter((id) => id === "Q56").length, 1);
  });
});
