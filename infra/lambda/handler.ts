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
import {
  handleOnboardingAccessOperation,
  lookupInvitation,
  provisionFromVerifiedStripe,
  relocateInvitationUrlToCanonicalHost,
  resolveOnboardingInvitationHost,
  type SqlPool,
} from "../../src/lib/server/persistence/onboarding-access";
import { hashToken } from "../../src/lib/server/persistence/tokens";
import {
  claimEmailJobs,
  markEmailBlocked,
  markEmailRetry,
  markEmailSent,
  stagingEmailAllowed,
} from "../../src/lib/server/persistence/email-outbox";
import {
  renderDashboardReadyEmail,
  renderPortalAdminVerificationEmail,
  renderQuestionnaireInvitationCorrectionEmail,
  renderQuestionnaireInvitationEmail,
} from "../../src/lib/server/persistence/email-templates";
import { resolveApprovedDashboardUrl, validateCustomerDashboardUrl } from "../../src/lib/server/persistence/dashboard-url";
import {
  loadStripeSecretKey,
  verifyPaidCheckoutSession,
} from "../../src/lib/server/persistence/stripe-verify";
import { QUESTION_REGISTRY_BY_ID } from "../../src/lib/onboarding/questionnaire-v1/registry";
import {
  flattenQuestionnaireAnswerFields,
  projectSubmissionToBusinessProfile,
} from "../../src/lib/server/persistence/profile-projector";
import {
  inviteCustomerToTrilletWorkspace,
  inviteFeatureEnabled,
  inviteLiveEnabled,
  loadInviteEligibility,
  resolveCustomerInviteRole,
  resolveDashboardUrl,
} from "../../src/lib/server/persistence/trillet-invite";
import { resolveTrilletApiKey } from "../../src/lib/server/persistence/trillet-secret";
import {
  loadCustomerProvisioningStatus,
  queueDashboardReadyEmail,
  reconcileCustomerProvisioning,
  runCustomerProvisioning,
} from "../../src/lib/server/persistence/customer-provisioning";
import { evaluateAgencyWorkspaceContract } from "../../src/lib/server/persistence/trillet-workspace-adapter";
import { assertOperatorWorkspaceAssignment } from "../../src/lib/server/persistence/provisioning-policy";
import { submitPersistenceV2FromAccess } from "../../src/lib/server/persistence/v2-submit";
import type { OnboardingDraft } from "../../src/lib/onboarding/types";
import {
  isVisibleLegacySubmission,
  mapSubmissionRow,
} from "../../src/lib/server/persistence/submission-row";
import { isSafeSubmissionKey } from "../../src/lib/server/persistence/keys";
import { createLineLogger } from "../../src/lib/server/persistence/logger";
import { handleRequestOperation } from "../../src/lib/server/requests/store";
import { handleJobberOAuthOperation } from "../../src/lib/server/requests/jobber-store";
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

/** Load Trillet API key from Secrets Manager into process.env for this invocation only. Never logs the value. */
async function ensureTrilletApiKeyLoaded(): Promise<void> {
  if ((process.env.TRILLET_API_KEY || "").trim()) return;
  const arn = (process.env.TRILLET_SECRET_ARN || "").trim();
  if (!arn) return;
  const secrets = new SecretsManagerClient({});
  const resolved = await resolveTrilletApiKey(process.env, async (secretArn) => {
    const got = await secrets.send(new GetSecretValueCommand({ SecretId: secretArn }));
    return got.SecretString || null;
  });
  if (resolved.ok) {
    process.env.TRILLET_API_KEY = resolved.key;
  }
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
    [
      "resolveRequestInstallation",
      "persistVerifiedCall",
      "listServiceRequests",
      "listServiceRequestsByCustomer",
      "upsertStagingRequestInstallation",
    ].includes(operation)
  ) {
    // Staging seed/list-by-customer ops are IAM-only (Vercel→Lambda). Ingest/list still require the pipeline flag.
    if (
      process.env.ALEXANDER_REQUEST_PIPELINE_ENABLED !== "true" &&
      operation !== "upsertStagingRequestInstallation" &&
      operation !== "listServiceRequestsByCustomer"
    ) {
      return { ok: false, reason: "disabled" };
    }
    return handleRequestOperation(event as Record<string, unknown>, await getPool() as unknown as SqlPool);
  }
  if (
    operation === "persistVerifiedJobberConnection" ||
    operation === "disconnectJobberTestConnection" ||
    operation === "inspectJobberTestConnection"
  ) {
    // Independent of ALEXANDER_REQUEST_PIPELINE_ENABLED so staging OAuth can land without enabling write pipeline.
    return handleJobberOAuthOperation(event as Record<string, unknown>, await getPool() as unknown as SqlPool);
  }
  if (operation === "inspectEmailOutbox") {
    const body = event as { customerNumber?: unknown };
    const customerNumber =
      typeof body.customerNumber === "string" ? body.customerNumber.trim() : "";
    if (!/^ALX-C\d{6}$/.test(customerNumber)) {
      return { ok: false, reason: "invalid_customer_number" };
    }
    const pool = await getPool();
    const jobs = await pool.query(
      `SELECT e.id, e.template_type, e.status, e.attempt_count,
              (e.provider_message_id IS NOT NULL AND length(e.provider_message_id) > 0) AS has_message_id,
              (e.sent_at IS NOT NULL) AS has_sent_at,
              (e.delivered_at IS NOT NULL) AS has_delivered_at,
              (e.payload_json ? 'invitation_url'
                 AND length(coalesce(e.payload_json->>'invitation_url','')) > 0) AS has_invitation_url,
              left(e.dedupe_key, 32) AS dedupe_prefix,
              e.last_error_code
       FROM email_outbox e
       JOIN customers c ON c.id = e.customer_id
       WHERE c.customer_number = $1
         AND e.template_type = 'questionnaire_invitation'
       ORDER BY e.created_at ASC`,
      [customerNumber],
    );
    const customers = await pool.query(
      `SELECT count(*)::int AS n FROM customers WHERE customer_number = $1`,
      [customerNumber],
    );
    const feedback = await pool.query(
      `SELECT count(*)::int AS n
       FROM email_feedback_events f
       JOIN email_outbox e ON e.provider_message_id = f.provider_message_id
       JOIN customers c ON c.id = e.customer_id
       WHERE c.customer_number = $1
         AND e.template_type = 'questionnaire_invitation'`,
      [customerNumber],
    ).catch(() => ({ rows: [{ n: 0 }] }));
    return {
      ok: true,
      customerCount: customers.rows[0]?.n ?? 0,
      jobCount: jobs.rows.length,
      jobs: jobs.rows.map((row) => ({
        idPrefix: String(row.id).slice(0, 8),
        templateType: row.template_type,
        status: row.status,
        attemptCount: Number(row.attempt_count || 0),
        hasMessageId: Boolean(row.has_message_id),
        hasSentAt: Boolean(row.has_sent_at),
        hasDeliveredAt: Boolean(row.has_delivered_at),
        hasInvitationUrl: Boolean(row.has_invitation_url),
        dedupePrefix: row.dedupe_prefix,
        lastErrorCode: row.last_error_code || null,
      })),
      feedbackEventCount: Number(feedback.rows[0]?.n || 0),
    };
  }

  
  if (operation === "inspectRecentSubmissionActivity") {
    const pool = await getPool();
    const recentSubs = await pool.query(
      `SELECT s.id, s.persistence_state, s.submitted_at IS NOT NULL AS has_submitted_at,
              s.revision_number, o.status AS onboarding_status,
              c.customer_number,
              left(s.id::text, 8) AS id_prefix,
              left(o.id::text, 8) AS onboarding_prefix
       FROM onboarding_submissions s
       LEFT JOIN customer_onboardings o ON o.id = s.onboarding_id
       LEFT JOIN customers c ON c.id = o.customer_id
       ORDER BY s.created_at DESC NULLS LAST
       LIMIT 20`
    );
    const recentSessions = await pool.query(
      `SELECT left(s.session_id::text, 8) AS session_prefix,
              left(coalesce(s.onboarding_id::text,''), 8) AS onboarding_prefix,
              s.submission_status,
              s.submitted_at IS NOT NULL AS has_submitted_at,
              s.version,
              pg_column_size(s.draft_json) AS draft_bytes,
              c.customer_number,
              s.updated_at
       FROM onboarding_sessions s
       LEFT JOIN customer_onboardings o ON o.id = s.onboarding_id
       LEFT JOIN customers c ON c.id = o.customer_id
       WHERE s.updated_at > now() - interval '14 days'
          OR s.submitted_at IS NOT NULL
       ORDER BY s.updated_at DESC NULLS LAST
       LIMIT 20`
    );
    const recentAccess = await pool.query(
      `SELECT left(a.id::text, 8) AS access_prefix,
              left(a.onboarding_id::text, 8) AS onboarding_prefix,
              c.customer_number,
              a.created_at,
              a.revoked_at IS NOT NULL AS revoked
       FROM onboarding_access_sessions a
       JOIN customer_onboardings o ON o.id = a.onboarding_id
       JOIN customers c ON c.id = o.customer_id
       WHERE a.created_at > now() - interval '14 days'
       ORDER BY a.created_at DESC
       LIMIT 20`
    );
    const schema = await pool.query(`SELECT version FROM schema_migrations ORDER BY version`);
    return {
      ok: true,
      schemaVersions: schema.rows.map((r) => r.version),
      recentSubmissions: recentSubs.rows,
      recentSessions: recentSessions.rows.map((r) => ({
        sessionPrefix: r.session_prefix,
        onboardingPrefix: r.onboarding_prefix || null,
        submissionStatus: r.submission_status,
        hasSubmittedAt: Boolean(r.has_submitted_at),
        version: Number(r.version || 0),
        draftBytes: Number(r.draft_bytes || 0),
        customerNumber: r.customer_number || null,
        updatedAt: r.updated_at ? String(r.updated_at) : null,
      })),
      recentAccess: recentAccess.rows.map((r) => ({
        accessPrefix: r.access_prefix,
        onboardingPrefix: r.onboarding_prefix,
        customerNumber: r.customer_number,
        revoked: Boolean(r.revoked),
        createdAt: r.created_at ? String(r.created_at) : null,
      })),
    };
  }

if (operation === "diagnoseCustomerSubmissionState") {
    const body = event as { customerNumber?: unknown };
    const customerNumber =
      typeof body.customerNumber === "string" ? body.customerNumber.trim() : "";
    if (!/^ALX-C\d{6}$/.test(customerNumber)) {
      return { ok: false, reason: "invalid_customer_number" };
    }
    const pool = await getPool();
    const customer = await pool.query(
      `SELECT id FROM customers WHERE customer_number = $1`,
      [customerNumber],
    );
    if (!customer.rows[0]) return { ok: false, reason: "customer_not_found" };
    const customerId = String(customer.rows[0].id);
    const onboardings = await pool.query(
      `SELECT id, status, latest_submission_id, created_at
       FROM customer_onboardings WHERE customer_id = $1 ORDER BY created_at`,
      [customerId],
    );
    const submissions = await pool.query(
      `SELECT s.id, s.onboarding_id, s.revision_number, s.persistence_state,
              s.submitted_at IS NOT NULL AS has_submitted_at,
              s.questionnaire_answers_json IS NOT NULL AS has_answers,
              s.normalized_config_json IS NOT NULL AS has_normalized,
              s.content_revision_sha256 IS NOT NULL AS has_hash,
              left(coalesce(s.content_revision_sha256,''), 12) AS hash_prefix,
              s.created_at
       FROM onboarding_submissions s
       JOIN customer_onboardings o ON o.id = s.onboarding_id
       WHERE o.customer_id = $1
       ORDER BY s.created_at`,
      [customerId],
    );
    const sessions = await pool.query(
      `SELECT s.session_id, s.onboarding_id, s.submission_status,
              s.submitted_at IS NOT NULL AS has_submitted_at,
              s.last_submitted_content_revision IS NOT NULL AS has_last_submitted_rev,
              s.version, s.updated_at,
              pg_column_size(s.draft_json) AS draft_bytes,
              coalesce(jsonb_typeof(s.draft_json->'answers'), 'null') AS answers_type,
              CASE
                WHEN jsonb_typeof(s.draft_json->'answers') = 'object'
                THEN (SELECT count(*)::int FROM jsonb_object_keys(s.draft_json->'answers'))
                ELSE 0
              END AS answer_key_count,
              coalesce(s.draft_json->'submission'->>'status','') AS draft_submission_status,
              (s.draft_json->'submission'->>'submittedAt') IS NOT NULL
                AND length(coalesce(s.draft_json->'submission'->>'submittedAt','')) > 0
                AS draft_has_submitted_at
       FROM onboarding_sessions s
       JOIN customer_onboardings o ON o.id = s.onboarding_id
       WHERE o.customer_id = $1
       ORDER BY s.updated_at DESC NULLS LAST`,
      [customerId],
    );
    const access = await pool.query(
      `SELECT count(*)::int AS n
       FROM onboarding_access_sessions a
       JOIN customer_onboardings o ON o.id = a.onboarding_id
       WHERE o.customer_id = $1`,
      [customerId],
    );
    const invitations = await pool.query(
      `SELECT i.id, i.revoked_at IS NOT NULL AS revoked,
              i.expires_at, i.created_at
       FROM onboarding_invitations i
       JOIN customer_onboardings o ON o.id = i.onboarding_id
       WHERE o.customer_id = $1
       ORDER BY i.created_at`,
      [customerId],
    );
    const emailInviteHost = await pool.query(
      `SELECT
         CASE
           WHEN e.payload_json->>'invitation_url' IS NULL OR e.payload_json->>'invitation_url' = ''
             THEN 'missing'
           ELSE substring(e.payload_json->>'invitation_url' from 'https?://([^/]+)')
         END AS invite_host,
         length(coalesce(e.payload_json->>'invitation_url','')) AS invite_url_len,
         (position('/onboarding' in coalesce(e.payload_json->>'invitation_url','')) > 0
           OR position('/i/' in coalesce(e.payload_json->>'invitation_url','')) > 0
           OR position('token=' in coalesce(e.payload_json->>'invitation_url','')) > 0) AS looks_like_invite_path
       FROM email_outbox e
       WHERE e.customer_id = $1
         AND e.template_type = 'questionnaire_invitation'
       ORDER BY e.created_at
       LIMIT 1`,
      [customerId],
    );
    return {
      ok: true,
      customerId,
      customerIdPrefix: customerId.slice(0, 8),
      onboardings: onboardings.rows.map((r) => ({
        idPrefix: String(r.id).slice(0, 8),
        id: String(r.id),
        status: r.status,
        latestSubmissionPrefix: r.latest_submission_id
          ? String(r.latest_submission_id).slice(0, 8)
          : null,
      })),
      submissions: submissions.rows.map((r) => ({
        idPrefix: String(r.id).slice(0, 8),
        id: String(r.id),
        onboardingIdPrefix: String(r.onboarding_id).slice(0, 8),
        revisionNumber: Number(r.revision_number),
        persistenceState: r.persistence_state,
        hasSubmittedAt: Boolean(r.has_submitted_at),
        hasAnswers: Boolean(r.has_answers),
        hasNormalized: Boolean(r.has_normalized),
        hasHash: Boolean(r.has_hash),
        hashPrefix: r.hash_prefix || null,
      })),
      sessions: sessions.rows.map((r) => ({
        sessionIdPrefix: String(r.session_id).slice(0, 8),
        onboardingIdPrefix: r.onboarding_id ? String(r.onboarding_id).slice(0, 8) : null,
        submissionStatus: r.submission_status,
        hasSubmittedAt: Boolean(r.has_submitted_at),
        hasLastSubmittedRev: Boolean(r.has_last_submitted_rev),
        version: Number(r.version || 0),
        draftBytes: Number(r.draft_bytes || 0),
        answerKeyCount: Number(r.answer_key_count || 0),
        draftSubmissionStatus: r.draft_submission_status || null,
        draftHasSubmittedAt: Boolean(r.draft_has_submitted_at),
        updatedAt: r.updated_at ? String(r.updated_at) : null,
      })),
      accessSessionCount: Number(access.rows[0]?.n || 0),
      invitations: invitations.rows.map((r) => ({
        idPrefix: String(r.id).slice(0, 8),
        revoked: Boolean(r.revoked),
      })),
      invitationUrlHost: emailInviteHost.rows[0]?.invite_host || null,
      invitationUrlLen: Number(emailInviteHost.rows[0]?.invite_url_len || 0),
      invitationLooksLikePath: Boolean(emailInviteHost.rows[0]?.looks_like_invite_path),
    };
  }

  if (operation === "inspectPostSubmissionLifecycle") {
    const body = event as { customerNumber?: unknown };
    const customerNumber =
      typeof body.customerNumber === "string" ? body.customerNumber.trim() : "";
    if (!/^ALX-C\d{6}$/.test(customerNumber)) {
      return { ok: false, reason: "invalid_customer_number" };
    }
    const pool = await getPool();
    const customer = await pool.query(
      `SELECT id, customer_number, data_classification FROM customers WHERE customer_number = $1`,
      [customerNumber],
    );
    if (!customer.rows[0]) return { ok: false, reason: "customer_not_found" };
    const customerId = String(customer.rows[0].id);
    const dataClassification = String(customer.rows[0].data_classification || "real_customer");
    const counts = await pool.query(
      `SELECT
         (SELECT count(*)::int FROM customers WHERE customer_number = $1) AS customers,
         (SELECT count(*)::int FROM customer_onboardings WHERE customer_id = $2) AS onboardings,
         (SELECT count(*)::int FROM onboarding_invitations i
            JOIN customer_onboardings o ON o.id = i.onboarding_id
           WHERE o.customer_id = $2) AS invitations,
         (SELECT count(*)::int FROM email_outbox
           WHERE customer_id = $2 AND template_type = 'questionnaire_invitation') AS email1,
         (SELECT count(*)::int FROM email_outbox
           WHERE customer_id = $2 AND template_type = 'dashboard_ready') AS email2,
         (SELECT count(*)::int FROM customer_business_profiles WHERE customer_id = $2) AS profiles,
         (SELECT count(*)::int FROM customer_profile_revisions
           WHERE customer_id = $2 AND revision_number = 1) AS revision1,
         (SELECT count(*)::int FROM customer_profile_revisions WHERE customer_id = $2) AS revisions,
         (SELECT count(*)::int FROM customer_trillet_workspaces WHERE customer_id = $2) AS trillet_rows`,
      [customerNumber, customerId],
    );
    const onboarding = await pool.query(
      `SELECT id, status, latest_submission_id
       FROM customer_onboardings
       WHERE customer_id = $1
       ORDER BY created_at ASC`,
      [customerId],
    );
    const submissions = await pool.query(
      `SELECT s.id, s.revision_number, s.persistence_state, s.submitted_at,
              s.content_revision_sha256, s.content_hash_algorithm,
              s.questionnaire_answers_schema_version,
              (s.questionnaire_answers_json IS NOT NULL) AS has_answers,
              (s.normalized_config_json IS NOT NULL) AS has_normalized,
              s.s3_manifest_key IS NOT NULL AS has_manifest,
              o.id AS onboarding_id, o.status AS onboarding_status
       FROM onboarding_submissions s
       JOIN customer_onboardings o ON o.id = s.onboarding_id
       WHERE o.customer_id = $1
         AND s.persistence_state = 'committed'
         AND s.submitted_at IS NOT NULL
       ORDER BY s.submitted_at ASC`,
      [customerId],
    );
    const profile = await pool.query(
      `SELECT current_revision, profile_schema_version, source_submission_id, status,
              jsonb_typeof(profile_data) AS profile_data_type,
              coalesce(jsonb_array_length(
                CASE WHEN jsonb_typeof(profile_data->'fields') = 'array'
                     THEN profile_data->'fields' ELSE '[]'::jsonb END
              ), 0) AS fields_array_len,
              CASE WHEN jsonb_typeof(profile_data->'fields') = 'object'
                   THEN (SELECT count(*)::int FROM jsonb_object_keys(profile_data->'fields'))
                   ELSE 0 END AS field_key_count,
              profile_data->>'schema' AS profile_schema_name,
              created_at, updated_at
       FROM customer_business_profiles
       WHERE customer_id = $1`,
      [customerId],
    );
    const revisions = await pool.query(
      `SELECT revision_number, change_source, source_submission_id, profile_schema_version,
              actor_type, status, created_at,
              CASE WHEN jsonb_typeof(profile_data->'fields') = 'object'
                   THEN (SELECT count(*)::int FROM jsonb_object_keys(profile_data->'fields'))
                   ELSE 0 END AS field_key_count
       FROM customer_profile_revisions
       WHERE customer_id = $1
       ORDER BY revision_number ASC`,
      [customerId],
    );
    const trillet = await pool.query(
      `SELECT status,
              (workspace_id IS NOT NULL AND length(workspace_id) > 0) AS has_workspace,
              (invitation_url IS NOT NULL AND length(invitation_url) > 0) AS has_invitation_url,
              workspace_ready_at IS NOT NULL AS has_ready_at
       FROM customer_trillet_workspaces
       WHERE customer_id = $1`,
      [customerId],
    );
    // Field mapping: compare answer keys present vs profile field keys (counts + overlap only).
    let fieldMapping: Record<string, unknown> = { ok: false, reason: "no_submission" };
    if (submissions.rows[0]) {
      const ans = await pool.query(
        `SELECT questionnaire_answers_json FROM onboarding_submissions WHERE id = $1`,
        [submissions.rows[0].id],
      );
      const answers = (ans.rows[0]?.questionnaire_answers_json || {}) as Record<string, unknown>;
      const flatFields = flattenQuestionnaireAnswerFields(answers);
      const answerKeys = Object.keys(flatFields).filter((k) => {
        if (k === "_entities") return false;
        const v = flatFields[k];
        return v !== null && v !== undefined && v !== "";
      });
      const prof = profile.rows[0]
        ? await pool.query(
            `SELECT profile_data->'fields' AS fields FROM customer_business_profiles WHERE customer_id = $1`,
            [customerId],
          )
        : { rows: [] as Array<{ fields?: unknown }> };
      const fields =
        prof.rows[0]?.fields && typeof prof.rows[0].fields === "object"
          ? (prof.rows[0].fields as Record<string, unknown>)
          : {};
      const profileKeys = Object.keys(fields);
      const missingInProfile = answerKeys.filter((k) => !(k in fields));
      const extraInProfile = profileKeys.filter(
        (k) => !(k in flatFields) || flatFields[k] === "" || flatFields[k] == null,
      );
      // Representative category presence by key substring heuristics (no values).
      const categories = {
        businessIdentity: answerKeys.some((k) => /business|company|name|brand/i.test(k)),
        businessHours: answerKeys.some((k) => /hour|schedule|open|close|timezone/i.test(k)),
        services: answerKeys.some((k) => /service|offering|job/i.test(k)),
        serviceArea: answerKeys.some((k) => /area|zip|radius|territory|location/i.test(k)),
        callHandling: answerKeys.some((k) => /call|phone|answer|greeting/i.test(k)),
        emergency: answerKeys.some((k) => /emergenc/i.test(k)),
        scheduling: answerKeys.some((k) => /appoint|book|schedul|slot/i.test(k)),
        escalation: answerKeys.some((k) => /escalat|contact|notify|owner/i.test(k)),
      };
      fieldMapping = {
        ok: missingInProfile.length === 0,
        answerKeyCount: answerKeys.length,
        profileKeyCount: profileKeys.length,
        missingInProfileCount: missingInProfile.length,
        extraInProfileCount: extraInProfile.length,
        categoriesPresentInAnswers: categories,
      };
    }
    return {
      ok: true,
      customerIdPrefix: customerId.slice(0, 8),
      dataClassification,
      counts: counts.rows[0],
      onboardings: onboarding.rows.map((r) => ({
        idPrefix: String(r.id).slice(0, 8),
        status: r.status,
        latestSubmissionPrefix: r.latest_submission_id
          ? String(r.latest_submission_id).slice(0, 8)
          : null,
      })),
      submissions: submissions.rows.map((r) => ({
        idPrefix: String(r.id).slice(0, 8),
        id: String(r.id),
        revisionNumber: Number(r.revision_number),
        persistenceState: r.persistence_state,
        hasSubmittedAt: Boolean(r.submitted_at),
        submittedAt: r.submitted_at ? String(r.submitted_at) : null,
        contentHashPrefix: r.content_revision_sha256
          ? String(r.content_revision_sha256).slice(0, 12)
          : null,
        contentHashAlgorithm: r.content_hash_algorithm || null,
        answersSchemaVersion: r.questionnaire_answers_schema_version,
        hasAnswers: Boolean(r.has_answers),
        hasNormalized: Boolean(r.has_normalized),
        hasManifest: Boolean(r.has_manifest),
        onboardingIdPrefix: String(r.onboarding_id).slice(0, 8),
        onboardingStatus: r.onboarding_status,
      })),
      profile: profile.rows[0]
        ? {
            currentRevision: Number(profile.rows[0].current_revision),
            schemaVersion: Number(profile.rows[0].profile_schema_version),
            schemaName: profile.rows[0].profile_schema_name || null,
            sourceSubmissionPrefix: profile.rows[0].source_submission_id
              ? String(profile.rows[0].source_submission_id).slice(0, 8)
              : null,
            status: profile.rows[0].status,
            fieldKeyCount: Number(profile.rows[0].field_key_count || 0),
            hasCreatedAt: Boolean(profile.rows[0].created_at),
            hasUpdatedAt: Boolean(profile.rows[0].updated_at),
          }
        : null,
      revisions: revisions.rows.map((r) => ({
        revisionNumber: Number(r.revision_number),
        changeSource: r.change_source,
        sourceSubmissionPrefix: r.source_submission_id
          ? String(r.source_submission_id).slice(0, 8)
          : null,
        schemaVersion: Number(r.profile_schema_version),
        actorType: r.actor_type,
        status: r.status,
        hasCreatedAt: Boolean(r.created_at),
        fieldKeyCount: Number(r.field_key_count || 0),
      })),
      trillet: trillet.rows[0] || null,
      fieldMapping,
    };
  }

  if (operation === "projectSubmittedCustomerProfile") {
    const body = event as { customerNumber?: unknown; dryRun?: unknown };
    const customerNumber =
      typeof body.customerNumber === "string" ? body.customerNumber.trim() : "";
    const dryRun = body.dryRun === true || body.dryRun === "true";
    if (!/^ALX-C\d{6}$/.test(customerNumber)) {
      return { ok: false, reason: "invalid_customer_number" };
    }
    const pool = await getPool();
    const meta = await pool.query(
      `SELECT c.id AS customer_id, c.data_classification,
              o.status AS onboarding_status,
              s.id AS submission_id,
              (SELECT count(*)::int FROM customer_business_profiles p WHERE p.customer_id = c.id) AS profiles,
              (SELECT count(*)::int FROM customer_profile_revisions r
                 WHERE r.customer_id = c.id AND r.revision_number = 1) AS revision1
       FROM customers c
       JOIN customer_onboardings o ON o.customer_id = c.id
       JOIN onboarding_submissions s ON s.onboarding_id = o.id
       WHERE c.customer_number = $1
         AND s.persistence_state = 'committed'
         AND s.submitted_at IS NOT NULL
       ORDER BY s.submitted_at DESC
       LIMIT 1`,
      [customerNumber],
    );
    if (!meta.rows[0]) {
      return { ok: false, reason: "no_committed_submission", dryRun };
    }
    const row = meta.rows[0];
    const profiles = Number(row.profiles || 0);
    const revision1 = Number(row.revision1 || 0);
    const report = {
      customerNumber,
      dataClassification: String(row.data_classification || "real_customer"),
      onboardingStatus: String(row.onboarding_status || ""),
      submissionIdPrefix: String(row.submission_id).slice(0, 8),
      existingProfiles: profiles,
      existingRevision1: revision1,
      wouldProject: profiles === 0 || revision1 === 0,
      dryRun,
    };
    if (dryRun) return { ok: true, ...report, executed: false };
    if (profiles >= 1 && revision1 >= 1) {
      return { ok: true, ...report, executed: false, reason: "profile_already_present" };
    }
    const answersRow = await pool.query(
      `SELECT questionnaire_answers_json FROM onboarding_submissions WHERE id = $1`,
      [row.submission_id],
    );
    const projected = await projectSubmissionToBusinessProfile(pool as unknown as SqlPool, {
      customerId: String(row.customer_id),
      submissionId: String(row.submission_id),
      answers: (answersRow.rows[0]?.questionnaire_answers_json || {}) as Record<string, unknown>,
    });
    return { ok: true, ...report, executed: true, projection: projected };
  }

  if (operation === "inspectTrilletOperatorChecklist") {
    const body = event as { customerNumber?: unknown };
    const customerNumber =
      typeof body.customerNumber === "string" ? body.customerNumber.trim() : "";
    if (!/^ALX-C\d{6}$/.test(customerNumber)) {
      return { ok: false, reason: "invalid_customer_number" };
    }
    const pool = await getPool();
    const meta = await pool.query(
      `SELECT c.data_classification, p.profile_data->'fields' AS fields,
              t.status AS trillet_status
       FROM customers c
       LEFT JOIN customer_business_profiles p ON p.customer_id = c.id
       LEFT JOIN customer_trillet_workspaces t ON t.customer_id = c.id
       WHERE c.customer_number = $1`,
      [customerNumber],
    );
    if (!meta.rows[0]?.fields) {
      return { ok: false, reason: "profile_not_found" };
    }
    const fields =
      meta.rows[0].fields && typeof meta.rows[0].fields === "object"
        ? (meta.rows[0].fields as Record<string, unknown>)
        : {};
    const sectionCounts: Record<string, number> = {};
    let unknownSectionKeys = 0;
    const operational = {
      businessIdentity: 0,
      hoursAndSchedule: 0,
      services: 0,
      serviceArea: 0,
      callHandling: 0,
      emergencies: 0,
      scheduling: 0,
      escalation: 0,
      policiesAndFaqs: 0,
      submissionAcknowledgements: 0,
    };
    for (const key of Object.keys(fields)) {
      if (key === "_entities") continue;
      const reg = QUESTION_REGISTRY_BY_ID.get(key);
      const section = reg?.sectionId || "unknown";
      if (section === "unknown") unknownSectionKeys += 1;
      else sectionCounts[section] = (sectionCounts[section] || 0) + 1;
      const label = `${key} ${reg?.debugLabel || ""}`.toLowerCase();
      if (/business|company|brand|name|legal/i.test(label)) operational.businessIdentity += 1;
      if (/hour|schedule|open|close|timezone|after.?hours/i.test(label)) operational.hoursAndSchedule += 1;
      if (/service|offering|job type|trade/i.test(label)) operational.services += 1;
      if (/area|zip|radius|territory|dispatch|location/i.test(label)) operational.serviceArea += 1;
      if (/call|phone|greeting|answer|voicemail/i.test(label)) operational.callHandling += 1;
      if (/emergenc/i.test(label)) operational.emergencies += 1;
      if (/appoint|book|schedul|slot|calendar/i.test(label)) operational.scheduling += 1;
      if (/escalat|notify|owner|manager|contact/i.test(label)) operational.escalation += 1;
      if (/policy|faq|warranty|guarantee|payment/i.test(label)) operational.policiesAndFaqs += 1;
      if (section === "SUBMISSION") operational.submissionAcknowledgements += 1;
    }
    const entityBuckets =
      fields._entities && typeof fields._entities === "object"
        ? Object.keys(fields._entities as Record<string, unknown>)
        : [];
    return {
      ok: true,
      customerNumber,
      dataClassification: String(meta.rows[0].data_classification || "real_customer"),
      trilletStatus: meta.rows[0].trillet_status || null,
      profileFieldKeyCount: Object.keys(fields).filter((k) => k !== "_entities").length,
      sectionAnswerCounts: sectionCounts,
      unknownSectionKeys,
      entityBucketsPresent: entityBuckets,
      operationalCategoryCounts: operational,
      note: "Counts only — no answer values or contact details returned.",
    };
  }

  if (operation === "projectExistingSubmission") {
    const body = event as { customerNumber?: unknown };
    const customerNumber =
      typeof body.customerNumber === "string" ? body.customerNumber.trim() : "";
    if (!/^ALX-C\d{6}$/.test(customerNumber)) {
      return { ok: false, reason: "invalid_customer_number" };
    }
    const pool = await getPool();
    const row = await pool.query(
      `SELECT c.id AS customer_id, s.id AS submission_id, s.questionnaire_answers_json,
              s.content_revision_sha256, s.submitted_at, s.persistence_state
       FROM customers c
       JOIN customer_onboardings o ON o.customer_id = c.id
       JOIN onboarding_submissions s ON s.onboarding_id = o.id
       WHERE c.customer_number = $1
         AND s.persistence_state = 'committed'
         AND s.submitted_at IS NOT NULL
       ORDER BY s.submitted_at DESC
       LIMIT 1`,
      [customerNumber],
    );
    if (!row.rows[0]) return { ok: false, reason: "no_committed_submission" };
    const before = await pool.query(
      `SELECT content_revision_sha256, submitted_at, questionnaire_answers_json
       FROM onboarding_submissions WHERE id = $1`,
      [row.rows[0].submission_id],
    );
    const projected = await projectSubmissionToBusinessProfile(pool as unknown as SqlPool, {
      customerId: String(row.rows[0].customer_id),
      submissionId: String(row.rows[0].submission_id),
      answers: (row.rows[0].questionnaire_answers_json || {}) as Record<string, unknown>,
    });
    const after = await pool.query(
      `SELECT content_revision_sha256, submitted_at,
              (questionnaire_answers_json = $2::jsonb) AS answers_unchanged
       FROM onboarding_submissions WHERE id = $1`,
      [row.rows[0].submission_id, JSON.stringify(before.rows[0]?.questionnaire_answers_json ?? {})],
    );
    return {
      ok: true,
      submissionIdPrefix: String(row.rows[0].submission_id).slice(0, 8),
      revisionNumber: projected.revisionNumber,
      profileUpdated: projected.profileUpdated,
      submissionImmutable: {
        hashUnchanged:
          String(before.rows[0]?.content_revision_sha256 || "") ===
          String(after.rows[0]?.content_revision_sha256 || ""),
        submittedAtUnchanged:
          String(before.rows[0]?.submitted_at || "") === String(after.rows[0]?.submitted_at || ""),
        answersUnchanged: Boolean(after.rows[0]?.answers_unchanged),
      },
    };
  }

  if (operation === "cancelQueuedDashboardReadyEmail") {
    const body = event as { customerNumber?: unknown; emailJobId?: unknown };
    const customerNumber =
      typeof body.customerNumber === "string" ? body.customerNumber.trim() : "";
    const emailJobId = typeof body.emailJobId === "string" ? body.emailJobId.trim() : "";
    if (!/^ALX-C\d{6}$/.test(customerNumber) || !/^[0-9a-f-]{36}$/i.test(emailJobId)) {
      return { ok: false, reason: "invalid_payload" };
    }
    const pool = await getPool();
    const classification = await pool.query(
      `SELECT data_classification FROM customers WHERE customer_number = $1 LIMIT 1`,
      [customerNumber],
    );
    if (String(classification.rows[0]?.data_classification || "") !== "synthetic_test") {
      return { ok: false, reason: "not_synthetic_test" };
    }
    const updated = await pool.query(
      `UPDATE email_outbox e
       SET status = 'blocked_test_guard', updated_at = now(), last_error_code = 'staging_e2e_suppressed'
       FROM customers c
       WHERE e.id = $1
         AND e.customer_id = c.id
         AND c.customer_number = $2
         AND e.template_type = 'dashboard_ready'
         AND e.provider_message_id IS NULL
         AND e.status NOT IN ('sent', 'delivered', 'blocked_test_guard')
       RETURNING e.id, e.status`,
      [emailJobId, customerNumber],
    );
    return { ok: true, suppressed: updated.rows.length, idPrefix: emailJobId.slice(0, 8) };
  }

  if (operation === "recoverBlockedQuestionnaireInvitation") {
    const body = event as { customerNumber?: unknown };
    const customerNumber =
      typeof body.customerNumber === "string" ? body.customerNumber.trim() : "";
    if (!/^ALX-C\d{6}$/.test(customerNumber)) {
      return { ok: false, reason: "invalid_customer_number" };
    }
    const pool = await getPool();
    const updated = await pool.query(
      `UPDATE email_outbox e
       SET status = 'queued', next_attempt_at = now(), updated_at = now()
       FROM customers c
       WHERE e.customer_id = c.id
         AND c.customer_number = $1
         AND e.template_type = 'questionnaire_invitation'
         AND e.status IN ('blocked_test_guard', 'processing')
         AND e.provider_message_id IS NULL
       RETURNING e.id, e.status`,
      [customerNumber],
    );
    return { ok: true, recovered: updated.rows.length };
  }

  if (operation === "processEmailOutbox") {
    const pool = await getPool();
    // Load staging delivery guard from Secrets Manager when env is empty.
    let allow = (process.env.ALLOWED_TEST_RECIPIENT || "").trim();
    const guardArn = (process.env.EMAIL_GUARD_SECRET_ARN || "").trim();
    if (!allow && guardArn) {
      try {
        const secrets = new SecretsManagerClient({});
        const guard = await secrets.send(new GetSecretValueCommand({ SecretId: guardArn }));
        if (guard.SecretString) {
          const parsed = JSON.parse(guard.SecretString) as {
            ALLOWED_TEST_RECIPIENT?: string;
            EMAIL_DELIVERY_MODE?: string;
          };
          allow = (parsed.ALLOWED_TEST_RECIPIENT || "").trim();
          if (parsed.EMAIL_DELIVERY_MODE) {
            process.env.EMAIL_DELIVERY_MODE = parsed.EMAIL_DELIVERY_MODE;
          }
        }
      } catch {
        return { ok: false, reason: "email_guard_secret_unavailable" };
      }
    }
    if (!allow) {
      return { ok: false, reason: "TEST_RECIPIENT_REQUIRED" };
    }
    // Ensure staging guard env is visible to helper.
    process.env.EMAIL_DELIVERY_MODE = process.env.EMAIL_DELIVERY_MODE || "test";
    process.env.ALLOWED_TEST_RECIPIENT = allow;

    const jobs = await claimEmailJobs(pool as unknown as SqlPool, 5);
    const results: Array<Record<string, unknown>> = [];
    const { SESv2Client, SendEmailCommand } = await import("@aws-sdk/client-sesv2");
    const ses = new SESv2Client({});
    const from = process.env.ALEXANDER_SES_FROM || "Alexander <support@beyondintelligence.ai>";
    const configSet = process.env.ALEXANDER_SES_CONFIGURATION_SET || "alexander-transactional-staging";

    for (const job of jobs) {
      const guard = stagingEmailAllowed(allow);
      if (!guard.ok) {
        await markEmailBlocked(pool as unknown as SqlPool, job.id, guard.reason);
        results.push({ id: job.id, status: "blocked_test_guard", reason: guard.reason });
        continue;
      }
      // Always send to allowlisted test recipient in staging.
      const to = allow;
      const firstName = String(job.payload.first_name || "there");
      const invitationUrl = String(job.payload.invitation_url || "");
      const verificationUrl = String(job.payload.verification_url || "");
      if (job.templateType === "dashboard_ready") {
        const dashCheck = validateCustomerDashboardUrl(
          String(job.payload.dashboard_url || ""),
          process.env,
        );
        if (!dashCheck.ok) {
          await markEmailRetry(
            pool as unknown as SqlPool,
            job.id,
            `dashboard_url_${dashCheck.reason}`,
          );
          results.push({
            id: job.id,
            status: "retry_pending",
            reason: `dashboard_url_${dashCheck.reason}`,
          });
          continue;
        }
      }
      if (job.templateType === "portal_admin_verification" && !verificationUrl) {
        await markEmailRetry(pool as unknown as SqlPool, job.id, "missing_verification_url");
        results.push({ id: job.id, status: "retry_pending", reason: "missing_verification_url" });
        continue;
      }
      let rendered =
        job.templateType === "dashboard_ready"
          ? renderDashboardReadyEmail({
              firstName,
              dashboardUrl: String(job.payload.dashboard_url || ""),
            })
          : job.templateType === "portal_admin_verification"
            ? renderPortalAdminVerificationEmail({
                firstName,
                verificationUrl,
              })
            : job.templateType === "questionnaire_invitation_correction"
              ? renderQuestionnaireInvitationCorrectionEmail({
                  firstName,
                  invitationUrl,
                })
              : renderQuestionnaireInvitationEmail({
                  firstName,
                  invitationUrl,
                });
      if (
        (job.templateType === "questionnaire_invitation" ||
          job.templateType === "questionnaire_invitation_correction") &&
        !invitationUrl
      ) {
        await markEmailRetry(pool as unknown as SqlPool, job.id, "missing_invitation_url");
        results.push({ id: job.id, status: "retry_pending", reason: "missing_invitation_url" });
        continue;
      }
      try {
        const sent = await ses.send(
          new SendEmailCommand({
            FromEmailAddress: from,
            Destination: { ToAddresses: [to] },
            Content: {
              Simple: {
                Subject: { Data: rendered.subject, Charset: "UTF-8" },
                Body: {
                  Text: { Data: rendered.text, Charset: "UTF-8" },
                  Html: { Data: rendered.html, Charset: "UTF-8" },
                },
              },
            },
            ConfigurationSetName: configSet,
          }),
        );
        const messageId = sent.MessageId || "";
        await markEmailSent(pool as unknown as SqlPool, job.id, messageId);
        results.push({ id: job.id, status: "sent", messageId: Boolean(messageId) });
      } catch {
        await markEmailRetry(pool as unknown as SqlPool, job.id, "ses_send_failed");
        results.push({ id: job.id, status: "retry_pending", reason: "ses_send_failed" });
      }
    }
    return { ok: true, processed: results.length, results };
  }

  if (operation === "markTrilletWorkspaceReady") {
    const body = event as {
      customerId?: unknown;
      workspaceId?: unknown;
      agentId?: unknown;
      /** @deprecated Ignored for Email #2. Trillet sends its own invite links. */
      invitationUrl?: unknown;
      dashboardUrl?: unknown;
      operatorRef?: unknown;
      /** When true, attempt automated Trillet invite after marking ready. */
      sendTrilletInvite?: unknown;
      /** Requires TRILLET_INVITE_LIVE_ENABLED=true; default false. */
      liveInvite?: unknown;
    };
    const customerId = typeof body.customerId === "string" ? body.customerId : "";
    const workspaceRaw = typeof body.workspaceId === "string" ? body.workspaceId.trim() : "";
    if (!/^[0-9a-f-]{36}$/i.test(customerId) || !workspaceRaw) {
      return {
        ok: false,
        reason: "invalid_payload",
        detail: "customerId and workspaceId are required",
      };
    }
    const workspaceCheck = assertOperatorWorkspaceAssignment(workspaceRaw, process.env);
    if (!workspaceCheck.ok) {
      return { ok: false, reason: workspaceCheck.reason, detail: workspaceCheck.detail };
    }
    const workspaceId = workspaceCheck.workspaceId;

    // Email #2 is optional and independent of Trillet's native invite.
    // Never trust body.invitationUrl. Missing/unapproved dashboard URL blocks Email #2 only.
    const configuredDash = resolveApprovedDashboardUrl(process.env);
    const explicitDash =
      typeof body.dashboardUrl === "string" && body.dashboardUrl.trim()
        ? validateCustomerDashboardUrl(body.dashboardUrl.trim(), process.env)
        : null;
    const dashResult =
      explicitDash && explicitDash.ok
        ? explicitDash
        : configuredDash.ok
          ? configuredDash
          : explicitDash || configuredDash;
    const dashboardUrl = dashResult.ok ? dashResult.url : null;
    const dashboardBlockedReason = dashResult.ok
      ? null
      : `${dashResult.reason}${dashResult.detail ? `:${dashResult.detail}` : ""}`;

    const pool = await getPool();
    const client = await (pool as unknown as SqlPool).connect();
    let emailJobId: string | null = null;
    let emailBlockedReason: string | null = dashboardBlockedReason
      ? `dashboard_url_${dashboardBlockedReason}`
      : null;
    try {
      await client.query("BEGIN");
      const submitted = await client.query(
        `SELECT o.id
         FROM customer_onboardings o
         WHERE o.customer_id = $1 AND o.status = 'submitted'
         ORDER BY created_at DESC LIMIT 1`,
        [customerId],
      );
      if (!submitted.rows[0]) {
        await client.query("ROLLBACK");
        return { ok: false, reason: "questionnaire_not_submitted" };
      }
      const profileReady = await client.query(
        `SELECT p.customer_id
         FROM customer_business_profiles p
         JOIN customer_profile_revisions r
           ON r.customer_id = p.customer_id
          AND r.revision_number = 1
          AND r.change_source = 'initial_questionnaire'
          AND r.status = 'active'
         WHERE p.customer_id = $1
           AND p.current_revision >= 1
         LIMIT 1`,
        [customerId],
      );
      if (!profileReady.rows[0]) {
        await client.query("ROLLBACK");
        return { ok: false, reason: "canonical_profile_not_ready" };
      }
      const trilletRow = await client.query(
        `SELECT status, workspace_id FROM customer_trillet_workspaces WHERE customer_id = $1 LIMIT 1`,
        [customerId],
      );
      const trilletStatus = String(trilletRow.rows[0]?.status || "");
      const existingWorkspaceId = trilletRow.rows[0]?.workspace_id
        ? String(trilletRow.rows[0].workspace_id)
        : "";
      const allowedPrior = new Set([
        "awaiting_internal_setup",
        "workspace_provisioning_blocked",
        "provisioning_pending",
        "error",
        "trillet_sync_required",
      ]);
      // Idempotent re-mark of the same workspace mapping.
      const sameReady =
        trilletStatus === "ready" &&
        existingWorkspaceId &&
        existingWorkspaceId === workspaceId;
      if (!sameReady && !allowedPrior.has(trilletStatus)) {
        await client.query("ROLLBACK");
        return {
          ok: false,
          reason: "trillet_status_not_awaiting_setup",
          status: trilletStatus || null,
        };
      }
      const clash = await client.query(
        `SELECT customer_id FROM customer_trillet_workspaces
         WHERE workspace_id = $1 AND customer_id <> $2 LIMIT 1`,
        [workspaceId, customerId],
      );
      if (clash.rows[0]) {
        await client.query("ROLLBACK");
        return { ok: false, reason: "workspace_already_assigned" };
      }
      await client.query(
        `INSERT INTO customer_trillet_workspaces (
           customer_id, workspace_id, agent_id, invitation_url, dashboard_url, status,
           workspace_ready_at, operator_ref, provisioning_phase,
           provisioning_last_error, updated_at
         ) VALUES ($1,$2,$3,NULL,$4,'ready',now(),$5,'workspace_mapped',NULL,now())
         ON CONFLICT (customer_id) DO UPDATE SET
           workspace_id = EXCLUDED.workspace_id,
           agent_id = EXCLUDED.agent_id,
           dashboard_url = COALESCE(EXCLUDED.dashboard_url, customer_trillet_workspaces.dashboard_url),
           status = 'ready',
           workspace_ready_at = COALESCE(customer_trillet_workspaces.workspace_ready_at, now()),
           operator_ref = EXCLUDED.operator_ref,
           provisioning_phase = 'workspace_mapped',
           provisioning_last_error = NULL,
           last_error = NULL,
           updated_at = now()`,
        [
          customerId,
          workspaceId,
          typeof body.agentId === "string" ? body.agentId : null,
          dashboardUrl,
          typeof body.operatorRef === "string" ? body.operatorRef : null,
        ],
      );
      // Queue Email #2 only when destination AND portal admin are both ready.
      if (dashboardUrl) {
        const email = await client.query(
          `SELECT portal_admin_email, portal_admin_status, customer_facing_name
           FROM customers WHERE id = $1`,
          [customerId],
        );
        const queued = await queueDashboardReadyEmail(client, {
          customerId,
          workspaceId,
          portalAdminEmail: email.rows[0]?.portal_admin_email
            ? String(email.rows[0].portal_admin_email)
            : null,
          portalAdminStatus: email.rows[0]?.portal_admin_status
            ? String(email.rows[0].portal_admin_status)
            : null,
          customerFacingName: email.rows[0]?.customer_facing_name
            ? String(email.rows[0].customer_facing_name)
            : null,
          dashboardUrl,
        });
        emailJobId = queued.emailJobId;
        if (queued.blockedReason) emailBlockedReason = queued.blockedReason;
      }
      await client.query("COMMIT");
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // ignore
      }
      throw error;
    } finally {
      client.release();
    }

    const wantInvite = body.sendTrilletInvite === true || inviteFeatureEnabled(process.env);
    const resumed = await runCustomerProvisioning(pool as unknown as SqlPool, {
      customerId,
      trigger: "mark_workspace_ready",
      sendTrilletInvite: wantInvite,
      liveInvite: body.liveInvite === true,
      operatorRef:
        typeof body.operatorRef === "string" ? body.operatorRef : "markTrilletWorkspaceReady",
    });
    if (
      resumed.phase === "invite_failed" ||
      resumed.phase === "workspace_provisioning_blocked" ||
      resumed.gateReason
    ) {
      console.log(
        JSON.stringify({
          event: "customer_provisioning_attention",
          customerIdPrefix: customerId.slice(0, 8),
          phase: resumed.phase,
          reason: resumed.gateReason || resumed.detail || resumed.phase,
        }),
      );
    }

    return {
      ok: true,
      customerId,
      workspaceId,
      dashboardUrl,
      emailJobId,
      emailBlockedReason,
      provisioning: {
        phase: resumed.phase,
        ok: resumed.ok,
        idempotent: resumed.idempotent,
        emailBlockedReason: resumed.emailBlockedReason || null,
      },
      invite: resumed.invite,
      inviteFeatureEnabled: inviteFeatureEnabled(process.env),
      inviteLiveEnabled: inviteLiveEnabled(process.env),
      note:
        "Trillet native invite is independent of SES Email #2. Email #2 stays blocked without an allowlisted dashboard URL and confirmed portal admin. invite_status=sent is not customer activation.",
    };
  }

  if (operation === "reconcileCustomerProvisioning") {
    const body = event as { execute?: unknown; limit?: unknown };
    const pool = await getPool();
    const execute = body.execute === true;
    await ensureTrilletApiKeyLoaded();
    const reconciled = await reconcileCustomerProvisioning(pool as unknown as SqlPool, {
      execute,
      limit: typeof body.limit === "number" ? body.limit : 25,
    });
    return {
      ...reconciled,
      inviteFeatureEnabled: inviteFeatureEnabled(process.env),
      inviteLiveEnabled: inviteLiveEnabled(process.env),
      note: execute
        ? "Executed idempotent provisioning. Terminal invitations are not resent. Workspaces are not created."
        : "Dry-run only. Pass execute:true to recover missed triggers. Does not send live invites unless invite flags are already enabled.",
    };
  }

  if (operation === "inspectCustomerProvisioning") {
    const body = event as { customerNumber?: unknown; customerId?: unknown };
    const customerNumber =
      typeof body.customerNumber === "string" ? body.customerNumber.trim() : "";
    const customerId = typeof body.customerId === "string" ? body.customerId.trim() : "";
    if (!customerId && !/^ALX-C\d{6}$/.test(customerNumber)) {
      return { ok: false, reason: "invalid_payload" };
    }
    const pool = await getPool();
    const loaded = await loadCustomerProvisioningStatus(
      pool as unknown as SqlPool,
      { customerId: customerId || undefined, customerNumber: customerNumber || undefined },
      process.env,
    );
    if (!loaded.ok) return loaded;
    return {
      ok: true,
      status: loaded.status,
      agencyContract: evaluateAgencyWorkspaceContract(),
      inviteFeatureEnabled: inviteFeatureEnabled(process.env),
      inviteLiveEnabled: inviteLiveEnabled(process.env),
      note:
        "workspace_provisioning_blocked means Agency-managed create is not in the confirmed Trillet API. Operator maps an isolated workspace via markTrilletWorkspaceReady. Never use ALX-C000002 / Phillip workspace.",
    };
  }

  if (operation === "runCustomerProvisioning" || operation === "retryCustomerProvisioning") {
    const body = event as {
      customerNumber?: unknown;
      customerId?: unknown;
      sendTrilletInvite?: unknown;
      liveInvite?: unknown;
      forceRetry?: unknown;
      operatorRef?: unknown;
    };
    const customerNumber =
      typeof body.customerNumber === "string" ? body.customerNumber.trim() : "";
    const customerId = typeof body.customerId === "string" ? body.customerId.trim() : "";
    if (!customerId && !/^ALX-C\d{6}$/.test(customerNumber)) {
      return { ok: false, reason: "invalid_payload" };
    }
    if (customerNumber === "ALX-C000002") {
      return { ok: false, reason: "customer_blocked", detail: "ALX-C000002 is never provisioned by automation" };
    }
    await ensureTrilletApiKeyLoaded();
    const pool = await getPool();
    return runCustomerProvisioning(pool as unknown as SqlPool, {
      customerId: customerId || undefined,
      customerNumber: customerNumber || undefined,
      trigger: operation === "retryCustomerProvisioning" ? "operator_retry" : "operator_retry",
      sendTrilletInvite: body.sendTrilletInvite === true,
      liveInvite: body.liveInvite === true,
      forceRetry: operation === "retryCustomerProvisioning" || body.forceRetry === true,
      operatorRef:
        typeof body.operatorRef === "string"
          ? body.operatorRef
          : operation,
    });
  }

  if (operation === "prepareTrilletInvite") {
    const body = event as {
      customerNumber?: unknown;
      customerId?: unknown;
    };
    const customerNumber =
      typeof body.customerNumber === "string" ? body.customerNumber.trim() : "";
    const customerId = typeof body.customerId === "string" ? body.customerId.trim() : "";
    if (!customerId && !/^ALX-C\d{6}$/.test(customerNumber)) {
      return { ok: false, reason: "invalid_payload" };
    }
    if (customerNumber === "ALX-C000002") {
      return { ok: false, reason: "customer_blocked", detail: "ALX-C000002 is never invited by automation" };
    }
    await ensureTrilletApiKeyLoaded();
    const pool = await getPool();
    const eligibility = await loadInviteEligibility(
      pool as unknown as SqlPool,
      { customerId: customerId || undefined, customerNumber: customerNumber || undefined },
      process.env,
    );
    return {
      ok: eligibility.ok,
      eligibility,
      plannedRole: resolveCustomerInviteRole(process.env),
      dashboardUrl: resolveDashboardUrl(process.env),
      inviteFeatureEnabled: inviteFeatureEnabled(process.env),
      inviteLiveEnabled: inviteLiveEnabled(process.env),
      trilletApiKeyConfigured: Boolean((process.env.TRILLET_API_KEY || "").trim()),
      endpoint: "POST https://api.trillet.ai/v1/api/workspaces/{workspaceId}/invite",
      note: "Dry-run only. Live send requires inviteTrilletCustomer with live:true and TRILLET_INVITE_LIVE_ENABLED=true plus explicit recipient approval. invite_status=sent is not account activation.",
    };
  }

  if (operation === "inviteTrilletCustomer") {
    const body = event as {
      customerNumber?: unknown;
      customerId?: unknown;
      live?: unknown;
      forceRetry?: unknown;
      role?: unknown;
      operatorRef?: unknown;
    };
    const customerNumber =
      typeof body.customerNumber === "string" ? body.customerNumber.trim() : "";
    const customerId = typeof body.customerId === "string" ? body.customerId.trim() : "";
    if (!customerId && !/^ALX-C\d{6}$/.test(customerNumber)) {
      return { ok: false, reason: "invalid_payload" };
    }
    if (customerNumber === "ALX-C000002") {
      return { ok: false, reason: "customer_blocked" };
    }
    await ensureTrilletApiKeyLoaded();
    const pool = await getPool();
    const role =
      typeof body.role === "string" && ["viewer", "editor", "admin"].includes(body.role)
        ? (body.role as "viewer" | "editor" | "admin")
        : undefined;
    return inviteCustomerToTrilletWorkspace(pool as unknown as SqlPool, {
      customerId: customerId || undefined,
      customerNumber: customerNumber || undefined,
      live: body.live === true,
      forceRetry: body.forceRetry === true,
      role,
      operatorRef: typeof body.operatorRef === "string" ? body.operatorRef : null,
    });
  }

  if (operation === "inspectInvitationRedeemability") {
    const body = event as { customerNumber?: unknown };
    const customerNumber =
      typeof body.customerNumber === "string" ? body.customerNumber.trim() : "";
    if (!/^ALX-C\d{6}$/.test(customerNumber)) {
      return { ok: false, reason: "invalid_customer_number" };
    }
    const pool = await getPool();
    const customer = await pool.query(
      `SELECT id FROM customers WHERE customer_number = $1`,
      [customerNumber],
    );
    if (!customer.rows[0]) return { ok: false, reason: "customer_not_found" };
    const customerId = String(customer.rows[0].id);
    const invites = await pool.query(
      `SELECT i.id, i.revoked_at IS NOT NULL AS revoked,
              i.expires_at IS NOT NULL AND i.expires_at <= now() AS expired,
              i.expires_at IS NULL OR i.expires_at > now() AS unexpired
       FROM onboarding_invitations i
       JOIN customer_onboardings o ON o.id = i.onboarding_id
       WHERE o.customer_id = $1
       ORDER BY i.created_at`,
      [customerId],
    );
    const access = await pool.query(
      `SELECT left(a.id::text, 8) AS access_prefix,
              a.revoked_at IS NOT NULL AS revoked,
              a.expires_at IS NULL OR a.expires_at > now() AS unexpired,
              a.created_at
       FROM onboarding_access_sessions a
       JOIN customer_onboardings o ON o.id = a.onboarding_id
       WHERE o.customer_id = $1
       ORDER BY a.created_at`,
      [customerId],
    );
    const email = await pool.query(
      `SELECT payload_json->>'invitation_url' AS invitation_url
       FROM email_outbox
       WHERE customer_id = $1
         AND template_type IN ('questionnaire_invitation','questionnaire_invitation_correction')
         AND coalesce(payload_json->>'invitation_url','') <> ''
       ORDER BY created_at DESC
       LIMIT 1`,
      [customerId],
    );
    const invitationUrl = String(email.rows[0]?.invitation_url || "");
    const token = invitationUrl.includes("/i#") ? invitationUrl.split("/i#")[1] || "" : "";
    let lookupOk = false;
    let lookupOnboardingPrefix: string | null = null;
    if (token.length >= 32) {
      const looked = await lookupInvitation(pool as unknown as SqlPool, hashToken(token));
      lookupOk = Boolean(looked.ok);
      if (looked.ok) lookupOnboardingPrefix = looked.onboardingId.slice(0, 8);
    }
    const activeUnrevoked = invites.rows.filter((row) => !row.revoked && row.unexpired);
    return {
      ok: true,
      invitationCount: invites.rows.length,
      active: activeUnrevoked.length === 1,
      expired: invites.rows.some((row) => Boolean(row.expired)),
      revoked: invites.rows.some((row) => Boolean(row.revoked)),
      consumedFlagExists: false,
      redeemCountColumnExists: false,
      browserRedeemable: lookupOk && activeUnrevoked.length === 1,
      lookupOnboardingPrefix,
      invitationHost: (() => {
        try {
          return invitationUrl ? new URL(invitationUrl).host : null;
        } catch {
          return null;
        }
      })(),
      accessSessionCount: access.rows.length,
      accessSessions: access.rows.map((row) => ({
        accessPrefix: row.access_prefix,
        revoked: Boolean(row.revoked),
        unexpired: Boolean(row.unexpired),
        createdAt: row.created_at ? String(row.created_at) : null,
      })),
      redeemed: false,
    };
  }

  if (operation === "enqueueInvitationHostCorrection") {
    const body = event as { customerNumber?: unknown };
    const customerNumber =
      typeof body.customerNumber === "string" ? body.customerNumber.trim() : "";
    if (!/^ALX-C\d{6}$/.test(customerNumber)) {
      return { ok: false, reason: "invalid_customer_number" };
    }
    let canonicalHost: string;
    try {
      canonicalHost = resolveOnboardingInvitationHost();
    } catch {
      return { ok: false, reason: "onboarding_host_not_configured" };
    }
    const pool = await getPool();
    const client = await (pool as unknown as SqlPool).connect();
    try {
      await client.query("BEGIN");
      const customer = await client.query(
        `SELECT id, customer_facing_name, primary_email
         FROM customers WHERE customer_number = $1 FOR UPDATE`,
        [customerNumber],
      );
      if (!customer.rows[0]) {
        await client.query("ROLLBACK");
        return { ok: false, reason: "customer_not_found" };
      }
      const customerId = String(customer.rows[0].id);
      const onboarding = await client.query(
        `SELECT id FROM customer_onboardings
         WHERE customer_id = $1 ORDER BY created_at ASC LIMIT 1 FOR UPDATE`,
        [customerId],
      );
      if (!onboarding.rows[0]) {
        await client.query("ROLLBACK");
        return { ok: false, reason: "onboarding_not_found" };
      }
      const onboardingId = String(onboarding.rows[0].id);
      const invite = await client.query(
        `SELECT id, token_hash, expires_at, revoked_at
         FROM onboarding_invitations
         WHERE onboarding_id = $1
         ORDER BY created_at ASC`,
        [onboardingId],
      );
      if (invite.rows.length !== 1) {
        await client.query("ROLLBACK");
        return { ok: false, reason: "invitation_count_unexpected", invitationCount: invite.rows.length };
      }
      if (invite.rows[0].revoked_at) {
        await client.query("ROLLBACK");
        return { ok: false, reason: "invitation_revoked" };
      }
      if (invite.rows[0].expires_at && new Date(String(invite.rows[0].expires_at)).getTime() <= Date.now()) {
        await client.query("ROLLBACK");
        return { ok: false, reason: "invitation_expired" };
      }
      const original = await client.query(
        `SELECT id, payload_json
         FROM email_outbox
         WHERE customer_id = $1
           AND template_type = 'questionnaire_invitation'
         ORDER BY created_at ASC
         LIMIT 1
         FOR UPDATE`,
        [customerId],
      );
      if (!original.rows[0]) {
        await client.query("ROLLBACK");
        return { ok: false, reason: "original_email_missing" };
      }
      const payload = (original.rows[0].payload_json || {}) as Record<string, unknown>;
      const priorUrl = typeof payload.invitation_url === "string" ? payload.invitation_url : "";
      if (!priorUrl) {
        await client.query("ROLLBACK");
        return { ok: false, reason: "original_invitation_url_missing" };
      }
      let correctedUrl: string;
      try {
        correctedUrl = relocateInvitationUrlToCanonicalHost(priorUrl);
      } catch {
        await client.query("ROLLBACK");
        return { ok: false, reason: "invitation_token_unrecoverable" };
      }
      const token = correctedUrl.split("/i#")[1] || "";
      if (!token || hashToken(token) !== String(invite.rows[0].token_hash)) {
        await client.query("ROLLBACK");
        return { ok: false, reason: "invitation_token_mismatch" };
      }
      if (!correctedUrl.startsWith(`https://${canonicalHost}/i#`)) {
        await client.query("ROLLBACK");
        return { ok: false, reason: "corrected_host_mismatch" };
      }
      // Keep original outbox payload aligned to the canonical host (no resend of original job).
      await client.query(
        `UPDATE email_outbox
         SET payload_json = jsonb_set(payload_json, '{invitation_url}', to_jsonb($2::text), true),
             updated_at = now()
         WHERE id = $1`,
        [original.rows[0].id, correctedUrl],
      );
      const firstName =
        String(payload.first_name || "") ||
        String(customer.rows[0].customer_facing_name || "there").split(/\s+/)[0] ||
        "there";
      const dedupe = `questionnaire_invitation_correction:${onboardingId}:host-fix-v1`;
      const recipient = String(customer.rows[0].primary_email || "test-recipient-required@invalid.local");
      const job = await client.query(
        `INSERT INTO email_outbox (
           customer_id, onboarding_id, template_type, recipient, dedupe_key, payload_json, status
         ) VALUES ($1,$2,'questionnaire_invitation_correction',$3,$4,$5::jsonb,'queued')
         ON CONFLICT (dedupe_key) DO UPDATE SET updated_at = now()
         RETURNING id, status,
           (provider_message_id IS NOT NULL AND length(provider_message_id) > 0) AS has_message_id`,
        [
          customerId,
          onboardingId,
          recipient,
          dedupe,
          JSON.stringify({
            first_name: firstName,
            invitation_url: correctedUrl,
            correction_reason: "invitation_host_fix",
            canonical_host: canonicalHost,
          }),
        ],
      );
      await client.query("COMMIT");
      return {
        ok: true,
        customerNumber,
        onboardingIdPrefix: onboardingId.slice(0, 8),
        invitationCount: 1,
        invitationActive: true,
        correctedHost: canonicalHost,
        correctionJobIdPrefix: String(job.rows[0]?.id || "").slice(0, 8),
        correctionStatus: job.rows[0]?.status || null,
        alreadySent: Boolean(job.rows[0]?.has_message_id),
        newInvitationCreated: false,
      };
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // ignore
      }
      throw error;
    } finally {
      client.release();
    }
  }

  if (operation === "provisionFromStripeSession" || operation === "provisionFromVerifiedStripe") {
    const body = event as {
      checkoutSessionId?: unknown;
      correlationKey?: unknown;
      host?: unknown;
      verified?: Record<string, unknown>;
    };
    // Invitation host comes only from ONBOARDING_HOST / ALEXANDER_ONBOARDING_BASE_URL.
    // WordPress / Stripe callback hosts must never control questionnaire URLs.
    let host: string;
    try {
      host = resolveOnboardingInvitationHost(
        typeof body.host === "string" ? body.host : null,
      );
    } catch {
      return { ok: false, reason: "onboarding_host_not_configured" };
    }
    const correlationKey =
      typeof body.correlationKey === "string" ? body.correlationKey : null;

    // Isolated VPC Lambda cannot reach Stripe (no NAT). Preferred path:
    // Vercel verifies Stripe over the internet, then IAM-invokes with verified payload.
    if (operation === "provisionFromVerifiedStripe" || body.verified) {
      const v = (body.verified || {}) as Record<string, unknown>;
      const stripe = {
        checkoutSessionId: typeof v.checkoutSessionId === "string" ? v.checkoutSessionId : "",
        customerId: typeof v.customerId === "string" ? v.customerId : "",
        subscriptionId: typeof v.subscriptionId === "string" ? v.subscriptionId : "",
        priceId: typeof v.priceId === "string" ? v.priceId : "",
        productId: typeof v.productId === "string" ? v.productId : "",
        email: typeof v.email === "string" ? v.email : null,
        name: typeof v.name === "string" ? v.name : null,
        phone: typeof v.phone === "string" ? v.phone : null,
      };
      if (
        !stripe.checkoutSessionId.startsWith("cs_test_") ||
        !stripe.customerId.startsWith("cus_") ||
        !stripe.subscriptionId.startsWith("sub_")
      ) {
        return { ok: false, reason: "invalid_verified_payload" };
      }
      const pool = await getPool();
      return provisionFromVerifiedStripe(pool as unknown as SqlPool, {
        stripe,
        host,
        correlationKey,
      });
    }

    const checkoutSessionId =
      typeof body.checkoutSessionId === "string" ? body.checkoutSessionId.trim() : "";
    if (!checkoutSessionId) return { ok: false, reason: "invalid_payload" };

    const secretArn = process.env.STRIPE_SECRET_ARN || "";
    if (!secretArn) return { ok: false, reason: "stripe_secret_not_configured" };

    let secretKey: string;
    try {
      secretKey = await loadStripeSecretKey(secretArn);
    } catch {
      return { ok: false, reason: "stripe_secret_unavailable" };
    }

    const verified = await verifyPaidCheckoutSession(checkoutSessionId, secretKey);
    if (!verified.ok) {
      return {
        ok: false,
        reason: verified.reason,
        retryable: verified.retryable,
      };
    }

    const pool = await getPool();
    return provisionFromVerifiedStripe(pool as unknown as SqlPool, {
      stripe: verified.session,
      host,
      correlationKey,
    });
  }
  if (
    operation === "lookupInvitation" ||
    operation === "redeemInvitation" ||
    operation === "resolveAccess" ||
    operation === "saveInvitedDraft" ||
    operation === "loadPortalAdmin" ||
    operation === "confirmPortalAdmin" ||
    operation === "verifyPortalAdmin"
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
