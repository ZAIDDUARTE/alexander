import {
  createDefaultDraft,
  SCHEMA_VERSION,
  type OnboardingDraft,
  type OnboardingNavigation,
  type OnboardingStage,
  type Section1Data,
  type Section2Data,
  type Section3Data,
  type Section4Data,
  type Section5Data,
  type Section6Data,
  type Contact,
  type FeeRecord,
} from "./types";
import { mergeWithDefaults } from "./draft-utils";

/**
 * Draft migration.
 *
 * Rule of thumb: a schema version bump must never silently destroy a
 * customer's saved answers if a deterministic upgrade path exists. Only
 * genuinely unsupported/unknown legacy shapes fall back to a safe reset,
 * and that fallback is a narrow, explicit exception — not the default
 * policy for every future version bump.
 */

type LegacyNavigationV2 = {
  stage?: OnboardingStage;
  sectionId?: number;
  sectionsCompleted?: number;
};

type LegacyDraftV2 = {
  schemaVersion: 2;
  updatedAt?: string;
  currentRoute?: string;
  navigation?: LegacyNavigationV2;
  section1?: Partial<Section1Data>;
};

/**
 * v2 stored a single "highest completed section" counter. v3 stores an
 * explicit set of completed section ids so a section can stay marked
 * complete while the user re-opens it for editing. A contiguous
 * 1..count run is the only value the old counter could represent, so
 * this reconstruction is lossless.
 */
export function migrateNavigationV2ToV3(legacy: LegacyNavigationV2 | undefined): OnboardingNavigation {
  const count =
    typeof legacy?.sectionsCompleted === "number" && legacy.sectionsCompleted > 0
      ? Math.floor(legacy.sectionsCompleted)
      : 0;

  return {
    stage: legacy?.stage ?? "welcome",
    sectionId: legacy?.sectionId ?? 1,
    completedSections: Array.from({ length: count }, (_, i) => i + 1),
  };
}

function migrateV2(raw: LegacyDraftV2): OnboardingDraft {
  return mergeWithDefaults({
    updatedAt: raw.updatedAt,
    currentRoute: raw.currentRoute,
    navigation: migrateNavigationV2ToV3(raw.navigation),
    section1: raw.section1 as Section1Data | undefined,
    // section2 did not exist yet — mergeWithDefaults fills it in.
  });
}

/**
 * v3 had `navigation` in its final (current) shape already — only
 * `section2` is new in v4. No navigation reshaping needed; Section 1
 * answers and navigation/progress carry over untouched.
 */
type LegacyDraftV3 = {
  schemaVersion: 3;
  updatedAt?: string;
  currentRoute?: string;
  navigation?: OnboardingNavigation;
  section1?: Partial<Section1Data>;
};

function migrateV3(raw: LegacyDraftV3): OnboardingDraft {
  return mergeWithDefaults({
    updatedAt: raw.updatedAt,
    currentRoute: raw.currentRoute,
    navigation: raw.navigation,
    section1: raw.section1 as Section1Data | undefined,
    // section2 did not exist yet — mergeWithDefaults fills it in
    // with fresh, unanswered defaults (no MD-approved defaults exist
    // for Q14–Q25, so a blank starting state is correct).
  });
}

/**
 * v4 had `section1`/`section2` in their final (current) shape already
 * — only `section3` and the shared `contacts` registry are new in v5.
 * Section 1 and Section 2 answers, navigation, and completed-section
 * progress all carry over untouched.
 */
type LegacyDraftV4 = {
  schemaVersion: 4;
  updatedAt?: string;
  currentRoute?: string;
  navigation?: OnboardingNavigation;
  section1?: Partial<Section1Data>;
  section2?: Partial<Section2Data>;
};

function migrateV4(raw: LegacyDraftV4): OnboardingDraft {
  return mergeWithDefaults({
    updatedAt: raw.updatedAt,
    currentRoute: raw.currentRoute,
    navigation: raw.navigation,
    section1: raw.section1 as Section1Data | undefined,
    section2: raw.section2 as Section2Data | undefined,
    // section3/contacts/section4/fees did not exist yet — defaults fill in.
  });
}

/**
 * v5 had section1–3 + contacts in their final shape — only `section4`
 * and the shared `fees` registry are new in v6.
 */
type LegacyDraftV5 = {
  schemaVersion: 5;
  updatedAt?: string;
  currentRoute?: string;
  navigation?: OnboardingNavigation;
  section1?: Partial<Section1Data>;
  section2?: Partial<Section2Data>;
  section3?: Partial<Section3Data>;
  contacts?: Contact[];
};

function migrateV5(raw: LegacyDraftV5): OnboardingDraft {
  return mergeWithDefaults({
    updatedAt: raw.updatedAt,
    currentRoute: raw.currentRoute,
    navigation: raw.navigation,
    section1: raw.section1 as Section1Data | undefined,
    section2: raw.section2 as Section2Data | undefined,
    section3: raw.section3 as Section3Data | undefined,
    contacts: raw.contacts,
    // section4/fees did not exist yet — mergeWithDefaults fills them.
  });
}

type LegacyDraftV6 = {
  schemaVersion: 6;
  updatedAt?: string;
  currentRoute?: string;
  navigation?: OnboardingNavigation;
  section1?: Partial<Section1Data>;
  section2?: Partial<Section2Data>;
  section3?: Partial<Section3Data>;
  section4?: Partial<Section4Data>;
  contacts?: Contact[];
  fees?: FeeRecord[];
};

function migrateFeeRecordV6ToV7(fee: FeeRecord): FeeRecord {
  const categoryTemplate = fee.categoryTemplate ?? "";
  let amountKind = fee.amountKind;
  if (!amountKind && fee.amountFixed.trim()) {
    amountKind = "fixed";
  }
  return { ...fee, categoryTemplate, amountKind };
}

function migrateV6(raw: LegacyDraftV6): OnboardingDraft {
  const fees = (raw.fees ?? []).map(migrateFeeRecordV6ToV7);
  return migrateV7({
    ...raw,
    schemaVersion: 7,
    fees,
  } as LegacyDraftV7);
}

type LegacyDraftV7 = {
  schemaVersion: 7;
  updatedAt?: string;
  currentRoute?: string;
  navigation?: OnboardingNavigation;
  section1?: Partial<Section1Data>;
  section2?: Partial<Section2Data>;
  section3?: Partial<Section3Data>;
  section4?: Partial<Section4Data>;
  section5?: Partial<Section5Data>;
  contacts?: Contact[];
  fees?: FeeRecord[];
};

function migrateV7(raw: LegacyDraftV7): OnboardingDraft {
  const fees = (raw.fees ?? []).map(migrateFeeRecordV6ToV7);
  return migrateV8({
    schemaVersion: 8,
    updatedAt: raw.updatedAt,
    currentRoute: raw.currentRoute,
    navigation: raw.navigation,
    section1: raw.section1,
    section2: raw.section2,
    section3: raw.section3,
    section4: raw.section4,
    section5: raw.section5,
    contacts: raw.contacts,
    fees,
  } as LegacyDraftV8);
}

type LegacyDraftV8 = {
  schemaVersion: 8;
  updatedAt?: string;
  currentRoute?: string;
  navigation?: OnboardingNavigation;
  section1?: Partial<Section1Data>;
  section2?: Partial<Section2Data>;
  section3?: Partial<Section3Data>;
  section4?: Partial<Section4Data>;
  section5?: Partial<Section5Data>;
  section6?: Partial<Section6Data>;
  contacts?: Contact[];
  fees?: FeeRecord[];
};

function migrateV8(raw: LegacyDraftV8): OnboardingDraft {
  const fees = (raw.fees ?? []).map(migrateFeeRecordV6ToV7);
  return mergeWithDefaults({
    updatedAt: raw.updatedAt,
    currentRoute: raw.currentRoute,
    navigation: raw.navigation,
    section1: raw.section1 as Section1Data | undefined,
    section2: raw.section2 as Section2Data | undefined,
    section3: raw.section3 as Section3Data | undefined,
    section4: raw.section4 as Section4Data | undefined,
    section5: raw.section5 as Section5Data | undefined,
    section6: raw.section6 as Section6Data | undefined,
    contacts: raw.contacts,
    fees,
    // section7 did not exist yet — mergeWithDefaults fills it.
  });
}

/**
 * Migrate a raw persisted value (any prior schema version, or garbage)
 * into the current OnboardingDraft shape, preserving customer answers
 * wherever a deterministic upgrade path exists.
 */
export function migrateDraft(raw: unknown): OnboardingDraft {
  if (!raw || typeof raw !== "object") {
    return createDefaultDraft();
  }

  const version = (raw as { schemaVersion?: unknown }).schemaVersion;

  if (version === SCHEMA_VERSION) {
    const merged = mergeWithDefaults(raw as Partial<OnboardingDraft>);
    return {
      ...merged,
      fees: merged.fees.map(migrateFeeRecordV6ToV7),
    };
  }

  if (version === 8) {
    return migrateV8(raw as LegacyDraftV8);
  }

  if (version === 7) {
    return migrateV7(raw as LegacyDraftV7);
  }

  if (version === 6) {
    return migrateV6(raw as LegacyDraftV6);
  }

  if (version === 5) {
    return migrateV5(raw as LegacyDraftV5);
  }

  if (version === 4) {
    return migrateV4(raw as LegacyDraftV4);
  }

  if (version === 3) {
    return migrateV3(raw as LegacyDraftV3);
  }

  if (version === 2) {
    return migrateV2(raw as LegacyDraftV2);
  }

  // v1 (double-boolean service schedule) or any unrecognized/missing
  // version: no deterministic upgrade path exists yet. Documented,
  // narrow exception — reset rather than risk a malformed hybrid state.
  return createDefaultDraft();
}
