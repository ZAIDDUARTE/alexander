import type { OnboardingDraft } from "./types";
import {
  fromRedisDraft,
  toRedisDraft,
  type RedisOnboardingDraft,
} from "./draft-utils";

export type FetchDraftResponse = {
  draft: RedisOnboardingDraft | null;
  redisAvailable: boolean;
};

export async function fetchServerDraft(): Promise<{
  draft: OnboardingDraft | null;
  redisAvailable: boolean;
}> {
  const res = await fetch("/api/onboarding/draft", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });

  if (!res.ok) {
    return { draft: null, redisAvailable: false };
  }

  const body = (await res.json()) as FetchDraftResponse;
  if (!body.draft) {
    return { draft: null, redisAvailable: body.redisAvailable };
  }

  return {
    draft: fromRedisDraft(body.draft),
    redisAvailable: body.redisAvailable,
  };
}

export async function putServerDraft(
  draft: OnboardingDraft,
  currentRoute: string,
  options?: { keepalive?: boolean },
): Promise<{ ok: boolean; redisAvailable: boolean; savedToRedis: boolean }> {
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
    return { ok: false, redisAvailable: false, savedToRedis: false };
  }

  const body = (await res.json()) as {
    ok: boolean;
    redisAvailable: boolean;
    savedToRedis?: boolean;
  };
  return {
    ok: body.ok,
    redisAvailable: body.redisAvailable,
    savedToRedis: body.savedToRedis ?? false,
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
  };
  if (!body.ok || !body.draft) {
    return {
      ok: false,
      reason: body.reason,
      invalidSectionIds: body.invalidSectionIds,
      redisAvailable: body.redisAvailable ?? false,
      savedToRedis: false,
    };
  }
  return {
    ok: true,
    draft: fromRedisDraft(body.draft),
    submittedAt: body.submittedAt,
    redisAvailable: body.redisAvailable ?? false,
    savedToRedis: body.savedToRedis ?? false,
  };
}
