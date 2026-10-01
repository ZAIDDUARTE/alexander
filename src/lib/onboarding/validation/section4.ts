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
  CallerAuthority,
  Contact,
  FeeRecord,
  Section2Data,
  Section4Data,
} from "../types";
import { contactHasIdentity, createDefaultSection2 } from "../types";
import { isPositiveMoney } from "../money";
import { isCurrentBookingMode } from "../stage2Migration";
import { isCurrentCallerAuthority } from "../stage3Migration";

export type FieldErrors = Partial<Record<string, string>>;

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

function validateCallerAuthorityRow(
  callerTypeId: string,
  authority: CallerAuthority | "",
  errors: FieldErrors,
): void {
  if (!isCurrentCallerAuthority(authority)) {
    errors[`callerPermissions.${callerTypeId}`] = "Select one authority level for this caller.";
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

  let missingCallerAuthority = false;
  for (const row of CALLER_TYPES) {
    const authority = data.callerPermissions[row.id] ?? "";
    if (!isCurrentCallerAuthority(authority)) missingCallerAuthority = true;
    validateCallerAuthorityRow(row.id, authority, errors);
  }
  if (missingCallerAuthority && !errors.callerPermissions) {
    errors.callerPermissions = "Select one authority level for every caller.";
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

  if (!isCurrentBookingMode(data.defaultBookingMode)) {
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
      const intervals: { id: string; label: string; interval: { start: string; end: string } }[] = [];
      for (const window of data.appointmentWindows) {
        const interval = windowInterval(window);
        if (interval) {
          intervals.push({
            id: window.id,
            label: window.label.trim() || "This window",
            interval,
          });
        }
      }
      const partners = new Map<string, string[]>();
      for (let i = 0; i < intervals.length; i++) {
        for (let j = i + 1; j < intervals.length; j++) {
          if (!intervalsOverlap(intervals[i].interval, intervals[j].interval)) continue;
          const left = partners.get(intervals[i].id) ?? [];
          left.push(intervals[j].label);
          partners.set(intervals[i].id, left);
          const right = partners.get(intervals[j].id) ?? [];
          right.push(intervals[i].label);
          partners.set(intervals[j].id, right);
        }
      }
      for (const interval of intervals) {
        const others = partners.get(interval.id);
        if (!others?.length) continue;
        errors[`appointmentWindows.${interval.id}.overlap`] =
          `${interval.label} overlaps ${others.join(" and ")}.`;
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
  { value: "another_person" as const, label: "Another person/role" },
  { value: "never_allowed" as const, label: "Never allowed" },
];

export const APPROVER_UNAVAILABLE_OPTIONS = [
  { value: "callback" as const, label: "Take the request and arrange a callback" },
  { value: "follow_normal_rule" as const, label: "Follow the normal rule without making an exception" },
  { value: "other" as const, label: "Other" },
];


export const EMERGENCY_AUTH_OPTIONS = [
  { value: "same_rules" as const, label: "Yes — use the same rules" },
  { value: "special_rules" as const, label: "No — emergencies have special rules" },
  {
    value: "human_review_always" as const,
    label: "Human review is always required when the work is classified as an emergency",
  },
];

export const DEFAULT_BOOKING_OPTIONS: {
  value: "book_appointment" | "send_to_team";
  label: string;
  description: string;
}[] = [
  {
    value: "book_appointment",
    label: "Book an available appointment",
    description:
      "Alexander can confirm an available appointment that follows your scheduling rules.",
  },
  {
    value: "send_to_team",
    label: "Send the request to our team",
    description:
      "Alexander collects the customer's details and sends the request to your team for scheduling.",
  },
];

export const CAPACITY_OFFER_OPTIONS = [
  { value: "allowed" as const, label: "Allowed" },
  { value: "with_conditions" as const, label: "Allowed with conditions" },
  { value: "human_approval" as const, label: "Human approval required" },
  { value: "not_offered" as const, label: "Not offered" },
];

export const RESCHEDULE_AUTHORITY_OPTIONS = [
  { value: "direct" as const, label: "Reschedule the appointment directly" },
  { value: "conditional" as const, label: "Reschedule only under certain conditions" },
  { value: "human_approval" as const, label: "Submit the request for human approval" },
  { value: "callback" as const, label: "Arrange a callback" },
];

export const CANCELLATION_AUTHORITY_OPTIONS = [
  { value: "direct" as const, label: "Cancel the appointment directly" },
  { value: "conditional" as const, label: "Cancel only under certain conditions" },
  { value: "human_approval" as const, label: "Submit the request for human approval" },
  { value: "callback" as const, label: "Arrange a callback" },
];

/** @deprecated Use RESCHEDULE_AUTHORITY_OPTIONS or CANCELLATION_AUTHORITY_OPTIONS. */
export const CHANGE_AUTHORITY_OPTIONS = RESCHEDULE_AUTHORITY_OPTIONS;

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
  { value: "do_not_accept" as const, label: "We don’t accept specific-technician requests" },
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
