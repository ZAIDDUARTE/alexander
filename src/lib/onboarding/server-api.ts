import type { OnboardingDraft } from "./types";
import {
  fromRedisDraft,
  toRedisDraft,
  type RedisOnboardingDraft,
} from "./draft-utils";
import type { DraftSaveResult } from "./autosave";

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
  try {
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
  } catch {
    return { draft: null, redisAvailable: false, durableAvailable: false, persistence: "unavailable" };
  }
}

function failureResult(
  partial?: Partial<DraftSaveResult>,
): DraftSaveResult {
  return {
    ok: false,
    redisAvailable: false,
    savedToRedis: false,
    savedDurable: false,
    durableAvailable: false,
    persistence: "unavailable",
    ...partial,
  };
}

export async function putServerDraft(
  draft: OnboardingDraft,
  currentRoute: string,
  options?: { keepalive?: boolean },
): Promise<DraftSaveResult> {
  const payload = toRedisDraft(
    { ...draft, updatedAt: draft.updatedAt || new Date().toISOString() },
    currentRoute,
  );

  let res: Response;
  try {
    res = await fetch("/api/onboarding/draft", {
      method: "PUT",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draft: payload }),
      keepalive: options?.keepalive ?? false,
    });
  } catch {
    // Network/abort failures must not surface as uncaught TypeError: Failed to fetch.
    return failureResult({ reason: "network_error" });
  }

  let body: {
    ok?: boolean;
    reason?: string;
    draft?: RedisOnboardingDraft | null;
    redisAvailable?: boolean;
    savedToRedis?: boolean;
    savedDurable?: boolean;
    durableAvailable?: boolean;
    persistence?: PersistenceModeName;
  } = {};
  try {
    body = (await res.json()) as typeof body;
  } catch {
    body = {};
  }

  if (!res.ok || !body.ok) {
    return failureResult({
      reason: body.reason ?? (res.status === 409 ? "stale_draft" : "save_failed"),
      draft: body.draft ? fromRedisDraft(body.draft) : null,
      redisAvailable: body.redisAvailable ?? false,
      savedToRedis: false,
      savedDurable: false,
      durableAvailable: body.durableAvailable ?? false,
      persistence: body.persistence ?? "unavailable",
    });
  }

  return {
    ok: true,
    redisAvailable: body.redisAvailable ?? false,
    savedToRedis: body.savedToRedis ?? false,
    savedDurable: body.savedDurable ?? false,
    durableAvailable: body.durableAvailable ?? false,
    persistence: body.persistence ?? "unavailable",
    draft: body.draft ? fromRedisDraft(body.draft) : null,
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
  let res: Response;
  try {
    res = await fetch("/api/onboarding/submit", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draft: payload }),
    });
  } catch {
    return {
      ok: false,
      reason: "network_error",
      redisAvailable: false,
      savedToRedis: false,
      savedDurable: false,
    };
  }
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
