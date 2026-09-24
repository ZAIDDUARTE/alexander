import {
  CALLER_TYPES,
  EXCEPTION_TYPES,
  NO_AVAILABILITY_FALLBACK_OPTIONS,
  CAPACITY_POLICY_ROWS,
} from "../section4Catalog";
import { getSchedulingEligibleServiceIds } from "../schedulingServices";
import {
  approverContactIsValid,
  validateApproverContact,
} from "./section3";
import type {
  AppointmentWindow,
  CallerPermission,
  Contact,
  FeeRecord,
  Section2Data,
  Section4Data,
} from "../types";
import { contactHasIdentity, createDefaultSection2 } from "../types";

export type FieldErrors = Partial<Record<string, string>>;

const POSITIVE_MONEY_REGEX = /^\d+(\.\d{1,2})?$/;

const CALLER_TYPE_IDS = new Set(CALLER_TYPES.map((c) => c.id));
const FALLBACK_IDS = NO_AVAILABILITY_FALLBACK_OPTIONS.map((o) => o.id);
const VALID_EXCEPTION_AUTHORITIES = new Set([
  "alexander",
  "dispatcher",
  "manager",
  "owner",
  "another_person",
  "never_allowed",
]);

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

function validateCallerPermissionRow(
  callerTypeId: string,
  permissions: CallerPermission[],
  errors: FieldErrors,
): void {
  if (permissions.length === 0) {
    errors[`callerPermissions.${callerTypeId}`] = "Select at least one permission for this caller type.";
    return;
  }
  const hasNotAllowed = permissions.includes("not_allowed");
  if (hasNotAllowed && permissions.length > 1) {
    errors[`callerPermissions.${callerTypeId}`] =
      "Not allowed cannot be combined with other permissions.";
  }
}

function validateFeeForMode(
  mode: Section4Data["lateCancellationFeeMode"],
  feeId: string,
  fees: FeeRecord[],
  errors: FieldErrors,
  fieldPrefix: string,
  requireNotice: boolean,
): void {
  if (mode !== "yes" && mode !== "conditional") return;

  if (!feeId.trim()) {
    errors[`${fieldPrefix}Fee`] = "Enter the fee details.";
    return;
  }

  const fee = fees.find((f) => f.id === feeId);
  if (!fee || !fee.active) {
    errors[`${fieldPrefix}Fee`] = "Enter the fee details.";
    return;
  }

  if (!isPositiveMoney(fee.amountFixed)) {
    errors[`${fieldPrefix}Fee.amountFixed`] = "Enter a valid amount greater than zero.";
  }

  if (requireNotice && !fee.noticeRequired.trim()) {
    errors[`${fieldPrefix}Fee.noticeRequired`] = "Enter the notice required before cancellation.";
  }

  if (mode === "conditional" && !fee.applicationRule.trim()) {
    errors[`${fieldPrefix}Fee.applicationRule`] = "Describe when this fee applies.";
  }
}

/**
 * Section 4 ("Scheduling") validation (Q39–Q64).
 *
 * Hidden / inapplicable branches are not validated (spending limits when
 * Q44 = No, Q45 special rules unless special_rules, Q47 days when No
 * maximum, fee cards when mode = No, Q59/Q60 when Q58 = No, etc.).
 */
export function validateSection4(
  data: Section4Data,
  contacts: Contact[],
  fees: FeeRecord[],
  section2: Section2Data = createDefaultSection2(),
): FieldErrors {
  const errors: FieldErrors = {};
  const eligibleServiceIds = getSchedulingEligibleServiceIds(section2);

  if (!data.humanRequestPolicy) {
    errors.humanRequestPolicy = "Select an option.";
  }
  // Q39 custom rule: MD says "show custom rule" only — NOT "required"
  // (contrast Q42 which explicitly says "required custom rule"). Blank
  // custom text must not block completion; normalize maps whitespace → null.

  if (!data.aiRefusalPolicy) {
    errors.aiRefusalPolicy = "Select an option.";
  }
  // Q40 custom rule: same as Q39 — visible when custom, optional per MD.
  // Do NOT tighten to match Q42.

  let missingExceptionAuthority = false;
  for (const row of EXCEPTION_TYPES) {
    const authority = data.exceptionAuthority[row.id] ?? "";
    if (!authority) {
      missingExceptionAuthority = true;
      continue;
    }
    if (!VALID_EXCEPTION_AUTHORITIES.has(authority)) {
      missingExceptionAuthority = true;
      continue;
    }
    if (authority === "another_person") {
      const contactId = data.exceptionApproverContactIds[row.id] ?? "";
      if (!contactId.trim()) {
        errors[`exceptionApprover.${row.id}`] = "Select or add an approver for this exception type.";
        continue;
      }
      const approver = contacts.find((c) => c.id === contactId);
      if (!approver || !contactHasIdentity(approver)) {
        errors[`exceptionApprover.${row.id}`] = "Select a valid approver.";
        continue;
      }
      const approverErrors = validateApproverContact(approver);
      for (const [key, msg] of Object.entries(approverErrors)) {
        if (msg && typeof msg === "string") {
          errors[`exceptionApprover.${row.id}.${key}`] = msg;
        }
      }
    }
  }
  if (missingExceptionAuthority) {
    errors.exceptionAuthority = "Select who may approve each exception type.";
  }

  if (!data.approverUnavailablePolicy) {
    errors.approverUnavailablePolicy = "Select an option.";
  } else if (
    data.approverUnavailablePolicy === "other" &&
    !data.approverUnavailableCustomRule.trim()
  ) {
    // Q42 explicitly: "Other -> show required custom rule."
    errors.approverUnavailableCustomRule = "Describe what Alexander should do.";
  }

  let missingCallerPermissions = false;
  for (const row of CALLER_TYPES) {
    const permissions = data.callerPermissions[row.id] ?? [];
    if (permissions.length === 0) missingCallerPermissions = true;
    validateCallerPermissionRow(row.id, permissions, errors);
  }
  if (missingCallerPermissions && !errors.callerPermissions) {
    errors.callerPermissions = "Select permissions for every caller type.";
  }

  if (!data.hasSpendingLimits) {
    errors.hasSpendingLimits = "Select yes or no.";
  } else if (data.hasSpendingLimits === "yes") {
    if (data.spendingLimits.length === 0) {
      errors.spendingLimits = "Add at least one spending limit.";
    }
    for (const row of data.spendingLimits) {
      if (!row.callerTypeId || !CALLER_TYPE_IDS.has(row.callerTypeId)) {
        errors[`spendingLimits.${row.id}.callerTypeId`] = "Select a caller type.";
      }
      if (!isPositiveMoney(row.maxAmount)) {
        errors[`spendingLimits.${row.id}.maxAmount`] =
          "Enter a valid maximum amount greater than zero.";
      }
    }
  }

  if (!data.emergencyAuthMode) {
    errors.emergencyAuthMode = "Select an option.";
  } else if (
    data.emergencyAuthMode === "special_rules" &&
    !data.emergencyAuthSpecialRules.trim()
  ) {
    errors.emergencyAuthSpecialRules = "Describe how emergency authorization differs.";
  }

  if (!data.defaultBookingMode) {
    errors.defaultBookingMode = "Select an option.";
  }

  const noMax = data.bookingHorizonNoMaximum;
  const days = data.bookingHorizonDays.trim();
  if (noMax && days) {
    errors.bookingHorizonDays = "Clear the day limit or turn off No maximum.";
  } else if (!noMax && !days) {
    errors.bookingHorizonDays = "Enter how many days ahead Alexander may book, or select No maximum.";
  } else if (!noMax && days && !isPositiveWholeNumber(days)) {
    errors.bookingHorizonDays = "Enter a positive whole number of days.";
  }

  const enabledWindows = data.appointmentWindows.filter((w) => w.enabled);
  if (enabledWindows.length === 0) {
    errors.appointmentWindows = "Enable at least one appointment window.";
  } else {
    let windowConfigInvalid = false;
    for (const window of enabledWindows) {
      if (!window.start || !window.end) {
        errors[`appointmentWindows.${window.id}.times`] =
          "Start and end times are required for enabled windows.";
        windowConfigInvalid = true;
      } else if (window.start >= window.end) {
        errors[`appointmentWindows.${window.id}.times`] = "End time must be after start time.";
        windowConfigInvalid = true;
      }
    }

    if (!windowConfigInvalid) {
      const intervals: { id: string; interval: { start: string; end: string } }[] = [];
      for (const window of data.appointmentWindows) {
        const interval = windowInterval(window);
        if (interval) intervals.push({ id: window.id, interval });
      }
      for (let i = 0; i < intervals.length; i++) {
        for (let j = i + 1; j < intervals.length; j++) {
          if (intervalsOverlap(intervals[i].interval, intervals[j].interval)) {
            errors[`appointmentWindows.overlap.${intervals[i].id}.${intervals[j].id}`] =
              "This window overlaps another enabled window.";
            errors[`appointmentWindows.overlap.${intervals[j].id}.${intervals[i].id}`] =
              "This window overlaps another enabled window.";
          }
        }
      }
    }
  }

  if (data.confirmationInfo.length === 0) {
    errors.confirmationInfo = "Select at least one type of information Alexander may repeat.";
  }

  if (!data.hasServiceBookingRules) {
    errors.hasServiceBookingRules = "Select yes or no.";
  } else if (data.hasServiceBookingRules === "yes") {
    if (eligibleServiceIds.size === 0) {
      errors.serviceBookingRules =
        "No eligible services are configured in Section 2 yet. Offer services there first, or choose No.";
    } else if (data.serviceBookingRules.length === 0) {
      errors.serviceBookingRules = "Add at least one special booking rule.";
    }
    const seenServiceIds = new Set<string>();
    for (const rule of data.serviceBookingRules) {
      if (!rule.serviceId || !eligibleServiceIds.has(rule.serviceId)) {
        errors[`serviceBookingRules.${rule.id}.serviceId`] =
          "Select a service your company currently offers (or may offer with conditions / team review).";
      } else if (seenServiceIds.has(rule.serviceId)) {
        errors[`serviceBookingRules.${rule.id}.serviceId`] =
          "Each service can only have one booking rule.";
      } else {
        seenServiceIds.add(rule.serviceId);
      }
      if (!rule.rule.trim()) {
        errors[`serviceBookingRules.${rule.id}.rule`] = "Describe the special booking rule.";
      }
    }
  }

  let missingCapacityPolicy = false;
  for (const row of CAPACITY_POLICY_ROWS) {
    const entry = data.capacityPolicies[row.id];
    if (!entry || !entry.policy) {
      missingCapacityPolicy = true;
      continue;
    }
    if (entry.policy === "with_conditions" && !entry.condition.trim()) {
      errors[`capacityPolicies.${row.id}.condition`] = "Describe the conditions for this row.";
    }
  }
  if (missingCapacityPolicy) {
    errors.capacityPolicies = "Select a policy for same-day and holiday service.";
  }

  if (!data.rescheduleAuthority) {
    errors.rescheduleAuthority = "Select an option.";
  } else if (data.rescheduleAuthority === "conditional" && !data.rescheduleCondition.trim()) {
    errors.rescheduleCondition = "Describe when Alexander may reschedule.";
  }

  if (!data.cancellationAuthority) {
    errors.cancellationAuthority = "Select an option.";
  } else if (data.cancellationAuthority === "conditional" && !data.cancellationCondition.trim()) {
    errors.cancellationCondition = "Describe when Alexander may cancel.";
  }

  if (!data.lateCancellationFeeMode) {
    errors.lateCancellationFeeMode = "Select an option.";
  } else {
    validateFeeForMode(
      data.lateCancellationFeeMode,
      data.lateCancellationFeeId,
      fees,
      errors,
      "lateCancellation",
      true,
    );
  }

  if (!data.noShowFeeMode) {
    errors.noShowFeeMode = "Select an option.";
  } else {
    validateFeeForMode(
      data.noShowFeeMode,
      data.noShowFeeId,
      fees,
      errors,
      "noShow",
      false,
    );
  }

  const expectedFallbackSet = new Set(FALLBACK_IDS);
  const priority = data.noAvailabilityPriority;
  const priorityValid =
    priority.length === FALLBACK_IDS.length &&
    priority.every((id) => expectedFallbackSet.has(id)) &&
    new Set(priority).size === priority.length;
  if (!priorityValid) {
    errors.noAvailabilityPriority =
      "Set the priority order for all four fallback options.";
  }

  if (!data.mayArrangeCallback) {
    errors.mayArrangeCallback = "Select yes or no.";
  } else if (data.mayArrangeCallback === "yes") {
    if (!data.callbackNumberPolicy) {
      errors.callbackNumberPolicy = "Select which callback number Alexander should use.";
    }
    if (!data.callbackOwnerContactId.trim()) {
      errors.callbackOwnerContactId = "Select who should handle scheduling callbacks.";
    } else {
      const owner = contacts.find((c) => c.id === data.callbackOwnerContactId);
      if (!owner || !contactHasIdentity(owner)) {
        errors.callbackOwnerContactId = "Select a valid contact.";
      } else if (!approverContactIsValid(owner)) {
        const ownerErrors = validateApproverContact(owner);
        for (const [key, msg] of Object.entries(ownerErrors)) {
          if (msg && typeof msg === "string") {
            errors[`callbackOwnerContact.${key}`] = msg;
          }
        }
      }
    }
  }

  if (!data.hasTechnicianAssignments) {
    errors.hasTechnicianAssignments = "Select yes or no.";
  } else if (data.hasTechnicianAssignments === "yes") {
    if (data.technicianAssignments.length === 0) {
      errors.technicianAssignments = "Add at least one job that requires a particular technician.";
    }
    for (const row of data.technicianAssignments) {
      const hasService = Boolean(row.serviceId.trim());
      const hasOther = Boolean(row.otherJobName.trim());
      if (hasService && hasOther) {
        errors[`technicianAssignments.${row.id}.job`] =
          "Select either a service from the list or describe another job — not both.";
      } else if (!hasService && !hasOther) {
        errors[`technicianAssignments.${row.id}.job`] = "Select a service or describe the job.";
      } else if (hasService && !eligibleServiceIds.has(row.serviceId)) {
        errors[`technicianAssignments.${row.id}.serviceId`] =
          "Select a service your company currently offers, or choose Other job.";
      }

      const contact = row.technicianContactId
        ? contacts.find((c) => c.id === row.technicianContactId)
        : undefined;
      const hasContact = Boolean(contact && contactHasIdentity(contact));
      const hasName = Boolean(row.technicianName.trim());
      if (!hasContact && !hasName) {
        errors[`technicianAssignments.${row.id}.technician`] =
          "Select a technician contact or enter a technician name.";
      }
    }
  }

  if (!data.specificTechnicianRequest) {
    errors.specificTechnicianRequest = "Select an option.";
  }

  if (!data.multiIssueMode) {
    errors.multiIssueMode = "Select an option.";
  } else if (data.multiIssueMode === "separate_issues") {
    const hasService = data.separateIssueServiceIds.some((id) => eligibleServiceIds.has(id));
    const hasOtherDetail =
      data.separateIssueOther && Boolean(data.separateIssueOtherDetail.trim());
    if (!hasService && !hasOtherDetail) {
      errors.separateIssueSelection =
        eligibleServiceIds.size === 0
          ? "Describe other work that needs its own appointment, or configure offered services in Section 2."
          : "Select at least one issue type or describe other work that needs its own appointment.";
    }
    if (data.separateIssueOther && !data.separateIssueOtherDetail.trim()) {
      errors.separateIssueOtherDetail = "Describe the other issue that needs its own appointment.";
    }
  }

  return errors;
}

export function section4IsValid(
  data: Section4Data,
  contacts: Contact[],
  fees: FeeRecord[],
  section2: Section2Data = createDefaultSection2(),
): boolean {
  return Object.keys(validateSection4(data, contacts, fees, section2)).length === 0;
}

export const HUMAN_REQUEST_OPTIONS = [
  { value: "connect_right_away" as const, label: "Try to connect them to someone right away" },
  {
    value: "ask_briefly_then_connect" as const,
    label: "Ask briefly what they need, then connect them to the right person",
  },
  { value: "callback" as const, label: "Take their information and arrange a callback" },
  { value: "custom" as const, label: "Follow another rule" },
];

export const AI_REFUSAL_OPTIONS = [
  { value: "connect_to_person" as const, label: "Try to connect them to a person" },
  { value: "callback" as const, label: "Take their information and arrange a callback" },
  { value: "custom" as const, label: "Follow another rule" },
];

export const EXCEPTION_AUTHORITY_OPTIONS = [
  { value: "alexander" as const, label: "Alexander" },
  { value: "dispatcher" as const, label: "Dispatcher" },
  { value: "manager" as const, label: "Manager" },
  { value: "owner" as const, label: "Owner" },
  { value: "another_person" as const, label: "Another person / role" },
  { value: "never_allowed" as const, label: "Never allowed" },
];

export const APPROVER_UNAVAILABLE_OPTIONS = [
  { value: "callback" as const, label: "Take the request and arrange a callback" },
  { value: "follow_normal_rule" as const, label: "Follow the normal rule without making an exception" },
  { value: "other" as const, label: "Other" },
];

export const CALLER_PERMISSION_OPTIONS = [
  { value: "schedule_service" as const, label: "Request / schedule service" },
  { value: "approve_diagnostic_fee" as const, label: "Approve diagnostic fee" },
  { value: "authorize_repair" as const, label: "Authorize repair" },
  { value: "agree_to_pay" as const, label: "Agree to pay" },
  { value: "human_approval_required" as const, label: "Human approval required" },
  { value: "not_allowed" as const, label: "Not allowed" },
];

export const EMERGENCY_AUTH_OPTIONS = [
  { value: "same_rules" as const, label: "Yes — use the same rules" },
  { value: "special_rules" as const, label: "No — emergencies have special rules" },
  {
    value: "human_review_always" as const,
    label: "Human review is always required for emergency authorization",
  },
];

export const DEFAULT_BOOKING_OPTIONS = [
  { value: "confirm_immediately" as const, label: "Confirm an available appointment immediately" },
  {
    value: "submit_for_approval" as const,
    label: "Submit the requested appointment for team approval",
  },
  {
    value: "arrange_callback" as const,
    label: "Arrange a callback so our team can schedule it",
  },
];

export const CAPACITY_OFFER_OPTIONS = [
  { value: "allowed" as const, label: "Allowed" },
  { value: "with_conditions" as const, label: "Allowed with conditions" },
  { value: "human_approval" as const, label: "Human approval required" },
  { value: "not_offered" as const, label: "Not offered" },
];

export const CHANGE_AUTHORITY_OPTIONS = [
  { value: "direct" as const, label: "Reschedule or cancel directly" },
  { value: "conditional" as const, label: "Only under certain conditions" },
  { value: "human_approval" as const, label: "Submit the request for human approval" },
  { value: "callback" as const, label: "Arrange a callback" },
];

export const FEE_CHARGE_OPTIONS = [
  { value: "yes" as const, label: "Yes" },
  { value: "conditional" as const, label: "Only under certain conditions" },
  { value: "no" as const, label: "No" },
];

export const CALLBACK_NUMBER_OPTIONS = [
  { value: "calling_from" as const, label: "The number the customer is calling from" },
  { value: "ask_preferred" as const, label: "Ask the customer for their preferred callback number" },
];

export const SPECIFIC_TECH_OPTIONS = [
  { value: "book_if_confirmed_available" as const, label: "Book that technician if confirmed available" },
  {
    value: "try_honor_may_reassign" as const,
    label: "Try to honor the request, but another technician may be assigned",
  },
  { value: "submit_for_review" as const, label: "Submit the request for team review" },
  { value: "do_not_accept" as const, label: "We do not accept specific-technician requests" },
];

export const MULTI_ISSUE_OPTIONS = [
  { value: "one_appointment" as const, label: "Put all eligible issues into one appointment" },
  {
    value: "separate_issues" as const,
    label: "Certain issues must be scheduled separately",
  },
  { value: "ask_team" as const, label: "Ask our team to decide" },
];

export const YES_NO_OPTIONS = [
  { value: "yes" as const, label: "Yes" },
  { value: "no" as const, label: "No" },
];
