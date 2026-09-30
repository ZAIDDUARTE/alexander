import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyAcceptedServerTimestamp,
  bumpUpdatedAtForConflictRetry,
  createDraftAutosaveController,
  type DraftSaveResult,
} from "./autosave";
import { createDefaultDraft } from "./types";

function draftAt(updatedAt: string, name = "Acme") {
  const draft = createDefaultDraft();
  draft.updatedAt = updatedAt;
  draft.section1.customerFacingName = name;
  return draft;
}

function okResult(overrides: Partial<DraftSaveResult> = {}): DraftSaveResult {
  return {
    ok: true,
    redisAvailable: false,
    savedToRedis: false,
    savedDurable: true,
    durableAvailable: true,
    persistence: "durable",
    ...overrides,
  };
}

describe("draft autosave concurrency", () => {
  it("bumps updatedAt past both local and server clocks without replacing answers", () => {
    const local = draftAt("2026-09-30T12:00:00.000Z", "Newest");
    const bumped = bumpUpdatedAtForConflictRetry(
      local,
      "2026-09-30T12:00:05.000Z",
      "2026-09-30T12:00:01.000Z",
    );
    assert.equal(bumped.section1.customerFacingName, "Newest");
    assert.ok(Date.parse(bumped.updatedAt) > Date.parse("2026-09-30T12:00:05.000Z"));
  });

  it("keeps newer local answers when applying the accepted server timestamp", () => {
    const local = draftAt("2026-09-30T12:00:02.000Z", "LocalNewer");
    const server = draftAt("2026-09-30T12:00:03.000Z", "ServerOlderContent");
    const next = applyAcceptedServerTimestamp(local, "2026-09-30T12:00:01.000Z", server);
    assert.equal(next.section1.customerFacingName, "LocalNewer");
    assert.ok(Date.parse(next.updatedAt) > Date.parse(server.updatedAt));
  });

  it("serializes overlapping saves and always ends on the newest local draft", async () => {
    const calls: string[] = [];
    let latest = draftAt("2026-09-30T12:00:00.000Z", "A");
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    let saveCount = 0;

    const controller = createDraftAutosaveController({
      getLatest: () => latest,
      getRoute: () => "/onboarding",
      nowIso: () => "2026-09-30T12:00:10.000Z",
      onLocalDraftAdjusted: (draft) => {
        latest = draft;
      },
      onResult: () => {},
      save: async (draft) => {
        saveCount += 1;
        const name = draft.section1.customerFacingName;
        calls.push(`start:${name}`);
        if (saveCount === 1) await firstGate;
        calls.push(`end:${name}`);
        return okResult({
          draft: {
            ...draft,
            updatedAt: `2026-09-30T12:00:0${saveCount}.000Z`,
          },
        });
      },
    });

    controller.requestSave();
    await Promise.resolve();
    await Promise.resolve();

    latest = draftAt("2026-09-30T12:00:01.000Z", "B");
    controller.requestSave();
    latest = draftAt("2026-09-30T12:00:02.000Z", "C");
    controller.requestSave();

    releaseFirst();
    await controller.whenIdle();

    assert.deepEqual(calls, ["start:A", "end:A", "start:C", "end:C"]);
    assert.equal(latest.section1.customerFacingName, "C");
  });

  it("retries an expected 409 with the newest local answers and a newer updatedAt", async () => {
    const sent: Array<{ name: string; updatedAt: string }> = [];
    let latest = draftAt("2026-09-30T12:00:00.000Z", "First");
    let attempts = 0;

    const controller = createDraftAutosaveController({
      getLatest: () => latest,
      getRoute: () => "/onboarding",
      nowIso: () => "2026-09-30T12:00:00.000Z",
      onLocalDraftAdjusted: (draft) => {
        latest = draft;
      },
      onResult: (result) => {
        assert.equal(result.ok, true);
      },
      save: async (draft) => {
        attempts += 1;
        sent.push({
          name: draft.section1.customerFacingName,
          updatedAt: draft.updatedAt,
        });
        if (attempts === 1) {
          latest = draftAt("2026-09-30T12:00:00.500Z", "Newest");
          return {
            ok: false,
            reason: "stale_draft",
            draft: draftAt("2026-09-30T12:00:01.000Z", "Server"),
            redisAvailable: false,
            savedToRedis: false,
            savedDurable: false,
            durableAvailable: true,
            persistence: "durable",
          };
        }
        return okResult({
          draft: { ...draft, updatedAt: "2026-09-30T12:00:02.000Z" },
        });
      },
    });

    controller.requestSave();
    await controller.whenIdle();

    assert.equal(sent.length, 2);
    assert.equal(sent[0]?.name, "First");
    assert.equal(sent[1]?.name, "Newest");
    assert.ok(Date.parse(sent[1]!.updatedAt) > Date.parse("2026-09-30T12:00:01.000Z"));
  });

  it("flush writes the newest local draft after coalesced autosaves", async () => {
    const names: string[] = [];
    let latest = draftAt("2026-09-30T12:00:00.000Z", "Old");
    const controller = createDraftAutosaveController({
      getLatest: () => latest,
      getRoute: () => "/onboarding",
      onLocalDraftAdjusted: (draft) => {
        latest = draft;
      },
      onResult: () => {},
      save: async (draft) => {
        names.push(draft.section1.customerFacingName);
        return okResult({
          draft: { ...draft, updatedAt: "2026-09-30T12:00:09.000Z" },
        });
      },
    });

    controller.requestSave();
    latest = draftAt("2026-09-30T12:00:03.000Z", "Final");
    const result = await controller.flush({ keepalive: true });
    assert.equal(result.ok, true);
    assert.equal(names.at(-1), "Final");
  });
});
