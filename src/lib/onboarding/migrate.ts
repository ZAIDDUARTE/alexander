import {
  createDefaultDraft,
  SCHEMA_VERSION,
  type OnboardingDraft,
  type OnboardingNavigation,
  type OnboardingStage,
  type Section1Data,
  type Section2Data,
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
    // section3/contacts did not exist yet — mergeWithDefaults fills
    // them in with fresh, unanswered defaults and one freshly
    // generated primary-contact placeholder (no MD-approved defaults
    // exist for Q26–Q38, so a blank starting state is correct).
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
    return mergeWithDefaults(raw as Partial<OnboardingDraft>);
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
