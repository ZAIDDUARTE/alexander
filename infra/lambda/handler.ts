import { readFileSync } from "node:fs";
import { join } from "node:path";
import { rootCertificates } from "node:tls";
import {
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { Pool, type QueryResultRow } from "pg";
import { sha256Hex } from "../../src/lib/server/persistence/canonical";
import { handlePersistenceOperation } from "../../src/lib/server/persistence/engine";
import { handleOnboardingAccessOperation, type SqlPool } from "../../src/lib/server/persistence/onboarding-access";
import { submitPersistenceV2FromAccess } from "../../src/lib/server/persistence/v2-submit";
import type { OnboardingDraft } from "../../src/lib/onboarding/types";
import {
  isVisibleLegacySubmission,
  mapSubmissionRow,
} from "../../src/lib/server/persistence/submission-row";
import { isSafeSubmissionKey } from "../../src/lib/server/persistence/keys";
import { createLineLogger } from "../../src/lib/server/persistence/logger";
import type {
  DatabasePort,
  ObjectStorePort,
  SchemaStatus,
  SessionRecord,
  SubmissionRecord,
  SubmissionStatus,
} from "../../src/lib/server/persistence/types";
import type { DraftEnvelope } from "../../src/lib/server/persistence/types";

type SecretShape = { username?: string; password?: string };

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error("persistence_not_configured");
  return value;
}

function iso(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  const text = String(value);
  return text || null;
}

function asStatus(value: unknown): SubmissionStatus {
  return value === "submitted" ? "submitted" : "draft";
}

function mapSession(row: QueryResultRow): SessionRecord {
  const draft = row.draft_json as DraftEnvelope;
  return {
    sessionId: String(row.session_id),
    questionnaireSchemaVersion: Number(row.questionnaire_schema_version),
    draft,
    normalized: row.normalized_json ?? null,
    currentRoute: row.current_route == null ? null : String(row.current_route),
    currentSection: row.current_section == null ? null : Number(row.current_section),
    completedSections: Array.isArray(row.completed_sections) ? row.completed_sections.map(Number) : [],
    submissionStatus: asStatus(row.submission_status),
    lastSubmittedContentRevision:
      row.last_submitted_content_revision == null ? null : String(row.last_submitted_content_revision),
    submittedAt: iso(row.submitted_at),
    createdAt: iso(row.created_at) ?? draft.updatedAt,
    updatedAt: iso(row.updated_at) ?? draft.updatedAt,
    version: Number(row.version),
  };
}

function mapSubmission(row: QueryResultRow): SubmissionRecord {
  return mapSubmissionRow(row);
}

let pool: Pool | null = null;

async function getPool(): Promise<Pool> {
  if (pool) return pool;
  const secrets = new SecretsManagerClient({});
  const result = await secrets.send(
    new GetSecretValueCommand({ SecretId: requireEnv("APP_SECRET_ARN") }),
  );
  if (!result.SecretString) throw new Error("secret_missing");
  const secret = JSON.parse(result.SecretString) as SecretShape;
  if (!secret.username || !secret.password) throw new Error("secret_incomplete");
  const ca = [...rootCertificates, readFileSync(join(__dirname, "global-bundle.pem"), "utf8")];
  pool = new Pool({
    host: requireEnv("DB_PROXY_HOST"),
    port: Number(process.env.DB_PORT || "5432"),
    database: requireEnv("DB_NAME"),
    user: secret.username,
    password: secret.password,
    max: 1,
    ssl: { ca, rejectUnauthorized: true },
    connectionTimeoutMillis: 8000,
  });
  return pool;
}

function createDatabase(): DatabasePort {
  return {
    async ping() {
      const db = await getPool();
      await db.query("SELECT 1");
    },
    async schemaStatus(): Promise<SchemaStatus> {
      const db = await getPool();
      const migrations = await db.query<{ version: string }>(
        "SELECT version FROM schema_migrations ORDER BY version",
      );
      const tables = await db.query<{ table_name: string }>(
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema = 'public'
           AND table_name IN ('onboarding_sessions', 'onboarding_submissions', 'schema_migrations')
         ORDER BY table_name`,
      );
      const indexes = await db.query<{ indexname: string }>(
        `SELECT indexname FROM pg_indexes
         WHERE schemaname = 'public'
           AND tablename IN ('onboarding_sessions', 'onboarding_submissions')
         ORDER BY indexname`,
      );
      const constraints = await db.query<{ conname: string }>(
        `SELECT con.conname
         FROM pg_constraint con
         JOIN pg_class rel ON rel.oid = con.conrelid
         JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
         WHERE nsp.nspname = 'public'
           AND rel.relname IN ('onboarding_sessions', 'onboarding_submissions')
         ORDER BY con.conname`,
      );
      return {
        migrationVersion: migrations.rows.at(-1)?.version ?? null,
        tables: tables.rows.map((row) => row.table_name),
        indexes: indexes.rows.map((row) => row.indexname),
        constraints: constraints.rows.map((row) => row.conname),
      };
    },
    async getSession(sessionId) {
      const db = await getPool();
      const result = await db.query("SELECT * FROM onboarding_sessions WHERE session_id = $1", [
        sessionId,
      ]);
      return result.rows[0] ? mapSession(result.rows[0]) : null;
    },
    async listSubmissions(sessionId) {
      const db = await getPool();
      const result = await db.query(
        "SELECT * FROM onboarding_submissions WHERE session_id = $1 ORDER BY created_at",
        [sessionId],
      );
      return result.rows.filter(isVisibleLegacySubmission).map(mapSubmission);
    },
    async applyDraft(record) {
      const db = await getPool();
      const result = await db.query(
        `INSERT INTO onboarding_sessions (
           session_id, questionnaire_schema_version, draft_json, normalized_json,
           current_route, current_section, completed_sections, submission_status,
           last_submitted_content_revision, submitted_at, created_at, updated_at, version
         ) VALUES (
           $1, $2, $3::jsonb, $4::jsonb, $5, $6, $7::jsonb, $8, $9, $10, $11, $12, 1
         )
         ON CONFLICT (session_id) DO UPDATE SET
           questionnaire_schema_version = EXCLUDED.questionnaire_schema_version,
           draft_json = EXCLUDED.draft_json,
           normalized_json = COALESCE(EXCLUDED.normalized_json, onboarding_sessions.normalized_json),
           current_route = EXCLUDED.current_route,
           current_section = EXCLUDED.current_section,
           completed_sections = EXCLUDED.completed_sections,
           submission_status = EXCLUDED.submission_status,
           last_submitted_content_revision = EXCLUDED.last_submitted_content_revision,
           submitted_at = EXCLUDED.submitted_at,
           updated_at = EXCLUDED.updated_at,
           version = onboarding_sessions.version + 1
         WHERE onboarding_sessions.updated_at <= EXCLUDED.updated_at
         RETURNING *`,
        [
          record.sessionId,
          record.questionnaireSchemaVersion,
          JSON.stringify(record.draft),
          record.normalized == null ? null : JSON.stringify(record.normalized),
          record.currentRoute,
          record.currentSection,
          JSON.stringify(record.completedSections),
          record.submissionStatus,
          record.lastSubmittedContentRevision,
          record.submittedAt,
          record.createdAt,
          record.updatedAt,
        ],
      );
      if (result.rows[0]) return { applied: true, session: mapSession(result.rows[0]) };
      const current = await db.query("SELECT * FROM onboarding_sessions WHERE session_id = $1", [
        record.sessionId,
      ]);
      if (!current.rows[0]) throw new Error("session_missing");
      return { applied: false, session: mapSession(current.rows[0]) };
    },
    async commitSubmission(input) {
      const db = await getPool();
      const client = await db.connect();
      try {
        await client.query("BEGIN");
        const sessionResult = await client.query(
          `INSERT INTO onboarding_sessions (
             session_id, questionnaire_schema_version, draft_json, normalized_json,
             current_route, current_section, completed_sections, submission_status,
             last_submitted_content_revision, submitted_at, created_at, updated_at, version
           ) VALUES (
             $1, $2, $3::jsonb, $4::jsonb, $5, $6, $7::jsonb, 'submitted', $8, $9, $10, $11, 1
           )
           ON CONFLICT (session_id) DO UPDATE SET
             questionnaire_schema_version = EXCLUDED.questionnaire_schema_version,
             draft_json = EXCLUDED.draft_json,
             normalized_json = EXCLUDED.normalized_json,
             current_route = EXCLUDED.current_route,
             current_section = EXCLUDED.current_section,
             completed_sections = EXCLUDED.completed_sections,
             submission_status = 'submitted',
             last_submitted_content_revision = EXCLUDED.last_submitted_content_revision,
             submitted_at = CASE
               WHEN onboarding_sessions.last_submitted_content_revision = EXCLUDED.last_submitted_content_revision
                 AND onboarding_sessions.submitted_at IS NOT NULL
               THEN onboarding_sessions.submitted_at
               ELSE EXCLUDED.submitted_at
             END,
             updated_at = EXCLUDED.updated_at,
             version = onboarding_sessions.version + 1
           RETURNING *`,
          [
            input.session.sessionId,
            input.session.questionnaireSchemaVersion,
            JSON.stringify(input.session.draft),
            JSON.stringify(input.session.normalized),
            input.session.currentRoute,
            input.session.currentSection,
            JSON.stringify(input.session.completedSections),
            input.session.lastSubmittedContentRevision,
            input.session.submittedAt,
            input.session.createdAt,
            input.session.updatedAt,
          ],
        );
        const inserted = await client.query(
          `INSERT INTO onboarding_submissions (
             session_id, content_revision, content_revision_sha256, questionnaire_schema_version,
             raw_draft_json, normalized_config_json, s3_prefix, s3_raw_key,
             s3_normalized_key, s3_manifest_key, raw_sha256, normalized_sha256, submitted_at
           ) VALUES (
             $1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9, $10, $11, $12, $13
           )
           ON CONFLICT (session_id, content_revision_sha256) DO NOTHING
           RETURNING id`,
          [
            input.submission.sessionId,
            input.submission.contentRevision,
            sha256Hex(input.submission.contentRevision),
            input.submission.questionnaireSchemaVersion,
            JSON.stringify(input.submission.rawDraft),
            JSON.stringify(input.submission.normalized),
            input.submission.s3Prefix,
            input.submission.s3RawKey,
            input.submission.s3NormalizedKey,
            input.submission.s3ManifestKey,
            input.submission.rawSha256,
            input.submission.normalizedSha256,
            input.submission.submittedAt,
          ],
        );
        await client.query("COMMIT");
        return {
          duplicate: inserted.rowCount === 0,
          session: mapSession(sessionResult.rows[0]),
        };
      } catch (error) {
        const code =
          typeof error === "object" && error && "code" in error
            ? String((error as { code?: unknown }).code ?? "error")
            : "error";
        console.log(
          JSON.stringify({
            source: "alexander-persistence",
            operation: "commitSubmission",
            status: "error",
            errorCode: code,
          }),
        );
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

function createObjectStore(): ObjectStorePort {
  const s3 = new S3Client({});
  const bucket = requireEnv("SNAPSHOT_BUCKET");
  const kmsKeyId = requireEnv("SNAPSHOT_KMS_KEY_ARN");
  return {
    async putObject(key, body) {
      if (!isSafeSubmissionKey(key)) throw new Error("invalid_key");
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: "application/json",
          ServerSideEncryption: "aws:kms",
          SSEKMSKeyId: kmsKeyId,
        }),
      );
    },
    async getObject(key) {
      if (!isSafeSubmissionKey(key)) throw new Error("invalid_key");
      try {
        const result = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        const bytes = await result.Body?.transformToByteArray();
        return bytes ? Buffer.from(bytes) : null;
      } catch (error) {
        const name = error instanceof Error ? error.name : "";
        if (name === "NoSuchKey" || name === "NotFound") return null;
        throw error;
      }
    },
    async checkAccess() {
      await s3.send(new HeadBucketCommand({ Bucket: bucket }));
    },
  };
}

const log = createLineLogger();

export async function handler(event: unknown): Promise<unknown> {
  const operation =
    event && typeof event === "object" && "operation" in event
      ? String((event as { operation?: unknown }).operation ?? "")
      : "";
  if (
    operation === "redeemInvitation" ||
    operation === "resolveAccess" ||
    operation === "saveInvitedDraft"
  ) {
    const pool = await getPool();
    return handleOnboardingAccessOperation(event as Record<string, unknown>, pool as unknown as SqlPool);
  }
  if (operation === "submitPersistenceV2") {
    const body = event as { accessTokenHash?: unknown; draft?: unknown; failFinalize?: unknown };
    const accessTokenHash = typeof body.accessTokenHash === "string" ? body.accessTokenHash : "";
    if (!accessTokenHash || !body.draft || typeof body.draft !== "object") {
      return { ok: false, reason: "rejected" };
    }
    const pool = await getPool();
    return submitPersistenceV2FromAccess(pool as unknown as SqlPool, createObjectStore(), {
      accessTokenHash,
      draft: body.draft as OnboardingDraft,
      failFinalize: body.failFinalize === true,
    });
  }
  return handlePersistenceOperation(event, { db: createDatabase(), objects: createObjectStore() }, log);
}
