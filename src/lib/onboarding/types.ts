import {
  createDefaultOfficeHours,
  createDefaultServiceHours,
  createEmptyAnsweringSchedule,
  type WeeklyOfficeSchedule,
  type WeeklyServiceSchedule,
} from "./schedule";

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
 */
export const SCHEMA_VERSION = 3;

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
  };
}
