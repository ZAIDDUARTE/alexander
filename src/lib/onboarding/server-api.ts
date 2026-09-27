import type { OnboardingDraft } from "./types";
import {
  fromRedisDraft,
  toRedisDraft,
  type RedisOnboardingDraft,
} from "./draft-utils";

export type PersistenceModeName = "durable" | "local" | "unavailable";

export type FetchDraftResponse = {
  draft: RedisOnboardingDraft | null;
  redisAvailable: boolean;
  durableAvailable?: boolean;
  persistence?: PersistenceModeName;
};

export async function fetchServerDraft(): Promise<{
  draft: OnboardingDraft | null;
  redisAvailable: boolean;
  durableAvailable: boolean;
  persistence: PersistenceModeName;
}> {
  const res = await fetch("/api/onboarding/draft", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });

  if (!res.ok) {
    return { draft: null, redisAvailable: false, durableAvailable: false, persistence: "unavailable" };
  }

  const body = (await res.json()) as FetchDraftResponse;
  const persistence = body.persistence ?? "unavailable";
  const durableAvailable = body.durableAvailable ?? false;
  if (!body.draft) {
    return { draft: null, redisAvailable: body.redisAvailable, durableAvailable, persistence };
  }

  return {
    draft: fromRedisDraft(body.draft),
    redisAvailable: body.redisAvailable,
    durableAvailable,
    persistence,
  };
}

export async function putServerDraft(
  draft: OnboardingDraft,
  currentRoute: string,
  options?: { keepalive?: boolean },
): Promise<{
  ok: boolean;
  redisAvailable: boolean;
  savedToRedis: boolean;
  savedDurable: boolean;
  durableAvailable: boolean;
  persistence: PersistenceModeName;
}> {
  const payload = toRedisDraft(
    { ...draft, updatedAt: draft.updatedAt || new Date().toISOString() },
    currentRoute,
  );
  const res = await fetch("/api/onboarding/draft", {
    method: "PUT",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ draft: payload }),
    keepalive: options?.keepalive ?? false,
  });

  if (!res.ok) {
    let persistence: PersistenceModeName = "unavailable";
    let durableAvailable = false;
    try {
      const failed = (await res.json()) as { persistence?: PersistenceModeName; durableAvailable?: boolean };
      persistence = failed.persistence ?? "unavailable";
      durableAvailable = failed.durableAvailable ?? false;
    } catch {
      persistence = "unavailable";
    }
    return {
      ok: false,
      redisAvailable: false,
      savedToRedis: false,
      savedDurable: false,
      durableAvailable,
      persistence,
    };
  }

  const body = (await res.json()) as {
    ok: boolean;
    redisAvailable: boolean;
    savedToRedis?: boolean;
    savedDurable?: boolean;
    durableAvailable?: boolean;
    persistence?: PersistenceModeName;
  };
  return {
    ok: body.ok,
    redisAvailable: body.redisAvailable,
    savedToRedis: body.savedToRedis ?? false,
    savedDurable: body.savedDurable ?? false,
    durableAvailable: body.durableAvailable ?? false,
    persistence: body.persistence ?? "unavailable",
  };
}

export async function postQuestionnaireSubmit(draft: OnboardingDraft): Promise<{
  ok: boolean;
  reason?: string;
  invalidSectionIds?: number[];
  draft?: OnboardingDraft;
  submittedAt?: string | null;
  duplicate?: boolean;
  redisAvailable: boolean;
  savedToRedis: boolean;
  savedDurable: boolean;
}> {
  const payload = toRedisDraft(
    { ...draft, updatedAt: draft.updatedAt || new Date().toISOString() },
    draft.currentRoute || "/onboarding/review",
  );
  const res = await fetch("/api/onboarding/submit", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ draft: payload }),
  });
  const body = (await res.json()) as {
    ok: boolean;
    reason?: string;
    invalidSectionIds?: number[];
    draft?: RedisOnboardingDraft;
    submittedAt?: string | null;
    duplicate?: boolean;
    redisAvailable?: boolean;
    savedToRedis?: boolean;
    savedDurable?: boolean;
  };
  if (!body.ok || !body.draft) {
    return {
      ok: false,
      reason: body.reason,
      invalidSectionIds: body.invalidSectionIds,
      redisAvailable: body.redisAvailable ?? false,
      savedToRedis: false,
      savedDurable: false,
    };
  }
  return {
    ok: true,
    draft: fromRedisDraft(body.draft),
    submittedAt: body.submittedAt,
    duplicate: body.duplicate,
    redisAvailable: body.redisAvailable ?? false,
    savedToRedis: body.savedToRedis ?? false,
    savedDurable: body.savedDurable ?? false,
  };
}
