import {
  createDefaultOfficeHours,
  createDefaultServiceHours,
  createEmptyAnsweringSchedule,
  type WeeklyOfficeSchedule,
  type WeeklyServiceSchedule,
} from "./schedule";
import {
  CUSTOMER_PROPERTY_TYPES,
  DIAGNOSTIC_SERVICES,
  PLUMBING_SERVICES,
  type ServiceCatalogItem,
} from "./section2Catalog";
import { createDefaultEmergencyClassifications } from "./section3Defaults";
import {
  APPOINTMENT_WINDOW_TEMPLATES,
  CALLER_TYPES,
  CAPACITY_POLICY_ROWS,
  CONFIRMATION_INFO_OPTIONS,
  EXCEPTION_TYPES,
} from "./section4Catalog";
import { JOB_SERVICES } from "./section2Catalog";
import { DEFAULT_FORBIDDEN_STATEMENT_IDS } from "./section5Catalog";
import {
  DEFAULT_ESCALATION_TRIGGER_IDS,
  DEFAULT_FORBIDDEN_UNHAPPY_PROMISE_IDS,
  DEFAULT_RESTRICTED_INFORMATION_IDS,
  NON_SERVICE_CALL_TYPE_ROWS,
  type NonServiceCallTypeId,
} from "./section6Catalog";
import type { TimeValue } from "./schedule";
import type {
  AdditionalSoftwareCategoryId,
  ConnectionOwnerMode,
  CrmFsmProvider,
  DispatchProvider,
  FailureFallbackMode,
  IntegrationCapabilityId,
  PhoneProvider,
  SchedulingProvider,
} from "./section8Catalog";
import { ALL_INTEGRATION_CAPABILITY_IDS } from "./section8Catalog";
/**
 * Schema history:
 *  v1 -> v2: ServiceDaySchedule moved from two independent booleans
 *            (noService/twentyFourHours) to a single mutually-exclusive
 *            `mode` enum. v1 drafts are reset (narrow, documented
 *            exception — see migrate.ts).
 *  v2 -> v3: OnboardingNavigation moved from a single high-water-mark
 *            counter (`sectionsCompleted: number`) to an explicit set
 *            (`completedSections: number[]`), so re-editing an earlier
 *            completed section can never be confused with the section
 *            currently being worked on. v2 drafts are MIGRATED forward
 *            (answers preserved) — see migrate.ts.
 *  v3 -> v4: Added `section2` ("Your Services") to the draft. v3 drafts
 *            are MIGRATED forward (Section 1 answers + navigation
 *            preserved); Section 2 initializes to its defaults — see
 *            migrate.ts.
 *  v4 -> v5: Added `section3` ("Emergencies") and the shared `contacts`
 *            registry to the draft. v4 drafts are MIGRATED forward
 *            (Sections 1–2 + navigation preserved); Section 3
 *            initializes to its defaults with one fresh, uniquely
 *            identified primary-contact placeholder — see migrate.ts.
 *  v5 -> v6: Added `section4` ("Scheduling") and the shared `fees`
 *            registry (forward-compatible with Section 5 Q68 fee cards).
 *            v5 drafts are MIGRATED forward (Sections 1–3 + contacts
 *            preserved); Section 4 + fees initialize safely — see
 *            migrate.ts.
 *  v6 -> v7: Added `section5` ("Pricing and Payments"). v6 drafts are
 *            MIGRATED forward (Sections 1–4 + contacts + fees preserved);
 *            Section 5 initializes to MD-approved defaults — see migrate.ts.
 *  v7 -> v8: Added `section6` ("Customer Care"). v7 drafts are MIGRATED
 *            forward (Sections 1–5 + contacts + fees preserved); Section 6
 *            initializes to MD-approved defaults — see migrate.ts.
 *  v8 -> v9: Added `section7` ("Voice and Conversation"). v8 drafts are
 *            MIGRATED forward; Section 7 initializes empty — see migrate.ts.
 *  v9 -> v10: Added `section8`, shared `systems` registry, and
 *             `submission` lifecycle. v9 drafts are MIGRATED forward — see
 *             migrate.ts.
 */
export const SCHEMA_VERSION = 10;

export type ApprovedClaim =
  | "licensed"
  | "insured"
  | "bonded"
  | "locally_owned"
  | "family_owned"
  | "other"
  | "none";

export type AnsweringMode =
  | "24_7"
  | "office_closed_only"
  | "specific_hours";

export type Section1Data = {
  customerFacingName: string;
  legalName: string;
  mainPhone: string;
  website: string;
  approvedClaims: ApprovedClaim[];
  otherApprovedClaim: string;
  licensingDetails: string;
  forbiddenClaims: string;
  officeHours: WeeklyOfficeSchedule;
  serviceHours: WeeklyServiceSchedule;
  answeringMode: AnsweringMode | "";
  answeringSchedule: WeeklyOfficeSchedule;
  recurringAvailabilityNotes: string;
};

// ---------------------------------------------------------------------------
// Section 2 — Your Services (Q14–Q25)
// ---------------------------------------------------------------------------

/**
 * Canonical four-state service/policy model (MD §1.3 "Canonical State
 * Pattern"). Deliberately has NO "not sure" / uncertainty state — every
 * service-policy question must resolve to exactly one of these four
 * distinct Company Truth facts:
 *
 *   offered         — normal state: offered/allowed.
 *   with_conditions — Alexander may act autonomously, but only under a
 *                     defined rule attached to this exact row.
 *   ask_team        — human-workflow state: collect context, then a
 *                     human decides. No autonomous condition applies.
 *   not_offered     — denied state: do not offer/authorize.
 */
export type ServicePolicy = "offered" | "with_conditions" | "ask_team" | "not_offered";

/** "" = not yet answered (no default is authorized by the MD). */
export type ServicePolicyState = ServicePolicy | "";

export type ServicePolicyEntry = {
  policy: ServicePolicyState;
  /**
   * Autonomous-condition detail bound to THIS row only — never a
   * shared/global textarea. Only meaningful while
   * policy === "with_conditions"; retained verbatim if the user
   * changes the policy away and back for UX convenience (see
   * normalize/section2.ts for the Company-Truth exclusion boundary).
   */
  condition: string;
};

export function createEmptyServicePolicyEntry(): ServicePolicyEntry {
  return { policy: "", condition: "" };
}

export function createServicePolicyMap(
  items: readonly ServiceCatalogItem[],
): Record<string, ServicePolicyEntry> {
  const map: Record<string, ServicePolicyEntry> = {};
  for (const item of items) {
    map[item.id] = createEmptyServicePolicyEntry();
  }
  return map;
}

/** Q19 — how the business normally defines its service area. */
export type ServiceAreaDefinitionMode = "zip_codes" | "cities" | "distance";

/** Q20 (distance branch) — business-center address + travel radius. */
export type ServiceAreaDistance = {
  address: string;
  radiusMiles: string;
};

/** Q23 — one repeatable "conditional territory" card. */
export type ConditionalTerritoryEntry = {
  id: string;
  area: string;
  condition: string;
};

/** Q24 — after-hours field-service area mode. */
export type AfterHoursAreaMode = "same" | "smaller" | "none";

export type YesNo = "yes" | "no";

export type Section2Data = {
  // Q14 — plumbing services matrix
  plumbingServices: Record<string, ServicePolicyEntry>;
  // Q15 — diagnostic/drain/inspection services matrix
  diagnosticServices: Record<string, ServicePolicyEntry>;
  // Q16 — who the company serves (customer/property types) matrix
  customerPropertyTypes: Record<string, ServicePolicyEntry>;
  // Q17 — customer-supplied fixtures/equipment/materials
  customerSuppliedMaterialsPolicy: ServicePolicyState;
  customerSuppliedMaterialsCondition: string;
  // Q18 — corrective/finish-another-plumber's-work policy
  correctiveWorkPolicy: ServicePolicyState;
  correctiveWorkCondition: string;
  // Q19 — how the normal service area is defined
  serviceAreaDefinitionMode: ServiceAreaDefinitionMode | "";
  // Q20 — structured definition (only the branch matching Q19 applies)
  serviceAreaZipCodes: string[];
  serviceAreaCities: string[];
  serviceAreaDistance: ServiceAreaDistance;
  // Q21 — areas Alexander should always decline (optional)
  excludedTerritory: string;
  // Q22 — are there conditionally-served areas?
  hasConditionalTerritory: YesNo | "";
  // Q23 — repeatable conditional-territory cards
  conditionalTerritories: ConditionalTerritoryEntry[];
  // Q24 — after-hours field-service area mode
  afterHoursAreaMode: AfterHoursAreaMode | "";
  // Q25 — after-hours service area (conditional on Q24 = "smaller")
  afterHoursServiceArea: string;
};

export function createDefaultSection2(): Section2Data {
  return {
    plumbingServices: createServicePolicyMap(PLUMBING_SERVICES),
    diagnosticServices: createServicePolicyMap(DIAGNOSTIC_SERVICES),
    customerPropertyTypes: createServicePolicyMap(CUSTOMER_PROPERTY_TYPES),
    customerSuppliedMaterialsPolicy: "",
    customerSuppliedMaterialsCondition: "",
    correctiveWorkPolicy: "",
    correctiveWorkCondition: "",
    serviceAreaDefinitionMode: "",
    serviceAreaZipCodes: [],
    serviceAreaCities: [],
    serviceAreaDistance: { address: "", radiusMiles: "" },
    excludedTerritory: "",
    hasConditionalTerritory: "",
    conditionalTerritories: [],
    afterHoursAreaMode: "",
    afterHoursServiceArea: "",
  };
}

// ---------------------------------------------------------------------------
// Section 3 — Emergencies (Q26–Q38)
// ---------------------------------------------------------------------------

/**
 * Q26 classification states. Deliberately has no "not sure" option —
 * every scenario resolves to exactly one of these five distinct
 * Company Truth facts. "recommended_default" is itself an explicit,
 * selectable state (not a hidden fallback) per the MD.
 */
export type EmergencyClassification =
  | "emergency"
  | "urgent"
  | "routine"
  | "human_review"
  | "recommended_default";

/** "" = legacy/uninitialized row (migrated to recommended_default on load). */
export type EmergencyClassificationState = EmergencyClassification | "";

export { createDefaultEmergencyClassifications } from "./section3Defaults";

/** Q28 — the three after-hours call classes, each with its own dropdown. */
export type AfterHoursCallClass = "emergency" | "urgent_contained" | "routine";

export type AfterHoursDispositionOption =
  | "attempt_contact"
  | "confirm_or_book"
  | "submit_for_review"
  | "schedule_next_available"
  | "arrange_callback"
  | "info_only"
  | "no_service";

export type AfterHoursDisposition = Record<AfterHoursCallClass, AfterHoursDispositionOption | "">;

export function createDefaultAfterHoursDisposition(): AfterHoursDisposition {
  return { emergency: "", urgent_contained: "", routine: "" };
}

/** Q29 — when the company can actually send someone out after hours. */
export type EmergencyServiceMode = "24_7" | "certain_hours" | "none";

/**
 * Shared contact registry (MD §1.2 "Shared Registries" — Contact
 * registry). Reused by escalation (Q31/Q32/Q38 here), and later by
 * scheduling exceptions, pricing/fee approvals, callbacks, complaints,
 * and routing. A durable local id (never array position) lets later
 * sections reference a contact without re-entering name/phone.
 */
export type ContactCategory =
  | "emergencies"
  | "urgent_calls"
  | "scheduling_exceptions"
  | "pricing_exceptions"
  | "customer_complaints"
  // NOTE: the source transcript said "Warranty/callback issues"; that
  // wording was explicitly removed for the final MVP per the MD —
  // use "Callback / previous-work issues" instead.
  | "callback_previous_work"
  | "other";

/**
 * Shared contact registry entry. Core identity is always name/role +
 * phone. Escalation-role metadata (availability, call categories) is
 * required for Q31/Q32 emergency contacts but optional for other roles
 * (e.g. a Q38 scheduling-exception approver who only needs name + phone).
 * Empty defaults keep the draft shape stable without forcing unrelated
 * fields on every contact.
 */
export type Contact = {
  id: string;
  nameOrRole: string;
  phone: string;
  /** Escalation availability — structured Monday–Sunday; may be empty for non-escalation roles. */
  availability: WeeklyOfficeSchedule;
  /** Escalation routing categories; may be empty for non-escalation roles. */
  callCategories: ContactCategory[];
  /** Only meaningful while callCategories includes "other". */
  otherCategory: string;
};

export function createContactId(): string {
  return `contact-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export function createEmptyContact(): Contact {
  return {
    id: createContactId(),
    nameOrRole: "",
    phone: "",
    availability: createEmptyAnsweringSchedule(),
    callCategories: [],
    otherCategory: "",
  };
}

/**
 * True when a contact has enough identity to appear in pickers /
 * Company Truth. An empty createDefaultDraft() placeholder returns
 * false so it never looks like real customer data.
 */
export function contactHasIdentity(contact: Contact): boolean {
  return Boolean(contact.nameOrRole.trim() || contact.phone.trim());
}

/** Q33 — what Alexander does if nobody on the team responds. */
export type NobodyRespondsFallback =
  | "callback"
  | "schedule_next_available"
  | "team_notification_fallback"
  | "custom";

/** Q34 — how Alexander retries an unanswered urgent escalation. */
export type RetryRule =
  | "try_once_then_next"
  | "try_same_again_then_next"
  | "move_immediately_to_next"
  | "custom";

/** Q35 — what happens when the normal schedule is already full. */
export type CapacityMode =
  | "reserved_capacity"
  | "emergency_override"
  | "authorized_approval"
  | "no_override";

export type Section3Data = {
  // Q26 — emergency classification matrix (scenarioId -> classification)
  emergencyClassifications: Record<string, EmergencyClassificationState>;
  // Q27 — dispatch-approval multi-select. Values are EMERGENCY_SCENARIOS
  // ids, plus the sentinel values "other" and "none" (None is mutually
  // exclusive with every other selection; enforced by CheckboxGroup).
  dispatchApproval: string[];
  dispatchApprovalOtherDetail: string;
  // Q28 — after-hours disposition (three call classes -> one dropdown each)
  afterHoursDisposition: AfterHoursDisposition;
  // Q29 — after-hours emergency field-service mode
  emergencyServiceMode: EmergencyServiceMode | "";
  // Q30 — emergency service weekly schedule (conditional on Q29 = certain_hours)
  emergencyServiceSchedule: WeeklyOfficeSchedule;
  // Q31 — primary escalation contact id (always has a registry entry —
  // created alongside the rest of the default draft, see createDefaultDraft)
  primaryContactId: string;
  // Q32 — backup contact
  hasBackupContact: YesNo | "";
  backupContactId: string;
  // Q33 — terminal fallback when nobody on the team responds
  nobodyRespondsFallback: NobodyRespondsFallback | "";
  nobodyRespondsCustomRule: string;
  // Q34 — retry rule for an unanswered urgent escalation
  retryRule: RetryRule | "";
  retryCustomRule: string;
  // Q35 — capacity/override mode when the schedule is full
  capacityMode: CapacityMode | "";
  // Q36 — reserved-capacity description (conditional on Q35 = reserved_capacity)
  reservedCapacityText: string;
  // Q37 — override conditions (conditional on Q35 = emergency_override)
  overrideConditionsText: string;
  // Q38 — approver contact id (conditional on Q35 = authorized_approval)
  approverContactId: string;
};

export function createDefaultSection3(primaryContactId: string): Section3Data {
  return {
    emergencyClassifications: createDefaultEmergencyClassifications(),
    dispatchApproval: [],
    dispatchApprovalOtherDetail: "",
    afterHoursDisposition: createDefaultAfterHoursDisposition(),
    emergencyServiceMode: "",
    emergencyServiceSchedule: createEmptyAnsweringSchedule(),
    primaryContactId,
    hasBackupContact: "",
    backupContactId: "",
    nobodyRespondsFallback: "",
    nobodyRespondsCustomRule: "",
    retryRule: "",
    retryCustomRule: "",
    capacityMode: "",
    reservedCapacityText: "",
    overrideConditionsText: "",
    approverContactId: "",
  };
}

// ---------------------------------------------------------------------------
// Shared fee registry (MD §1.2) — created/updated by Section 4 Q54/Q55,
// enriched later by Section 5 Q68. Stable IDs; never duplicate on amount edit.
// ---------------------------------------------------------------------------

/** Forward-compatible with Q68 amount representations. */
export type FeeAmountKind = "fixed" | "range" | "percentage" | "varies";

export type FeeQuoteAuthority = "yes" | "no" | "after_confirmation";
export type FeeCreditTowardWork = "yes" | "no" | "sometimes";
export type FeeWaiverPolicy = "yes" | "no" | "sometimes";

/**
 * Singleton fee keys used by Section 4 so there can be at most one
 * active late-cancellation fee and one active no-show fee.
 */
export type FeeKey = "late_cancellation" | "no_show";

export type FeeRecord = {
  id: string;
  /** Singleton key for Section 4 system fees; empty for future custom fees. */
  feeKey: FeeKey | "";
  name: string;
  /** Amount representation (Q68-compatible). Section 4 uses "fixed". */
  amountKind: FeeAmountKind | "";
  amountFixed: string;
  amountMin: string;
  amountMax: string;
  amountPercentage: string;
  /** When the fee applies (also holds Q54/Q55 conditional rules). */
  applicationRule: string;
  /** Late-cancellation notice window (e.g. "24 hours"). */
  noticeRequired: string;
  quoteAuthority: FeeQuoteAuthority | "";
  creditTowardWork: FeeCreditTowardWork | "";
  waiverPolicy: FeeWaiverPolicy | "";
  waiverRule: string;
  /** Optional Q68 category template id (label-only prefill). */
  categoryTemplate: string;
  /** False when Q54/Q55 = No — excluded from normalized Company Truth. */
  active: boolean;
  sourceSection: 4 | 5;
};

export function createFeeId(): string {
  return `fee-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export function createEmptyFee(feeKey: FeeKey, name: string): FeeRecord {
  return {
    id: createFeeId(),
    feeKey,
    name,
    amountKind: "fixed",
    amountFixed: "",
    amountMin: "",
    amountMax: "",
    amountPercentage: "",
    applicationRule: "",
    noticeRequired: "",
    quoteAuthority: "",
    creditTowardWork: "",
    waiverPolicy: "",
    waiverRule: "",
    categoryTemplate: "",
    active: true,
    sourceSection: 4,
  };
}

export function createCustomFee(name = ""): FeeRecord {
  return {
    id: createFeeId(),
    feeKey: "",
    name,
    amountKind: "",
    amountFixed: "",
    amountMin: "",
    amountMax: "",
    amountPercentage: "",
    applicationRule: "",
    noticeRequired: "",
    quoteAuthority: "",
    creditTowardWork: "",
    waiverPolicy: "",
    waiverRule: "",
    categoryTemplate: "",
    active: true,
    sourceSection: 5,
  };
}

// ---------------------------------------------------------------------------
// Section 4 — Scheduling (Q39–Q64)
// ---------------------------------------------------------------------------

export type HumanRequestPolicy =
  | "connect_right_away"
  | "ask_briefly_then_connect"
  | "callback"
  | "custom";

export type AiRefusalPolicy = "connect_to_person" | "callback" | "custom";

export type ExceptionAuthority =
  | "alexander"
  | "dispatcher"
  | "manager"
  | "owner"
  | "another_person"
  | "never_allowed";

export type ExceptionAuthorityState = ExceptionAuthority | "";

export type ApproverUnavailablePolicy = "callback" | "follow_normal_rule" | "other";

export type CallerPermission =
  | "schedule_service"
  | "approve_diagnostic_fee"
  | "authorize_repair"
  | "agree_to_pay"
  | "human_approval_required"
  | "not_allowed";

export type SpendingLimitRow = {
  id: string;
  callerTypeId: string;
  maxAmount: string;
};

export type EmergencyAuthMode = "same_rules" | "special_rules" | "human_review_always";

export type DefaultBookingMode = "confirm_immediately" | "submit_for_approval" | "arrange_callback";

export type AppointmentWindow = {
  id: string;
  label: string;
  start: TimeValue | "";
  end: TimeValue | "";
  enabled: boolean;
};

export type ConfirmationInfoId =
  | "appointment_date"
  | "appointment_time_or_window"
  | "requested_service"
  | "customer_name_and_address"
  | "callback_phone"
  | "email_address";

export type ServiceBookingRule = {
  id: string;
  serviceId: string;
  rule: string;
};

export type CapacityOfferPolicy =
  | "allowed"
  | "with_conditions"
  | "human_approval"
  | "not_offered";

export type CapacityOfferEntry = {
  policy: CapacityOfferPolicy | "";
  condition: string;
};

export type ChangeAuthority =
  | "direct"
  | "conditional"
  | "human_approval"
  | "callback";

export type FeeChargeMode = "yes" | "conditional" | "no";

export type CallbackNumberPolicy = "calling_from" | "ask_preferred";

export type TechnicianSource = "contact" | "name";

export type TechnicianAssignment = {
  id: string;
  /** Empty when otherJobName is used. */
  serviceId: string;
  otherJobName: string;
  technicianSource: TechnicianSource | "";
  technicianContactId: string;
  technicianName: string;
};

export type SpecificTechnicianRequest =
  | "book_if_confirmed_available"
  | "try_honor_may_reassign"
  | "submit_for_review"
  | "do_not_accept";

export type MultiIssueMode = "one_appointment" | "separate_issues" | "ask_team";

export type NoAvailabilityFallbackId =
  | "offer_next_available"
  | "look_for_approved_window"
  | "add_to_callback_waitlist"
  | "ask_team_for_help";

export function createSpendingLimitId(): string {
  return `limit-${Math.random().toString(36).slice(2, 10)}`;
}

export function createServiceRuleId(): string {
  return `svc-rule-${Math.random().toString(36).slice(2, 10)}`;
}

export function createTechnicianAssignmentId(): string {
  return `tech-${Math.random().toString(36).slice(2, 10)}`;
}

export function createDefaultExceptionAuthority(): Record<string, ExceptionAuthorityState> {
  const map: Record<string, ExceptionAuthorityState> = {};
  for (const row of EXCEPTION_TYPES) map[row.id] = "";
  return map;
}

export function createDefaultCallerPermissions(): Record<string, CallerPermission[]> {
  const map: Record<string, CallerPermission[]> = {};
  for (const row of CALLER_TYPES) map[row.id] = [];
  return map;
}

export function createDefaultAppointmentWindows(): AppointmentWindow[] {
  // Labels only — MD does not authorize invented clock-time defaults.
  // Rows begin ENABLED so the company fills start/end; empty times are
  // NOT treated as hasDraftContent (see draft-utils). At least one
  // enabled window with valid start < end is required for Q48.
  return APPOINTMENT_WINDOW_TEMPLATES.map((t) => ({
    id: t.id,
    label: t.label,
    start: "",
    end: "",
    enabled: true,
  }));
}

export function createDefaultCapacityPolicies(): Record<string, CapacityOfferEntry> {
  const map: Record<string, CapacityOfferEntry> = {};
  for (const row of CAPACITY_POLICY_ROWS) {
    map[row.id] = { policy: "", condition: "" };
  }
  return map;
}

/** Explicit MD default: preselect all six confirmation-info options. */
export function createDefaultConfirmationInfo(): ConfirmationInfoId[] {
  return CONFIRMATION_INFO_OPTIONS.map((o) => o.id as ConfirmationInfoId);
}

export type Section4Data = {
  // Q39
  humanRequestPolicy: HumanRequestPolicy | "";
  humanRequestCustomRule: string;
  // Q40
  aiRefusalPolicy: AiRefusalPolicy | "";
  aiRefusalCustomRule: string;
  // Q41
  exceptionAuthority: Record<string, ExceptionAuthorityState>;
  /** Per-row approver contact id when authority = another_person. */
  exceptionApproverContactIds: Record<string, string>;
  // Q42
  approverUnavailablePolicy: ApproverUnavailablePolicy | "";
  approverUnavailableCustomRule: string;
  // Q43
  callerPermissions: Record<string, CallerPermission[]>;
  // Q44
  hasSpendingLimits: YesNo | "";
  spendingLimits: SpendingLimitRow[];
  // Q45
  emergencyAuthMode: EmergencyAuthMode | "";
  emergencyAuthSpecialRules: string;
  // Q46
  defaultBookingMode: DefaultBookingMode | "";
  // Q47
  bookingHorizonDays: string;
  bookingHorizonNoMaximum: boolean;
  // Q48
  appointmentWindows: AppointmentWindow[];
  // Q49
  confirmationInfo: ConfirmationInfoId[];
  // Q50
  hasServiceBookingRules: YesNo | "";
  serviceBookingRules: ServiceBookingRule[];
  // Q51
  capacityPolicies: Record<string, CapacityOfferEntry>;
  // Q52
  rescheduleAuthority: ChangeAuthority | "";
  rescheduleCondition: string;
  // Q53
  cancellationAuthority: ChangeAuthority | "";
  cancellationCondition: string;
  // Q54
  lateCancellationFeeMode: FeeChargeMode | "";
  lateCancellationFeeId: string;
  // Q55
  noShowFeeMode: FeeChargeMode | "";
  noShowFeeId: string;
  // Q56 (optional)
  cancellationExceptions: string;
  // Q57 — empty until the customer consciously sets priority (not source-list default)
  noAvailabilityPriority: NoAvailabilityFallbackId[];
  // Q58–Q60
  mayArrangeCallback: YesNo | "";
  callbackNumberPolicy: CallbackNumberPolicy | "";
  callbackOwnerContactId: string;
  // Q61
  hasTechnicianAssignments: YesNo | "";
  technicianAssignments: TechnicianAssignment[];
  // Q62
  specificTechnicianRequest: SpecificTechnicianRequest | "";
  // Q63–Q64
  multiIssueMode: MultiIssueMode | "";
  separateIssueServiceIds: string[];
  separateIssueOther: boolean;
  separateIssueOtherDetail: string;
};

// ---------------------------------------------------------------------------
// Section 5 — Pricing and Payments (Q65–Q82)
// ---------------------------------------------------------------------------

export type PricingModelId =
  | "flat_rate"
  | "hourly_labor_materials"
  | "fixed_prices_certain_services"
  | "after_diagnosis"
  | "estimate_required"
  | "other";

export type MaterialMarkupPolicy = "yes" | "sometimes" | "no";

export type UnknownPriceBehaviorId =
  | "technician_after_evaluation"
  | "approved_price_or_range"
  | "fee_plus_separate_quote"
  | "team_provides_pricing"
  | "custom";

export type VisitTypeId =
  | "free_estimate"
  | "paid_diagnostic"
  | "inspection"
  | "normal_service"
  | "ask_team"
  | "not_offered";

export type GeneralPricingAuthorityId =
  | "approved_price_list"
  | "fees_not_repair"
  | "after_evaluation"
  | "ask_team";

export type ServicePricingInstructionId =
  | "quote_approved"
  | "explain_fee_only"
  | "ask_team"
  | "do_not_discuss"
  | "no_approved_pricing";

export type ForbiddenStatementId =
  | "no_guarantee_before_diagnosis"
  | "never_invent_price"
  | "no_promise_no_additional"
  | "no_disclose_markup"
  | "no_unauthorized_discount"
  | "other";

export type PromotionStackingId = "yes" | "no" | "conditional" | "human_approval";

export type PromotionModificationId = "within_rules" | "human_approval" | "no";

export type PaymentMethodId =
  | "credit_card"
  | "debit_card"
  | "cash"
  | "check"
  | "ach"
  | "financing"
  | "invoice"
  | "other";

export type PaymentDueId =
  | "at_time_of_service"
  | "when_work_completed"
  | "deposit_required"
  | "progress_payments"
  | "invoice_after_service"
  | "other";

export type FinancingPermissionId =
  | "explain_options"
  | "send_application_link"
  | "help_begin_application"
  | "transfer_to_team"
  | "other";

export type RemedyId =
  | "refund"
  | "account_credit"
  | "fee_waiver"
  | "discount_goodwill"
  | "return_visit";

export type RemedyAuthority = "within_rules" | "human_approval" | "never";

export type AreaPricingRow = {
  id: string;
  area: string;
  travelFee: string;
  minimumCharge: string;
};

export type ServicePricingRule = {
  instruction: ServicePricingInstructionId | "";
  approvedPriceMode: "exact" | "range" | "";
  approvedPriceExact: string;
  approvedPriceMin: string;
  approvedPriceMax: string;
  pricingConditions: string;
  linkedFeeIds: string[];
  askTeamDetail: string;
};

export type PromotionOffer = {
  id: string;
  name: string;
  benefit: string;
  eligibility: string;
  qualifyingServiceIds: string[];
  expiration: string;
  /** MD has no proactive-use enum — structured free text. */
  proactiveUsePolicy: string;
};

export function createAreaPricingRowId(): string {
  return `area-${Math.random().toString(36).slice(2, 10)}`;
}

export function createPromotionId(): string {
  return `promo-${Math.random().toString(36).slice(2, 10)}`;
}

export function createDefaultVisitTypeByService(): Record<string, VisitTypeId | ""> {
  const map: Record<string, VisitTypeId | ""> = {};
  for (const item of JOB_SERVICES) map[item.id] = "";
  return map;
}

export function createDefaultForbiddenStatements(): ForbiddenStatementId[] {
  return [...DEFAULT_FORBIDDEN_STATEMENT_IDS] as ForbiddenStatementId[];
}

export type Section5Data = {
  pricingModels: PricingModelId[];
  pricingModelOther: string;
  materialMarkupPolicy: MaterialMarkupPolicy | "";
  materialMarkupCustomerExplanation: string;
  unknownPriceBehavior: UnknownPriceBehaviorId | "";
  unknownPriceCustomRule: string;
  /** Q68 — mutually exclusive with active fee cards when true. */
  noSeparateFees: boolean;
  hasAreaTravelOrMinimum: YesNo | "";
  areaPricingRows: AreaPricingRow[];
  visitTypeByServiceId: Record<string, VisitTypeId | "">;
  paidDiagnosticExplanation: string;
  generalPricingAuthority: GeneralPricingAuthorityId | "";
  servicePricingRules: Record<string, ServicePricingRule>;
  forbiddenStatements: ForbiddenStatementId[];
  forbiddenStatementOther: string;
  hasPromotions: YesNo | "";
  promotions: PromotionOffer[];
  promotionStacking: PromotionStackingId | "";
  promotionStackingRule: string;
  promotionModificationAuthority: PromotionModificationId | "";
  promotionModificationRule: string;
  paymentMethods: PaymentMethodId[];
  paymentMethodOther: string;
  paymentDuePolicies: PaymentDueId[];
  depositWorkDetail: string;
  depositRule: string;
  progressPaymentProjectsDetail: string;
  progressPaymentRule: string;
  invoiceCustomersDetail: string;
  invoiceTerms: string;
  paymentDueOtherRule: string;
  offersFinancing: YesNo | "";
  financingProviderTerms: string;
  financingPermissions: FinancingPermissionId[];
  financingPermissionOtherDetail: string;
  financingEligibilityStatement: string;
  remedyAuthority: Record<RemedyId, RemedyAuthority | "">;
  remedyRules: Record<RemedyId, string>;
  financialApproverContactId: string;
};

export function createDefaultRemedyAuthority(): Record<RemedyId, RemedyAuthority | ""> {
  return {
    refund: "",
    account_credit: "",
    fee_waiver: "",
    discount_goodwill: "",
    return_visit: "",
  };
}

export function createDefaultRemedyRules(): Record<RemedyId, string> {
  return {
    refund: "",
    account_credit: "",
    fee_waiver: "",
    discount_goodwill: "",
    return_visit: "",
  };
}

export function createDefaultSection5(): Section5Data {
  return {
    pricingModels: [],
    pricingModelOther: "",
    materialMarkupPolicy: "",
    materialMarkupCustomerExplanation: "",
    unknownPriceBehavior: "",
    unknownPriceCustomRule: "",
    noSeparateFees: false,
    hasAreaTravelOrMinimum: "",
    areaPricingRows: [],
    visitTypeByServiceId: createDefaultVisitTypeByService(),
    paidDiagnosticExplanation: "",
    generalPricingAuthority: "",
    servicePricingRules: {},
    forbiddenStatements: createDefaultForbiddenStatements(),
    forbiddenStatementOther: "",
    hasPromotions: "",
    promotions: [],
    promotionStacking: "",
    promotionStackingRule: "",
    promotionModificationAuthority: "",
    promotionModificationRule: "",
    paymentMethods: [],
    paymentMethodOther: "",
    paymentDuePolicies: [],
    depositWorkDetail: "",
    depositRule: "",
    progressPaymentProjectsDetail: "",
    progressPaymentRule: "",
    invoiceCustomersDetail: "",
    invoiceTerms: "",
    paymentDueOtherRule: "",
    offersFinancing: "",
    financingProviderTerms: "",
    financingPermissions: [],
    financingPermissionOtherDetail: "",
    financingEligibilityStatement: "",
    remedyAuthority: createDefaultRemedyAuthority(),
    remedyRules: createDefaultRemedyRules(),
    financialApproverContactId: "",
  };
}

export type PreviousWorkInitialAction =
  | "schedule_return_visit"
  | "submit_team_review"
  | "connect_team"
  | "arrange_callback"
  | "custom";

export type RepeatCallbackAction =
  | "schedule_another_return"
  | "human_review_after_first"
  | "connect_manager";

export type EscalationTriggerId =
  | "asks_manager"
  | "repair_not_solved"
  | "disputes_charge"
  | "refund_credit_request"
  | "property_damage"
  | "legal_threat"
  | "chargeback_threat"
  | "repeated_dissatisfaction"
  | "other";

export type ForbiddenUnhappyPromiseId =
  | "no_admit_fault"
  | "no_refund_unauthorized"
  | "no_free_work_unauthorized"
  | "no_compensation_unauthorized"
  | "no_specific_outcome"
  | "other";

export type NonServiceDisposition =
  | "send_specific"
  | "take_message"
  | "politely_decline"
  | "human_review";

export type NonServiceCallPolicyRow = {
  disposition: NonServiceDisposition | "";
  contactId: string;
};

export type CustomerHistoryPolicy =
  | "use_available_history"
  | "human_review_before_details"
  | "custom";

export type RestrictedInformationId =
  | "payment_information"
  | "internal_company_notes"
  | "technician_notes"
  | "another_customer"
  | "sensitive_account"
  | "other";

export type AdditionalServicePolicy =
  | "mention_relevant"
  | "mention_approved_only"
  | "only_when_asked"
  | "do_not_proactive"
  | "custom";

export type Section6Data = {
  previousWorkInitialAction: PreviousWorkInitialAction | "";
  returnVisitEligibilityRule: string;
  previousWorkCustomRule: string;
  repeatCallbackAction: RepeatCallbackAction | "";
  escalationTriggers: EscalationTriggerId[];
  escalationTriggerOther: string;
  forbiddenUnhappyPromises: ForbiddenUnhappyPromiseId[];
  forbiddenUnhappyPromiseOther: string;
  nonServiceCallPolicies: Record<NonServiceCallTypeId, NonServiceCallPolicyRow>;
  customerHistoryPolicy: CustomerHistoryPolicy | "";
  customerHistoryCustomRule: string;
  restrictedInformation: RestrictedInformationId[];
  restrictedInformationOther: string;
  additionalServicePolicy: AdditionalServicePolicy | "";
  additionalServiceCustomRule: string;
  unusualCallNotes: string;
};

export function createDefaultNonServiceCallPolicies(): Record<
  NonServiceCallTypeId,
  NonServiceCallPolicyRow
> {
  const policies = {} as Record<NonServiceCallTypeId, NonServiceCallPolicyRow>;
  for (const row of NON_SERVICE_CALL_TYPE_ROWS) {
    policies[row.id] = { disposition: "", contactId: "" };
  }
  return policies;
}

export function createDefaultEscalationTriggers(): EscalationTriggerId[] {
  return [...DEFAULT_ESCALATION_TRIGGER_IDS] as EscalationTriggerId[];
}

export function createDefaultForbiddenUnhappyPromises(): ForbiddenUnhappyPromiseId[] {
  return [...DEFAULT_FORBIDDEN_UNHAPPY_PROMISE_IDS] as ForbiddenUnhappyPromiseId[];
}

export function createDefaultRestrictedInformation(): RestrictedInformationId[] {
  return [...DEFAULT_RESTRICTED_INFORMATION_IDS] as RestrictedInformationId[];
}

export function createDefaultSection6(): Section6Data {
  return {
    previousWorkInitialAction: "",
    returnVisitEligibilityRule: "",
    previousWorkCustomRule: "",
    repeatCallbackAction: "",
    escalationTriggers: createDefaultEscalationTriggers(),
    escalationTriggerOther: "",
    forbiddenUnhappyPromises: createDefaultForbiddenUnhappyPromises(),
    forbiddenUnhappyPromiseOther: "",
    nonServiceCallPolicies: createDefaultNonServiceCallPolicies(),
    customerHistoryPolicy: "",
    customerHistoryCustomRule: "",
    restrictedInformation: createDefaultRestrictedInformation(),
    restrictedInformationOther: "",
    additionalServicePolicy: "",
    additionalServiceCustomRule: "",
    unusualCallNotes: "",
  };
}

export type CallerLanguageId = "english" | "spanish" | "other";

export type VoiceSelectionId =
  | "voice_a"
  | "voice_b"
  | "voice_c"
  | "another_approved"
  | "";

export type CommunicationStylePreset =
  | "warm_professional"
  | "friendly_relaxed"
  | "direct_efficient"
  | "calm_reassuring";

export type SpokenNameMode = "alexander" | "company_specific" | "another_approved" | "";

export type AiDisclosureStyle = "opening_ai_receptionist" | "only_if_asked" | "custom" | "";

export type PronunciationMode = "none" | "yes" | "";

export type LanguageSwitchingPolicy =
  | "continue_caller_language"
  | "ask_preference"
  | "english_offer_human"
  | "custom"
  | "";

export type PerceivedVoicePreference =
  | "no_preference"
  | "masculine_presenting"
  | "feminine_presenting"
  | "neutral_androgynous"
  | "";

export type AccentPreference =
  | "neutral_american"
  | "regional_american"
  | "spanish_influenced_english"
  | "other_approved"
  | "no_preference"
  | "";

export type FormalityPreference = "conversational" | "balanced_professional" | "formal_traditional" | "";

export type PronunciationEntry = {
  id: string;
  term: string;
  pronunciation: string;
  /** Optional URL/path reference — not a File/Blob in draft state. */
  audioSampleReference: string;
};

export type Section7Data = {
  englishOnly: boolean;
  callerLanguages: CallerLanguageId[];
  otherSupportedLanguage: string;
  voiceSelection: VoiceSelectionId;
  anotherApprovedVoiceId: string;
  communicationStyle: CommunicationStylePreset | "";
  spokenNameMode: SpokenNameMode;
  spokenDisplayName: string;
  aiDisclosureStyle: AiDisclosureStyle;
  aiDisclosureCustom: string;
  pronunciationMode: PronunciationMode;
  pronunciationEntries: PronunciationEntry[];
  languageSwitchingPolicy: LanguageSwitchingPolicy;
  languageSwitchingCustomRule: string;
  perceivedVoicePreference: PerceivedVoicePreference | "";
  accentPreference: AccentPreference | "";
  accentOtherApproved: string;
  formalityPreference: FormalityPreference | "";
  brandPhrasesAndAvoidances: string;
  additionalReviewNotes: string;
};

export function createPronunciationEntryId(): string {
  return `pron-${Math.random().toString(36).slice(2, 10)}`;
}

export function createDefaultSection7(): Section7Data {
  return {
    englishOnly: false,
    callerLanguages: [],
    otherSupportedLanguage: "",
    voiceSelection: "",
    anotherApprovedVoiceId: "",
    communicationStyle: "",
    spokenNameMode: "",
    spokenDisplayName: "",
    aiDisclosureStyle: "",
    aiDisclosureCustom: "",
    pronunciationMode: "",
    pronunciationEntries: [],
    languageSwitchingPolicy: "",
    languageSwitchingCustomRule: "",
    perceivedVoicePreference: "",
    accentPreference: "",
    accentOtherApproved: "",
    formalityPreference: "",
    brandPhrasesAndAvoidances: "",
    additionalReviewNotes: "",
  };
}

// ---------------------------------------------------------------------------
// Section 8 — Integration Systems and Final Setup (Q104–Q113)
// ---------------------------------------------------------------------------

export type SoftwareRole = "crm_fsm" | "scheduling" | "dispatch" | "phone" | "additional";

export type SoftwareRecord = {
  id: string;
  role: SoftwareRole;
  providerKey: string;
  displayName: string;
  customName: string | null;
  desiredAccess: string | null;
};

export type AdditionalSoftwareCard = {
  categoryId: AdditionalSoftwareCategoryId;
  softwareId: string;
  systemName: string;
  desiredAccess: string;
  otherCategoryLabel: string;
  otherDetails: string;
};

export type Section8Data = {
  crmFsmProvider: CrmFsmProvider;
  crmFsmCustomName: string;
  crmFsmSoftwareId: string;

  schedulingProvider: SchedulingProvider;
  schedulingCustomName: string;
  schedulingSoftwareId: string;

  dispatchProvider: DispatchProvider;
  dispatchCustomName: string;
  dispatchSoftwareId: string;

  phoneProvider: PhoneProvider;
  phoneCustomName: string;
  phoneSoftwareId: string;

  additionalSoftwareCategories: AdditionalSoftwareCategoryId[];
  additionalSoftwareCards: AdditionalSoftwareCard[];

  authorizedCapabilities: IntegrationCapabilityId[];
  authorizedCapabilityOther: string;

  connectionOwnerMode: ConnectionOwnerMode;
  connectionOwnerName: string;
  connectionOwnerEmail: string;
  connectionOwnerPhone: string;

  connectionNoticeAcknowledged: boolean;

  failureFallback: FailureFallbackMode;
  failureFallbackCustom: string;

  finalOperatingNotes: string;
};

/**
 * MD “preselect all capabilities” = every concrete approved capability.
 * `other` is an extension affordance requiring custom text — not preselected.
 */
export function createDefaultAuthorizedCapabilities(): IntegrationCapabilityId[] {
  return ALL_INTEGRATION_CAPABILITY_IDS.filter((id) => id !== "other");
}

export function createDefaultSection8(): Section8Data {
  return {
    crmFsmProvider: "",
    crmFsmCustomName: "",
    crmFsmSoftwareId: "",

    schedulingProvider: "",
    schedulingCustomName: "",
    schedulingSoftwareId: "",

    dispatchProvider: "",
    dispatchCustomName: "",
    dispatchSoftwareId: "",

    phoneProvider: "",
    phoneCustomName: "",
    phoneSoftwareId: "",

    additionalSoftwareCategories: [],
    additionalSoftwareCards: [],

    authorizedCapabilities: createDefaultAuthorizedCapabilities(),
    authorizedCapabilityOther: "",

    connectionOwnerMode: "",
    connectionOwnerName: "",
    connectionOwnerEmail: "",
    connectionOwnerPhone: "",

    connectionNoticeAcknowledged: false,

    failureFallback: "",
    failureFallbackCustom: "",

    finalOperatingNotes: "",
  };
}

export type SubmissionConfirmations = {
  answersAccurate: boolean;
  capabilitiesDependOnIntegrations: boolean;
  actionsRequireSupportAuthorizationConfirmation: boolean;
};

export type OnboardingSubmission = {
  status: "draft" | "submitted";
  submittedAt: string | null;
  /**
   * Fingerprint of sections 1–8 + registries at the last successful submit.
   * Used to detect edits after submission and to preserve submittedAt on duplicate submit.
   */
  lastSubmittedContentRevision: string | null;
  confirmations: SubmissionConfirmations;
};

export function createDefaultSubmission(): OnboardingSubmission {
  return {
    status: "draft",
    submittedAt: null,
    lastSubmittedContentRevision: null,
    confirmations: {
      answersAccurate: false,
      capabilitiesDependOnIntegrations: false,
      actionsRequireSupportAuthorizationConfirmation: false,
    },
  };
}

export function createDefaultSection4(): Section4Data {
  return {
    humanRequestPolicy: "",
    humanRequestCustomRule: "",
    aiRefusalPolicy: "",
    aiRefusalCustomRule: "",
    exceptionAuthority: createDefaultExceptionAuthority(),
    exceptionApproverContactIds: {},
    approverUnavailablePolicy: "",
    approverUnavailableCustomRule: "",
    callerPermissions: createDefaultCallerPermissions(),
    hasSpendingLimits: "",
    spendingLimits: [],
    emergencyAuthMode: "",
    emergencyAuthSpecialRules: "",
    defaultBookingMode: "",
    bookingHorizonDays: "",
    bookingHorizonNoMaximum: false,
    appointmentWindows: createDefaultAppointmentWindows(),
    confirmationInfo: createDefaultConfirmationInfo(),
    hasServiceBookingRules: "",
    serviceBookingRules: [],
    capacityPolicies: createDefaultCapacityPolicies(),
    rescheduleAuthority: "",
    rescheduleCondition: "",
    cancellationAuthority: "",
    cancellationCondition: "",
    lateCancellationFeeMode: "",
    lateCancellationFeeId: "",
    noShowFeeMode: "",
    noShowFeeId: "",
    cancellationExceptions: "",
    noAvailabilityPriority: [],
    mayArrangeCallback: "",
    // Explicit MD default for when Q58 becomes Yes — stored empty until then
    // so a fresh draft is not dirty; applied when Q58 = yes if still blank.
    callbackNumberPolicy: "",
    callbackOwnerContactId: "",
    hasTechnicianAssignments: "",
    technicianAssignments: [],
    specificTechnicianRequest: "",
    multiIssueMode: "",
    separateIssueServiceIds: [],
    separateIssueOther: false,
    separateIssueOtherDetail: "",
  };
}

export type OnboardingStage =
  | "welcome"
  | "section-intro"
  | "section-form"
  | "section-complete"
  | "section-review";

export type OnboardingNavigation = {
  stage: OnboardingStage;
  /** The section the user is currently viewing/editing. */
  sectionId: number;
  /**
   * Sections that have been formally completed (validated + saved).
   * A section's id can remain in this list while the user re-opens it
   * for editing — completion is a banked fact, independent of whatever
   * is currently being edited.
   */
  completedSections: number[];
};

export type OnboardingDraft = {
  schemaVersion: number;
  updatedAt: string;
  currentRoute?: string;
  navigation: OnboardingNavigation;
  section1: Section1Data;
  section2: Section2Data;
  section3: Section3Data;
  section4: Section4Data;
  section5: Section5Data;
  section6: Section6Data;
  section7: Section7Data;
  section8: Section8Data;
  /** Shared contact registry (MD §1.2) — sibling to sections, not buried
   * inside Section 3, so later sections can reference contacts by id. */
  contacts: Contact[];
  /**
   * Shared fee registry (MD §1.2). Section 4 Q54/Q55 create/update
   * late-cancellation and no-show records; Section 5 Q68 will enrich
   * the same IDs rather than duplicating fee truth.
   */
  fees: FeeRecord[];
  /** Shared software registry (MD §1.2) — Section 8 references by stable id. */
  systems: SoftwareRecord[];
  submission: OnboardingSubmission;
};

export function createDefaultSection1(): Section1Data {
  return {
    customerFacingName: "",
    legalName: "",
    mainPhone: "",
    website: "",
    approvedClaims: [],
    otherApprovedClaim: "",
    licensingDetails: "",
    forbiddenClaims: "",
    officeHours: createDefaultOfficeHours(),
    serviceHours: createDefaultServiceHours(),
    answeringMode: "",
    answeringSchedule: createEmptyAnsweringSchedule(),
    recurringAvailabilityNotes: "",
  };
}

export const EMPTY_DRAFT_UPDATED_AT = "1970-01-01T00:00:00.000Z";

export function createDefaultDraft(): OnboardingDraft {
  const primaryContact = createEmptyContact();
  return {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: EMPTY_DRAFT_UPDATED_AT,
    currentRoute: "/onboarding",
    navigation: {
      stage: "welcome",
      sectionId: 1,
      completedSections: [],
    },
    section1: createDefaultSection1(),
    section2: createDefaultSection2(),
    section3: createDefaultSection3(primaryContact.id),
    section4: createDefaultSection4(),
    section5: createDefaultSection5(),
    section6: createDefaultSection6(),
    section7: createDefaultSection7(),
    section8: createDefaultSection8(),
    contacts: [primaryContact],
    fees: [],
    systems: [],
    submission: createDefaultSubmission(),
  };
}
