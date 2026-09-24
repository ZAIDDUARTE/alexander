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
