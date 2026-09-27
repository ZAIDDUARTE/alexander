import { fromRedisDraft, toRedisDraft, type RedisOnboardingDraft } from "@/lib/onboarding/draft-utils";
import { migrateDraft } from "@/lib/onboarding/migrate";
import { normalizeOnboardingDraft } from "@/lib/onboarding/normalizeOnboarding";
import { prepareSubmission } from "@/lib/onboarding/submission";
import { createDefaultDraft, SCHEMA_VERSION } from "@/lib/onboarding/types";
import { isValidRedisDraft, writeOnboardingDraft } from "@/lib/server/draft-store";
import { getRedisClient } from "@/lib/server/redis";
import { getOnboardingStore } from "@/lib/server/onboarding-store";
import { resolvePersistenceMode } from "@/lib/server/persistence/mode";
import { acknowledgeStoredSubmission } from "@/lib/server/persistence/submit-ack";

export async function redisAvailable(): Promise<boolean> {
  if (!process.env.REDIS_URL) return false;
  const client = await getRedisClient();
  return client !== null;
}

async function mirrorRedis(sessionId: string, draft: RedisOnboardingDraft): Promise<boolean> {
  try {
    return await writeOnboardingDraft(sessionId, draft);
  } catch {
    return false;
  }
}

export async function getDraftResponse(sessionId: string) {
  const persistence = resolvePersistenceMode();
  const available = await redisAvailable();
  const store = getOnboardingStore();
  const loaded = await store.getDraft(sessionId);
  if (!loaded.ok) {
    return {
      status: 503,
      body: {
        draft: null,
        redisAvailable: available,
        durableAvailable: false,
        persistence,
        savedDurable: false,
      },
    };
  }
  return {
    status: 200,
    body: {
      draft: loaded.draft,
      redisAvailable: available,
      durableAvailable: persistence === "durable",
      persistence,
      savedDurable: false,
    },
  };
}

export async function putDraftResponse(sessionId: string, body: unknown) {
  const persistence = resolvePersistenceMode();
  const available = await redisAvailable();
  const incoming = (body as { draft?: unknown } | null)?.draft;
  if (!isValidRedisDraft(incoming)) {
    return {
      status: 400,
      body: {
        ok: false,
        reason: "invalid_draft",
        redisAvailable: available,
        durableAvailable: persistence === "durable",
        persistence,
        savedDurable: false,
        savedToRedis: false,
      },
    };
  }

  const store = getOnboardingStore();
  const current = await store.getDraft(sessionId);
  if (current.ok && current.draft) {
    const storedAt = Date.parse(current.draft.updatedAt);
    const incomingAt = Date.parse(incoming.updatedAt);
    if (Number.isFinite(storedAt) && Number.isFinite(incomingAt) && incomingAt < storedAt) {
      return {
        status: 409,
        body: {
          ok: false,
          reason: "stale_draft",
          draft: current.draft,
          redisAvailable: available,
          durableAvailable: persistence === "durable",
          persistence,
          savedDurable: false,
          savedToRedis: false,
        },
      };
    }
  }

  const clientDraft = fromRedisDraft(incoming);
  const defaults = createDefaultDraft();
  const merged = {
    ...defaults,
    ...clientDraft,
    schemaVersion: SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    navigation: { ...defaults.navigation, ...clientDraft.navigation },
    section1: { ...defaults.section1, ...clientDraft.section1 },
    section2: { ...defaults.section2, ...clientDraft.section2 },
    section3: { ...defaults.section3, ...clientDraft.section3 },
    section4: { ...defaults.section4, ...clientDraft.section4 },
    section5: { ...defaults.section5, ...clientDraft.section5 },
    section6: { ...defaults.section6, ...clientDraft.section6 },
    section7: { ...defaults.section7, ...clientDraft.section7 },
    section8: { ...defaults.section8, ...clientDraft.section8 },
    contacts: clientDraft.contacts ?? defaults.contacts,
    fees: clientDraft.fees ?? defaults.fees,
    systems: clientDraft.systems ?? defaults.systems,
    submission: {
      ...defaults.submission,
      ...clientDraft.submission,
      confirmations: {
        ...defaults.submission.confirmations,
        ...clientDraft.submission?.confirmations,
      },
    },
  };
  const payload = toRedisDraft(merged, incoming.currentRoute || "/onboarding");
  payload.updatedAt = merged.updatedAt;

  const saved = await store.saveDraft(sessionId, payload);
  if (!saved.ok && saved.reason === "stale_draft") {
    return {
      status: 409,
      body: {
        ok: false,
        reason: "stale_draft",
        draft: saved.draft ?? null,
        redisAvailable: available,
        durableAvailable: persistence === "durable",
        persistence,
        savedDurable: false,
        savedToRedis: false,
      },
    };
  }

  const savedDurable = saved.ok && (persistence === "durable" || persistence === "local");
  const savedToRedis = savedDurable ? await mirrorRedis(sessionId, saved.ok ? saved.draft : payload) : false;
  if (!saved.ok || !savedDurable) {
    return {
      status: persistence === "unavailable" ? 503 : 500,
      body: {
        ok: false,
        reason: saved.ok ? "persistence_unavailable" : saved.reason,
        redisAvailable: available,
        durableAvailable: persistence === "durable",
        persistence,
        savedDurable: false,
        savedToRedis,
      },
    };
  }

  return {
    status: 200,
    body: {
      ok: true,
      redisAvailable: available,
      savedToRedis,
      durableAvailable: persistence === "durable",
      savedDurable: persistence === "durable",
      persistence,
      draft: saved.draft,
    },
  };
}

export async function submitDraftResponse(sessionId: string, body: unknown) {
  const persistence = resolvePersistenceMode();
  const available = await redisAvailable();
  const base = {
    redisAvailable: available,
    durableAvailable: persistence === "durable",
    persistence,
    savedDurable: false,
    savedToRedis: false,
  };

  const incoming = (body as { draft?: unknown } | null)?.draft;
  if (!incoming || !isValidRedisDraft(incoming)) {
    return { status: 400, body: { ok: false, reason: "missing_draft", ...base } };
  }

  const draft = migrateDraft(fromRedisDraft(incoming));
  if (draft.schemaVersion !== SCHEMA_VERSION) {
    return { status: 400, body: { ok: false, reason: "schema_mismatch", ...base } };
  }

  const prepared = prepareSubmission(draft);
  if (!prepared.ok) {
    return {
      status: 422,
      body: {
        ok: false,
        reason: prepared.reason,
        invalidSectionIds: prepared.invalidSectionIds,
        ...base,
      },
    };
  }

  const submitted = prepared.draft;
  const contentRevision = submitted.submission.lastSubmittedContentRevision;
  const submittedAt = submitted.submission.submittedAt;
  if (!contentRevision || !submittedAt) {
    return { status: 422, body: { ok: false, reason: "invalid_sections", ...base } };
  }

  if (persistence === "unavailable" || (persistence === "local" && process.env.NODE_ENV === "production")) {
    return {
      status: 503,
      body: { ok: false, reason: "persistence_unavailable", ...base },
    };
  }

  const redisPayload = toRedisDraft(submitted, submitted.currentRoute || "/onboarding/review");
  redisPayload.updatedAt = submitted.updatedAt;
  const normalized = normalizeOnboardingDraft(submitted);
  const store = getOnboardingStore();
  let storeResult: Awaited<ReturnType<typeof store.submitDraft>>;
  try {
    storeResult = await store.submitDraft({
      sessionId,
      draft: redisPayload,
      normalized,
      contentRevision,
      submittedAt,
    });
  } catch {
    storeResult = { ok: false, reason: "database_failed" };
  }

  const ack = acknowledgeStoredSubmission({
    mode: persistence,
    nodeEnv: process.env.NODE_ENV,
    storeResult: storeResult.ok
      ? { ok: true, duplicate: storeResult.duplicate }
      : { ok: false, reason: storeResult.reason === "persistence_unavailable" ? "database_failed" : storeResult.reason },
  });

  if (!ack.ok || !storeResult.ok) {
    return {
      status: ack.ok ? 503 : ack.httpStatus,
      body: {
        ok: false,
        reason: ack.ok ? "persistence_unavailable" : ack.reason,
        ...base,
      },
    };
  }

  const savedToRedis = await mirrorRedis(sessionId, storeResult.draft);
  return {
    status: 200,
    body: {
      ok: true,
      duplicate: prepared.duplicate || storeResult.duplicate,
      redisAvailable: available,
      savedToRedis,
      durableAvailable: persistence === "durable",
      savedDurable: persistence === "durable" || persistence === "local",
      persistence,
      draft: storeResult.draft,
      submittedAt: storeResult.submittedAt,
      submission: storeResult.draft.data.submission,
    },
  };
}
