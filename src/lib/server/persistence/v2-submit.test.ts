import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { buildSubmittableDraft } from "@/lib/onboarding/submission-test-helpers";
import { questionnaireContentFingerprint } from "@/lib/onboarding/submissionIntegrity";
import {
  hashQuestionnaireAnswersContentV1,
  serializeQuestionnaireAnswersV1,
} from "@/lib/onboarding/questionnaire-v1";
import { normalizeOnboardingDraft } from "@/lib/onboarding/normalizeOnboarding";
import type { OnboardingDraft } from "@/lib/onboarding/types";
import { sha256Hex } from "@/lib/server/persistence/canonical";
import { submitDraft } from "@/lib/server/persistence/engine";
import { persistenceV2ObjectKeys } from "@/lib/server/persistence/keys";
import { createMemoryObjectStore, createMemoryPorts } from "@/lib/server/persistence/memory";
import {
  invitationTokenFromUrl,
  provisionCustomerOnboarding,
  redeemInvitation,
  type SqlPool,
} from "@/lib/server/persistence/onboarding-access";
import { hashToken } from "@/lib/server/persistence/tokens";
import { persistenceV2Enabled, pilotOnboardingAllowed, pilotOnboardingIds } from "@/lib/server/persistence/v2-flag";
import {
  reservePersistenceV2,
  submitPersistenceV2FromAccess,
} from "@/lib/server/persistence/v2-submit";

const PSQL_CANDIDATES = [
  process.env.PSQL,
  "psql",
  "/Applications/Postgres.app/Contents/Versions/latest/bin/psql",
].filter((value): value is string => Boolean(value));
const SQL_DIR = "infra/sql";
const DB = `alexander_v2_${process.pid}`;
const FILES = [
  "001_onboarding_storage.sql",
  "002_submission_revision_hash.sql",
  "003_customer_onboarding_identity.sql",
  "004_questionnaire_answers_storage.sql",
  "005_onboarding_access.sql",
];

function psqlBin(): string | null {
  for (const candidate of PSQL_CANDIDATES) {
    if (candidate === "psql" || existsSync(candidate)) {
      try {
        execFileSync(candidate, ["-d", "postgres", "-c", "SELECT 1"], { stdio: "ignore" });
        return candidate;
      } catch {
        continue;
      }
    }
  }
  return null;
}

function loadPg(): {
  Pool: new (config: { database: string; max?: number }) => SqlPool & { end(): Promise<void> };
} | null {
  try {
    const require = createRequire(resolve(process.cwd(), "infra/package.json"));
    return require("pg") as {
      Pool: new (config: { database: string; max?: number }) => SqlPool & { end(): Promise<void> };
    };
  } catch {
    return null;
  }
}

const psql = psqlBin();
const pg = loadPg();

function run(database: string, args: string[]): void {
  if (!psql) throw new Error("psql_unavailable");
  execFileSync(psql, ["-d", database, "-v", "ON_ERROR_STOP=1", "-X", "-q", ...args], {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
}

async function openOnboarding(pool: SqlPool): Promise<{ accessHash: string; onboardingId: string; customerNumber: string }> {
  const created = await provisionCustomerOnboarding(pool, {
    customerFacingName: "Acme Plumbing",
    dataClassification: "synthetic_test",
    host: "onboard.example.test",
  });
  const raw = invitationTokenFromUrl(created.invitationUrl);
  assert.ok(raw);
  const accessToken = `browser-${created.onboardingId}`;
  const redeemed = await redeemInvitation(pool, {
    invitationTokenHash: hashToken(raw),
    accessTokenHash: hashToken(accessToken),
  });
  assert.equal(redeemed.ok, true);
  return {
    accessHash: hashToken(accessToken),
    onboardingId: created.onboardingId,
    customerNumber: created.customerNumber,
  };
}

describe("persistence v2 flag", () => {
  it("stays off unless set to true, and v1 submit still stores a revision", async () => {
    assert.equal(persistenceV2Enabled(), false);
    assert.equal(persistenceV2Enabled({ PERSISTENCE_V2_ENABLED: "false" }), false);
    assert.equal(persistenceV2Enabled({ PERSISTENCE_V2_ENABLED: "true" }), true);
    const pilotId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    assert.deepEqual(pilotOnboardingIds({}), []);
    assert.equal(pilotOnboardingAllowed(pilotId, {}), false);
    assert.equal(
      pilotOnboardingAllowed(pilotId, {
        PERSISTENCE_V2_PILOT_ONBOARDING_IDS: ` ${pilotId.toUpperCase()}, not-an-id `,
      }),
      true,
    );
    assert.equal(
      pilotOnboardingAllowed("bbbbbbbb-bbbb-4ccc-8ddd-eeeeeeeeeeee", {
        PERSISTENCE_V2_PILOT_ONBOARDING_IDS: pilotId,
      }),
      false,
    );
    const ports = createMemoryPorts();
    const draft = {
      schemaVersion: 10,
      updatedAt: "2026-10-02T00:00:00.000Z",
      currentRoute: "/onboarding/review",
      currentSection: 1,
      completedSections: [] as number[],
      data: { section1: { customerFacingName: "Legacy" } },
    };
    const result = await submitDraft(ports, {
      sessionId: "11111111-1111-4111-8111-111111111111",
      draft,
      normalized: { schema_version: 10 },
      contentRevision: "legacy-rev",
      submittedAt: "2026-10-02T00:00:00.000Z",
    });
    assert.equal(result.ok, true);
    assert.equal(ports.objects.writeOrder.at(-1)?.endsWith("/manifest.json"), true);
    assert.equal(ports.objects.writeOrder.some((key) => key.startsWith("customers/")), false);
  });
});

describe("persistence v2 runtime", { skip: psql && pg ? false : "local psql or pg unavailable" }, () => {
  it("reserves, writes, finalizes, and retries one onboarding", async () => {
    run("postgres", ["-c", `DROP DATABASE IF EXISTS ${DB}`]);
    run("postgres", ["-c", `CREATE DATABASE ${DB}`]);
    const pool = new pg!.Pool({ database: DB, max: 4 });
    try {
      for (const name of FILES) run(DB, ["-f", `${SQL_DIR}/${name}`]);

      const opened = await openOnboarding(pool);
      const draft = buildSubmittableDraft();
      const store = createMemoryObjectStore();
      const first = await submitPersistenceV2FromAccess(pool, store, {
        accessTokenHash: opened.accessHash,
        draft,
      });
      assert.equal(first.ok, true);
      if (!first.ok) return;
      assert.equal(first.revisionNumber, 1);
      assert.equal(first.duplicate, false);
      assert.equal(store.writeOrder.length, 4);
      assert.equal(store.writeOrder.at(-1)?.endsWith("/metadata/manifest.json"), true);
      for (const key of store.writeOrder) {
        assert.equal(key.includes(opened.customerNumber), false);
        assert.equal(key.includes("ALX-C"), false);
      }
      const manifestBytes = store.objects.get(store.writeOrder[3] ?? "");
      assert.ok(manifestBytes);
      const manifest = JSON.parse(manifestBytes.toString("utf8")) as {
        content_revision_sha256: string;
        customer_number: string;
        objects: Record<string, { key: string; sha256: string; size_bytes: number }>;
      };
      const manifestText = manifestBytes.toString("utf8");
      assert.equal(manifestText.includes(questionnaireContentFingerprint(draft)), false);
      assert.equal(manifestText.includes(draft.section1.mainPhone), false);
      assert.equal(manifest.customer_number, opened.customerNumber);
      assert.equal(manifest.content_revision_sha256, hashQuestionnaireAnswersContentV1(serializeQuestionnaireAnswersV1(draft)));
      for (const [name, object] of Object.entries(manifest.objects)) {
        const stored = store.objects.get(object.key);
        assert.ok(stored, name);
        assert.equal(sha256Hex(stored), object.sha256);
        assert.equal(stored.byteLength, object.size_bytes);
      }
      assert.deepEqual(Object.keys(manifest.objects).sort(), ["answers", "normalized", "raw"]);

      const retry = await submitPersistenceV2FromAccess(pool, store, {
        accessTokenHash: opened.accessHash,
        draft,
      });
      assert.equal(retry.ok, true);
      if (!retry.ok) return;
      assert.equal(retry.duplicate, true);
      assert.equal(retry.submissionId, first.submissionId);
      assert.equal(store.writeOrder.length, 4);

      const changed: OnboardingDraft = structuredClone(draft);
      changed.section1.customerFacingName = "Acme Plumbing North";
      const second = await submitPersistenceV2FromAccess(pool, store, {
        accessTokenHash: opened.accessHash,
        draft: changed,
      });
      assert.equal(second.ok, true);
      if (!second.ok) return;
      assert.equal(second.revisionNumber, 2);
      assert.notEqual(second.submissionId, first.submissionId);
      const latest = await pool.query(
        `SELECT s.revision_number
         FROM customer_onboardings o
         JOIN onboarding_submissions s ON s.id = o.latest_submission_id
         WHERE o.id = $1`,
        [opened.onboardingId],
      );
      assert.equal(Number(latest.rows[0]?.revision_number), 2);

      const partial = await openOnboarding(pool);
      const partialStore = createMemoryObjectStore();
      let puts = 0;
      const originalPut = partialStore.putObject.bind(partialStore);
      partialStore.putObject = async (key, body) => {
        puts += 1;
        if (puts === 2) throw new Error("snapshot_failed");
        return originalPut(key, body);
      };
      const partialResult = await submitPersistenceV2FromAccess(pool, partialStore, {
        accessTokenHash: partial.accessHash,
        draft,
      });
      assert.equal(partialResult.ok, false);
      if (partialResult.ok) return;
      assert.equal(partialResult.reason, "snapshot_failed");
      const pending = await pool.query(
        `SELECT persistence_state FROM onboarding_submissions WHERE id = $1`,
        [partialResult.submissionId],
      );
      assert.equal(pending.rows[0]?.persistence_state, "pending");
      partialStore.putObject = originalPut;
      const resumed = await submitPersistenceV2FromAccess(pool, partialStore, {
        accessTokenHash: partial.accessHash,
        draft,
      });
      assert.equal(resumed.ok, true);
      if (!resumed.ok) return;
      assert.equal(resumed.submissionId, partialResult.submissionId);
      assert.equal(resumed.revisionNumber, 1);

      const held = await openOnboarding(pool);
      const heldStore = createMemoryObjectStore();
      const heldFail = await submitPersistenceV2FromAccess(pool, heldStore, {
        accessTokenHash: held.accessHash,
        draft,
        failFinalize: true,
      });
      assert.equal(heldFail.ok, false);
      if (heldFail.ok) return;
      const stillPending = await pool.query(
        `SELECT persistence_state, submitted_at FROM onboarding_submissions WHERE id = $1`,
        [heldFail.submissionId],
      );
      assert.equal(stillPending.rows[0]?.persistence_state, "pending");
      assert.equal(stillPending.rows[0]?.submitted_at ?? null, null);
      const heldDone = await submitPersistenceV2FromAccess(pool, heldStore, {
        accessTokenHash: held.accessHash,
        draft,
      });
      assert.equal(heldDone.ok, true);
      if (!heldDone.ok) return;
      assert.equal(heldDone.submissionId, heldFail.submissionId);
      const manifestKey = [...heldStore.objects.keys()].find((key) => key.endsWith("/metadata/manifest.json"));
      assert.ok(manifestKey);
      const reused = JSON.parse(heldStore.objects.get(manifestKey)?.toString("utf8") ?? "{}") as {
        submitted_at?: string;
      };
      assert.equal(heldDone.submittedAt, reused.submitted_at);

      const conflicted = await openOnboarding(pool);
      const conflictStore = createMemoryObjectStore();
      const answers = serializeQuestionnaireAnswersV1(draft);
      const identity = await pool.query(
        `SELECT c.id AS customer_id, c.customer_number, s.session_id
         FROM customer_onboardings o
         JOIN customers c ON c.id = o.customer_id
         JOIN onboarding_sessions s ON s.onboarding_id = o.id
         WHERE o.id = $1`,
        [conflicted.onboardingId],
      );
      const reserved = await reservePersistenceV2(pool, {
        onboardingId: conflicted.onboardingId,
        sessionId: String(identity.rows[0]?.session_id),
        customerId: String(identity.rows[0]?.customer_id),
        customerNumber: String(identity.rows[0]?.customer_number),
        draft,
        answers,
        normalized: normalizeOnboardingDraft(draft),
        contentHash: hashQuestionnaireAnswersContentV1(answers),
      });
      assert.equal(reserved.ok, true);
      if (!reserved.ok) return;
      const keys = persistenceV2ObjectKeys(
        reserved.reserved.customerId,
        reserved.reserved.onboardingId,
        reserved.reserved.submissionId,
      );
      conflictStore.objects.set(keys.raw, Buffer.from("different-bytes"));
      const conflict = await submitPersistenceV2FromAccess(pool, conflictStore, {
        accessTokenHash: conflicted.accessHash,
        draft,
      });
      assert.equal(conflict.ok, false);
      if (conflict.ok) return;
      assert.equal(conflict.reason, "storage_integrity_conflict");
      assert.equal(conflictStore.objects.get(keys.raw)?.toString("utf8"), "different-bytes");
      const failed = await pool.query(
        `SELECT persistence_state, persistence_error_code FROM onboarding_submissions WHERE id = $1`,
        [reserved.reserved.submissionId],
      );
      assert.equal(failed.rows[0]?.persistence_state, "failed");
      assert.equal(failed.rows[0]?.persistence_error_code, "storage_integrity_conflict");

      const empty = createMemoryObjectStore();
      const missing = await reservePersistenceV2(pool, {
        onboardingId: "99999999-9999-4999-8999-999999999999",
        sessionId: "11111111-1111-4111-8111-111111111111",
        customerId: "11111111-1111-4111-8111-111111111111",
        customerNumber: "ALX-C000999",
        draft,
        answers,
        normalized: normalizeOnboardingDraft(draft),
        contentHash: hashQuestionnaireAnswersContentV1(answers),
      });
      assert.equal(missing.ok, false);
      assert.equal(empty.writeOrder.length, 0);

      const left = await openOnboarding(pool);
      const right = await openOnboarding(pool);
      const leftStore = createMemoryObjectStore();
      const rightStore = createMemoryObjectStore();
      const [sameA, sameB] = await Promise.all([
        submitPersistenceV2FromAccess(pool, leftStore, { accessTokenHash: left.accessHash, draft }),
        submitPersistenceV2FromAccess(pool, leftStore, { accessTokenHash: left.accessHash, draft }),
      ]);
      assert.equal(sameA.ok && sameB.ok, true);
      if (!sameA.ok || !sameB.ok) return;
      assert.equal(sameA.submissionId, sameB.submissionId);
      assert.equal(sameA.revisionNumber, 1);
      const sameCount = await pool.query(
        `SELECT count(*)::int AS n FROM onboarding_submissions WHERE onboarding_id = $1`,
        [left.onboardingId],
      );
      assert.equal(sameCount.rows[0]?.n, 1);

      const other: OnboardingDraft = structuredClone(draft);
      other.section1.customerFacingName = "Other Plumbing";
      const [diffA, diffB] = await Promise.all([
        submitPersistenceV2FromAccess(pool, rightStore, { accessTokenHash: right.accessHash, draft }),
        submitPersistenceV2FromAccess(pool, rightStore, { accessTokenHash: right.accessHash, draft: other }),
      ]);
      assert.equal(diffA.ok && diffB.ok, true);
      if (!diffA.ok || !diffB.ok) return;
      assert.notEqual(diffA.submissionId, diffB.submissionId);
      const revisions = await pool.query(
        `SELECT revision_number FROM onboarding_submissions WHERE onboarding_id = $1 ORDER BY revision_number`,
        [right.onboardingId],
      );
      assert.deepEqual(
        revisions.rows.map((row) => Number(row.revision_number)),
        [1, 2],
      );
      const pointer = await pool.query(
        `SELECT s.revision_number
         FROM customer_onboardings o
         JOIN onboarding_submissions s ON s.id = o.latest_submission_id
         WHERE o.id = $1`,
        [right.onboardingId],
      );
      assert.equal(Number(pointer.rows[0]?.revision_number), 2);

      const regress = await openOnboarding(pool);
      const regressStore = createMemoryObjectStore();
      const low = await submitPersistenceV2FromAccess(pool, regressStore, {
        accessTokenHash: regress.accessHash,
        draft,
        failFinalize: true,
      });
      const highDraft: OnboardingDraft = structuredClone(draft);
      highDraft.section1.customerFacingName = "Later Plumbing";
      const high = await submitPersistenceV2FromAccess(pool, regressStore, {
        accessTokenHash: regress.accessHash,
        draft: highDraft,
      });
      assert.equal(low.ok, false);
      assert.equal(high.ok, true);
      if (!high.ok || low.ok) return;
      const finishedLow = await submitPersistenceV2FromAccess(pool, regressStore, {
        accessTokenHash: regress.accessHash,
        draft,
      });
      assert.equal(finishedLow.ok, true);
      if (!finishedLow.ok) return;
      assert.equal(finishedLow.revisionNumber, 1);
      const after = await pool.query(
        `SELECT s.id, s.revision_number
         FROM customer_onboardings o
         JOIN onboarding_submissions s ON s.id = o.latest_submission_id
         WHERE o.id = $1`,
        [regress.onboardingId],
      );
      assert.equal(String(after.rows[0]?.id), high.submissionId);
      assert.equal(Number(after.rows[0]?.revision_number), 2);
    } finally {
      await pool.end();
      run("postgres", ["-c", `DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`]);
    }
  });
});
