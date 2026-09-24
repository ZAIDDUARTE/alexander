import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateSection4, section4IsValid, SPECIFIC_TECH_OPTIONS } from "./section4";
import {
  CONFIRMATION_INFO_OPTIONS,
  EXCEPTION_TYPES,
  NO_AVAILABILITY_FALLBACK_OPTIONS,
} from "../section4Catalog";
import {
  createDefaultSection4,
  createEmptyContact,
  createDefaultConfirmationInfo,
  createDefaultSection2,
  createDefaultDraft,
} from "../types";
import {
  fullyValidSection4,
  validApproverContact,
  validLateCancellationFee,
  validNoShowFee,
  withLateCancellationFee,
  withNoShowFee,
  FIRST_JOB_SERVICE_ID,
  spendingLimitRow,
  serviceBookingRule,
  technicianAssignmentRow,
  setNonOverlappingAppointmentWindows,
  ELIGIBLE_SECTION2,
  section2WithEligibleServices,
  upsertFeeByKey,
} from "../section4-test-helpers";
import { getSchedulingEligibleServices } from "../schedulingServices";
import { JOB_SERVICES } from "../section2Catalog";
import { hasDraftContent } from "../draft-utils";

describe("validateSection4 — A: Q39 custom branch (optional text)", () => {
  // MD: "Follow another rule -> show custom rule" — NOT "required".
  // Contrast Q42: "Other -> show required custom rule."
  it("does not block completion when custom text is blank", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.humanRequestPolicy = "custom";
    data.humanRequestCustomRule = "";
    const errors = validateSection4(data, [owner], []);
    assert.equal(errors.humanRequestCustomRule, undefined);
    assert.equal(section4IsValid(data, [owner], []), true);
  });

  it("still accepts entered custom text", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.humanRequestPolicy = "custom";
    data.humanRequestCustomRule = "Offer callback first on weekends.";
    assert.equal(section4IsValid(data, [owner], []), true);
  });
});

describe("validateSection4 — B: Q40 custom branch (optional text)", () => {
  // MD: same as Q39 — show custom rule, not required. Do not mirror Q42.
  it("does not block completion when custom text is blank", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.aiRefusalPolicy = "custom";
    data.aiRefusalCustomRule = "";
    const errors = validateSection4(data, [owner], []);
    assert.equal(errors.aiRefusalCustomRule, undefined);
    assert.equal(section4IsValid(data, [owner], []), true);
  });

  it("still accepts entered custom text", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.aiRefusalPolicy = "custom";
    data.aiRefusalCustomRule = "Connect to dispatch immediately.";
    assert.equal(section4IsValid(data, [owner], []), true);
  });
});

describe("validateSection4 — C: Q41 one authority per row", () => {
  it("blocks completion when any exception row is unclassified", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.exceptionAuthority[EXCEPTION_TYPES[0].id] = "";
    const errors = validateSection4(data, [owner], []);
    assert.ok(errors.exceptionAuthority);
  });

  it("passes when every row has an authority", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    assert.equal(section4IsValid(data, [owner], []), true);
  });
});

describe("validateSection4 — D: Q41 row-specific approver", () => {
  it("requires a valid approver contact for the exact row selecting another_person", () => {
    const owner = validApproverContact();
    const approver = validApproverContact({ nameOrRole: "Fee Approver" });
    const data = fullyValidSection4([owner, approver], []);
    data.exceptionAuthority["fee_or_price"] = "another_person";
    data.exceptionApproverContactIds["fee_or_price"] = "";
    const errors = validateSection4(data, [owner, approver], []);
    assert.ok(errors["exceptionApprover.fee_or_price"]);

    data.exceptionApproverContactIds["fee_or_price"] = approver.id;
    assert.equal(section4IsValid(data, [owner, approver], []), true);
  });

  it("does not require approvers on rows that are not another_person", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.exceptionAuthority["fee_or_price"] = "manager";
    data.exceptionApproverContactIds["fee_or_price"] = "stale-id";
    assert.equal(section4IsValid(data, [owner], []), true);
  });
});

describe("validateSection4 — E: Q42 Other", () => {
  it("requires custom rule when Other is selected", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.approverUnavailablePolicy = "other";
    data.approverUnavailableCustomRule = "";
    assert.ok(validateSection4(data, [owner], []).approverUnavailableCustomRule);
  });

  it("passes once Other detail is filled", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.approverUnavailablePolicy = "other";
    data.approverUnavailableCustomRule = "Leave a voicemail for the owner.";
    assert.equal(section4IsValid(data, [owner], []), true);
  });
});

describe("validateSection4 — F: Q43 Not allowed exclusivity", () => {
  it("rejects Not allowed combined with positive permissions", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.callerPermissions["homeowner"] = ["schedule_service", "not_allowed"];
    const errors = validateSection4(data, [owner], []);
    assert.ok(errors["callerPermissions.homeowner"]);
  });

  it("requires at least one permission per caller type", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.callerPermissions["tenant"] = [];
    const errors = validateSection4(data, [owner], []);
    assert.ok(errors.callerPermissions || errors["callerPermissions.tenant"]);
  });
});

describe("validateSection4 — G: Q44 spending limits", () => {
  it("does not validate spending rows when Q44 = no", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.hasSpendingLimits = "no";
    data.spendingLimits = [spendingLimitRow("", "not-money")];
    assert.equal(section4IsValid(data, [owner], []), true);
  });

  it("requires valid rows when Q44 = yes", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.hasSpendingLimits = "yes";
    data.spendingLimits = [];
    assert.ok(validateSection4(data, [owner], []).spendingLimits);

    data.spendingLimits = [spendingLimitRow("homeowner", "500")];
    assert.equal(section4IsValid(data, [owner], []), true);
  });
});

describe("validateSection4 — H: Q45 special emergency rules", () => {
  it("requires special-rules text when emergencies have special rules", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.emergencyAuthMode = "special_rules";
    data.emergencyAuthSpecialRules = "";
    assert.ok(validateSection4(data, [owner], []).emergencyAuthSpecialRules);
  });

  it("does not require special-rules text for same_rules", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.emergencyAuthMode = "same_rules";
    data.emergencyAuthSpecialRules = "stale text";
    assert.equal(section4IsValid(data, [owner], []), true);
  });
});

describe("validateSection4 — I: Q47 no maximum vs numeric", () => {
  it("rejects both a day limit and No maximum", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.bookingHorizonNoMaximum = true;
    data.bookingHorizonDays = "30";
    assert.ok(validateSection4(data, [owner], []).bookingHorizonDays);
  });

  it("requires a positive whole number when No maximum is off", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.bookingHorizonDays = "0";
    assert.ok(validateSection4(data, [owner], []).bookingHorizonDays);

    data.bookingHorizonDays = "45";
    assert.equal(section4IsValid(data, [owner], []), true);
  });

  it("accepts No maximum with cleared days", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.bookingHorizonNoMaximum = true;
    data.bookingHorizonDays = "";
    assert.equal(section4IsValid(data, [owner], []), true);
  });
});

describe("validateSection4 — J: Q48 enabled window validation + reorder identity", () => {
  it("requires start/end on enabled windows and start < end", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    const morning = data.appointmentWindows.find((w) => w.id === "morning")!;
    morning.start = "12:00";
    morning.end = "08:00";
    assert.ok(validateSection4(data, [owner], [])["appointmentWindows.morning.times"]);
  });

  it("detects overlapping enabled windows", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.appointmentWindows = data.appointmentWindows.map((w) => ({ ...w, enabled: true }));
    setNonOverlappingAppointmentWindows(data);
    const b = data.appointmentWindows.find((w) => w.id === "late_morning")!;
    b.start = "09:00";
    b.end = "11:00";
    const errors = validateSection4(data, [owner], []);
    assert.ok(
      errors["appointmentWindows.overlap.morning.late_morning"] ||
        errors["appointmentWindows.overlap.late_morning.morning"],
    );
  });

  it("preserves stable window IDs after reordering the array", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    const idsBefore = data.appointmentWindows.map((w) => w.id);
    data.appointmentWindows = [...data.appointmentWindows].reverse();
    const idsAfter = data.appointmentWindows.map((w) => w.id);
    assert.deepEqual(new Set(idsAfter), new Set(idsBefore));
    assert.equal(section4IsValid(data, [owner], []), true);
  });
});

describe("validateSection4 — K: Q49 all-six explicit default", () => {
  it("createDefaultSection4 preselects all six confirmation options", () => {
    const data = createDefaultSection4();
    assert.equal(data.confirmationInfo.length, CONFIRMATION_INFO_OPTIONS.length);
    assert.deepEqual(
      [...data.confirmationInfo].sort(),
      createDefaultConfirmationInfo().slice().sort(),
    );
  });

  it("requires at least one confirmation option", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.confirmationInfo = [];
    assert.ok(validateSection4(data, [owner], []).confirmationInfo);
  });
});

describe("validateSection4 — L: Q50 service ID reuse", () => {
  it("requires complete service-rule cards when Yes", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.hasServiceBookingRules = "yes";
    data.serviceBookingRules = [];
    assert.ok(validateSection4(data, [owner], [], ELIGIBLE_SECTION2).serviceBookingRules);
  });

  it("rejects duplicate service IDs across rules", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.hasServiceBookingRules = "yes";
    data.serviceBookingRules = [
      serviceBookingRule(FIRST_JOB_SERVICE_ID, "Team approval required."),
      serviceBookingRule(FIRST_JOB_SERVICE_ID, "Duplicate row."),
    ];
    const errors = validateSection4(data, [owner], [], ELIGIBLE_SECTION2);
    assert.ok(errors[`serviceBookingRules.${data.serviceBookingRules[1].id}.serviceId`]);
  });
});

describe("validateSection4 — M: Q51 row-specific condition", () => {
  it("requires condition text only on rows with Allowed with conditions", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.capacityPolicies["same_day"] = { policy: "with_conditions", condition: "" };
    assert.ok(validateSection4(data, [owner], [])["capacityPolicies.same_day.condition"]);

    data.capacityPolicies["same_day"].condition = "Only before noon.";
    assert.equal(section4IsValid(data, [owner], []), true);
  });
});

describe("validateSection4 — N: Q52 conditional reschedule", () => {
  it("requires condition when reschedule is conditional", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.rescheduleAuthority = "conditional";
    data.rescheduleCondition = "";
    assert.ok(validateSection4(data, [owner], []).rescheduleCondition);
  });
});

describe("validateSection4 — O: Q53 conditional cancellation", () => {
  it("requires condition when cancellation is conditional", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.cancellationAuthority = "conditional";
    data.cancellationCondition = "";
    assert.ok(validateSection4(data, [owner], []).cancellationCondition);
  });
});

describe("validateSection4 — P: Q54 late-cancellation fee linkage", () => {
  it("requires linked active fee with amount and notice when mode is yes", () => {
    const owner = validApproverContact();
    const fee = validLateCancellationFee();
    const data = fullyValidSection4([owner], [fee]);
    withLateCancellationFee(data, fee, "yes");
    fee.amountFixed = "";
    assert.ok(validateSection4(data, [owner], [fee])["lateCancellationFee.amountFixed"]);

    fee.amountFixed = "75";
    fee.noticeRequired = "";
    assert.ok(validateSection4(data, [owner], [fee])["lateCancellationFee.noticeRequired"]);

    fee.noticeRequired = "24 hours";
    assert.equal(section4IsValid(data, [owner], [fee]), true);
  });

  it("does not require fee details when mode is no", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.lateCancellationFeeMode = "no";
    data.lateCancellationFeeId = "orphan";
    assert.equal(section4IsValid(data, [owner], []), true);
  });
});

describe("validateSection4 — Q: Q55 no-show fee linkage", () => {
  it("requires linked fee amount when mode is yes (no notice required)", () => {
    const owner = validApproverContact();
    const fee = validNoShowFee();
    const data = fullyValidSection4([owner], [fee]);
    withNoShowFee(data, fee, "yes");
    fee.amountFixed = "";
    assert.ok(validateSection4(data, [owner], [fee])["noShowFee.amountFixed"]);

    fee.amountFixed = "50";
    assert.equal(section4IsValid(data, [owner], [fee]), true);
  });
});

describe("validateSection4 — R: Q57 explicit priority", () => {
  it("rejects incomplete or duplicate fallback priority", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.noAvailabilityPriority = ["offer_next_available"];
    assert.ok(validateSection4(data, [owner], []).noAvailabilityPriority);

    data.noAvailabilityPriority = [
      "offer_next_available",
      "look_for_approved_window",
      "add_to_callback_waitlist",
      "offer_next_available",
    ];
    assert.ok(validateSection4(data, [owner], []).noAvailabilityPriority);
  });

  it("requires each priority option exactly once (permutation completeness)", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.noAvailabilityPriority = [
      "ask_team_for_help",
      "add_to_callback_waitlist",
      "look_for_approved_window",
      "offer_next_available",
    ];
    assert.equal(section4IsValid(data, [owner], []), true);
    const required = NO_AVAILABILITY_FALLBACK_OPTIONS.map((o) => o.id);
    assert.equal(data.noAvailabilityPriority.length, required.length);
    assert.deepEqual(
      [...data.noAvailabilityPriority].sort(),
      [...required].sort(),
    );
    assert.equal(new Set(data.noAvailabilityPriority).size, required.length);
  });
});

describe("validateSection4 — S: Q58 → Q59/Q60 applicability", () => {
  it("does not require callback fields when Q58 = no", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.mayArrangeCallback = "no";
    data.callbackNumberPolicy = "";
    data.callbackOwnerContactId = "";
    assert.equal(section4IsValid(data, [owner], []), true);
  });

  it("requires Q59 and Q60 when Q58 = yes", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.callbackNumberPolicy = "";
    assert.ok(validateSection4(data, [owner], []).callbackNumberPolicy);

    data.callbackNumberPolicy = "calling_from";
    data.callbackOwnerContactId = "";
    assert.ok(validateSection4(data, [owner], []).callbackOwnerContactId);
  });
});

describe("validateSection4 — T: Q59 approved default (stored empty until Q58 yes)", () => {
  it("createDefaultSection4 keeps callbackNumberPolicy empty", () => {
    assert.equal(createDefaultSection4().callbackNumberPolicy, "");
  });
});

describe("validateSection4 — U: Q60 contact reuse", () => {
  it("accepts an existing shared contact as callback owner", () => {
    const owner = validApproverContact({ nameOrRole: "Dispatch Lead" });
    const data = fullyValidSection4([owner], []);
    data.callbackOwnerContactId = owner.id;
    assert.equal(section4IsValid(data, [owner], []), true);
  });

  it("rejects callback owner contacts without a valid E.164 phone", () => {
    const owner = validApproverContact();
    const incomplete = createEmptyContact();
    incomplete.nameOrRole = "New Owner";
    incomplete.phone = "not-a-phone";
    const data = fullyValidSection4([owner, incomplete], []);
    data.callbackOwnerContactId = incomplete.id;
    const errors = validateSection4(data, [owner, incomplete], []);
    assert.ok(errors["callbackOwnerContact.phone"]);
  });
});

describe("validateSection4 — V: Q61 service/technician assignment", () => {
  it("requires service + technician when assignments are enabled", () => {
    const owner = validApproverContact();
    const tech = validApproverContact({ nameOrRole: "Tech Sam" });
    const data = fullyValidSection4([owner, tech], []);
    data.hasTechnicianAssignments = "yes";
    data.technicianAssignments = [
      technicianAssignmentRow({ serviceId: FIRST_JOB_SERVICE_ID, technicianContactId: tech.id }),
    ];
    assert.equal(section4IsValid(data, [owner, tech], [], ELIGIBLE_SECTION2), true);
  });
});

describe("validateSection4 — W: Q61 Other job", () => {
  it("rejects both service registry id and other job name on the same row", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.hasTechnicianAssignments = "yes";
    data.technicianAssignments = [
      technicianAssignmentRow({
        serviceId: FIRST_JOB_SERVICE_ID,
        otherJobName: "Custom install",
        technicianName: "Alex",
      }),
    ];
    assert.ok(
      validateSection4(data, [owner], [], ELIGIBLE_SECTION2)[`technicianAssignments.${data.technicianAssignments[0].id}.job`],
    );
  });

  it("accepts other job name with plain technician name", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.hasTechnicianAssignments = "yes";
    data.technicianAssignments = [
      technicianAssignmentRow({ otherJobName: "Backflow test", technicianName: "Maria" }),
    ];
    assert.equal(section4IsValid(data, [owner], [], ELIGIBLE_SECTION2), true);
  });
});

describe("validateSection4 — X: Q62 confirmed-availability semantics", () => {
  it("exposes book_if_confirmed_available with customer-facing confirmed-availability label", () => {
    const option = SPECIFIC_TECH_OPTIONS.find((o) => o.value === "book_if_confirmed_available");
    assert.ok(option);
    assert.match(option!.label, /confirmed available/i);
  });
});

describe("validateSection4 — Y: Q63 → Q64", () => {
  it("requires separate-issue selection when Q63 = separate_issues", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.multiIssueMode = "separate_issues";
    data.separateIssueServiceIds = [];
    data.separateIssueOther = false;
    assert.ok(validateSection4(data, [owner], [], ELIGIBLE_SECTION2).separateIssueSelection);
  });

  it("does not validate Q64 when Q63 is one_appointment", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.multiIssueMode = "one_appointment";
    data.separateIssueServiceIds = [];
    data.separateIssueOther = true;
    data.separateIssueOtherDetail = "";
    assert.equal(section4IsValid(data, [owner], [], ELIGIBLE_SECTION2), true);
  });

  it("passes Q64 with registry service selection", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.multiIssueMode = "separate_issues";
    data.separateIssueServiceIds = [FIRST_JOB_SERVICE_ID];
    assert.equal(section4IsValid(data, [owner], [], ELIGIBLE_SECTION2), true);
  });
});

describe("validateSection4 — scheduling-eligible services from Section 2", () => {
  it("includes offered, with_conditions, and ask_team; excludes not_offered and unanswered", () => {
    const offered = JOB_SERVICES[0].id;
    const withCond = JOB_SERVICES[1].id;
    const askTeam = JOB_SERVICES[2].id;
    const notOffered = JOB_SERVICES[3].id;
    const unanswered = JOB_SERVICES[4].id;
    const s2 = section2WithEligibleServices({
      [offered]: "offered",
      [withCond]: "with_conditions",
      [askTeam]: "ask_team",
      [notOffered]: "not_offered",
      [unanswered]: "",
    });
    const ids = new Set(getSchedulingEligibleServices(s2).map((s) => s.id));
    assert.ok(ids.has(offered));
    assert.ok(ids.has(withCond));
    assert.ok(ids.has(askTeam));
    assert.equal(ids.has(notOffered), false);
    assert.equal(ids.has(unanswered), false);
  });

  it("Q50 rejects service ids that are not scheduling-eligible", () => {
    const owner = validApproverContact();
    const data = fullyValidSection4([owner], []);
    data.hasServiceBookingRules = "yes";
    data.serviceBookingRules = [
      serviceBookingRule(FIRST_JOB_SERVICE_ID, "Special rule."),
    ];
    const s2Empty = createDefaultSection2();
    assert.ok(
      validateSection4(data, [owner], [], s2Empty)[
        `serviceBookingRules.${data.serviceBookingRules[0].id}.serviceId`
      ],
    );
    assert.equal(section4IsValid(data, [owner], [], ELIGIBLE_SECTION2), true);
  });
});

describe("validateSection4 — Q54/Q55 stable fee IDs across Yes → No → Yes", () => {
  it("reuses the same late-cancellation fee id", () => {
    let fees: ReturnType<typeof upsertFeeByKey>["fees"] = [];
    const first = upsertFeeByKey(fees, "late_cancellation", {
      amountFixed: "75",
      noticeRequired: "24 hours",
      active: true,
    });
    fees = first.fees;
    const id1 = first.id;

    const deactivated = upsertFeeByKey(fees, "late_cancellation", { active: false });
    fees = deactivated.fees;
    assert.equal(deactivated.id, id1);

    const reactivated = upsertFeeByKey(fees, "late_cancellation", {
      amountFixed: "80",
      noticeRequired: "12 hours",
      active: true,
    });
    assert.equal(reactivated.id, id1);
    assert.equal(reactivated.fees.filter((f) => f.feeKey === "late_cancellation").length, 1);
  });

  it("reuses the same no-show fee id", () => {
    let fees: ReturnType<typeof upsertFeeByKey>["fees"] = [];
    const first = upsertFeeByKey(fees, "no_show", { amountFixed: "50", active: true });
    fees = first.fees;
    const id1 = first.id;

    fees = upsertFeeByKey(fees, "no_show", { active: false }).fees;
    const again = upsertFeeByKey(fees, "no_show", { amountFixed: "60", active: true });
    assert.equal(again.id, id1);
    assert.equal(again.fees.filter((f) => f.feeKey === "no_show").length, 1);
  });
});

describe("hasDraftContent — fresh default after Section 4", () => {
  it("createDefaultDraft still hasDraftContent === false", () => {
    assert.equal(hasDraftContent(createDefaultDraft()), false);
  });
});

