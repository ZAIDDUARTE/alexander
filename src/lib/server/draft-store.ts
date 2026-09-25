import type { RedisOnboardingDraft } from "@/lib/onboarding/draft-utils";
import { toRedisDraft } from "@/lib/onboarding/draft-utils";
import { migrateDraft } from "@/lib/onboarding/migrate";
import { SCHEMA_VERSION, type OnboardingDraft, type OnboardingStage } from "@/lib/onboarding/types";
import { getRedisClient, onboardingDraftKey } from "./redis";

const DRAFT_TTL_SECONDS = 60 * 60 * 24 * 365;

/**
 * Strict check for the *current* Redis envelope (schema v4+). Used by
 * PUT so clients cannot write an incomplete/legacy shape.
 */
export function isValidRedisDraft(value: unknown): value is RedisOnboardingDraft {
  if (!value || typeof value !== "object") return false;
  const v = value as RedisOnboardingDraft;
  if (v.schemaVersion !== SCHEMA_VERSION) return false;
  if (typeof v.updatedAt !== "string") return false;
  if (typeof v.currentRoute !== "string") return false;
  if (typeof v.currentSection !== "number") return false;
  if (!Array.isArray(v.completedSections)) return false;
  if (!v.data || typeof v.data !== "object") return false;
  if (!v.data.navigation || !v.data.section1 || !v.data.section2) return false;
  if (!v.data.section3 || !Array.isArray(v.data.contacts)) return false;
  if (!v.data.section4 || !v.data.section5 || !v.data.section6 || !Array.isArray(v.data.fees)) {
    return false;
  }
  return true;
}

/**
 * Loose envelope check for anything Redis may still hold from a prior
 * schema version. Must not require `section2` or the current
 * SCHEMA_VERSION — `migrateStoredRedisDraft` upgrades after this gate.
 */
export function isReadableStoredDraft(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.schemaVersion !== "number") return false;
  if (typeof v.updatedAt !== "string") return false;
  if (typeof v.currentRoute !== "string") return false;
  if (!v.data || typeof v.data !== "object") return false;
  return true;
}

/**
 * raw stored Redis draft → migrateDraft → current RedisOnboardingDraft.
 *
 * This is the server-side counterpart of localStorage's
 * `loadLocalDraft` → `migrateDraft` path. Without it, a still-valid
 * v3 Redis draft would fail `isValidRedisDraft` (expects v4 +
 * section2) and become unreadable.
 */
export function migrateStoredRedisDraft(raw: unknown): RedisOnboardingDraft | null {
  if (!isReadableStoredDraft(raw)) return null;

  const v = raw as {
    schemaVersion: number;
    updatedAt: string;
    currentRoute: string;
    currentSection?: number;
    completedSections?: number[];
    data: {
      navigation?: OnboardingDraft["navigation"];
      section1?: OnboardingDraft["section1"];
      section2?: OnboardingDraft["section2"];
      section3?: OnboardingDraft["section3"];
      section4?: OnboardingDraft["section4"];
      section5?: OnboardingDraft["section5"];
      contacts?: OnboardingDraft["contacts"];
      fees?: OnboardingDraft["fees"];
    };
  };

  const draftLike: Partial<OnboardingDraft> & { schemaVersion: number } = {
    schemaVersion: v.schemaVersion,
    updatedAt: v.updatedAt,
    currentRoute: v.currentRoute,
    navigation:
      v.data.navigation ??
      ({
        stage: "welcome" as OnboardingStage,
        sectionId: typeof v.currentSection === "number" ? v.currentSection : 1,
        completedSections: Array.isArray(v.completedSections) ? v.completedSections : [],
      } satisfies OnboardingDraft["navigation"]),
    section1: v.data.section1,
    section2: v.data.section2,
    section3: v.data.section3,
    section4: v.data.section4,
    section5: v.data.section5,
    contacts: v.data.contacts,
    fees: v.data.fees,
  };

  const migrated = migrateDraft(draftLike);
  const redis = toRedisDraft(migrated, v.currentRoute || migrated.currentRoute || "/onboarding");
  // Preserve the stored updatedAt so reconciliation timestamps stay honest.
  redis.updatedAt = v.updatedAt || migrated.updatedAt;
  return redis;
}

export async function readOnboardingDraft(
  sessionId: string,
): Promise<RedisOnboardingDraft | null> {
  const redis = await getRedisClient();
  if (!redis) return null;

  try {
    const raw = await redis.get(onboardingDraftKey(sessionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return migrateStoredRedisDraft(parsed);
  } catch {
    return null;
  }
}

export async function writeOnboardingDraft(
  sessionId: string,
  draft: RedisOnboardingDraft,
): Promise<boolean> {
  const redis = await getRedisClient();
  if (!redis) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[onboarding] REDIS_URL not set; skipping Redis draft write");
    }
    return false;
  }

  try {
    await redis.set(onboardingDraftKey(sessionId), JSON.stringify(draft), {
      EX: DRAFT_TTL_SECONDS,
    });
    return true;
  } catch {
    return false;
  }
}

export async function deleteOnboardingDraft(sessionId: string): Promise<boolean> {
  const redis = await getRedisClient();
  if (!redis) return false;
  try {
    await redis.del(onboardingDraftKey(sessionId));
    return true;
  } catch {
    return false;
  }
}
