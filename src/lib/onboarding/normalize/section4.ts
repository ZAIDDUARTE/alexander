import {
  CALLER_TYPES,
  CAPACITY_POLICY_ROWS,
  EXCEPTION_TYPES,
  NO_AVAILABILITY_FALLBACK_OPTIONS,
} from "../section4Catalog";
import { getSchedulingEligibleServices } from "../schedulingServices";
import { normalizeContact, type NormalizedContact } from "./section3";
import type { TimeValue } from "../schedule";
import type {
  AppointmentWindow,
  CallerPermission,
  CapacityOfferPolicy,
  ChangeAuthority,
  Contact,
  DefaultBookingMode,
  EmergencyAuthMode,
  ExceptionAuthority,
  FeeChargeMode,
  FeeRecord,
  HumanRequestPolicy,
  AiRefusalPolicy,
  ApproverUnavailablePolicy,
  CallbackNumberPolicy,
  ConfirmationInfoId,
  MultiIssueMode,
  NoAvailabilityFallbackId,
  Section2Data,
  Section4Data,
  SpecificTechnicianRequest,
  SpendingLimitRow,
  YesNo,
} from "../types";
import { contactHasIdentity, createDefaultSection2 } from "../types";

export type NormalizedSection4Fee = {
  id: string;
  name: string;
  amountFixed: string;
  noticeRequired?: string;
  applicationRule: string;
};

export type NormalizedExceptionAuthorityRow = {
  id: string;
  label: string;
  authority: ExceptionAuthority;
  /** Only when authority === another_person and the contact has identity. */
  approverContactId: string | null;
};

export type NormalizedCallerPermissionsRow = {
  id: string;
  label: string;
  permissions: CallerPermission[];
};

export type NormalizedCapacityPolicyRow = {
  id: string;
  label: string;
  policy: CapacityOfferPolicy;
  condition: string | null;
};

export type NormalizedAppointmentWindow = {
  id: string;
  label: string;
  start: TimeValue;
  end: TimeValue;
};

export type NormalizedServiceBookingRule = {
  serviceId: string;
  serviceName: string;
  rule: string;
};

export type NormalizedTechnicianAssignment = {
  serviceId: string | null;
  serviceName: string | null;
  otherJobName: string | null;
  technicianContactId: string | null;
  technicianName: string | null;
};

export type NormalizedSection4 = {
  humanRequest: {
    policy: HumanRequestPolicy | null;
    customRule: string | null;
  };
  aiRefusal: {
    policy: AiRefusalPolicy | null;
    customRule: string | null;
  };
  exceptionAuthority: NormalizedExceptionAuthorityRow[];
  approverUnavailable: {
    policy: ApproverUnavailablePolicy | null;
    customRule: string | null;
  };
  callerPermissions: NormalizedCallerPermissionsRow[];
  spendingLimits: SpendingLimitRow[] | null;
  emergencyAuth: {
    mode: EmergencyAuthMode | null;
    specialRules: string | null;
  };
  defaultBookingMode: DefaultBookingMode | null;
  bookingHorizon: {
    noMaximum: boolean;
    days: number | null;
  };
  appointmentWindows: NormalizedAppointmentWindow[];
  confirmationInfo: ConfirmationInfoId[];
  serviceBookingRules: NormalizedServiceBookingRule[] | null;
  capacityPolicies: NormalizedCapacityPolicyRow[];
  reschedule: {
    authority: ChangeAuthority | null;
    condition: string | null;
  };
  cancellation: {
    authority: ChangeAuthority | null;
    condition: string | null;
  };
  lateCancellationFee: NormalizedSection4Fee | null;
  noShowFee: NormalizedSection4Fee | null;
  cancellationExceptions: string | null;
  noAvailabilityPriority: NoAvailabilityFallbackId[];
  callback: {
    mayArrange: YesNo | null;
    numberPolicy: CallbackNumberPolicy | null;
    ownerContactId: string | null;
  };
  technicianAssignments: NormalizedTechnicianAssignment[] | null;
  specificTechnicianRequest: SpecificTechnicianRequest | null;
  multiIssue: {
    mode: MultiIssueMode | null;
    separateServiceIds: string[];
    separateOtherDetail: string | null;
  };
  /** Meaningful contacts only — empty placeholders are excluded. */
  contacts: NormalizedContact[];
};

const FALLBACK_ID_SET = new Set(NO_AVAILABILITY_FALLBACK_OPTIONS.map((o) => o.id));

function eligibleLabelMap(section2: Section2Data): Map<string, string> {
  return new Map(getSchedulingEligibleServices(section2).map((s) => [s.id, s.label]));
}

function normalizeRegistryFee(
  feeId: string,
  fees: FeeRecord[],
  includeNotice: boolean,
): NormalizedSection4Fee | null {
  if (!feeId.trim()) return null;
  const fee = fees.find((f) => f.id === feeId);
  if (!fee || !fee.active) return null;
  const out: NormalizedSection4Fee = {
    id: fee.id,
    name: fee.name,
    amountFixed: fee.amountFixed.trim(),
    applicationRule: fee.applicationRule.trim(),
  };
  if (includeNotice && fee.noticeRequired.trim()) {
    out.noticeRequired = fee.noticeRequired.trim();
  }
  return out;
}

function normalizeFeeForMode(
  mode: FeeChargeMode | "",
  feeId: string,
  fees: FeeRecord[],
  includeNotice: boolean,
): NormalizedSection4Fee | null {
  if (mode !== "yes" && mode !== "conditional") return null;
  return normalizeRegistryFee(feeId, fees, includeNotice);
}

function normalizeAppointmentWindows(windows: AppointmentWindow[]): NormalizedAppointmentWindow[] {
  const out: NormalizedAppointmentWindow[] = [];
  for (const window of windows) {
    if (!window.enabled) continue;
    if (!window.start || !window.end) continue;
    if (window.start >= window.end) continue;
    out.push({
      id: window.id,
      label: window.label.trim() || window.id,
      start: window.start,
      end: window.end,
    });
  }
  return out;
}

function normalizeSpendingLimits(data: Section4Data): SpendingLimitRow[] | null {
  if (data.hasSpendingLimits !== "yes") return null;
  return data.spendingLimits
    .filter((row) => row.callerTypeId.trim() && row.maxAmount.trim())
    .map((row) => ({
      id: row.id,
      callerTypeId: row.callerTypeId,
      maxAmount: row.maxAmount.trim(),
    }));
}

function normalizeServiceBookingRules(
  data: Section4Data,
  eligibleLabels: Map<string, string>,
): NormalizedServiceBookingRule[] | null {
  if (data.hasServiceBookingRules !== "yes") return null;
  const out: NormalizedServiceBookingRule[] = [];
  for (const rule of data.serviceBookingRules) {
    if (!rule.serviceId || !rule.rule.trim()) continue;
    // Drop stale refs to services that are now not_offered / unanswered —
    // do not convert them to Other.
    const name = eligibleLabels.get(rule.serviceId);
    if (!name) continue;
    out.push({
      serviceId: rule.serviceId,
      serviceName: name,
      rule: rule.rule.trim(),
    });
  }
  return out.length > 0 ? out : [];
}

function normalizeTechnicianAssignments(
  data: Section4Data,
  contacts: Contact[],
  eligibleLabels: Map<string, string>,
): NormalizedTechnicianAssignment[] | null {
  if (data.hasTechnicianAssignments !== "yes") return null;
  const out: NormalizedTechnicianAssignment[] = [];
  for (const row of data.technicianAssignments) {
    const hasService = Boolean(row.serviceId.trim());
    const hasOther = Boolean(row.otherJobName.trim());
    if (hasService && hasOther) continue;
    if (!hasService && !hasOther) continue;
    // Registered service must still be scheduling-eligible.
    if (hasService && !eligibleLabels.has(row.serviceId)) continue;

    const contact = row.technicianContactId
      ? contacts.find((c) => c.id === row.technicianContactId)
      : undefined;
    const hasContact = Boolean(contact && contactHasIdentity(contact));
    const hasName = Boolean(row.technicianName.trim());
    if (!hasContact && !hasName) continue;

    out.push({
      serviceId: hasService ? row.serviceId : null,
      serviceName: hasService ? (eligibleLabels.get(row.serviceId) ?? null) : null,
      otherJobName: hasOther ? row.otherJobName.trim() : null,
      technicianContactId: hasContact ? contact!.id : null,
      technicianName: hasName ? row.technicianName.trim() : null,
    });
  }
  return out;
}

function normalizeNoAvailabilityPriority(
  priority: NoAvailabilityFallbackId[],
): NoAvailabilityFallbackId[] {
  if (priority.length !== NO_AVAILABILITY_FALLBACK_OPTIONS.length) return [];
  const seen = new Set<string>();
  const out: NoAvailabilityFallbackId[] = [];
  for (const id of priority) {
    if (!FALLBACK_ID_SET.has(id) || seen.has(id)) return [];
    seen.add(id);
    out.push(id);
  }
  return out;
}

/**
 * Section 4 ("Scheduling") normalization — Company Truth boundary for
 * Q39–Q64. Drops stale conditional text, inactive fee registry rows,
 * hidden spending limits, and empty contact shells.
 */
export function normalizeSection4(
  data: Section4Data,
  contacts: Contact[],
  fees: FeeRecord[],
  section2: Section2Data = createDefaultSection2(),
): NormalizedSection4 {
  const eligibleLabels = eligibleLabelMap(section2);
  const meaningfulContacts = contacts
    .map(normalizeContact)
    .filter((c): c is NormalizedContact => c !== null);

  const exceptionAuthority: NormalizedExceptionAuthorityRow[] = [];
  for (const row of EXCEPTION_TYPES) {
    const authority = data.exceptionAuthority[row.id];
    if (!authority) continue;
    let approverContactId: string | null = null;
    if (authority === "another_person") {
      const rawId = data.exceptionApproverContactIds[row.id] ?? "";
      const raw = contacts.find((c) => c.id === rawId);
      if (raw && contactHasIdentity(raw)) approverContactId = raw.id;
    }
    exceptionAuthority.push({
      id: row.id,
      label: row.label,
      authority,
      approverContactId,
    });
  }

  const callerPermissions: NormalizedCallerPermissionsRow[] = [];
  for (const row of CALLER_TYPES) {
    const permissions = data.callerPermissions[row.id] ?? [];
    if (permissions.length === 0) continue;
    callerPermissions.push({ id: row.id, label: row.label, permissions: [...permissions] });
  }

  const capacityPolicies: NormalizedCapacityPolicyRow[] = [];
  for (const row of CAPACITY_POLICY_ROWS) {
    const entry = data.capacityPolicies[row.id];
    if (!entry?.policy) continue;
    capacityPolicies.push({
      id: row.id,
      label: row.label,
      policy: entry.policy,
      condition: entry.policy === "with_conditions" ? entry.condition.trim() || null : null,
    });
  }

  const callbackActive = data.mayArrangeCallback === "yes";
  let callbackOwnerContactId: string | null = null;
  if (callbackActive && data.callbackOwnerContactId.trim()) {
    const owner = contacts.find((c) => c.id === data.callbackOwnerContactId);
    if (owner && contactHasIdentity(owner)) callbackOwnerContactId = owner.id;
  }

  const separateIssues = data.multiIssueMode === "separate_issues";
  const separateServiceIds = separateIssues
    ? data.separateIssueServiceIds.filter((id) => eligibleLabels.has(id))
    : [];

  const daysRaw = data.bookingHorizonDays.trim();
  const bookingDays =
    !data.bookingHorizonNoMaximum && daysRaw && /^\d+$/.test(daysRaw)
      ? parseInt(daysRaw, 10)
      : null;

  return {
    humanRequest: {
      policy: data.humanRequestPolicy || null,
      customRule:
        data.humanRequestPolicy === "custom" ? data.humanRequestCustomRule.trim() || null : null,
    },
    aiRefusal: {
      policy: data.aiRefusalPolicy || null,
      customRule:
        data.aiRefusalPolicy === "custom" ? data.aiRefusalCustomRule.trim() || null : null,
    },
    exceptionAuthority,
    approverUnavailable: {
      policy: data.approverUnavailablePolicy || null,
      customRule:
        data.approverUnavailablePolicy === "other"
          ? data.approverUnavailableCustomRule.trim() || null
          : null,
    },
    callerPermissions,
    spendingLimits: normalizeSpendingLimits(data),
    emergencyAuth: {
      mode: data.emergencyAuthMode || null,
      specialRules:
        data.emergencyAuthMode === "special_rules"
          ? data.emergencyAuthSpecialRules.trim() || null
          : null,
    },
    defaultBookingMode: data.defaultBookingMode || null,
    bookingHorizon: {
      noMaximum: data.bookingHorizonNoMaximum,
      days: data.bookingHorizonNoMaximum ? null : bookingDays,
    },
    appointmentWindows: normalizeAppointmentWindows(data.appointmentWindows),
    confirmationInfo: [...data.confirmationInfo],
    serviceBookingRules: normalizeServiceBookingRules(data, eligibleLabels),
    capacityPolicies,
    reschedule: {
      authority: data.rescheduleAuthority || null,
      condition:
        data.rescheduleAuthority === "conditional" ? data.rescheduleCondition.trim() || null : null,
    },
    cancellation: {
      authority: data.cancellationAuthority || null,
      condition:
        data.cancellationAuthority === "conditional"
          ? data.cancellationCondition.trim() || null
          : null,
    },
    lateCancellationFee: normalizeFeeForMode(
      data.lateCancellationFeeMode,
      data.lateCancellationFeeId,
      fees,
      true,
    ),
    noShowFee: normalizeFeeForMode(data.noShowFeeMode, data.noShowFeeId, fees, false),
    cancellationExceptions: data.cancellationExceptions.trim() || null,
    noAvailabilityPriority: normalizeNoAvailabilityPriority(data.noAvailabilityPriority),
    callback: {
      mayArrange: data.mayArrangeCallback || null,
      numberPolicy: callbackActive ? data.callbackNumberPolicy || null : null,
      ownerContactId: callbackActive ? callbackOwnerContactId : null,
    },
    technicianAssignments: normalizeTechnicianAssignments(data, contacts, eligibleLabels),
    specificTechnicianRequest: data.specificTechnicianRequest || null,
    multiIssue: {
      mode: data.multiIssueMode || null,
      separateServiceIds,
      separateOtherDetail:
        separateIssues && data.separateIssueOther
          ? data.separateIssueOtherDetail.trim() || null
          : null,
    },
    contacts: meaningfulContacts,
  };
}
