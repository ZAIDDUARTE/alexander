import {
  CALLER_TYPES,
  CAPACITY_POLICY_ROWS,
  EXCEPTION_TYPES,
  NO_AVAILABILITY_FALLBACK_OPTIONS,
} from "../section4Catalog";
import { getSchedulingEligibleServiceIds } from "../schedulingServices";
import type {
  AppointmentWindow,
  Contact,
  FeeRecord,
  Section2Data,
  Section4Data,
} from "../types";
import { contactHasIdentity, createDefaultSection2 } from "../types";
import { approverContactIsValid } from "../validation/section3";

type ProgressUnit = {
  applicable: boolean;
  complete: boolean;
};

const FALLBACK_IDS = NO_AVAILABILITY_FALLBACK_OPTIONS.map((o) => o.id);
const POSITIVE_MONEY_REGEX = /^\d+(\.\d{1,2})?$/;

function isPositiveMoney(value: string): boolean {
  const trimmed = value.trim();
  if (!POSITIVE_MONEY_REGEX.test(trimmed)) return false;
  return parseFloat(trimmed) > 0;
}

function isPositiveWholeNumber(value: string): boolean {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return false;
  return parseInt(trimmed, 10) > 0;
}

function windowInterval(
  window: AppointmentWindow,
): { start: string; end: string } | null {
  if (!window.enabled) return null;
  if (!window.start || !window.end) return null;
  if (window.start >= window.end) return null;
  return { start: window.start, end: window.end };
}

function intervalsOverlap(
  a: { start: string; end: string },
  b: { start: string; end: string },
): boolean {
  return a.start < b.end && b.start < a.end;
}

function appointmentWindowsComplete(windows: AppointmentWindow[]): boolean {
  const enabled = windows.filter((w) => w.enabled);
  if (enabled.length === 0) return false;
  for (const window of enabled) {
    if (!window.start || !window.end || window.start >= window.end) return false;
  }
  const intervals: { start: string; end: string }[] = [];
  for (const window of windows) {
    const interval = windowInterval(window);
    if (interval) intervals.push(interval);
  }
  for (let i = 0; i < intervals.length; i++) {
    for (let j = i + 1; j < intervals.length; j++) {
      if (intervalsOverlap(intervals[i], intervals[j])) return false;
    }
  }
  return true;
}

function callerPermissionsComplete(data: Section4Data): boolean {
  for (const row of CALLER_TYPES) {
    const permissions = data.callerPermissions[row.id] ?? [];
    if (permissions.length === 0) return false;
    if (permissions.includes("not_allowed") && permissions.length > 1) return false;
  }
  return true;
}

function exceptionAuthorityComplete(data: Section4Data, contacts: Contact[]): boolean {
  for (const row of EXCEPTION_TYPES) {
    const authority = data.exceptionAuthority[row.id] ?? "";
    if (!authority) return false;
    if (authority === "another_person") {
      const contactId = data.exceptionApproverContactIds[row.id] ?? "";
      const approver = contacts.find((c) => c.id === contactId);
      if (!approver || !contactHasIdentity(approver) || !approverContactIsValid(approver)) {
        return false;
      }
    }
  }
  return true;
}

function feeModeComplete(
  mode: Section4Data["lateCancellationFeeMode"],
  feeId: string,
  fees: FeeRecord[],
  requireNotice: boolean,
): boolean {
  if (mode !== "yes" && mode !== "conditional") return true;
  if (!feeId.trim()) return false;
  const fee = fees.find((f) => f.id === feeId);
  if (!fee || !fee.active) return false;
  if (!isPositiveMoney(fee.amountFixed)) return false;
  if (requireNotice && !fee.noticeRequired.trim()) return false;
  if (mode === "conditional" && !fee.applicationRule.trim()) return false;
  return true;
}

function noAvailabilityPriorityComplete(priority: Section4Data["noAvailabilityPriority"]): boolean {
  if (priority.length !== FALLBACK_IDS.length) return false;
  const expected = new Set(FALLBACK_IDS);
  const seen = new Set<string>();
  for (const id of priority) {
    if (!expected.has(id) || seen.has(id)) return false;
    seen.add(id);
  }
  return true;
}

/**
 * Deterministic Section 4 completion units — one per top-level MD
 * question (Q39–Q64). Conditional units enter the denominator only
 * when their parent answer makes them applicable.
 */
export function getSection4ProgressUnits(
  data: Section4Data,
  contacts: Contact[],
  fees: FeeRecord[],
  section2: Section2Data = createDefaultSection2(),
): ProgressUnit[] {
  const eligibleServiceIds = getSchedulingEligibleServiceIds(section2);
  const showSpendingLimits = data.hasSpendingLimits === "yes";
  const showEmergencySpecial = data.emergencyAuthMode === "special_rules";
  const showServiceRules = data.hasServiceBookingRules === "yes";
  const showRescheduleCondition = data.rescheduleAuthority === "conditional";
  const showCancellationCondition = data.cancellationAuthority === "conditional";
  const showCallbackDetails = data.mayArrangeCallback === "yes";
  const showTechnicianAssignments = data.hasTechnicianAssignments === "yes";
  const showSeparateIssues = data.multiIssueMode === "separate_issues";

  const bookingHorizonComplete = data.bookingHorizonNoMaximum
    ? !data.bookingHorizonDays.trim()
    : isPositiveWholeNumber(data.bookingHorizonDays);

  const spendingLimitsComplete =
    showSpendingLimits &&
    data.spendingLimits.length > 0 &&
    data.spendingLimits.every(
      (row) =>
        Boolean(row.callerTypeId) &&
        CALLER_TYPES.some((c) => c.id === row.callerTypeId) &&
        isPositiveMoney(row.maxAmount),
    );

  const capacityComplete = CAPACITY_POLICY_ROWS.every((row) => {
    const entry = data.capacityPolicies[row.id];
    if (!entry?.policy) return false;
    if (entry.policy === "with_conditions") return Boolean(entry.condition.trim());
    return true;
  });

  const serviceRulesComplete =
    showServiceRules &&
    eligibleServiceIds.size > 0 &&
    data.serviceBookingRules.length > 0 &&
    (() => {
      const seen = new Set<string>();
      for (const rule of data.serviceBookingRules) {
        if (!rule.serviceId || !eligibleServiceIds.has(rule.serviceId)) return false;
        if (!rule.rule.trim()) return false;
        if (seen.has(rule.serviceId)) return false;
        seen.add(rule.serviceId);
      }
      return true;
    })();

  const technicianAssignmentsComplete =
    showTechnicianAssignments &&
    data.technicianAssignments.length > 0 &&
    data.technicianAssignments.every((row) => {
      const hasService = Boolean(row.serviceId.trim());
      const hasOther = Boolean(row.otherJobName.trim());
      if (hasService === hasOther) return false;
      if (hasService && !eligibleServiceIds.has(row.serviceId)) return false;
      const contact = row.technicianContactId
        ? contacts.find((c) => c.id === row.technicianContactId)
        : undefined;
      const hasContact = Boolean(contact && contactHasIdentity(contact));
      const hasName = Boolean(row.technicianName.trim());
      return hasContact || hasName;
    });

  const separateIssuesComplete =
    showSeparateIssues &&
    (data.separateIssueServiceIds.some((id) => eligibleServiceIds.has(id)) ||
      (data.separateIssueOther && Boolean(data.separateIssueOtherDetail.trim())));

  const callbackOwnerComplete =
    showCallbackDetails &&
    Boolean(data.callbackNumberPolicy) &&
    Boolean(data.callbackOwnerContactId.trim()) &&
    (() => {
      const owner = contacts.find((c) => c.id === data.callbackOwnerContactId);
      return Boolean(owner && contactHasIdentity(owner) && approverContactIsValid(owner));
    })();

  return [
    // Q39 — custom text is optional (MD: "show custom rule", not "required")
    {
      applicable: true,
      complete: data.humanRequestPolicy !== "",
    },
    // Q40 — custom text is optional (same MD wording as Q39; contrast Q42)
    {
      applicable: true,
      complete: data.aiRefusalPolicy !== "",
    },
    // Q41 — matrix + per-row approvers when another_person
    { applicable: true, complete: exceptionAuthorityComplete(data, contacts) },
    // Q42 — Other custom rule IS required (MD: "show required custom rule")
    {
      applicable: true,
      complete:
        data.approverUnavailablePolicy !== "" &&
        (data.approverUnavailablePolicy !== "other" ||
          Boolean(data.approverUnavailableCustomRule.trim())),
    },
    // Q43
    { applicable: true, complete: callerPermissionsComplete(data) },
    // Q44
    {
      applicable: true,
      complete: data.hasSpendingLimits !== "" && (!showSpendingLimits || spendingLimitsComplete),
    },
    // Q45
    {
      applicable: true,
      complete:
        data.emergencyAuthMode !== "" &&
        (!showEmergencySpecial || Boolean(data.emergencyAuthSpecialRules.trim())),
    },
    // Q46
    { applicable: true, complete: data.defaultBookingMode !== "" },
    // Q47
    { applicable: true, complete: bookingHorizonComplete },
    // Q48
    { applicable: true, complete: appointmentWindowsComplete(data.appointmentWindows) },
    // Q49
    { applicable: true, complete: data.confirmationInfo.length > 0 },
    // Q50
    {
      applicable: true,
      complete: data.hasServiceBookingRules !== "" && (!showServiceRules || serviceRulesComplete),
    },
    // Q51
    { applicable: true, complete: capacityComplete },
    // Q52
    {
      applicable: true,
      complete:
        data.rescheduleAuthority !== "" &&
        (!showRescheduleCondition || Boolean(data.rescheduleCondition.trim())),
    },
    // Q53
    {
      applicable: true,
      complete:
        data.cancellationAuthority !== "" &&
        (!showCancellationCondition || Boolean(data.cancellationCondition.trim())),
    },
    // Q54 — mode + fee details
    {
      applicable: true,
      complete:
        data.lateCancellationFeeMode !== "" &&
        feeModeComplete(data.lateCancellationFeeMode, data.lateCancellationFeeId, fees, true),
    },
    // Q55 — mode + fee details
    {
      applicable: true,
      complete:
        data.noShowFeeMode !== "" &&
        feeModeComplete(data.noShowFeeMode, data.noShowFeeId, fees, false),
    },
    // Q56 — optional; always counts as complete
    { applicable: true, complete: true },
    // Q57
    { applicable: true, complete: noAvailabilityPriorityComplete(data.noAvailabilityPriority) },
    // Q58
    { applicable: true, complete: data.mayArrangeCallback !== "" },
    // Q59
    { applicable: showCallbackDetails, complete: showCallbackDetails && Boolean(data.callbackNumberPolicy) },
    // Q60
    { applicable: showCallbackDetails, complete: callbackOwnerComplete },
    // Q61
    {
      applicable: true,
      complete:
        data.hasTechnicianAssignments !== "" &&
        (!showTechnicianAssignments || technicianAssignmentsComplete),
    },
    // Q62
    { applicable: true, complete: data.specificTechnicianRequest !== "" },
    // Q63
    { applicable: true, complete: data.multiIssueMode !== "" },
    // Q64
    { applicable: showSeparateIssues, complete: separateIssuesComplete },
  ];
}

/** Fraction (0–1) of applicable Section 4 questions that are currently complete. */
export function getSection4Progress(
  data: Section4Data,
  contacts: Contact[],
  fees: FeeRecord[],
  section2: Section2Data = createDefaultSection2(),
): number {
  const units = getSection4ProgressUnits(data, contacts, fees, section2).filter((u) => u.applicable);
  if (units.length === 0) return 0;
  const completed = units.filter((u) => u.complete).length;
  return completed / units.length;
}
