import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeSection4 } from "./section4";
import {
  fullyValidSection4,
  validApproverContact,
  validLateCancellationFee,
  validNoShowFee,
  withLateCancellationFee,
  withNoShowFee,
  FIRST_JOB_SERVICE_ID,
  technicianAssignmentRow,
  serviceBookingRule,
  ELIGIBLE_SECTION2,
  section2WithEligibleServices,
} from "../section4-test-helpers";
import { createDefaultSection4 } from "../types";
describe("normalizeSection4 — Z: stale inactive branches", () => {
  it("nulls Q39 custom text unless policy is custom", () => {
    const owner = validApproverContact();
    const data = createDefaultSection4();
    data.humanRequestPolicy = "callback";
    data.humanRequestCustomRule = "stale custom";
    const normalized = normalizeSection4(data, [owner], [], ELIGIBLE_SECTION2);
    assert.equal(normalized.humanRequest.customRule, null);
  });

  it("nulls Q44 spending limits when Q44 = no", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.hasSpendingLimits = "no";
    data.spendingLimits = [{ id: "x", callerTypeId: "homeowner", maxAmount: "999" }];
    assert.equal(normalizeSection4(data, [owner], [], ELIGIBLE_SECTION2).spendingLimits, null);
  });

  it("nulls Q45 emergency special rules unless special_rules mode", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.emergencyAuthMode = "same_rules";
    data.emergencyAuthSpecialRules = "stale emergency text";
    assert.equal(normalizeSection4(data, [owner], [], ELIGIBLE_SECTION2).emergencyAuth.specialRules, null);
  });

  it("nulls Q52/Q53 conditions unless authority is conditional", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.rescheduleAuthority = "direct";
    data.rescheduleCondition = "stale reschedule";
    data.cancellationAuthority = "human_approval";
    data.cancellationCondition = "stale cancel";
    const normalized = normalizeSection4(data, [owner], [], ELIGIBLE_SECTION2);
    assert.equal(normalized.reschedule.condition, null);
    assert.equal(normalized.cancellation.condition, null);
  });

  it("nulls Q51 row conditions unless policy is with_conditions", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.capacityPolicies["holiday"] = { policy: "allowed", condition: "stale holiday rule" };
    const row = normalizeSection4(data, [owner], [], ELIGIBLE_SECTION2).capacityPolicies.find((r) => r.id === "holiday");
    assert.equal(row?.condition, null);
  });

  it("nulls Q61 assignments when Q61 = no", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.hasTechnicianAssignments = "no";
    data.technicianAssignments = [
      technicianAssignmentRow({ serviceId: FIRST_JOB_SERVICE_ID, technicianName: "Stale" }),
    ];
    assert.equal(normalizeSection4(data, [owner], [], ELIGIBLE_SECTION2).technicianAssignments, null);
  });

  it("nulls Q64 separate-issue detail unless Q63 = separate_issues", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.multiIssueMode = "one_appointment";
    data.separateIssueOther = true;
    data.separateIssueOtherDetail = "stale detail";
    assert.equal(normalizeSection4(data, [owner], [], ELIGIBLE_SECTION2).multiIssue.separateOtherDetail, null);
  });
});

describe("normalizeSection4 — Q58 nulls Q59/Q60 when callback not arranged", () => {
  it("clears callback number policy and owner when Q58 = no", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.mayArrangeCallback = "no";
    data.callbackNumberPolicy = "calling_from";
    data.callbackOwnerContactId = owner.id;
    const normalized = normalizeSection4(data, [owner], []);
    assert.equal(normalized.callback.mayArrange, "no");
    assert.equal(normalized.callback.numberPolicy, null);
    assert.equal(normalized.callback.ownerContactId, null);
  });

  it("includes callback fields when Q58 = yes and calling_from is set", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.mayArrangeCallback = "yes";
    data.callbackNumberPolicy = "calling_from";
    data.callbackOwnerContactId = owner.id;
    const normalized = normalizeSection4(data, [owner], []);
    assert.equal(normalized.callback.numberPolicy, "calling_from");
    assert.equal(normalized.callback.ownerContactId, owner.id);
  });
});

describe("normalizeSection4 — P/Q fee linkage", () => {
  it("includes late-cancellation fee snapshot when mode is yes", () => {
    const owner = validApproverContact();
    const fee = validLateCancellationFee();
    const data = fullyValidSection4([owner], [fee]);
    withLateCancellationFee(data, fee, "yes");
    const normalized = normalizeSection4(data, [owner], [fee]);
    assert.equal(normalized.lateCancellationFee?.id, fee.id);
    assert.equal(normalized.lateCancellationFee?.amountFixed, "75.00");
    assert.equal(normalized.lateCancellationFee?.noticeRequired, "24 hours");
  });

  it("nulls fees when mode is no even if stale fee id remains", () => {
    const owner = validApproverContact();
    const fee = validLateCancellationFee();
    const data = fullyValidSection4([owner], [fee]);
    data.lateCancellationFeeMode = "no";
    data.lateCancellationFeeId = fee.id;
    const normalized = normalizeSection4(data, [owner], [fee]);
    assert.equal(normalized.lateCancellationFee, null);
    assert.equal(normalized.noShowFee, null);
  });

  it("preserves the same fee id when amount changes on the linked FeeRecord", () => {
    const owner = validApproverContact();
    const fee = validLateCancellationFee();
    const data = fullyValidSection4([owner], [fee]);
    withLateCancellationFee(data, fee, "yes");
    const first = normalizeSection4(data, [owner], [fee]).lateCancellationFee?.id;

    fee.amountFixed = "99.50";
    const second = normalizeSection4(data, [owner], [fee]).lateCancellationFee?.id;
    assert.equal(first, fee.id);
    assert.equal(second, fee.id);
    assert.equal(normalizeSection4(data, [owner], [fee]).lateCancellationFee?.amountFixed, "99.50");
  });

  it("includes no-show fee without noticeRequired", () => {
    const owner = validApproverContact();
    const fee = validNoShowFee();
    const data = fullyValidSection4([owner], [fee]);
    withNoShowFee(data, fee, "conditional");
    const normalized = normalizeSection4(data, [owner], [fee]);
    assert.equal(normalized.noShowFee?.id, fee.id);
    assert.equal(normalized.noShowFee?.noticeRequired, undefined);
    assert.equal(normalized.noShowFee?.applicationRule, fee.applicationRule);
  });
});

describe("normalizeSection4 — Q41 approver contact", () => {
  it("includes approverContactId only for another_person rows with identity", () => {
    const owner = validApproverContact();
    const approver = validApproverContact({ nameOrRole: "Exception Approver" });
    const data = fullyValidSection4([owner, approver], []);
    data.exceptionAuthority["scheduling"] = "another_person";
    data.exceptionApproverContactIds["scheduling"] = approver.id;
    const row = normalizeSection4(data, [owner, approver], []).exceptionAuthority.find(
      (r) => r.id === "scheduling",
    );
    assert.equal(row?.approverContactId, approver.id);
  });
});

describe("normalizeSection4 — Q48 appointment windows", () => {
  it("drops disabled windows and invalid intervals from normalized output", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    const normalized = normalizeSection4(data, [owner], []);
    assert.equal(normalized.appointmentWindows.length, 1);
    assert.equal(normalized.appointmentWindows[0].id, "morning");
  });
});

describe("normalizeSection4 — Q47 booking horizon", () => {
  it("nulls days when No maximum is selected", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.bookingHorizonNoMaximum = true;
    data.bookingHorizonDays = "";
    const horizon = normalizeSection4(data, [owner], []).bookingHorizon;
    assert.equal(horizon.noMaximum, true);
    assert.equal(horizon.days, null);
  });
});

describe("normalizeSection4 — Q61 job integrity", () => {
  it("never exposes both serviceId and otherJobName on one assignment", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.hasTechnicianAssignments = "yes";
    data.technicianAssignments = [
      technicianAssignmentRow({ otherJobName: "Custom job", technicianName: "Pat" }),
    ];
    const row = normalizeSection4(data, [owner], [], ELIGIBLE_SECTION2).technicianAssignments?.[0];
    assert.equal(row?.serviceId, null);
    assert.equal(row?.otherJobName, "Custom job");
    assert.equal(row?.technicianName, "Pat");
  });
});

describe("normalizeSection4 — stale scheduling service references", () => {
  it("excludes Q50 rules for services that are now not_offered (does not convert to Other)", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.hasServiceBookingRules = "yes";
    data.serviceBookingRules = [
      serviceBookingRule(FIRST_JOB_SERVICE_ID, "Requires two techs."),
    ];
    const s2Gone = section2WithEligibleServices({ [FIRST_JOB_SERVICE_ID]: "not_offered" });
    const normalized = normalizeSection4(data, [owner], [], s2Gone);
    // Mode stays yes in raw draft; Company Truth drops ineligible refs (empty list, not Other).
    assert.deepEqual(normalized.serviceBookingRules, []);
  });

  it("excludes Q61 registered-service assignments that are no longer eligible", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.hasTechnicianAssignments = "yes";
    data.technicianAssignments = [
      technicianAssignmentRow({
        serviceId: FIRST_JOB_SERVICE_ID,
        technicianName: "Alex",
      }),
    ];
    const s2Gone = section2WithEligibleServices({ [FIRST_JOB_SERVICE_ID]: "" });
    const normalized = normalizeSection4(data, [owner], [], s2Gone);
    assert.deepEqual(normalized.technicianAssignments, []);
  });

  it("excludes Q64 separate-issue service ids that are no longer eligible", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.multiIssueMode = "separate_issues";
    data.separateIssueServiceIds = [FIRST_JOB_SERVICE_ID];
    data.separateIssueOther = true;
    data.separateIssueOtherDetail = "Custom trench work";
    const s2Gone = section2WithEligibleServices({ [FIRST_JOB_SERVICE_ID]: "not_offered" });
    const normalized = normalizeSection4(data, [owner], [], s2Gone);
    assert.deepEqual(normalized.multiIssue.separateServiceIds, []);
    assert.equal(normalized.multiIssue.separateOtherDetail, "Custom trench work");
  });

  it("keeps Q50 rules when the service remains offered", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.hasServiceBookingRules = "yes";
    data.serviceBookingRules = [
      serviceBookingRule(FIRST_JOB_SERVICE_ID, "Requires two techs."),
    ];
    const normalized = normalizeSection4(data, [owner], [], ELIGIBLE_SECTION2);
    assert.equal(normalized.serviceBookingRules?.length, 1);
    assert.equal(normalized.serviceBookingRules?.[0].serviceId, FIRST_JOB_SERVICE_ID);
  });
});

describe("normalizeSection4 — Q39/Q40 optional custom blank → null", () => {
  it("maps whitespace-only Q39 custom to null while keeping custom policy", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.humanRequestPolicy = "custom";
    data.humanRequestCustomRule = "   ";
    const normalized = normalizeSection4(data, [owner], []);
    assert.equal(normalized.humanRequest.policy, "custom");
    assert.equal(normalized.humanRequest.customRule, null);
  });

  it("maps whitespace-only Q40 custom to null while keeping custom policy", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.aiRefusalPolicy = "custom";
    data.aiRefusalCustomRule = "\t";
    const normalized = normalizeSection4(data, [owner], []);
    assert.equal(normalized.aiRefusal.policy, "custom");
    assert.equal(normalized.aiRefusal.customRule, null);
  });
});

