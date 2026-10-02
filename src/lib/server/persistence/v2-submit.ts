import { randomUUID } from "node:crypto";
import { normalizeOnboardingDraft } from "@/lib/onboarding/normalizeOnboarding";
import {
  hashQuestionnaireAnswersContentV1,
  serializeQuestionnaireAnswersV1,
} from "@/lib/onboarding/questionnaire-v1";
import { QUESTIONNAIRE_ANSWERS_SCHEMA_VERSION, QUESTIONNAIRE_SPEC_VERSION } from "@/lib/onboarding/questionnaire-v1/types";
import { prepareSubmission } from "@/lib/onboarding/submission";
import type { OnboardingDraft } from "@/lib/onboarding/types";
import { canonicalJsonBytes, sha256Hex } from "./canonical";
import { persistenceV2ObjectKeys } from "./keys";
import { resolveOnboardingAccess, type SqlPool } from "./onboarding-access";
import type { ObjectStorePort } from "./types";

const ALGORITHM = "questionnaire_answers_v1";

export type V2SubmitResult =
  | {
      ok: true;
      duplicate: boolean;
      submissionId: string;
      onboardingId: string;
      customerId: string;
      revisionNumber: number;
      submittedAt: string;
    }
  | { ok: false; reason: string; submissionId?: string };

type Reserved = {
  submissionId: string;
  onboardingId: string;
  customerId: string;
  customerNumber: string;
  sessionId: string;
  revisionNumber: number;
  contentHash: string;
  state: "pending" | "committed" | "failed";
  submittedAt: string | null;
};

class IntegrityConflict extends Error {
  constructor() {
    super("storage_integrity_conflict");
    this.name = "IntegrityConflict";
  }
}

function applicationCommit(): string | null {
  const value = process.env.APPLICATION_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA;
  return value && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function iso(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  const text = String(value);
  return text || null;
}

async function putImmutable(
  objects: ObjectStorePort,
  key: string,
  body: Buffer,
): Promise<{ sha256: string; size: number }> {
  const sha256 = sha256Hex(body);
  const size = body.byteLength;
  const existing = await objects.getObject(key);
  if (!existing) {
    await objects.putObject(key, body);
    const stored = await objects.getObject(key);
    if (!stored || sha256Hex(stored) !== sha256 || stored.byteLength !== size) {
      throw new IntegrityConflict();
    }
    return { sha256, size };
  }
  if (sha256Hex(existing) === sha256 && existing.byteLength === size) {
    return { sha256, size };
  }
  throw new IntegrityConflict();
}

async function markFailed(pool: SqlPool, submissionId: string): Promise<void> {
  await pool.query(
    `UPDATE onboarding_submissions
     SET persistence_state = 'failed',
         persistence_error_code = 'storage_integrity_conflict'
     WHERE id = $1
       AND persistence_state = 'pending'`,
    [submissionId],
  );
}

export async function reservePersistenceV2(
  pool: SqlPool,
  input: {
    onboardingId: string;
    sessionId: string;
    customerId: string;
    customerNumber: string;
    draft: OnboardingDraft;
    answers: unknown;
    normalized: unknown;
    contentHash: string;
  },
): Promise<{ ok: true; reserved: Reserved } | { ok: false; reason: string }> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const locked = await client.query(
      `SELECT id FROM customer_onboardings WHERE id = $1 FOR UPDATE`,
      [input.onboardingId],
    );
    if (!locked.rows[0]) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "rejected" };
    }
    const existing = await client.query(
      `SELECT id, revision_number, persistence_state, submitted_at
       FROM onboarding_submissions
       WHERE onboarding_id = $1
         AND content_hash_algorithm = $2
         AND content_revision_sha256 = $3`,
      [input.onboardingId, ALGORITHM, input.contentHash],
    );
    const row = existing.rows[0];
    if (row) {
      await client.query("COMMIT");
      const revisionNumber = asNumber(row.revision_number);
      if (revisionNumber == null) {
        return { ok: false, reason: "database_failed" };
      }
      const state = String(row.persistence_state);
      return {
        ok: true,
        reserved: {
          submissionId: String(row.id),
          onboardingId: input.onboardingId,
          customerId: input.customerId,
          customerNumber: input.customerNumber,
          sessionId: input.sessionId,
          revisionNumber,
          contentHash: input.contentHash,
          state: state === "committed" || state === "failed" ? state : "pending",
          submittedAt: iso(row.submitted_at),
        },
      };
    }

    const next = await client.query(
      `SELECT COALESCE(MAX(revision_number), 0) + 1 AS revision_number
       FROM onboarding_submissions
       WHERE onboarding_id = $1`,
      [input.onboardingId],
    );
    const revisionNumber = asNumber(next.rows[0]?.revision_number);
    if (revisionNumber == null) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "database_failed" };
    }
    const submissionId = randomUUID();
    const keys = persistenceV2ObjectKeys(input.customerId, input.onboardingId, submissionId);
    const rawBytes = canonicalJsonBytes(input.draft);
    const answersBytes = canonicalJsonBytes(input.answers);
    const normalizedBytes = canonicalJsonBytes(input.normalized);
    await client.query(
      `INSERT INTO onboarding_submissions (
         id, session_id, onboarding_id, content_revision, content_revision_sha256,
         content_hash_algorithm, questionnaire_schema_version, questionnaire_spec_version,
         questionnaire_answers_schema_version, raw_draft_json, normalized_config_json,
         questionnaire_answers_json, s3_prefix, s3_raw_key, s3_answers_key, s3_normalized_key,
         s3_manifest_key, raw_sha256, answers_sha256, normalized_sha256, raw_size_bytes,
         answers_size_bytes, normalized_size_bytes, revision_number, persistence_state,
         manifest_schema_version, submitted_at
       ) VALUES (
         $1, $2, $3, NULL, $4,
         $5, $6, $7,
         $8, $9::jsonb, $10::jsonb,
         $11::jsonb, $12, $13, $14, $15,
         $16, $17, $18, $19, $20,
         $21, $22, $23, 'pending',
         2, NULL
       )`,
      [
        submissionId,
        input.sessionId,
        input.onboardingId,
        input.contentHash,
        ALGORITHM,
        input.draft.schemaVersion,
        QUESTIONNAIRE_SPEC_VERSION,
        QUESTIONNAIRE_ANSWERS_SCHEMA_VERSION,
        rawBytes.toString("utf8"),
        normalizedBytes.toString("utf8"),
        answersBytes.toString("utf8"),
        keys.prefix,
        keys.raw,
        keys.answers,
        keys.normalized,
        keys.manifest,
        sha256Hex(rawBytes),
        sha256Hex(answersBytes),
        sha256Hex(normalizedBytes),
        rawBytes.byteLength,
        answersBytes.byteLength,
        normalizedBytes.byteLength,
        revisionNumber,
      ],
    );
    await client.query("COMMIT");
    return {
      ok: true,
      reserved: {
        submissionId,
        onboardingId: input.onboardingId,
        customerId: input.customerId,
        customerNumber: input.customerNumber,
        sessionId: input.sessionId,
        revisionNumber,
        contentHash: input.contentHash,
        state: "pending",
        submittedAt: null,
      },
    };
  } catch {
    try {
      await client.query("ROLLBACK");
    } catch {
      // The original failure is what the caller sees.
    }
    return { ok: false, reason: "database_failed" };
  } finally {
    client.release();
  }
}

function manifestDocument(
  reserved: Reserved,
  draft: OnboardingDraft,
  bytes: {
    raw: Buffer;
    answers: Buffer;
    normalized: Buffer;
  },
  submittedAt: string,
) {
  const keys = persistenceV2ObjectKeys(reserved.customerId, reserved.onboardingId, reserved.submissionId);
  const commit = applicationCommit();
  return {
    manifest_schema_version: 2,
    customer_id: reserved.customerId,
    customer_number: reserved.customerNumber,
    onboarding_id: reserved.onboardingId,
    submission_id: reserved.submissionId,
    revision_number: reserved.revisionNumber,
    questionnaire_schema_version: draft.schemaVersion,
    questionnaire_spec_version: QUESTIONNAIRE_SPEC_VERSION,
    questionnaire_answers_schema_version: QUESTIONNAIRE_ANSWERS_SCHEMA_VERSION,
    normalized_config_schema_version: 1,
    content_hash_algorithm: ALGORITHM,
    content_revision_sha256: reserved.contentHash,
    submitted_at: submittedAt,
    ...(commit ? { application_commit: commit } : {}),
    objects: {
      raw: { key: keys.raw, sha256: sha256Hex(bytes.raw), size_bytes: bytes.raw.byteLength },
      answers: {
        key: keys.answers,
        sha256: sha256Hex(bytes.answers),
        size_bytes: bytes.answers.byteLength,
      },
      normalized: {
        key: keys.normalized,
        sha256: sha256Hex(bytes.normalized),
        size_bytes: bytes.normalized.byteLength,
      },
    },
  };
}

export async function writePersistenceV2Objects(
  objects: ObjectStorePort,
  reserved: Reserved,
  draft: OnboardingDraft,
  answers: unknown,
  normalized: unknown,
): Promise<{ submittedAt: string }> {
  const keys = persistenceV2ObjectKeys(reserved.customerId, reserved.onboardingId, reserved.submissionId);
  const raw = canonicalJsonBytes(draft);
  const answerBytes = canonicalJsonBytes(answers);
  const normalizedBytes = canonicalJsonBytes(normalized);
  await putImmutable(objects, keys.raw, raw);
  await putImmutable(objects, keys.answers, answerBytes);
  await putImmutable(objects, keys.normalized, normalizedBytes);

  const existingManifest = await objects.getObject(keys.manifest);
  let submittedAt = new Date().toISOString();
  if (existingManifest) {
    let parsed: { submission_id?: unknown; onboarding_id?: unknown; content_revision_sha256?: unknown; submitted_at?: unknown };
    try {
      parsed = JSON.parse(existingManifest.toString("utf8")) as typeof parsed;
    } catch {
      throw new IntegrityConflict();
    }
    if (
      parsed.submission_id !== reserved.submissionId ||
      parsed.onboarding_id !== reserved.onboardingId ||
      parsed.content_revision_sha256 !== reserved.contentHash ||
      typeof parsed.submitted_at !== "string"
    ) {
      throw new IntegrityConflict();
    }
    submittedAt = parsed.submitted_at;
  }
  const manifest = manifestDocument(reserved, draft, { raw, answers: answerBytes, normalized: normalizedBytes }, submittedAt);
  await putImmutable(objects, keys.manifest, canonicalJsonBytes(manifest));
  return { submittedAt };
}

export async function finalizePersistenceV2(
  pool: SqlPool,
  reserved: Reserved,
  submittedAt: string,
  sessionDraft: unknown,
): Promise<V2SubmitResult> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`SELECT id FROM customer_onboardings WHERE id = $1 FOR UPDATE`, [reserved.onboardingId]);
    const current = await client.query(
      `SELECT persistence_state, revision_number, submitted_at
       FROM onboarding_submissions
       WHERE id = $1
       FOR UPDATE`,
      [reserved.submissionId],
    );
    const state = current.rows[0]?.persistence_state;
    if (state === "committed") {
      await client.query("COMMIT");
      return {
        ok: true,
        duplicate: true,
        submissionId: reserved.submissionId,
        onboardingId: reserved.onboardingId,
        customerId: reserved.customerId,
        revisionNumber: reserved.revisionNumber,
        submittedAt: iso(current.rows[0]?.submitted_at) ?? submittedAt,
      };
    }
    if (state !== "pending") {
      await client.query("ROLLBACK");
      return { ok: false, reason: "database_failed", submissionId: reserved.submissionId };
    }
    const updated = await client.query(
      `UPDATE onboarding_submissions
       SET persistence_state = 'committed',
           submitted_at = $2,
           persistence_error_code = NULL
       WHERE id = $1
         AND persistence_state = 'pending'
       RETURNING id`,
      [reserved.submissionId, submittedAt],
    );
    if (!updated.rows[0]) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "database_failed", submissionId: reserved.submissionId };
    }
    await client.query(
      `UPDATE customer_onboardings SET status = 'submitted' WHERE id = $1`,
      [reserved.onboardingId],
    );
    await client.query(
      `UPDATE customer_onboardings AS o
       SET latest_submission_id = $2
       WHERE o.id = $1
         AND (
           o.latest_submission_id IS NULL
           OR (
             SELECT s.revision_number
             FROM onboarding_submissions AS s
             WHERE s.id = o.latest_submission_id
           ) < $3
         )`,
      [reserved.onboardingId, reserved.submissionId, reserved.revisionNumber],
    );
    await client.query(
      `UPDATE onboarding_sessions
       SET submission_status = 'submitted',
           submitted_at = $2,
           draft_json = $3::jsonb
       WHERE onboarding_id = $1`,
      [reserved.onboardingId, submittedAt, JSON.stringify(sessionDraft)],
    );
    await client.query("COMMIT");
    return {
      ok: true,
      duplicate: false,
      submissionId: reserved.submissionId,
      onboardingId: reserved.onboardingId,
      customerId: reserved.customerId,
      revisionNumber: reserved.revisionNumber,
      submittedAt,
    };
  } catch {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Keep the pending row.
    }
    return { ok: false, reason: "database_failed", submissionId: reserved.submissionId };
  } finally {
    client.release();
  }
}

export async function submitPersistenceV2FromAccess(
  pool: SqlPool,
  objects: ObjectStorePort,
  input: {
    accessTokenHash: string;
    draft: OnboardingDraft;
    failFinalize?: boolean;
  },
): Promise<V2SubmitResult> {
  const access = await resolveOnboardingAccess(pool, input.accessTokenHash);
  if (!access.ok) return { ok: false, reason: "rejected" };

  const prepared = prepareSubmission(input.draft);
  if (!prepared.ok) {
    return { ok: false, reason: prepared.reason };
  }

  const identity = await pool.query(
    `SELECT c.id AS customer_id, c.customer_number
     FROM customer_onboardings o
     JOIN customers c ON c.id = o.customer_id
     WHERE o.id = $1`,
    [access.onboardingId],
  );
  const customerId = identity.rows[0]?.customer_id;
  const customerNumber = identity.rows[0]?.customer_number;
  if (typeof customerId !== "string" || typeof customerNumber !== "string") {
    return { ok: false, reason: "rejected" };
  }

  const answers = serializeQuestionnaireAnswersV1(input.draft);
  const contentHash = hashQuestionnaireAnswersContentV1(answers);
  const normalized = normalizeOnboardingDraft(input.draft);
  const reserved = await reservePersistenceV2(pool, {
    onboardingId: access.onboardingId,
    sessionId: access.sessionId,
    customerId,
    customerNumber,
    draft: input.draft,
    answers,
    normalized,
    contentHash,
  });
  if (!reserved.ok) return reserved;
  if (reserved.reserved.state === "committed" && reserved.reserved.submittedAt) {
    return {
      ok: true,
      duplicate: true,
      submissionId: reserved.reserved.submissionId,
      onboardingId: reserved.reserved.onboardingId,
      customerId,
      revisionNumber: reserved.reserved.revisionNumber,
      submittedAt: reserved.reserved.submittedAt,
    };
  }
  if (reserved.reserved.state === "failed") {
    return { ok: false, reason: "storage_integrity_conflict", submissionId: reserved.reserved.submissionId };
  }

  let submittedAt: string;
  try {
    const written = await writePersistenceV2Objects(
      objects,
      reserved.reserved,
      input.draft,
      answers,
      normalized,
    );
    submittedAt = written.submittedAt;
  } catch (error) {
    if (error instanceof IntegrityConflict) {
      await markFailed(pool, reserved.reserved.submissionId);
      return {
        ok: false,
        reason: "storage_integrity_conflict",
        submissionId: reserved.reserved.submissionId,
      };
    }
    return { ok: false, reason: "snapshot_failed", submissionId: reserved.reserved.submissionId };
  }

  if (input.failFinalize) {
    return { ok: false, reason: "database_failed", submissionId: reserved.reserved.submissionId };
  }

  const sessionDraft = {
    ...input.draft,
    submission: {
      ...input.draft.submission,
      status: "submitted",
      submittedAt,
    },
  };
  return finalizePersistenceV2(pool, reserved.reserved, submittedAt, sessionDraft);
}
