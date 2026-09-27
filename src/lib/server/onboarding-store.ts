import type { RedisOnboardingDraft } from "@/lib/onboarding/draft-utils";
import { readOnboardingDraft, writeOnboardingDraft } from "@/lib/server/draft-store";
import { invokePersistenceLambda } from "@/lib/server/aws-persistence";
import { handlePersistenceOperation, type PersistenceFailure } from "@/lib/server/persistence/engine";
import { createMemoryPorts } from "@/lib/server/persistence/memory";
import { resolvePersistenceMode, type PersistenceKind } from "@/lib/server/persistence/mode";
import { selectDraftSource } from "@/lib/server/persistence/redis-import";
import type { DraftEnvelope } from "@/lib/server/persistence/types";
import { createLineLogger } from "@/lib/server/persistence/logger";

export type StoreDraftResult =
  | { ok: true; draft: RedisOnboardingDraft; version: number | null }
  | { ok: false; reason: PersistenceFailure | "persistence_unavailable"; draft?: RedisOnboardingDraft };

export type StoreSubmitInput = {
  sessionId: string;
  draft: RedisOnboardingDraft;
  normalized: unknown;
  contentRevision: string;
  submittedAt: string;
};

export type StoreSubmitResult =
  | { ok: true; duplicate: boolean; draft: RedisOnboardingDraft; submittedAt: string }
  | { ok: false; reason: PersistenceFailure | "persistence_unavailable" };

export interface DurableOnboardingStore {
  mode: PersistenceKind;
  getDraft(sessionId: string): Promise<{ ok: true; draft: RedisOnboardingDraft | null } | { ok: false; reason: string }>;
  saveDraft(sessionId: string, draft: RedisOnboardingDraft): Promise<StoreDraftResult>;
  submitDraft(input: StoreSubmitInput): Promise<StoreSubmitResult>;
  health(): Promise<{ durablePersistence: boolean; database: string; snapshotStorage: string }>;
}

const log = createLineLogger();

function asRedisDraft(value: unknown): RedisOnboardingDraft | null {
  if (!value || typeof value !== "object") return null;
  return value as RedisOnboardingDraft;
}

function createMemoryStore(mode: PersistenceKind): DurableOnboardingStore {
  const ports = createMemoryPorts();
  return {
    mode,
    async getDraft(sessionId) {
      const result = await handlePersistenceOperation({ operation: "getDraft", sessionId }, ports, log);
      if (!result.ok) return { ok: false, reason: String(result.reason ?? "database_failed") };
      return { ok: true, draft: asRedisDraft(result.draft) };
    },
    async saveDraft(sessionId, draft) {
      const result = await handlePersistenceOperation(
        { operation: "upsertDraft", sessionId, draft },
        ports,
        log,
      );
      if (!result.ok) {
        return {
          ok: false,
          reason: (result.reason as PersistenceFailure) ?? "database_failed",
          draft: asRedisDraft(result.draft) ?? undefined,
        };
      }
      return { ok: true, draft: asRedisDraft(result.draft) ?? draft, version: Number(result.version ?? 0) };
    },
    async submitDraft(input) {
      const result = await handlePersistenceOperation({ operation: "submitDraft", ...input }, ports, log);
      if (!result.ok) return { ok: false, reason: (result.reason as PersistenceFailure) ?? "database_failed" };
      const draft = asRedisDraft(result.draft);
      if (!draft) return { ok: false, reason: "database_failed" };
      return {
        ok: true,
        duplicate: result.duplicate === true,
        draft,
        submittedAt: String(result.submittedAt ?? input.submittedAt),
      };
    },
    async health() {
      return { durablePersistence: false, database: "local", snapshotStorage: "local" };
    },
  };
}

function createAwsStore(): DurableOnboardingStore {
  return {
    mode: "durable",
    async getDraft(sessionId) {
      const invoked = await invokePersistenceLambda({ operation: "getDraft", sessionId });
      const payload = invoked.payload as { ok?: boolean; draft?: unknown; reason?: string } | null;
      if (!invoked.ok || !payload?.ok) return { ok: false, reason: payload?.reason ?? "database_failed" };
      return { ok: true, draft: asRedisDraft(payload.draft) };
    },
    async saveDraft(sessionId, draft) {
      const invoked = await invokePersistenceLambda({ operation: "upsertDraft", sessionId, draft });
      const payload = invoked.payload as {
        ok?: boolean;
        draft?: unknown;
        version?: number;
        reason?: string;
      } | null;
      if (!invoked.ok || !payload?.ok) {
        return {
          ok: false,
          reason: (payload?.reason as PersistenceFailure) ?? "database_failed",
          draft: asRedisDraft(payload?.draft) ?? undefined,
        };
      }
      return { ok: true, draft: asRedisDraft(payload.draft) ?? draft, version: payload.version ?? null };
    },
    async submitDraft(input) {
      const invoked = await invokePersistenceLambda({ operation: "submitDraft", ...input });
      const payload = invoked.payload as {
        ok?: boolean;
        duplicate?: boolean;
        draft?: unknown;
        submittedAt?: string;
        reason?: string;
      } | null;
      if (!invoked.ok || !payload?.ok) {
        return { ok: false, reason: (payload?.reason as PersistenceFailure) ?? "database_failed" };
      }
      const draft = asRedisDraft(payload.draft);
      if (!draft) return { ok: false, reason: "database_failed" };
      return {
        ok: true,
        duplicate: payload.duplicate === true,
        draft,
        submittedAt: payload.submittedAt ?? input.submittedAt,
      };
    },
    async health() {
      const invoked = await invokePersistenceLambda({ operation: "health" });
      const payload = invoked.payload as {
        database?: string;
        snapshotStorage?: string;
      } | null;
      return {
        durablePersistence: true,
        database: payload?.database === "ok" ? "ok" : "error",
        snapshotStorage: payload?.snapshotStorage === "ok" ? "ok" : "error",
      };
    },
  };
}

async function importRedisIfNewer(
  sessionId: string,
  store: DurableOnboardingStore,
  durable: RedisOnboardingDraft | null,
): Promise<RedisOnboardingDraft | null> {
  let redis: RedisOnboardingDraft | null = null;
  try {
    redis = await readOnboardingDraft(sessionId);
  } catch {
    redis = null;
  }
  const source = selectDraftSource(durable, redis);
  if (source !== "redis" || !redis) return durable;
  const saved = await store.saveDraft(sessionId, redis);
  if (!saved.ok) return durable;
  return saved.draft;
}

export function createDurableOnboardingStore(env: NodeJS.ProcessEnv = process.env): DurableOnboardingStore {
  const mode = resolvePersistenceMode(env);
  if (mode === "durable") {
    const aws = createAwsStore();
    return {
      ...aws,
      async getDraft(sessionId) {
        const current = await aws.getDraft(sessionId);
        if (!current.ok) return current;
        const draft = await importRedisIfNewer(sessionId, aws, current.draft);
        return { ok: true, draft };
      },
    };
  }
  if (mode === "local") return createMemoryStore("local");
  return {
    mode: "unavailable",
    async getDraft(sessionId) {
      try {
        const redis = await readOnboardingDraft(sessionId);
        return { ok: true, draft: redis };
      } catch {
        return { ok: true, draft: null };
      }
    },
    async saveDraft(sessionId, draft) {
      const mirrored = await writeOnboardingDraft(sessionId, draft);
      return mirrored
        ? { ok: false, reason: "persistence_unavailable", draft }
        : { ok: false, reason: "persistence_unavailable" };
    },
    async submitDraft() {
      return { ok: false, reason: "persistence_unavailable" };
    },
    async health() {
      return { durablePersistence: false, database: "unavailable", snapshotStorage: "unavailable" };
    },
  };
}

let testStore: DurableOnboardingStore | null = null;
let cached: { key: string; store: DurableOnboardingStore } | null = null;

export function setOnboardingStoreForTests(store: DurableOnboardingStore | null): void {
  testStore = store;
  cached = null;
}

export function resetOnboardingStoreForTests(): void {
  testStore = null;
  cached = null;
}

export function getOnboardingStore(): DurableOnboardingStore {
  if (testStore) return testStore;
  const mode = resolvePersistenceMode();
  const key = `${mode}:${process.env.ALEXANDER_PERSISTENCE_LAMBDA_ARN ?? ""}`;
  if (cached?.key === key) return cached.store;
  const store = createDurableOnboardingStore();
  if (mode === "local") cached = { key, store };
  return store;
}

export type { DraftEnvelope };
