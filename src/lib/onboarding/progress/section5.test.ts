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
    const units = getSection5ProgressUnits(data, ELIGIBLE_SECTION2_FOR_PRICING, [], []);
    assert.equal(units[1].complete, true);
    assert.equal(units[3].complete, true);
    assert.equal(units[5].complete, true);
  });
});

describe("getSection5Progress — conditional units affect denominator", () => {
  it("service prices apply only when Alexander may quote", () => {
    const hidden = createDefaultSection5();
    const applicableHidden = getSection5ProgressUnits(hidden, ELIGIBLE_SECTION2_FOR_PRICING, [], []).filter(
      (unit) => unit.applicable,
    );
    const shown = createDefaultSection5();
    shown.mayQuoteServicePrices = "allowed";
    const applicableShown = getSection5ProgressUnits(shown, ELIGIBLE_SECTION2_FOR_PRICING, [], []).filter(
      (unit) => unit.applicable,
    );
    assert.equal(applicableShown.length, applicableHidden.length + 1);
  });

  it("fully valid section5 scores 1.0", () => {
    const data = fullyValidSection5(ELIGIBLE_SECTION2_FOR_PRICING, [], []);
    assert.equal(getSection5Progress(data, ELIGIBLE_SECTION2_FOR_PRICING, [], []), 1);
  });
});
