import {
  CALLER_TYPES,
  CAPACITY_POLICY_ROWS,
  EXCEPTION_TYPES,
  NO_AVAILABILITY_FALLBACK_OPTIONS,
} from "./section4Catalog";
import { JOB_SERVICES } from "./section2Catalog";
import {
  createDefaultSection2,
  createDefaultSection4,
  createEmptyContact,
  createEmptyFee,
  createSpendingLimitId,
  createServiceRuleId,
  createTechnicianAssignmentId,
  type Contact,
  type FeeRecord,
  type Section2Data,
  type Section4Data,
} from "./types";

export function validApproverContact(overrides: Partial<Contact> = {}): Contact {
  return {
    ...createEmptyContact(),
    nameOrRole: "Scheduling Callback Owner",
    phone: "+14155552671",
    ...overrides,
  };
}

export const FIRST_JOB_SERVICE_ID = JOB_SERVICES[0].id;

/**
 * Section 2 with configurable job policies for Scheduling-eligible filtering.
 * Default: first catalog job is "offered" so Q50/Q61/Q64 service refs validate.
 */
export function section2WithEligibleServices(
  policies: Partial<
    Record<string, "offered" | "with_conditions" | "ask_team" | "not_offered" | "">
  > = {
    [FIRST_JOB_SERVICE_ID]: "offered",
  },
): Section2Data {
  const s2 = createDefaultSection2();
  for (const [id, policy] of Object.entries(policies)) {
    if (s2.plumbingServices[id]) {
      s2.plumbingServices[id] = { policy: policy || "", condition: "" };
    } else if (s2.diagnosticServices[id]) {
      s2.diagnosticServices[id] = { policy: policy || "", condition: "" };
    }
  }
  return s2;
}

/** Convenience default for most Section 4 tests that reference FIRST_JOB_SERVICE_ID. */
export const ELIGIBLE_SECTION2 = section2WithEligibleServices();

export function setNonOverlappingAppointmentWindows(data: Section4Data): void {
  const slots: Record<string, { start: string; end: string }> = {
    morning: { start: "08:00", end: "10:00" },
    late_morning: { start: "10:00", end: "12:00" },
    early_afternoon: { start: "12:00", end: "14:00" },
    afternoon: { start: "14:00", end: "16:00" },
    late_afternoon: { start: "16:00", end: "18:00" },
  };
  for (const window of data.appointmentWindows) {
    const slot = slots[window.id];
    if (slot && window.enabled) {
      window.start = slot.start;
      window.end = slot.end;
    }
  }
}

/** Minimum valid Section 4 answers; pass contacts/fees used for Q41/Q54–Q60. */
export function fullyValidSection4(contacts: Contact[], fees: FeeRecord[] = []): Section4Data {
  void fees;
  const data = createDefaultSection4();

  data.humanRequestPolicy = "connect_right_away";
  data.aiRefusalPolicy = "connect_to_person";

  for (const row of EXCEPTION_TYPES) {
    data.exceptionAuthority[row.id] = "alexander";
  }

  data.approverUnavailablePolicy = "callback";

  for (const row of CALLER_TYPES) {
    data.callerPermissions[row.id] = ["schedule_service"];
  }

  data.hasSpendingLimits = "no";
  data.emergencyAuthMode = "same_rules";
  data.defaultBookingMode = "confirm_immediately";
  data.bookingHorizonDays = "30";
  data.bookingHorizonNoMaximum = false;

  data.appointmentWindows = data.appointmentWindows.map((w) =>
    w.id === "morning" ? { ...w, enabled: true } : { ...w, enabled: false },
  );
  setNonOverlappingAppointmentWindows(data);

  data.hasServiceBookingRules = "no";

  for (const row of CAPACITY_POLICY_ROWS) {
    data.capacityPolicies[row.id] = { policy: "allowed", condition: "" };
  }

  data.rescheduleAuthority = "direct";
  data.cancellationAuthority = "direct";

  data.lateCancellationFeeMode = "no";
  data.lateCancellationFeeId = "";
  data.noShowFeeMode = "no";
  data.noShowFeeId = "";

  data.noAvailabilityPriority = NO_AVAILABILITY_FALLBACK_OPTIONS.map(
    (o) => o.id,
  ) as Section4Data["noAvailabilityPriority"];

  data.mayArrangeCallback = "yes";
  data.callbackNumberPolicy = "calling_from";
  data.callbackOwnerContactId = contacts[0]?.id ?? "";

  data.hasTechnicianAssignments = "no";
  data.specificTechnicianRequest = "book_if_confirmed_available";
  data.multiIssueMode = "one_appointment";

  return data;
}

export function validLateCancellationFee(overrides: Partial<FeeRecord> = {}): FeeRecord {
  return {
    ...createEmptyFee("late_cancellation", "Late cancellation fee"),
    amountFixed: "75.00",
    noticeRequired: "24 hours",
    active: true,
    ...overrides,
  };
}

export function validNoShowFee(overrides: Partial<FeeRecord> = {}): FeeRecord {
  return {
    ...createEmptyFee("no_show", "No-show fee"),
    amountFixed: "50",
    active: true,
    ...overrides,
  };
}

export function withLateCancellationFee(
  data: Section4Data,
  fee: FeeRecord,
  mode: "yes" | "conditional" = "yes",
): void {
  data.lateCancellationFeeMode = mode;
  data.lateCancellationFeeId = fee.id;
  if (mode === "conditional") {
    fee.applicationRule = "Within 24 hours of appointment.";
  }
}

export function withNoShowFee(
  data: Section4Data,
  fee: FeeRecord,
  mode: "yes" | "conditional" = "yes",
): void {
  data.noShowFeeMode = mode;
  data.noShowFeeId = fee.id;
  if (mode === "conditional") {
    fee.applicationRule = "Customer not home at arrival.";
  }
}

export function spendingLimitRow(callerTypeId: string, maxAmount: string) {
  return { id: createSpendingLimitId(), callerTypeId, maxAmount };
}

export function serviceBookingRule(serviceId: string, rule: string) {
  return { id: createServiceRuleId(), serviceId, rule };
}

export function technicianAssignmentRow(
  partial: Partial<{
    serviceId: string;
    otherJobName: string;
    technicianContactId: string;
    technicianName: string;
  }> = {},
) {
  return {
    id: createTechnicianAssignmentId(),
    serviceId: partial.serviceId ?? "",
    otherJobName: partial.otherJobName ?? "",
    technicianSource: "" as const,
    technicianContactId: partial.technicianContactId ?? "",
    technicianName: partial.technicianName ?? "",
  };
}

/**
 * Mirrors OnboardingContext.upsertFeeByKey for AE fee-ID stability tests.
 */
export function upsertFeeByKey(
  fees: FeeRecord[],
  feeKey: "late_cancellation" | "no_show",
  patch: Partial<FeeRecord>,
): { fees: FeeRecord[]; id: string } {
  const names = {
    late_cancellation: "Late cancellation fee",
    no_show: "No-show fee",
  } as const;
  const existing = fees.find((f) => f.feeKey === feeKey);
  if (existing) {
    const next = fees.map((f) =>
      f.id === existing.id ? { ...f, ...patch, feeKey, id: existing.id } : f,
    );
    return { fees: next, id: existing.id };
  }
  const created = { ...createEmptyFee(feeKey, names[feeKey]), ...patch, feeKey };
  return { fees: [...fees, created], id: created.id };
}
