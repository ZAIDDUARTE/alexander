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
import { EMERGENCY_SCENARIOS } from "./section3Catalog";

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
 */
export const SCHEMA_VERSION = 5;

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

/**
 * "" = not yet answered.
 *
 * SOURCE-DATA DEPENDENCY (not an implementation defect): the final MD
 * says to preselect "Use Alexander's recommended default" wherever the
 * approved default library provides a per-scenario mapping, but that
 * library's actual classifications are not published in the MD. Until
 * those mappings exist as real source data, every row stays blank —
 * we do not invent defaults, do not preselect rows, and do not claim a
 * specific classification in the UI tooltip.
 */
export type EmergencyClassificationState = EmergencyClassification | "";

export function createDefaultEmergencyClassifications(): Record<
  string,
  EmergencyClassificationState
> {
  const map: Record<string, EmergencyClassificationState> = {};
  for (const scenario of EMERGENCY_SCENARIOS) {
    // Intentionally blank — see EmergencyClassificationState docs.
    map[scenario.id] = "";
  }
  return map;
}

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
  /** Shared contact registry (MD §1.2) — sibling to section1/2/3, not
   * buried inside Section 3, so later sections can reference contacts
   * by id without re-entering name/phone. */
  contacts: Contact[];
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
    contacts: [primaryContact],
  };
}
