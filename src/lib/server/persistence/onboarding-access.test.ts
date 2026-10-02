import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { invitationTokenFromHash } from "@/lib/onboarding/invitation-link";
import {
  invitationTokenFromUrl,
  provisionCustomerOnboarding,
  redeemInvitation,
  resolveOnboardingAccess,
  saveInvitedDraft,
  type SqlPool,
} from "@/lib/server/persistence/onboarding-access";
import { hashToken } from "@/lib/server/persistence/tokens";
import { isVisibleLegacySubmission, mapSubmissionRow, revisionDigest } from "@/lib/server/persistence/submission-row";
import { sha256Hex } from "@/lib/server/persistence/canonical";

const PSQL_CANDIDATES = [
  process.env.PSQL,
  "psql",
  "/Applications/Postgres.app/Contents/Versions/latest/bin/psql",
].filter((value): value is string => Boolean(value));

const SQL_DIR = "infra/sql";
const DB = `alexander_prov_${process.pid}`;
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

function loadPg(): { Pool: new (config: { database: string; max?: number }) => SqlPool & { end(): Promise<void> } } | null {
  try {
    const require = createRequire(resolve(process.cwd(), "infra/package.json"));
    return require("pg") as { Pool: new (config: { database: string; max?: number }) => SqlPool & { end(): Promise<void> } };
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

describe("onboarding provisioning database", { skip: psql && pg ? false : "local psql or pg unavailable" }, () => {
  it("provisions, redeems, and versions one draft per onboarding", async () => {
    run("postgres", ["-c", `DROP DATABASE IF EXISTS ${DB}`]);
    run("postgres", ["-c", `CREATE DATABASE ${DB}`]);
    const pool = new pg!.Pool({ database: DB, max: 1 });
    try {
      for (const name of FILES) run(DB, ["-f", `${SQL_DIR}/${name}`]);
      for (const name of FILES) run(DB, ["-f", `${SQL_DIR}/${name}`]);

      const first = await provisionCustomerOnboarding(pool, {
        customerFacingName: "North Plumbing",
        dataClassification: "synthetic_test",
        host: "onboard.example.test",
      });
      const second = await provisionCustomerOnboarding(pool, {
        customerFacingName: "North Plumbing",
        dataClassification: "synthetic_test",
        host: "onboard.example.test",
      });
      assert.notEqual(first.customerId, second.customerId);
      assert.notEqual(first.onboardingId, second.onboardingId);

      const rawInvite = invitationTokenFromUrl(first.invitationUrl);
      assert.ok(rawInvite);
      assert.equal(first.invitationUrl.startsWith("https://onboard.example.test/i#"), true);
      assert.equal(first.invitationUrl.includes(`/i/${rawInvite}`), false);
      const storedInvite = await pool.query(
        `SELECT token_hash FROM onboarding_invitations WHERE onboarding_id = $1`,
        [first.onboardingId],
      );
      assert.equal(storedInvite.rows[0]?.token_hash, hashToken(rawInvite));
      assert.notEqual(storedInvite.rows[0]?.token_hash, rawInvite);

      const parsed = invitationTokenFromHash(`#${rawInvite}`);
      assert.equal(parsed, rawInvite);
      const before = await pool.query(`SELECT count(*)::int AS n FROM onboarding_access_sessions`);
      assert.equal(before.rows[0]?.n, 0);

      const accessA = "browser-a-token-browser-a-token-browser-a";
      const accessB = "browser-b-token-browser-b-token-browser-b";
      assert.notEqual(accessA, accessB);
      assert.notEqual(accessA, rawInvite);
      const redeemedA = await redeemInvitation(pool, {
        invitationTokenHash: hashToken(rawInvite),
        accessTokenHash: hashToken(accessA),
      });
      const redeemedB = await redeemInvitation(pool, {
        invitationTokenHash: hashToken(rawInvite),
        accessTokenHash: hashToken(accessB),
      });
      assert.equal(redeemedA.ok, true);
      assert.equal(redeemedB.ok, true);
      if (!redeemedA.ok || !redeemedB.ok) return;
      assert.equal(redeemedA.sessionId, redeemedB.sessionId);
      assert.equal(redeemedA.onboardingId, first.onboardingId);

      const hashes = await pool.query(
        `SELECT access_token_hash FROM onboarding_access_sessions WHERE onboarding_id = $1 ORDER BY created_at`,
        [first.onboardingId],
      );
      assert.deepEqual(
        hashes.rows.map((row) => row.access_token_hash),
        [hashToken(accessA), hashToken(accessB)],
      );
      assert.equal(hashes.rows.some((row) => row.access_token_hash === accessA), false);

      await pool.query(`UPDATE onboarding_sessions SET version = 10 WHERE onboarding_id = $1`, [
        first.onboardingId,
      ]);
      const readA = await resolveOnboardingAccess(pool, hashToken(accessA));
      const readB = await resolveOnboardingAccess(pool, hashToken(accessB));
      assert.equal(readA.ok && readA.version, 10);
      assert.equal(readB.ok && readB.version, 10);
      assert.equal(readA.ok && readB.ok && readA.sessionId === readB.sessionId, true);

      const saved = await saveInvitedDraft(pool, {
        accessTokenHash: hashToken(accessA),
        expectedVersion: 10,
        draft: { schemaVersion: 10, marker: "from-a", currentRoute: "/onboarding", currentSection: 1, completedSections: [] },
      });
      assert.equal(saved.ok, true);
      if (!saved.ok) return;
      assert.equal(saved.version, 11);
      assert.equal(saved.onboardingId, first.onboardingId);

      const stale = await saveInvitedDraft(pool, {
        accessTokenHash: hashToken(accessB),
        expectedVersion: 10,
        draft: { schemaVersion: 10, marker: "from-b", currentRoute: "/onboarding", currentSection: 1, completedSections: [] },
      });
      assert.equal(stale.ok, false);
      if (stale.ok) return;
      assert.equal(stale.reason, "stale_draft");
      assert.equal(stale.version, 11);
      const draft = stale.draft as { marker?: string };
      assert.equal(draft.marker, "from-a");

      const other = await resolveOnboardingAccess(pool, hashToken(accessA));
      assert.equal(other.ok, true);
      if (other.ok) assert.notEqual(other.onboardingId, second.onboardingId);

      const rawOther = invitationTokenFromUrl(second.invitationUrl);
      assert.ok(rawOther);
      const otherAccess = "browser-c-token-browser-c-token-browser-c";
      const redeemedOther = await redeemInvitation(pool, {
        invitationTokenHash: hashToken(rawOther),
        accessTokenHash: hashToken(otherAccess),
      });
      assert.equal(redeemedOther.ok, true);
      const otherDraft = await pool.query(
        `SELECT draft_json->>'marker' AS marker FROM onboarding_sessions WHERE onboarding_id = $1`,
        [second.onboardingId],
      );
      assert.equal(otherDraft.rows[0]?.marker ?? null, null);

      const sessions = await pool.query(
        `SELECT count(*)::int AS n FROM onboarding_sessions WHERE onboarding_id = $1`,
        [first.onboardingId],
      );
      assert.equal(sessions.rows[0]?.n, 1);
      await assert.rejects(() =>
        pool.query(
          `INSERT INTO onboarding_sessions (
             session_id, questionnaire_schema_version, draft_json, onboarding_id
           ) VALUES ('33333333-3333-4333-8333-333333333333', 10, '{}'::jsonb, $1)`,
          [first.onboardingId],
        ),
      );
      await assert.rejects(() =>
        pool.query(
          `INSERT INTO onboarding_invitations (onboarding_id, token_hash)
           VALUES ($1, $2)`,
          [first.onboardingId, hashToken("second-unrevoked-token-second-unrevoked")],
        ),
      );

      await pool.query(`UPDATE onboarding_invitations SET expires_at = now() - interval '1 day' WHERE onboarding_id = $1`, [
        second.onboardingId,
      ]);
      const expired = await redeemInvitation(pool, {
        invitationTokenHash: hashToken(rawOther),
        accessTokenHash: hashToken("expired-browser-token-expired-browser"),
      });
      assert.deepEqual(expired, { ok: false, reason: "rejected" });

      const third = await provisionCustomerOnboarding(pool, {
        customerFacingName: "South Plumbing",
        host: "onboard.example.test",
      });
      const rawThird = invitationTokenFromUrl(third.invitationUrl);
      assert.ok(rawThird);
      await pool.query(`UPDATE onboarding_invitations SET revoked_at = now() WHERE onboarding_id = $1`, [
        third.onboardingId,
      ]);
      const revoked = await redeemInvitation(pool, {
        invitationTokenHash: hashToken(rawThird),
        accessTokenHash: hashToken("revoked-browser-token-revoked-browser"),
      });
      assert.deepEqual(revoked, { ok: false, reason: "rejected" });

      const unknown = await redeemInvitation(pool, {
        invitationTokenHash: hashToken("missing-invitation-token-missing-inv"),
        accessTokenHash: hashToken("missing-browser-token-missing-browser"),
      });
      assert.deepEqual(unknown, { ok: false, reason: "rejected" });

      await pool.query(
        `INSERT INTO onboarding_sessions (session_id, questionnaire_schema_version, draft_json)
         VALUES ('22222222-2222-4222-8222-222222222222', 10, '{}'::jsonb)`,
      );
      await pool.query(
        `INSERT INTO onboarding_submissions (
           session_id, content_revision, submitted_at, content_revision_sha256,
           questionnaire_schema_version, raw_draft_json, normalized_config_json,
           s3_prefix, s3_raw_key, s3_normalized_key, s3_manifest_key, raw_sha256, normalized_sha256,
           persistence_state, content_hash_algorithm
         ) VALUES (
           '22222222-2222-4222-8222-222222222222', NULL, NULL,
           '9999999999999999999999999999999999999999999999999999999999999999',
           10, '{}'::jsonb, '{}'::jsonb, 'p', 'r', 'n', 'm',
           '9999999999999999999999999999999999999999999999999999999999999999',
           '9999999999999999999999999999999999999999999999999999999999999999',
           'pending', 'questionnaire_answers_v1'
         )`,
      );
      await pool.query(
        `INSERT INTO onboarding_submissions (
           session_id, content_revision, content_revision_sha256, questionnaire_schema_version,
           raw_draft_json, normalized_config_json, s3_prefix, s3_raw_key, s3_normalized_key,
           s3_manifest_key, raw_sha256, normalized_sha256, submitted_at
         ) VALUES (
           '22222222-2222-4222-8222-222222222222', 'fingerprint-legacy',
           'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
           10, '{}'::jsonb, '{}'::jsonb, 'p', 'r', 'n', 'm',
           'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
           'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
           '2026-09-27T12:00:00Z'
         )`,
      );
      const rows = await pool.query(
        `SELECT * FROM onboarding_submissions WHERE session_id = '22222222-2222-4222-8222-222222222222' ORDER BY created_at`,
      );
      const pending = rows.rows.find((row) => row.content_hash_algorithm === "questionnaire_answers_v1");
      const legacy = rows.rows.find((row) => row.content_revision === "fingerprint-legacy");
      assert.equal(pending?.content_revision ?? null, null);
      const mappedPending = mapSubmissionRow(pending ?? {});
      assert.equal(mappedPending.contentRevision, null);
      assert.equal(mappedPending.submittedAt, null);
      assert.equal(revisionDigest(mappedPending.contentRevision), null);
      assert.notEqual(revisionDigest(mappedPending.contentRevision), sha256Hex("null"));
      assert.equal(isVisibleLegacySubmission(pending ?? {}), false);
      assert.equal(isVisibleLegacySubmission(legacy ?? {}), true);
      assert.equal(revisionDigest("fingerprint-legacy"), sha256Hex("fingerprint-legacy"));
    } finally {
      await pool.end();
      run("postgres", ["-c", `DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`]);
    }
  });
});
