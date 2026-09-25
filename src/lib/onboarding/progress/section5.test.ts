import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getSection5Progress, getSection5ProgressUnits } from "./section5";
import { createDefaultSection5 } from "../types";
import {
  ELIGIBLE_SECTION2_FOR_PRICING,
  fullyValidSection5,
} from "../section5-test-helpers";

describe("getSection5Progress — fresh section", () => {
  it("is not fully complete for unanswered Q65–Q82", () => {
    const data = createDefaultSection5();
    const progress = getSection5Progress(data, ELIGIBLE_SECTION2_FOR_PRICING, [], []);
    assert.ok(progress > 0);
    assert.ok(progress < 1);
    assert.equal(getSection5ProgressUnits(data, ELIGIBLE_SECTION2_FOR_PRICING, [], [])[9].complete, true);
  });
});

describe("getSection5Progress — conditional units affect denominator", () => {
  it("Q71 only applies when Q70 includes paid diagnostic", () => {
    const data = createDefaultSection5();
    data.visitTypeByServiceId = { ...data.visitTypeByServiceId };
    for (const key of Object.keys(data.visitTypeByServiceId)) {
      data.visitTypeByServiceId[key] = "normal_service";
    }
    const unitsNormal = getSection5ProgressUnits(data, ELIGIBLE_SECTION2_FOR_PRICING, [], []).filter(
      (u) => u.applicable,
    );

    const paid = createDefaultSection5();
    const firstKey = Object.keys(paid.visitTypeByServiceId)[0];
    paid.visitTypeByServiceId[firstKey] = "paid_diagnostic";
    const unitsPaid = getSection5ProgressUnits(paid, ELIGIBLE_SECTION2_FOR_PRICING, [], []).filter(
      (u) => u.applicable,
    );

    assert.equal(unitsPaid.length, unitsNormal.length + 1);
  });

  it("Q76–Q77 units are NOT in the denominator until Q75 = yes", () => {
    const noPromo = createDefaultSection5();
    noPromo.hasPromotions = "no";
    const applicableNo = getSection5ProgressUnits(
      noPromo,
      ELIGIBLE_SECTION2_FOR_PRICING,
      [],
      [],
    ).filter((u) => u.applicable);

    const yesPromo = createDefaultSection5();
    yesPromo.hasPromotions = "yes";
    const applicableYes = getSection5ProgressUnits(
      yesPromo,
      ELIGIBLE_SECTION2_FOR_PRICING,
      [],
      [],
    ).filter((u) => u.applicable);

    assert.equal(applicableYes.length, applicableNo.length + 2);
  });

  it("fully valid section5 scores 1.0", () => {
    const data = fullyValidSection5(ELIGIBLE_SECTION2_FOR_PRICING, [], []);
    assert.equal(getSection5Progress(data, ELIGIBLE_SECTION2_FOR_PRICING, [], []), 1);
  });
});
