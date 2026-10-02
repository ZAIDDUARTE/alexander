import type { OnboardingDraft } from "./types";

export type DraftSaveResult = {
  ok: boolean;
  reason?: string;
  draft?: OnboardingDraft | null;
  redisAvailable: boolean;
  savedToRedis: boolean;
  savedDurable: boolean;
  durableAvailable: boolean;
  persistence: "durable" | "local" | "unavailable";
  invited?: boolean;
  draftVersion?: number | null;
};

export type DraftAutosaveController = {
  /** Autosave entry. Coalesces while a PUT is in flight. */
  requestSave: () => void;
  /** Await the latest draft write (submit / pagehide). */
  flush: (options?: { keepalive?: boolean }) => Promise<DraftSaveResult>;
  /** Resolve when no save is running. */
  whenIdle: () => Promise<void>;
  isBusy: () => boolean;
};

/**
 * After a successful PUT the server rewrites updatedAt. Keep the newest local
 * answers, and only advance the local clock so the next PUT is not stale.
 */
/** Answer fingerprint. A server timestamp rewrite must not look like a new edit. */
export function draftAutosaveFingerprint(draft: OnboardingDraft): string {
  return JSON.stringify({ ...draft, updatedAt: undefined });
}

export function applyAcceptedServerTimestamp(
  local: OnboardingDraft,
  sentUpdatedAt: string,
  serverDraft: OnboardingDraft,
): OnboardingDraft {
  const serverAt = Date.parse(serverDraft.updatedAt);
  if (local.updatedAt === sentUpdatedAt) {
    return { ...local, updatedAt: serverDraft.updatedAt };
  }
  const localAt = Date.parse(local.updatedAt);
  if (Number.isFinite(serverAt) && Number.isFinite(localAt) && localAt <= serverAt) {
    return { ...local, updatedAt: new Date(serverAt + 1).toISOString() };
  }
  return local;
}

/**
 * On an expected 409, retry with the newest local answers and an updatedAt
 * strictly after both local and server clocks. Never substitutes server content.
 */
export function bumpUpdatedAtForConflictRetry(
  local: OnboardingDraft,
  serverUpdatedAt: string | null | undefined,
  nowIso: string,
): OnboardingDraft {
  const times = [local.updatedAt, serverUpdatedAt ?? undefined, nowIso]
    .map((value) => Date.parse(value ?? ""))
    .filter((value) => Number.isFinite(value));
  const latest = times.length > 0 ? Math.max(...times) : Date.parse(nowIso);
  return { ...local, updatedAt: new Date(latest + 1).toISOString() };
}

export function createDraftAutosaveController(deps: {
  save: (
    draft: OnboardingDraft,
    route: string,
    options?: { keepalive?: boolean },
  ) => Promise<DraftSaveResult>;
  getLatest: () => OnboardingDraft;
  getRoute: () => string;
  onResult: (result: DraftSaveResult) => void;
  onLocalDraftAdjusted: (draft: OnboardingDraft) => void;
  onAuthoritativeDraft?: (draft: OnboardingDraft, draftVersion: number | null) => void;
  nowIso?: () => string;
}): DraftAutosaveController {
  let inFlight = false;
  let rerun = false;
  let scheduled = false;
  let tail: Promise<void> = Promise.resolve();

  const now = () => deps.nowIso?.() ?? new Date().toISOString();

  function enqueue(work: () => Promise<void>): Promise<void> {
    tail = tail.then(work, work);
    return tail;
  }

  async function saveOnce(options?: { keepalive?: boolean }): Promise<DraftSaveResult> {
    const sent = deps.getLatest();
    let result = await deps.save(sent, deps.getRoute(), options);

    if (!result.ok && result.reason === "stale_draft" && result.invited) {
      if (result.draft) deps.onAuthoritativeDraft?.(result.draft, result.draftVersion ?? null);
      deps.onResult(result);
      return result;
    }

    if (!result.ok && result.reason === "stale_draft") {
      const bumped = bumpUpdatedAtForConflictRetry(
        deps.getLatest(),
        result.draft?.updatedAt,
        now(),
      );
      deps.onLocalDraftAdjusted(bumped);
      result = await deps.save(bumped, deps.getRoute(), options);
    }

    if (result.ok && result.draft) {
      const current = deps.getLatest();
      const adjusted = applyAcceptedServerTimestamp(current, sent.updatedAt, result.draft);
      if (adjusted.updatedAt !== current.updatedAt) {
        deps.onLocalDraftAdjusted(adjusted);
      }
    }

    deps.onResult(result);
    return result;
  }

  async function drainAutosaves() {
    if (inFlight) {
      rerun = true;
      return;
    }
    inFlight = true;
    try {
      do {
        rerun = false;
        await saveOnce();
      } while (rerun);
    } finally {
      inFlight = false;
    }
    if (rerun) {
      rerun = false;
      await drainAutosaves();
    }
  }

  return {
    requestSave() {
      rerun = true;
      if (inFlight || scheduled) return;
      scheduled = true;
      void enqueue(async () => {
        scheduled = false;
        await drainAutosaves();
      });
    },
    async flush(options) {
      let result: DraftSaveResult = {
        ok: false,
        reason: "persistence_unavailable",
        redisAvailable: false,
        savedToRedis: false,
        savedDurable: false,
        durableAvailable: false,
        persistence: "unavailable",
      };
      await enqueue(async () => {
        rerun = false;
        await drainAutosaves();
        inFlight = true;
        try {
          result = await saveOnce(options);
        } finally {
          inFlight = false;
          if (rerun) {
            rerun = false;
            await drainAutosaves();
          }
        }
      });
      return result;
    },
    whenIdle() {
      return enqueue(async () => undefined);
    },
    isBusy() {
      return inFlight;
    },
  };
}
