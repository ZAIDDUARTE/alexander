import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getSection4Progress, getSection4ProgressUnits } from "./section4";
import { createDefaultSection4 } from "../types";
import {
  fullyValidSection4,
  validApproverContact,
  validLateCancellationFee,
  withLateCancellationFee,
} from "../section4-test-helpers";

describe("getSection4Progress — fresh section", () => {
  it("is not fully complete for unanswered Q39–Q64 (Q49 MD preselect counts as one unit)", () => {
    const owner = validApproverContact();
    const data = createDefaultSection4();
    const progress = getSection4Progress(data, [owner], []);
    assert.ok(progress > 0);
    assert.ok(progress < 1);
    assert.equal(getSection4ProgressUnits(data, [owner], [])[10].complete, true);
  });
});

describe("getSection4Progress — conditional units affect denominator", () => {
  it("Q44 spending-limit rows only apply when Q44 = yes", () => {
    const owner = validApproverContact();
    const no = createDefaultSection4();
    no.hasSpendingLimits = "no";
    const unitsNo = getSection4ProgressUnits(no, [owner], []).filter((u) => u.applicable);

    const yes = createDefaultSection4();
    yes.hasSpendingLimits = "yes";
    const unitsYes = getSection4ProgressUnits(yes, [owner], []).filter((u) => u.applicable);

    assert.equal(unitsYes.length, unitsNo.length);
    const q44No = getSection4ProgressUnits(no, [owner], [])[5];
    const q44Yes = getSection4ProgressUnits(yes, [owner], [])[5];
    assert.equal(q44No.complete, true);
    assert.equal(q44Yes.complete, false);
  });

  it("Q59/Q60 units are NOT in the denominator until Q58 = yes", () => {
    const owner = validApproverContact();
    const noCallback = createDefaultSection4();
    noCallback.mayArrangeCallback = "no";
    const applicableNo = getSection4ProgressUnits(noCallback, [owner], []).filter((u) => u.applicable);

    const yesCallback = createDefaultSection4();
    yesCallback.mayArrangeCallback = "yes";
    const applicableYes = getSection4ProgressUnits(yesCallback, [owner], []).filter((u) => u.applicable);

    assert.equal(applicableYes.length, applicableNo.length + 2);
  });

  it("Q64 unit is NOT in the denominator until Q63 = separate_issues", () => {
    const owner = validApproverContact();
    const oneAppt = createDefaultSection4();
    oneAppt.multiIssueMode = "one_appointment";
    const unitsOne = getSection4ProgressUnits(oneAppt, [owner], []).filter((u) => u.applicable);

    const separate = createDefaultSection4();
    separate.multiIssueMode = "separate_issues";
    const unitsSeparate = getSection4ProgressUnits(separate, [owner], []).filter((u) => u.applicable);

    assert.equal(unitsSeparate.length, unitsOne.length + 1);
  });

  it("selecting conditional options without filling them never scores higher than simpler choices", () => {
    const owner = validApproverContact();
    const direct = fullyValidSection4([owner], []);
    direct.rescheduleAuthority = "direct";

    const conditionalUnfilled = fullyValidSection4([owner], []);
    conditionalUnfilled.rescheduleAuthority = "conditional";
    conditionalUnfilled.rescheduleCondition = "";

    assert.ok(
      getSection4Progress(conditionalUnfilled, [owner], []) <=
        getSection4Progress(direct, [owner], []),
    );
  });
});

describe("getSection4Progress — complete valid section", () => {
  it("reaches 1 when every applicable unit is complete", () => {
    const owner = validApproverContact();
    const fee = validLateCancellationFee();
    const data = fullyValidSection4([owner], [fee]);
    data.mayArrangeCallback = "no";
    assert.equal(getSection4Progress(data, [owner], [fee]), 1);
  });

  it("counts Q54 fee details inside the Q54 unit when mode requires a fee", () => {
    const owner = validApproverContact();
    const fee = validLateCancellationFee();
    const data = fullyValidSection4([owner], [fee]);
    withLateCancellationFee(data, fee, "yes");
    fee.amountFixed = "";
    const units = getSection4ProgressUnits(data, [owner], [fee]);
    const q54 = units[15];
    assert.equal(q54.complete, false);

    fee.amountFixed = "75";
    fee.noticeRequired = "24 hours";
    const unitsFixed = getSection4ProgressUnits(data, [owner], [fee]);
    assert.equal(unitsFixed[15].complete, true);
  });
});
