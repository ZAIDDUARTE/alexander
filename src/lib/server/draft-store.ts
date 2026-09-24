import type { RedisOnboardingDraft } from "@/lib/onboarding/draft-utils";
import { SCHEMA_VERSION } from "@/lib/onboarding/types";
import { getRedisClient, onboardingDraftKey } from "./redis";

const DRAFT_TTL_SECONDS = 60 * 60 * 24 * 365;

export function isValidRedisDraft(value: unknown): value is RedisOnboardingDraft {
  if (!value || typeof value !== "object") return false;
  const v = value as RedisOnboardingDraft;
  if (v.schemaVersion !== SCHEMA_VERSION) return false;
  if (typeof v.updatedAt !== "string") return false;
  if (typeof v.currentRoute !== "string") return false;
  if (typeof v.currentSection !== "number") return false;
  if (!Array.isArray(v.completedSections)) return false;
  if (!v.data || typeof v.data !== "object") return false;
  if (!v.data.navigation || !v.data.section1) return false;
  return true;
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
    if (!isValidRedisDraft(parsed)) return null;
    return parsed;
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
