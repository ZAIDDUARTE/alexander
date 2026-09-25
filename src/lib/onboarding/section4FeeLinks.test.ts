import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  hasActiveSection4LinkedFeePolicies,
  isSection4LinkedFeeProtected,
} from "./section4FeeLinks";
import { createDefaultSection4, createEmptyFee } from "./types";
import { validateSection5 } from "./validation/section5";
import { fullyValidSection5 } from "./section5-test-helpers";
import { ELIGIBLE_SECTION2_FOR_PRICING } from "./section5-test-helpers";

describe("Section 4 linked fee integrity", () => {
  it("protects late-cancellation fee when Q54 policy is active", () => {
    const s4 = createDefaultSection4();
    const fee = createEmptyFee("late_cancellation", "Late cancellation fee");
    fee.active = true;
    s4.lateCancellationFeeMode = "yes";
    s4.lateCancellationFeeId = fee.id;
    assert.equal(isSection4LinkedFeeProtected(fee.id, s4), true);
    assert.equal(hasActiveSection4LinkedFeePolicies(s4, [fee]), true);
  });

  it("does not protect custom Q68 fee without Section 4 policy link", () => {
    const s4 = createDefaultSection4();
    const fee = createEmptyFee("late_cancellation", "Late cancellation fee");
    fee.feeKey = "";
    fee.active = true;
    assert.equal(isSection4LinkedFeeProtected(fee.id, s4), false);
  });

  it("rejects noSeparateFees when active Section 4 linked fees exist", () => {
    const data = fullyValidSection5();
    data.noSeparateFees = true;
    const s4 = createDefaultSection4();
    const fee = createEmptyFee("no_show", "No-show fee");
    fee.active = true;
    fee.amountFixed = "50";
    fee.amountKind = "fixed";
    fee.applicationRule = "When customer is not home.";
    fee.quoteAuthority = "yes";
    fee.creditTowardWork = "no";
    fee.waiverPolicy = "no";
    s4.noShowFeeMode = "yes";
    s4.noShowFeeId = fee.id;
    const errors = validateSection5(data, ELIGIBLE_SECTION2_FOR_PRICING, [], [fee], s4);
    assert.ok(errors.noSeparateFees);
  });
});
