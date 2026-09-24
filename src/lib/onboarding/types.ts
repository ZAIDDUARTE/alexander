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
 */
export const SCHEMA_VERSION = 4;

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
  };
}
