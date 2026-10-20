import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { describe, it } from "node:test";

const PSQL_CANDIDATES = [
  process.env.PSQL,
  "psql",
  "/Applications/Postgres.app/Contents/Versions/latest/bin/psql",
].filter((value): value is string => Boolean(value));

const SQL_DIR = "infra/sql";
const DB = `alexander_mig_003004_${process.pid}`;

function psqlBin(): string | null {
  for (const candidate of PSQL_CANDIDATES) {
    if (candidate === "psql" || existsSync(candidate)) {
      try {
        execFileSync(candidate, ["-d", "postgres", "-c", "SELECT 1"], {
          stdio: "ignore",
        });
        return candidate;
      } catch {
        continue;
      }
    }
  }
  return null;
}

const psql = psqlBin();

function run(database: string, args: string[], input?: string): string {
  if (!psql) throw new Error("psql_unavailable");
  return execFileSync(psql, ["-d", database, "-v", "ON_ERROR_STOP=1", "-X", "-q", ...args], {
    encoding: "utf8",
    input,
    stdio: ["pipe", "pipe", "pipe"],
  });
}

function sql(database: string, statement: string): string {
  return run(database, ["-t", "-A", "-c", statement]).trim();
}

function file(database: string, name: string): void {
  run(database, ["-f", `${SQL_DIR}/${name}`]);
}

function expectError(database: string, statement: string): void {
  assert.throws(() => sql(database, statement));
}

describe("persistence migrations 003 and 004", { skip: psql ? false : "local psql unavailable" }, () => {
  it("applies on a legacy database and enforces the v2 schema contract", () => {
    run("postgres", ["-c", `DROP DATABASE IF EXISTS ${DB}`]);
    run("postgres", ["-c", `CREATE DATABASE ${DB}`]);
    try {
      file(DB, "001_onboarding_storage.sql");
      file(DB, "002_submission_revision_hash.sql");

      sql(
        DB,
        `INSERT INTO onboarding_sessions (
           session_id, questionnaire_schema_version, draft_json, submission_status
         ) VALUES (
           '11111111-1111-4111-8111-111111111111', 10, '{"schemaVersion":10}'::jsonb, 'submitted'
         )`,
      );
      sql(
        DB,
        `INSERT INTO onboarding_submissions (
           session_id, content_revision, content_revision_sha256, questionnaire_schema_version,
           raw_draft_json, normalized_config_json, s3_prefix, s3_raw_key, s3_normalized_key,
           s3_manifest_key, raw_sha256, normalized_sha256, submitted_at
         ) VALUES (
           '11111111-1111-4111-8111-111111111111',
           'fingerprint-legacy',
           'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
           10,
           '{"schemaVersion":10}'::jsonb,
           '{"schema_version":10}'::jsonb,
           'onboarding/11111111-1111-4111-8111-111111111111/submissions/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
           'onboarding/11111111-1111-4111-8111-111111111111/submissions/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/raw-draft.json',
           'onboarding/11111111-1111-4111-8111-111111111111/submissions/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/normalized-config.json',
           'onboarding/11111111-1111-4111-8111-111111111111/submissions/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/manifest.json',
           'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
           'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
           '2026-09-27T12:00:00Z'
         )`,
      );

      file(DB, "003_customer_onboarding_identity.sql");
      file(DB, "004_questionnaire_answers_storage.sql");
      file(DB, "003_customer_onboarding_identity.sql");
      file(DB, "004_questionnaire_answers_storage.sql");

      const legacy = sql(
        DB,
        `SELECT onboarding_id IS NULL,
                revision_number IS NULL,
                persistence_state,
                content_hash_algorithm,
                manifest_schema_version,
                content_revision,
                submitted_at IS NOT NULL,
                questionnaire_answers_json IS NULL
         FROM onboarding_submissions
         WHERE content_revision = 'fingerprint-legacy'`,
      );
      assert.equal(
        legacy,
        "t|t|committed|fingerprint_v1|1|fingerprint-legacy|t|t",
      );
      assert.equal(sql(DB, "SELECT count(*) FROM customers"), "0");
      assert.equal(
        sql(DB, "SELECT onboarding_id IS NULL FROM onboarding_sessions"),
        "t",
      );

      sql(
        DB,
        `INSERT INTO onboarding_submissions (
           session_id, content_revision, content_revision_sha256, questionnaire_schema_version,
           raw_draft_json, normalized_config_json, s3_prefix, s3_raw_key, s3_normalized_key,
           s3_manifest_key, raw_sha256, normalized_sha256, submitted_at
         ) VALUES (
           '11111111-1111-4111-8111-111111111111',
           'fingerprint-v1-writer',
           'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
           10, '{}'::jsonb, '{}'::jsonb, 'p', 'r', 'n', 'm',
           'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
           'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
           '2026-10-02T12:00:00Z'
         )`,
      );
      assert.equal(
        sql(
          DB,
          `SELECT persistence_state || '|' || content_hash_algorithm || '|' ||
                  (onboarding_id IS NULL) || '|' || (revision_number IS NULL) || '|' ||
                  (questionnaire_answers_json IS NULL)
           FROM onboarding_submissions WHERE content_revision = 'fingerprint-v1-writer'`,
        ),
        "committed|fingerprint_v1|true|true|true",
      );

      sql(
        DB,
        `INSERT INTO onboarding_sessions (session_id, questionnaire_schema_version, draft_json)
         SELECT id, 10, '{}'::jsonb
         FROM unnest(ARRAY[
           '22222222-2222-4222-8222-222222222222',
           '33333333-3333-4333-8333-333333333333',
           '44444444-4444-4444-8444-444444444444',
           '55555555-5555-4555-8555-555555555555',
           '66666666-6666-4666-8666-666666666666',
           '77777777-7777-4777-8777-777777777777',
           '88888888-8888-4888-8888-888888888888',
           '99999999-9999-4999-8999-999999999999',
           'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
           'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
           'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
         ]) AS id`,
      );

      const first = sql(DB, "INSERT INTO customers (customer_facing_name) VALUES ('Acme') RETURNING customer_number");
      const second = sql(DB, "INSERT INTO customers (customer_facing_name) VALUES ('Acme') RETURNING customer_number");
      assert.equal(first, "ALX-C000001");
      assert.equal(second, "ALX-C000002");
      sql(DB, "SELECT setval('customer_number_seq', 122)");
      assert.equal(
        sql(DB, "INSERT INTO customers (customer_facing_name) VALUES ('Acme') RETURNING customer_number"),
        "ALX-C000123",
      );
      sql(DB, "SELECT setval('customer_number_seq', 999999)");
      assert.equal(
        sql(DB, "INSERT INTO customers (data_classification) VALUES ('synthetic_test') RETURNING customer_number"),
        "ALX-C1000000",
      );

      const customerA = sql(DB, "INSERT INTO customers (customer_facing_name) VALUES ('Shared') RETURNING id");
      const customerB = sql(DB, "INSERT INTO customers (customer_facing_name) VALUES ('Shared') RETURNING id");
      const onboardingA = sql(
        DB,
        `INSERT INTO customer_onboardings (customer_id) VALUES ('${customerA}') RETURNING id`,
      );
      sql(DB, `INSERT INTO customer_onboardings (customer_id) VALUES ('${customerA}')`);
      const onboardingB = sql(
        DB,
        `INSERT INTO customer_onboardings (customer_id) VALUES ('${customerB}') RETURNING id`,
      );
      assert.equal(
        sql(DB, `SELECT count(*) FROM customer_onboardings WHERE customer_id = '${customerA}'`),
        "2",
      );

      const submissionA = sql(
        DB,
        `INSERT INTO onboarding_submissions (
           session_id, content_revision, content_revision_sha256, questionnaire_schema_version,
           raw_draft_json, normalized_config_json, s3_prefix, s3_raw_key, s3_normalized_key,
           s3_manifest_key, raw_sha256, normalized_sha256, submitted_at,
           onboarding_id, revision_number, content_hash_algorithm
         ) VALUES (
           '22222222-2222-4222-8222-222222222222', 'rev-a',
           '1111111111111111111111111111111111111111111111111111111111111111',
           10, '{}'::jsonb, '{}'::jsonb, 'p', 'r', 'n', 'm',
           '1111111111111111111111111111111111111111111111111111111111111111',
           '1111111111111111111111111111111111111111111111111111111111111111',
           now(), '${onboardingA}', 1, 'questionnaire_answers_v1'
         ) RETURNING id`,
      );
      expectError(
        DB,
        `UPDATE customer_onboardings SET latest_submission_id = '${submissionA}' WHERE id = '${onboardingB}'`,
      );
      sql(
        DB,
        `UPDATE customer_onboardings SET latest_submission_id = '${submissionA}' WHERE id = '${onboardingA}'`,
      );

      expectError(
        DB,
        `INSERT INTO onboarding_submissions (
           session_id, content_revision_sha256, questionnaire_schema_version,
           raw_draft_json, normalized_config_json, s3_prefix, s3_raw_key, s3_normalized_key,
           s3_manifest_key, raw_sha256, normalized_sha256,
           onboarding_id, revision_number, content_hash_algorithm, persistence_state
         ) VALUES (
           '33333333-3333-4333-8333-333333333333',
           '2222222222222222222222222222222222222222222222222222222222222222',
           10, '{}'::jsonb, '{}'::jsonb, 'p', 'r', 'n', 'm',
           '2222222222222222222222222222222222222222222222222222222222222222',
           '2222222222222222222222222222222222222222222222222222222222222222',
           '${onboardingA}', 1, 'questionnaire_answers_v1', 'committed'
         )`,
      );
      sql(
        DB,
        `INSERT INTO onboarding_submissions (
           session_id, content_revision_sha256, questionnaire_schema_version,
           raw_draft_json, normalized_config_json, s3_prefix, s3_raw_key, s3_normalized_key,
           s3_manifest_key, raw_sha256, normalized_sha256,
           onboarding_id, revision_number, content_hash_algorithm, persistence_state
         ) VALUES (
           '44444444-4444-4444-8444-444444444444',
           '3333333333333333333333333333333333333333333333333333333333333333',
           10, '{}'::jsonb, '{}'::jsonb, 'p', 'r', 'n', 'm',
           '3333333333333333333333333333333333333333333333333333333333333333',
           '3333333333333333333333333333333333333333333333333333333333333333',
           '${onboardingA}', 2, 'questionnaire_answers_v1', 'committed'
         )`,
      );
      sql(
        DB,
        `INSERT INTO onboarding_submissions (
           session_id, content_revision_sha256, questionnaire_schema_version,
           raw_draft_json, normalized_config_json, s3_prefix, s3_raw_key, s3_normalized_key,
           s3_manifest_key, raw_sha256, normalized_sha256,
           onboarding_id, revision_number, content_hash_algorithm, persistence_state
         ) VALUES (
           '55555555-5555-4555-8555-555555555555',
           '4444444444444444444444444444444444444444444444444444444444444444',
           10, '{}'::jsonb, '{}'::jsonb, 'p', 'r', 'n', 'm',
           '4444444444444444444444444444444444444444444444444444444444444444',
           '4444444444444444444444444444444444444444444444444444444444444444',
           '${onboardingB}', 1, 'questionnaire_answers_v1', 'committed'
         )`,
      );

      const hash = "5555555555555555555555555555555555555555555555555555555555555555";
      sql(
        DB,
        `INSERT INTO onboarding_submissions (
           session_id, content_revision_sha256, questionnaire_schema_version,
           raw_draft_json, normalized_config_json, s3_prefix, s3_raw_key, s3_normalized_key,
           s3_manifest_key, raw_sha256, normalized_sha256,
           onboarding_id, revision_number, content_hash_algorithm, persistence_state
         ) VALUES (
           '66666666-6666-4666-8666-666666666666', '${hash}',
           10, '{}'::jsonb, '{}'::jsonb, 'p', 'r', 'n', 'm', '${hash}', '${hash}',
           '${onboardingA}', 3, 'questionnaire_answers_v1', 'committed'
         )`,
      );
      expectError(
        DB,
        `INSERT INTO onboarding_submissions (
           session_id, content_revision_sha256, questionnaire_schema_version,
           raw_draft_json, normalized_config_json, s3_prefix, s3_raw_key, s3_normalized_key,
           s3_manifest_key, raw_sha256, normalized_sha256,
           onboarding_id, revision_number, content_hash_algorithm, persistence_state
         ) VALUES (
           '77777777-7777-4777-8777-777777777777', '${hash}',
           10, '{}'::jsonb, '{}'::jsonb, 'p', 'r', 'n', 'm', '${hash}', '${hash}',
           '${onboardingA}', 4, 'questionnaire_answers_v1', 'committed'
         )`,
      );
      sql(
        DB,
        `INSERT INTO onboarding_submissions (
           session_id, content_revision_sha256, questionnaire_schema_version,
           raw_draft_json, normalized_config_json, s3_prefix, s3_raw_key, s3_normalized_key,
           s3_manifest_key, raw_sha256, normalized_sha256,
           onboarding_id, revision_number, content_hash_algorithm, persistence_state
         ) VALUES (
           '88888888-8888-4888-8888-888888888888', '${hash}',
           10, '{}'::jsonb, '{}'::jsonb, 'p', 'r', 'n', 'm', '${hash}', '${hash}',
           '${onboardingA}', 5, 'fingerprint_v1', 'committed'
         )`,
      );
      sql(
        DB,
        `INSERT INTO onboarding_submissions (
           session_id, content_revision_sha256, questionnaire_schema_version,
           raw_draft_json, normalized_config_json, s3_prefix, s3_raw_key, s3_normalized_key,
           s3_manifest_key, raw_sha256, normalized_sha256,
           onboarding_id, revision_number, content_hash_algorithm, persistence_state
         ) VALUES (
           '99999999-9999-4999-8999-999999999999', '${hash}',
           10, '{}'::jsonb, '{}'::jsonb, 'p', 'r', 'n', 'm', '${hash}', '${hash}',
           '${onboardingB}', 2, 'questionnaire_answers_v1', 'committed'
         )`,
      );

      sql(
        DB,
        `INSERT INTO onboarding_submissions (
           session_id, content_revision_sha256, questionnaire_schema_version,
           raw_draft_json, normalized_config_json, s3_prefix, s3_raw_key, s3_normalized_key,
           s3_manifest_key, raw_sha256, normalized_sha256, persistence_state
         ) VALUES (
           'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
           '6666666666666666666666666666666666666666666666666666666666666666',
           10, '{}'::jsonb, '{}'::jsonb, 'p', 'r', 'n', 'm',
           '6666666666666666666666666666666666666666666666666666666666666666',
           '6666666666666666666666666666666666666666666666666666666666666666',
           'failed'
         )`,
      );
      expectError(
        DB,
        `INSERT INTO onboarding_submissions (
           session_id, content_revision_sha256, questionnaire_schema_version,
           raw_draft_json, normalized_config_json, s3_prefix, s3_raw_key, s3_normalized_key,
           s3_manifest_key, raw_sha256, normalized_sha256, persistence_state
         ) VALUES (
           'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
           '6666666666666666666666666666666666666666666666666666666666666666',
           10, '{}'::jsonb, '{}'::jsonb, 'p', 'r', 'n', 'm',
           '6666666666666666666666666666666666666666666666666666666666666666',
           '6666666666666666666666666666666666666666666666666666666666666666',
           'complete'
         )`,
      );
      expectError(
        DB,
        `INSERT INTO onboarding_submissions (
           session_id, content_revision_sha256, questionnaire_schema_version,
           raw_draft_json, normalized_config_json, s3_prefix, s3_raw_key, s3_normalized_key,
           s3_manifest_key, raw_sha256, normalized_sha256,
           onboarding_id, revision_number
         ) VALUES (
           'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
           '7777777777777777777777777777777777777777777777777777777777777777',
           10, '{}'::jsonb, '{}'::jsonb, 'p', 'r', 'n', 'm',
           '7777777777777777777777777777777777777777777777777777777777777777',
           '7777777777777777777777777777777777777777777777777777777777777777',
           '${onboardingB}', 0
         )`,
      );

      sql(
        DB,
        `INSERT INTO onboarding_submissions (
           session_id, content_revision, submitted_at, content_revision_sha256,
           questionnaire_schema_version, raw_draft_json, normalized_config_json,
           s3_prefix, s3_raw_key, s3_normalized_key, s3_manifest_key, raw_sha256, normalized_sha256,
           onboarding_id, revision_number, persistence_state, content_hash_algorithm
         ) VALUES (
           'cccccccc-cccc-4ccc-8ccc-cccccccccccc', NULL, NULL,
           '8888888888888888888888888888888888888888888888888888888888888888',
           10, '{}'::jsonb, '{}'::jsonb, 'p', 'r', 'n', 'm',
           '8888888888888888888888888888888888888888888888888888888888888888',
           '8888888888888888888888888888888888888888888888888888888888888888',
           '${onboardingB}', 3, 'pending', 'questionnaire_answers_v1'
         )`,
      );

      assert.equal(
        sql(DB, "SELECT string_agg(version, ',' ORDER BY version) FROM schema_migrations"),
        "001,002,003,004",
      );
    } finally {
      run("postgres", ["-c", `DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`]);
    }
  });
});
