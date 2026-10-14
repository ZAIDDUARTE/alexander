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
  provisionFromVerifiedStripe,
  type SqlPool,
} from "../../src/lib/server/persistence/onboarding-access";
import {
  claimEmailJobs,
  markEmailBlocked,
  markEmailRetry,
  markEmailSent,
  stagingEmailAllowed,
} from "../../src/lib/server/persistence/email-outbox";
import {
  renderDashboardReadyEmail,
  renderQuestionnaireInvitationEmail,
} from "../../src/lib/server/persistence/email-templates";
import {
  loadStripeSecretKey,
  verifyPaidCheckoutSession,
} from "../../src/lib/server/persistence/stripe-verify";
import { submitPersistenceV2FromAccess } from "../../src/lib/server/persistence/v2-submit";
import type { OnboardingDraft } from "../../src/lib/onboarding/types";
import {
  isVisibleLegacySubmission,
  mapSubmissionRow,
} from "../../src/lib/server/persistence/submission-row";
import { isSafeSubmissionKey } from "../../src/lib/server/persistence/keys";
import { createLineLogger } from "../../src/lib/server/persistence/logger";
import { handleRequestOperation } from "../../src/lib/server/requests/store";
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
  if (["resolveRequestInstallation", "persistVerifiedCall", "listServiceRequests"].includes(operation)) {
    if (process.env.ALEXANDER_REQUEST_PIPELINE_ENABLED !== "true") return { ok: false, reason: "disabled" };
    return handleRequestOperation(event as Record<string, unknown>, await getPool() as unknown as SqlPool);
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
      let rendered =
        job.templateType === "dashboard_ready"
          ? renderDashboardReadyEmail({
              firstName,
              dashboardUrl: String(job.payload.dashboard_url || job.payload.invitation_url || ""),
            })
          : renderQuestionnaireInvitationEmail({
              firstName,
              invitationUrl: String(job.payload.invitation_url || ""),
            });
      if (job.templateType === "questionnaire_invitation" && !job.payload.invitation_url) {
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
      invitationUrl?: unknown;
      operatorRef?: unknown;
    };
    const customerId = typeof body.customerId === "string" ? body.customerId : "";
    const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId.trim() : "";
    const invitationUrl = typeof body.invitationUrl === "string" ? body.invitationUrl.trim() : "";
    if (!/^[0-9a-f-]{36}$/i.test(customerId) || !workspaceId || !invitationUrl) {
      return { ok: false, reason: "invalid_payload" };
    }
    const pool = await getPool();
    const client = await (pool as unknown as SqlPool).connect();
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
           customer_id, workspace_id, agent_id, invitation_url, status,
           workspace_ready_at, invitation_created_at, operator_ref, updated_at
         ) VALUES ($1,$2,$3,$4,'ready',now(),now(),$5,now())
         ON CONFLICT (customer_id) DO UPDATE SET
           workspace_id = EXCLUDED.workspace_id,
           agent_id = EXCLUDED.agent_id,
           invitation_url = EXCLUDED.invitation_url,
           status = 'ready',
           workspace_ready_at = COALESCE(customer_trillet_workspaces.workspace_ready_at, now()),
           invitation_created_at = COALESCE(customer_trillet_workspaces.invitation_created_at, now()),
           operator_ref = EXCLUDED.operator_ref,
           updated_at = now()`,
        [
          customerId,
          workspaceId,
          typeof body.agentId === "string" ? body.agentId : null,
          invitationUrl,
          typeof body.operatorRef === "string" ? body.operatorRef : null,
        ],
      );
      const dedupe = `dashboard_ready:${customerId}:${workspaceId}`;
      const email = await client.query(
        `SELECT primary_email, customer_facing_name FROM customers WHERE id = $1`,
        [customerId],
      );
      const recipient = String(email.rows[0]?.primary_email || "test-recipient-required@invalid.local");
      const first = String(email.rows[0]?.customer_facing_name || "there").split(/\s+/)[0] || "there";
      const job = await client.query(
        `INSERT INTO email_outbox (
           customer_id, template_type, recipient, dedupe_key, payload_json, status
         ) VALUES ($1,'dashboard_ready',$2,$3,$4::jsonb,'queued')
         ON CONFLICT (dedupe_key) DO UPDATE SET updated_at = now()
         RETURNING id`,
        [
          customerId,
          recipient,
          dedupe,
          JSON.stringify({ first_name: first, dashboard_url: invitationUrl }),
        ],
      );
      await client.query("COMMIT");
      return {
        ok: true,
        customerId,
        workspaceId,
        emailJobId: String(job.rows[0]?.id || ""),
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
    const host =
      typeof body.host === "string" && body.host.trim()
        ? body.host.trim()
        : "alexander1stg.wpenginepowered.com";
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
