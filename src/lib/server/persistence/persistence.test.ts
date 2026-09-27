import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createDefaultDraft, SCHEMA_VERSION } from "@/lib/onboarding/types";
import { reconcileDrafts, toRedisDraft } from "@/lib/onboarding/draft-utils";
import { interpretServerSave } from "@/lib/onboarding/server-save-status";
import { buildSubmittableDraft } from "@/lib/onboarding/submission-test-helpers";
import { putDraftResponse, submitDraftResponse, getDraftResponse } from "@/lib/server/draft-service";
import {
  createDurableOnboardingStore,
  resetOnboardingStoreForTests,
  setOnboardingStoreForTests,
  type DurableOnboardingStore,
} from "@/lib/server/onboarding-store";
import { canonicalJsonBytes, sha256Hex } from "@/lib/server/persistence/canonical";
import {
  handlePersistenceOperation,
  submitDraft,
  upsertDraft,
} from "@/lib/server/persistence/engine";
import { formatPersistenceLog } from "@/lib/server/persistence/logger";
import { createMemoryPorts } from "@/lib/server/persistence/memory";
import { submissionObjectKeys } from "@/lib/server/persistence/keys";
import { resolvePersistenceMode } from "@/lib/server/persistence/mode";
import { selectDraftSource } from "@/lib/server/persistence/redis-import";
import { acknowledgeStoredSubmission } from "@/lib/server/persistence/submit-ack";
import { DB_MIGRATION_VERSION } from "@/lib/server/persistence/types";

const SESSION = "11111111-1111-4111-8111-111111111111";
const PHONE = "+14155550199";
const EMAIL = "owner@example.com";
const COMPANY = "Example Plumbing Co";

function envelope(updatedAt: string, name = COMPANY) {
  const draft = createDefaultDraft();
  draft.updatedAt = updatedAt;
  draft.currentRoute = "/onboarding/sections/1/form";
  draft.section1.customerFacingName = name;
  draft.section1.mainPhone = PHONE;
  draft.contacts[0].nameOrRole = "Pat Example";
  draft.contacts[0].phone = PHONE;
  const redis = toRedisDraft(draft, draft.currentRoute);
  redis.updatedAt = updatedAt;
  return redis;
}

const originalEnv = { ...process.env };

function setNodeEnv(value: string | undefined) {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

beforeEach(() => {
  resetOnboardingStoreForTests();
});

afterEach(() => {
  setNodeEnv(originalEnv.NODE_ENV);
  process.env.ALLOW_LOCAL_ONLY_PERSISTENCE = originalEnv.ALLOW_LOCAL_ONLY_PERSISTENCE;
  process.env.AWS_REGION = originalEnv.AWS_REGION;
  process.env.AWS_ROLE_ARN = originalEnv.AWS_ROLE_ARN;
  process.env.ALEXANDER_PERSISTENCE_LAMBDA_ARN = originalEnv.ALEXANDER_PERSISTENCE_LAMBDA_ARN;
  resetOnboardingStoreForTests();
});

describe("durable persistence", () => {
  it("A/B: stored draft and normalized config keep the full questionnaire", async () => {
    const ports = createMemoryPorts();
    const draft = envelope("2026-09-27T12:00:00.000Z");
    const normalized = {
      schema_version: SCHEMA_VERSION,
      company: { name: COMPANY, phone: PHONE },
      submission: { status: "submitted" },
    };
    const saved = await upsertDraft(ports.db, SESSION, draft);
    assert.equal(saved.ok, true);
    if (!saved.ok) return;
    const session = await ports.db.getSession(SESSION);
    assert.ok(session);
    assert.equal(session.draft.data.section1 && (session.draft.data.section1 as { customerFacingName: string }).customerFacingName, COMPANY);
    assert.ok(session.draft.data.section8);
    assert.ok(Array.isArray(session.draft.data.contacts));
    assert.ok(Array.isArray(session.draft.data.fees));
    assert.ok(Array.isArray(session.draft.data.systems));
    assert.ok(session.draft.data.submission);

    const submitted = await submitDraft(ports, {
      sessionId: SESSION,
      draft,
      normalized,
      contentRevision: "rev-complete",
      submittedAt: "2026-09-27T12:05:00.000Z",
    });
    assert.equal(submitted.ok, true);
    const rows = await ports.db.listSubmissions(SESSION);
    assert.equal(rows.length, 1);
    assert.equal(
      (rows[0].rawDraft.data.section1 as { mainPhone: string }).mainPhone,
      PHONE,
    );
    assert.deepEqual(rows[0].normalized, normalized);
    const storedSession = await ports.db.getSession(SESSION);
    assert.deepEqual(storedSession?.normalized, normalized);
  });

  it("C/J: submission keys are deterministic and contain no customer details", () => {
    const revision = `fingerprint ${COMPANY} ${PHONE} ${EMAIL}`;
    const first = submissionObjectKeys(SESSION, revision);
    const second = submissionObjectKeys(SESSION, revision);
    assert.deepEqual(first, second);
    const joined = Object.values(first).join(" ");
    assert.equal(joined.includes(COMPANY), false);
    assert.equal(joined.includes(PHONE), false);
    assert.equal(joined.includes(EMAIL), false);
    assert.equal(joined.includes("Example"), false);
    assert.match(first.raw, /^onboarding\/11111111-1111-4111-8111-111111111111\/submissions\/[a-f0-9]{64}\/raw-draft\.json$/);
    assert.match(first.normalized, /\/normalized-config\.json$/);
    assert.match(first.manifest, /\/manifest\.json$/);
  });

  it("D/E: a newer draft replaces the stored draft and an older draft does not", async () => {
    const ports = createMemoryPorts();
    const first = await upsertDraft(ports.db, SESSION, envelope("2026-09-27T12:00:00.000Z", "First"));
    const second = await upsertDraft(ports.db, SESSION, envelope("2026-09-27T13:00:00.000Z", "Second"));
    const stale = await upsertDraft(ports.db, SESSION, envelope("2026-09-27T11:00:00.000Z", "Stale"));
    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    assert.equal(stale.ok, false);
    if (stale.ok) return;
    assert.equal(stale.reason, "stale_draft");
    const current = await ports.db.getSession(SESSION);
    assert.equal(
      (current?.draft.data.section1 as { customerFacingName: string }).customerFacingName,
      "Second",
    );
    assert.equal(current?.version, 2);
  });

  it("F/G/H/M: submit stores both payloads, repeats the same revision, and keeps a changed revision", async () => {
    const ports = createMemoryPorts();
    const normalized = { schema_version: SCHEMA_VERSION, company: { name: "First" } };
    const firstDraft = envelope("2026-09-27T12:00:00.000Z", "First");
    const first = await submitDraft(ports, {
      sessionId: SESSION,
      draft: firstDraft,
      normalized,
      contentRevision: "rev-1",
      submittedAt: "2026-09-27T12:00:00.000Z",
    });
    assert.equal(first.ok, true);
    if (!first.ok) return;
    const again = await submitDraft(ports, {
      sessionId: SESSION,
      draft: firstDraft,
      normalized,
      contentRevision: "rev-1",
      submittedAt: "2026-09-27T15:00:00.000Z",
    });
    assert.equal(again.ok, true);
    if (!again.ok) return;
    assert.equal(again.duplicate, true);
    assert.equal(again.submittedAt, "2026-09-27T12:00:00.000Z");
    assert.equal((await ports.db.listSubmissions(SESSION)).length, 1);

    const changed = envelope("2026-09-27T16:00:00.000Z", "Changed");
    const second = await submitDraft(ports, {
      sessionId: SESSION,
      draft: changed,
      normalized: { schema_version: SCHEMA_VERSION, company: { name: "Changed" } },
      contentRevision: "rev-2",
      submittedAt: "2026-09-27T16:00:00.000Z",
    });
    assert.equal(second.ok, true);
    const rows = await ports.db.listSubmissions(SESSION);
    assert.equal(rows.length, 2);
    assert.equal((rows[0].rawDraft.data.section1 as { customerFacingName: string }).customerFacingName, "First");
    assert.equal(rows[0].contentRevision, "rev-1");
    assert.equal(rows[1].contentRevision, "rev-2");
    assert.equal(ports.objects.objects.has(submissionObjectKeys(SESSION, "rev-1").raw), true);
    assert.equal(ports.objects.objects.has(submissionObjectKeys(SESSION, "rev-2").raw), true);

    const longRevision = "x".repeat(21095);
    const long = await submitDraft(ports, {
      sessionId: SESSION,
      draft: envelope("2026-09-27T17:00:00.000Z", "Long"),
      normalized: { schema_version: SCHEMA_VERSION, company: { name: "Long" } },
      contentRevision: longRevision,
      submittedAt: "2026-09-27T17:00:00.000Z",
    });
    assert.equal(long.ok, true);
    if (!long.ok) return;
    assert.match(long.keys.raw, /\/submissions\/[0-9a-f]{64}\/raw-draft\.json$/);
    assert.equal(long.keys.raw.includes(longRevision), false);
    const repeat = await submitDraft(ports, {
      sessionId: SESSION,
      draft: envelope("2026-09-27T17:00:00.000Z", "Long"),
      normalized: { schema_version: SCHEMA_VERSION, company: { name: "Long" } },
      contentRevision: longRevision,
      submittedAt: "2026-09-27T18:00:00.000Z",
    });
    assert.equal(repeat.ok, true);
    if (!repeat.ok) return;
    assert.equal(repeat.duplicate, true);
    assert.equal(
      (await ports.db.listSubmissions(SESSION)).filter((row) => row.contentRevision === longRevision).length,
      1,
    );
  });

  it("K/L: hashes match the stored bytes and the manifest is written last", async () => {
    const ports = createMemoryPorts();
    const result = await submitDraft(ports, {
      sessionId: SESSION,
      draft: envelope("2026-09-27T12:00:00.000Z"),
      normalized: { schema_version: SCHEMA_VERSION, marker: "normalized" },
      contentRevision: "rev-hash",
      submittedAt: "2026-09-27T12:00:00.000Z",
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const raw = ports.objects.objects.get(result.keys.raw);
    const normalized = ports.objects.objects.get(result.keys.normalized);
    assert.ok(raw);
    assert.ok(normalized);
    assert.equal(sha256Hex(raw), result.rawSha256);
    assert.equal(sha256Hex(normalized), result.normalizedSha256);
    assert.equal(raw.toString("utf8"), canonicalJsonBytes(JSON.parse(raw.toString("utf8"))).toString("utf8"));
    assert.deepEqual(ports.objects.writeOrder, [result.keys.raw, result.keys.normalized, result.keys.manifest]);
    const manifest = JSON.parse(ports.objects.objects.get(result.keys.manifest)!.toString("utf8"));
    assert.equal(manifest.rawSha256, result.rawSha256);
    assert.equal(manifest.normalizedSha256, result.normalizedSha256);
    assert.equal(manifest.formatVersion, 1);
  });

  it("N/O/P: snapshot or database failure is not success, and a retry stays idempotent", async () => {
    const snapshotPorts = createMemoryPorts();
    snapshotPorts.objects.failNextPut = true;
    const snapshotFailed = await submitDraft(snapshotPorts, {
      sessionId: SESSION,
      draft: envelope("2026-09-27T12:00:00.000Z"),
      normalized: { schema_version: SCHEMA_VERSION },
      contentRevision: "rev-fail",
      submittedAt: "2026-09-27T12:00:00.000Z",
    });
    assert.equal(snapshotFailed.ok, false);
    if (snapshotFailed.ok) return;
    assert.equal(snapshotFailed.reason, "snapshot_failed");
    assert.equal((await snapshotPorts.db.listSubmissions(SESSION)).length, 0);

    const dbPorts = createMemoryPorts();
    dbPorts.db.failNextCommit = true;
    const retryDraft = envelope("2026-09-27T12:00:00.000Z");
    const retryNormalized = { schema_version: SCHEMA_VERSION, marker: "same" };
    const dbFailed = await submitDraft(dbPorts, {
      sessionId: SESSION,
      draft: retryDraft,
      normalized: retryNormalized,
      contentRevision: "rev-retry",
      submittedAt: "2026-09-27T12:00:00.000Z",
    });
    assert.equal(dbFailed.ok, false);
    if (dbFailed.ok) return;
    assert.equal(dbFailed.reason, "database_failed");
    assert.equal(dbPorts.objects.objects.size > 0, true);
    const retried = await submitDraft(dbPorts, {
      sessionId: SESSION,
      draft: retryDraft,
      normalized: retryNormalized,
      contentRevision: "rev-retry",
      submittedAt: "2026-09-27T12:00:00.000Z",
    });
    assert.equal(retried.ok, true);
    assert.equal((await dbPorts.db.listSubmissions(SESSION)).length, 1);
    if (!retried.ok) return;
    const raw = dbPorts.objects.objects.get(retried.keys.raw);
    assert.equal(raw ? sha256Hex(raw) : "", retried.rawSha256);
  });

  it("Q: persistence logs do not contain the questionnaire", async () => {
    const ports = createMemoryPorts();
    const lines: string[] = [];
    const draft = envelope("2026-09-27T12:00:00.000Z");
    await handlePersistenceOperation(
      { operation: "upsertDraft", sessionId: SESSION, draft },
      ports,
      (event) => lines.push(formatPersistenceLog(event)),
    );
    const output = lines.join("\n");
    assert.equal(output.includes(PHONE), false);
    assert.equal(output.includes(COMPANY), false);
    assert.equal(output.includes("customerFacingName"), false);
    assert.equal(output.includes("section1"), false);
    assert.match(output, /"operation":"upsertDraft"/);
  });

  it("R/S: production ignores local-only mode and development accepts it only when enabled", () => {
    assert.equal(
      resolvePersistenceMode({
        NODE_ENV: "production",
        ALLOW_LOCAL_ONLY_PERSISTENCE: "true",
      }),
      "unavailable",
    );
    assert.equal(
      resolvePersistenceMode({
        NODE_ENV: "production",
        AWS_REGION: "us-east-1",
        AWS_ROLE_ARN: "arn:aws:iam::820242913027:role/alexander-vercel-persistence",
        ALEXANDER_PERSISTENCE_LAMBDA_ARN: "arn:aws:lambda:us-east-1:820242913027:function:alexander-onboarding-persistence",
        ALLOW_LOCAL_ONLY_PERSISTENCE: "true",
      }),
      "durable",
    );
    assert.equal(resolvePersistenceMode({ NODE_ENV: "test" }), "unavailable");
    assert.equal(
      resolvePersistenceMode({ NODE_ENV: "test", ALLOW_LOCAL_ONLY_PERSISTENCE: "true" }),
      "local",
    );
    assert.equal(
      acknowledgeStoredSubmission({
        mode: "local",
        nodeEnv: "production",
        storeResult: { ok: true, duplicate: false },
      }).ok,
      false,
    );
    assert.equal(
      acknowledgeStoredSubmission({
        mode: "local",
        nodeEnv: "test",
        storeResult: { ok: true, duplicate: false },
      }).ok,
      true,
    );
    const failed = acknowledgeStoredSubmission({
      mode: "durable",
      nodeEnv: "production",
      storeResult: { ok: false, reason: "snapshot_failed" },
    });
    assert.equal(failed.ok, false);
    if (failed.ok) return;
    assert.equal(failed.httpStatus, 503);
  });

  it("T: local and server drafts still reconcile by updatedAt", () => {
    const local = createDefaultDraft();
    local.updatedAt = "2026-09-27T12:00:00.000Z";
    local.section1.customerFacingName = "Local";
    const server = createDefaultDraft();
    server.updatedAt = "2026-09-27T13:00:00.000Z";
    server.section1.customerFacingName = "Server";
    const result = reconcileDrafts(local, server);
    assert.equal(result.draft.section1.customerFacingName, "Server");
    assert.equal(result.needsLocalSync, true);
  });

  it("V: questionnaire schema version stays 10 and database migration is separate", () => {
    assert.equal(SCHEMA_VERSION, 10);
    assert.equal(DB_MIGRATION_VERSION, "002");
    assert.equal(createDefaultDraft().schemaVersion, 10);
  });

  it("imports a Redis draft only when RDS has none or Redis is newer", () => {
    assert.equal(selectDraftSource(null, { updatedAt: "2026-09-27T12:00:00.000Z" }), "redis");
    assert.equal(
      selectDraftSource(
        { updatedAt: "2026-09-27T13:00:00.000Z" },
        { updatedAt: "2026-09-27T12:00:00.000Z" },
      ),
      "durable",
    );
    assert.equal(
      selectDraftSource(
        { updatedAt: "2026-09-27T12:00:00.000Z" },
        { updatedAt: "2026-09-27T13:00:00.000Z" },
      ),
      "redis",
    );
  });

  it("save status is Saved only after a durable server write", () => {
    assert.equal(
      interpretServerSave({ persistence: "durable", savedDurable: true, durableAvailable: true }),
      "saved",
    );
    assert.equal(
      interpretServerSave({ persistence: "durable", savedDurable: false, durableAvailable: true }),
      "server-pending",
    );
    assert.equal(
      interpretServerSave({ persistence: "local", savedDurable: false, durableAvailable: false }),
      "saved-local",
    );
  });

  it("local development can round-trip a draft when the fallback is explicit", async () => {
    setNodeEnv("test");
    process.env.ALLOW_LOCAL_ONLY_PERSISTENCE = "true";
    delete process.env.AWS_REGION;
    delete process.env.AWS_ROLE_ARN;
    delete process.env.ALEXANDER_PERSISTENCE_LAMBDA_ARN;
    setOnboardingStoreForTests(createDurableOnboardingStore(process.env));
    const draft = envelope("2026-09-27T12:00:00.000Z");
    const saved = await putDraftResponse(SESSION, { draft });
    assert.equal(saved.status, 200);
    assert.equal(saved.body.ok, true);
    assert.equal(saved.body.persistence, "local");
    const loaded = await getDraftResponse(SESSION);
    assert.equal(loaded.status, 200);
    assert.equal(loaded.body.draft?.data.section1.customerFacingName, COMPANY);
  });

  it("production submit is not acknowledged when durable storage fails", async () => {
    setNodeEnv("production");
    process.env.AWS_REGION = "us-east-1";
    process.env.AWS_ROLE_ARN = "arn:aws:iam::820242913027:role/alexander-vercel-persistence";
    process.env.ALEXANDER_PERSISTENCE_LAMBDA_ARN =
      "arn:aws:lambda:us-east-1:820242913027:function:alexander-onboarding-persistence";
    delete process.env.ALLOW_LOCAL_ONLY_PERSISTENCE;
    let submits = 0;
    const store: DurableOnboardingStore = {
      mode: "durable",
      async getDraft() {
        return { ok: true, draft: null };
      },
      async saveDraft(_sessionId, draft) {
        return { ok: true, draft, version: 1 };
      },
      async submitDraft() {
        submits += 1;
        return { ok: false, reason: "database_failed" };
      },
      async health() {
        return { durablePersistence: true, database: "error", snapshotStorage: "ok" };
      },
    };
    setOnboardingStoreForTests(store);
    const draft = toRedisDraft(buildSubmittableDraft(), "/onboarding/review");
    const result = await submitDraftResponse(SESSION, { draft });
    assert.equal(result.status, 503);
    assert.equal(result.body.ok, false);
    assert.equal("reason" in result.body ? result.body.reason : "", "database_failed");
    assert.equal(submits, 1);
    assert.equal("draft" in result.body && result.body.draft ? true : false, false);
  });

  it("production without AWS does not call storage or acknowledge a local submit", async () => {
    setNodeEnv("production");
    process.env.ALLOW_LOCAL_ONLY_PERSISTENCE = "true";
    delete process.env.AWS_REGION;
    delete process.env.AWS_ROLE_ARN;
    delete process.env.ALEXANDER_PERSISTENCE_LAMBDA_ARN;
    let submits = 0;
    setOnboardingStoreForTests({
      mode: "local",
      async getDraft() {
        return { ok: true, draft: null };
      },
      async saveDraft(_sessionId, draft) {
        return { ok: true, draft, version: 1 };
      },
      async submitDraft() {
        submits += 1;
        return { ok: true, duplicate: false, draft: envelope("2026-09-27T12:00:00.000Z"), submittedAt: "2026-09-27T12:00:00.000Z" };
      },
      async health() {
        return { durablePersistence: false, database: "local", snapshotStorage: "local" };
      },
    });
    const draft = toRedisDraft(buildSubmittableDraft(), "/onboarding/review");
    const result = await submitDraftResponse(SESSION, { draft });
    assert.equal(result.status, 503);
    assert.equal(result.body.ok, false);
    assert.equal("reason" in result.body ? result.body.reason : "", "persistence_unavailable");
    assert.equal(submits, 0);
  });
});
