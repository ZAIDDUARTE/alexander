import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { createDefaultDraft } from "@/lib/onboarding/types";
import { invitationTokenFromHash } from "@/lib/onboarding/invitation-link";
import {
  createDraftAutosaveController,
  draftAutosaveFingerprint,
  type DraftSaveResult,
} from "@/lib/onboarding/autosave";
import { draftRouteMode, invitationsEnabled } from "@/lib/server/onboarding-invitations";
import { sha256Hex } from "@/lib/server/persistence/canonical";
import { inspectSession } from "@/lib/server/persistence/engine";
import {
  isVisibleLegacySubmission,
  mapSubmissionRow,
  revisionDigest,
} from "@/lib/server/persistence/submission-row";
import { generateToken, hashToken } from "@/lib/server/persistence/tokens";
import type { PersistencePorts, SessionRecord, SubmissionRecord } from "@/lib/server/persistence/types";

describe("onboarding invitation flag", () => {
  it("stays off unless set to true, and an access cookie does not select invited mode", () => {
    assert.equal(invitationsEnabled({}), false);
    assert.equal(invitationsEnabled({ ONBOARDING_INVITATIONS_ENABLED: "false" }), false);
    assert.equal(invitationsEnabled({ ONBOARDING_INVITATIONS_ENABLED: "true" }), true);
    assert.equal(draftRouteMode(false, "access-token"), "legacy");
    assert.equal(draftRouteMode(true, null), "legacy");
    assert.equal(draftRouteMode(true, "access-token"), "invited");
  });
});

describe("invitation link", () => {
  it("reads the token from the fragment and the continue page does not redeem on load", () => {
    assert.equal(invitationTokenFromHash("#abc"), "abc");
    assert.equal(invitationTokenFromHash(""), null);
    const page = readFileSync("src/app/i/invitation-continue.tsx", "utf8");
    const effect = page.slice(page.indexOf("useEffect"), page.indexOf("async function continueInvitation"));
    assert.equal(effect.includes("fetch"), false);
    assert.equal(effect.includes("replaceState"), true);
    assert.equal(page.includes("localStorage"), false);
    assert.equal(page.includes("sessionStorage"), false);
    assert.equal(page.includes("/api/onboarding/invitations/redeem"), true);
  });
});

describe("null submission readers", () => {
  it("keeps SQL null as null and does not hash the word null", () => {
    const mapped = mapSubmissionRow({
      session_id: "11111111-1111-4111-8111-111111111111",
      content_revision: null,
      submitted_at: null,
      questionnaire_schema_version: 10,
      raw_draft_json: {},
      normalized_config_json: {},
      s3_prefix: "p",
      s3_raw_key: "r",
      s3_normalized_key: "n",
      s3_manifest_key: "m",
      raw_sha256: "a",
      normalized_sha256: "b",
    });
    assert.equal(mapped.contentRevision, null);
    assert.equal(mapped.submittedAt, null);
    assert.equal(revisionDigest(null), null);
    assert.notEqual(revisionDigest(null), sha256Hex("null"));
    assert.equal(isVisibleLegacySubmission({ content_revision: null }), false);
    assert.equal(
      isVisibleLegacySubmission({
        content_revision: "fingerprint-legacy",
        content_hash_algorithm: "fingerprint_v1",
        persistence_state: "committed",
      }),
      true,
    );
    assert.equal(revisionDigest("fingerprint-legacy"), sha256Hex("fingerprint-legacy"));
    assert.equal(
      isVisibleLegacySubmission({
        content_revision: "answers",
        content_hash_algorithm: "questionnaire_answers_v1",
        persistence_state: "committed",
      }),
      false,
    );
    assert.equal(
      isVisibleLegacySubmission({
        content_revision: "answers",
        content_hash_algorithm: "fingerprint_v1",
        persistence_state: "pending",
      }),
      false,
    );
  });

  it("inspectSession does not hash a null content revision", async () => {
    const session: SessionRecord = {
      sessionId: "11111111-1111-4111-8111-111111111111",
      questionnaireSchemaVersion: 10,
      draft: {
        schemaVersion: 10,
        updatedAt: "2026-10-02T00:00:00.000Z",
        currentRoute: "/onboarding",
        currentSection: 1,
        completedSections: [],
        data: {},
      },
      normalized: null,
      currentRoute: "/onboarding",
      currentSection: 1,
      completedSections: [],
      submissionStatus: "draft",
      lastSubmittedContentRevision: null,
      submittedAt: null,
      createdAt: "2026-10-02T00:00:00.000Z",
      updatedAt: "2026-10-02T00:00:00.000Z",
      version: 1,
    };
    const row: SubmissionRecord = {
      sessionId: session.sessionId,
      contentRevision: null,
      questionnaireSchemaVersion: 10,
      rawDraft: session.draft,
      normalized: {},
      s3Prefix: "p",
      s3RawKey: "r",
      s3NormalizedKey: "n",
      s3ManifestKey: "m",
      rawSha256: "a",
      normalizedSha256: "b",
      submittedAt: null,
      createdAt: "2026-10-02T00:00:00.000Z",
    };
    const ports = {
      db: {
        getSession: async () => session,
        listSubmissions: async () => [row],
      },
      objects: {
        getObject: async () => null,
      },
    } as unknown as PersistencePorts;
    const inspected = await inspectSession(ports, session.sessionId);
    assert.equal(inspected.ok, true);
    if (!inspected.ok || !("submissions" in inspected)) return;
    assert.equal(inspected.submissions[0]?.contentRevisionSha256, null);
  });
});

describe("invited autosave conflict", () => {
  it("does not retry a rejected invited body and does not treat the reload as a new edit", async () => {
    const calls: string[] = [];
    let latest = createDefaultDraft();
    latest.section1.customerFacingName = "Local";
    const server = createDefaultDraft();
    server.section1.customerFacingName = "Server";
    let snapshot = draftAutosaveFingerprint(latest);

    const controller = createDraftAutosaveController({
      getLatest: () => latest,
      getRoute: () => "/onboarding",
      onLocalDraftAdjusted: (draft) => {
        latest = draft;
      },
      onAuthoritativeDraft: (draft) => {
        snapshot = draftAutosaveFingerprint(draft);
        latest = draft;
      },
      onResult: () => {},
      save: async (draft) => {
        calls.push(draft.section1.customerFacingName);
        const result: DraftSaveResult = {
          ok: false,
          reason: "stale_draft",
          invited: true,
          draftVersion: 11,
          draft: server,
          redisAvailable: false,
          savedToRedis: false,
          savedDurable: false,
          durableAvailable: true,
          persistence: "durable",
        };
        return result;
      },
    });

    controller.requestSave();
    await controller.whenIdle();
    assert.deepEqual(calls, ["Local"]);
    assert.equal(latest.section1.customerFacingName, "Server");
    assert.equal(snapshot, draftAutosaveFingerprint(server));
  });
});

describe("access tokens", () => {
  it("generates a 256-bit token and stores only a sha256 hex hash", () => {
    const token = generateToken();
    const other = generateToken();
    assert.notEqual(token, other);
    assert.equal(Buffer.from(token, "base64url").length, 32);
    assert.equal(hashToken(token), hashToken(token));
    assert.notEqual(hashToken(token), token);
    assert.equal(hashToken(token).length, 64);
  });
});
