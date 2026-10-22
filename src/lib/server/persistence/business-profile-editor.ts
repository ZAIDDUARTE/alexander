import { randomUUID } from "node:crypto";
import { getRegistryQuestion } from "@/lib/onboarding/questionnaire-v1/registry";
import type { SqlPool, SqlClient } from "./onboarding-access";
import { BUSINESS_PROFILE_SCHEMA_NAME } from "./profile-projector";
import { diffProfileFields, type ProfileDiff } from "./profile-change-detection";
import { isEditableQuestionId } from "./profile-editable-catalog";
import {
  emptyPublicationState,
  readPublicationState,
  writePublicationIntoProfile,
  type PublicationState,
} from "./profile-publication";
import { generateToken, hashToken } from "./tokens";

const PROFILE_SESSION_TTL_MS = 60 * 60 * 1000;

export type BusinessProfileSnapshot = {
  customerId: string;
  currentRevision: number;
  profileSchemaVersion: number;
  profileData: Record<string, unknown>;
  fields: Record<string, unknown>;
  publication: PublicationState;
  status: string;
  updatedAt: string | null;
};

export type ApplyProfileEditResult =
  | {
      ok: true;
      revisionNumber: number;
      diff: ProfileDiff;
      publication: PublicationState;
      trilletSyncRequired: boolean;
    }
  | {
      ok: false;
      reason:
        | "not_found"
        | "revision_conflict"
        | "validation_failed"
        | "empty_patch"
        | "editing_disabled";
      details?: unknown;
    };

function asFields(profileData: Record<string, unknown>): Record<string, unknown> {
  const fields = profileData.fields;
  if (fields && typeof fields === "object" && !Array.isArray(fields)) {
    return { ...(fields as Record<string, unknown>) };
  }
  return {};
}

export function customerProfileEditingEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return String(env.ALEXANDER_CUSTOMER_PROFILE_EDITING_ENABLED || "").toLowerCase() === "true";
}

/** Production customer editing stays off until tenant-scoped auth is verified. */
export function productionCustomerEditingAllowed(env: NodeJS.ProcessEnv = process.env): boolean {
  return (
    String(env.ALEXANDER_CUSTOMER_PROFILE_PRODUCTION_EDITING_ENABLED || "").toLowerCase() ===
    "true"
  );
}

export function assertEditingAllowed(env: NodeJS.ProcessEnv = process.env): {
  ok: true;
} | { ok: false; reason: "editing_disabled" } {
  if (!customerProfileEditingEnabled(env)) {
    return { ok: false, reason: "editing_disabled" };
  }
  // Vercel Preview/dev set NODE_ENV=production during Next builds — trust VERCEL_ENV first.
  const vercelEnv = String(env.VERCEL_ENV || "").toLowerCase();
  const isVercelProduction = vercelEnv === "production";
  const isNonVercelProduction = !vercelEnv && String(env.NODE_ENV || "").toLowerCase() === "production";
  if ((isVercelProduction || isNonVercelProduction) && !productionCustomerEditingAllowed(env)) {
    return { ok: false, reason: "editing_disabled" };
  }
  return { ok: true };
}

export function validateFieldPatch(
  patch: Record<string, unknown>,
): { ok: true; fields: Record<string, unknown> } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const fields: Record<string, unknown> = {};
  for (const [questionId, value] of Object.entries(patch)) {
    if (!isEditableQuestionId(questionId)) {
      errors.push(`${questionId}:not_editable`);
      continue;
    }
    const meta = getRegistryQuestion(questionId);
    if (!meta) {
      errors.push(`${questionId}:unknown`);
      continue;
    }
    if (value === null || value === undefined) {
      errors.push(`${questionId}:null_not_allowed`);
      continue;
    }
    if (typeof value === "object" && !Array.isArray(value) && "answer_kind" in (value as object)) {
      fields[questionId] = value;
    } else {
      fields[questionId] = {
        question_id: questionId,
        answer_kind: meta.answerKind,
        value,
      };
    }
  }
  if (errors.length) return { ok: false, errors };
  if (!Object.keys(fields).length) return { ok: false, errors: ["empty_patch"] };
  return { ok: true, fields };
}

export async function getBusinessProfile(
  pool: SqlPool,
  customerId: string,
): Promise<BusinessProfileSnapshot | null> {
  const row = await pool.query(
    `SELECT customer_id, current_revision, profile_schema_version, profile_data, status, updated_at
     FROM customer_business_profiles
     WHERE customer_id = $1`,
    [customerId],
  );
  if (!row.rows[0]) return null;
  const profileData = (row.rows[0].profile_data as Record<string, unknown>) || {};
  const currentRevision = Number(row.rows[0].current_revision || 0);
  return {
    customerId: String(row.rows[0].customer_id),
    currentRevision,
    profileSchemaVersion: Number(row.rows[0].profile_schema_version || 1),
    profileData,
    fields: asFields(profileData),
    publication: readPublicationState(profileData, currentRevision),
    status: String(row.rows[0].status || "active"),
    updatedAt: row.rows[0].updated_at ? String(row.rows[0].updated_at) : null,
  };
}

export async function listProfileRevisions(
  pool: SqlPool,
  customerId: string,
  limit = 50,
): Promise<
  Array<{
    revisionNumber: number;
    changeSource: string;
    changeImpact: string;
    actorType: string;
    actorRef: string | null;
    status: string;
    createdAt: string;
    fieldCount: number;
  }>
> {
  const rows = await pool.query(
    `SELECT revision_number, change_source, change_impact, actor_type, actor_ref, status, created_at, profile_data
     FROM customer_profile_revisions
     WHERE customer_id = $1
     ORDER BY revision_number DESC
     LIMIT $2`,
    [customerId, limit],
  );
  return rows.rows.map((r) => {
    const data = (r.profile_data as Record<string, unknown>) || {};
    const fields = asFields(data);
    return {
      revisionNumber: Number(r.revision_number),
      changeSource: String(r.change_source),
      changeImpact: String(r.change_impact),
      actorType: String(r.actor_type || "system"),
      actorRef: r.actor_ref == null ? null : String(r.actor_ref),
      status: String(r.status),
      createdAt: String(r.created_at),
      fieldCount: Object.keys(fields).filter((k) => !k.startsWith("_")).length,
    };
  });
}

export async function getProfileRevision(
  pool: SqlPool,
  customerId: string,
  revisionNumber: number,
): Promise<Record<string, unknown> | null> {
  const row = await pool.query(
    `SELECT profile_data
     FROM customer_profile_revisions
     WHERE customer_id = $1 AND revision_number = $2
     LIMIT 1`,
    [customerId, revisionNumber],
  );
  if (!row.rows[0]) return null;
  return (row.rows[0].profile_data as Record<string, unknown>) || {};
}

export async function createProfileUpdateSession(
  pool: SqlPool,
  customerId: string,
): Promise<{ token: string; expiresAt: string; sessionId: string }> {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + PROFILE_SESSION_TTL_MS).toISOString();
  const inserted = await pool.query(
    `INSERT INTO customer_profile_update_sessions (customer_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [customerId, tokenHash, expiresAt],
  );
  return {
    token,
    expiresAt,
    sessionId: String(inserted.rows[0].id),
  };
}

export async function resolveProfileUpdateSession(
  pool: SqlPool,
  rawToken: string,
): Promise<{ ok: true; customerId: string; sessionId: string } | { ok: false; reason: string }> {
  const tokenHash = hashToken(rawToken);
  const row = await pool.query(
    `SELECT id, customer_id, expires_at, revoked_at, consumed_at
     FROM customer_profile_update_sessions
     WHERE token_hash = $1
     LIMIT 1`,
    [tokenHash],
  );
  if (!row.rows[0]) return { ok: false, reason: "invalid_token" };
  if (row.rows[0].revoked_at) return { ok: false, reason: "revoked" };
  if (row.rows[0].consumed_at) return { ok: false, reason: "consumed" };
  if (new Date(String(row.rows[0].expires_at)).getTime() <= Date.now()) {
    return { ok: false, reason: "expired" };
  }
  return {
    ok: true,
    customerId: String(row.rows[0].customer_id),
    sessionId: String(row.rows[0].id),
  };
}

async function markPriorRevisionsSuperseded(
  client: SqlClient,
  customerId: string,
  keepRevision: number,
): Promise<void> {
  await client.query(
    `UPDATE customer_profile_revisions
     SET status = 'superseded'
     WHERE customer_id = $1
       AND revision_number < $2
       AND status = 'active'`,
    [customerId, keepRevision],
  );
}

async function setTrilletSyncRequired(client: SqlClient, customerId: string): Promise<void> {
  await client.query(
    `INSERT INTO customer_trillet_workspaces (id, customer_id, status, updated_at)
     VALUES ($1, $2, 'trillet_sync_required', now())
     ON CONFLICT (customer_id) DO UPDATE SET
       status = CASE
         WHEN customer_trillet_workspaces.status IN ('ready','active','invitation_created')
           THEN 'trillet_sync_required'
         WHEN customer_trillet_workspaces.status = 'workspace_provisioning_blocked'
           THEN customer_trillet_workspaces.status
         ELSE 'trillet_sync_required'
       END,
       updated_at = now()`,
    [randomUUID(), customerId],
  );
}

export async function applyCustomerProfileEdit(
  pool: SqlPool,
  input: {
    customerId: string;
    expectedRevision: number;
    patch: Record<string, unknown>;
    actorType?: string;
    actorRef?: string | null;
    changeSource?: "customer_self_service" | "internal_admin";
  },
): Promise<ApplyProfileEditResult> {
  const gate = assertEditingAllowed();
  if (!gate.ok) return { ok: false, reason: "editing_disabled" };

  const validated = validateFieldPatch(input.patch);
  if (!validated.ok) {
    return { ok: false, reason: "validation_failed", details: validated.errors };
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query(
      `SELECT current_revision, profile_data, profile_schema_version
       FROM customer_business_profiles
       WHERE customer_id = $1
       FOR UPDATE`,
      [input.customerId],
    );
    if (!existing.rows[0]) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "not_found" };
    }

    const currentRevision = Number(existing.rows[0].current_revision || 0);
    if (currentRevision !== input.expectedRevision) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "revision_conflict", details: { currentRevision } };
    }

    const priorData = (existing.rows[0].profile_data as Record<string, unknown>) || {};
    const priorFields = asFields(priorData);
    const nextFields = { ...priorFields, ...validated.fields };
    const diff = diffProfileFields(priorFields, nextFields);
    if (!diff.changes.length) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "empty_patch" };
    }

    const nextRevision = currentRevision + 1;
    let publication = readPublicationState(priorData, currentRevision);
    publication = {
      ...publication,
      status: diff.requiresQa ? "qa_required" : "draft",
      profileRevision: nextRevision,
      configContentSha256: null,
      lastFailure: null,
      qaRequirements: publication.qaRequirements.map((r) => ({
        ...r,
        satisfied: false,
        satisfiedAt: null,
      })),
      updatedAt: new Date().toISOString(),
    };

    const nextProfileData = writePublicationIntoProfile(
      {
        schema: priorData.schema || BUSINESS_PROFILE_SCHEMA_NAME,
        questionnaire: priorData.questionnaire ?? null,
        fields: nextFields,
        _last_diff: {
          revision: nextRevision,
          impact: diff.revisionImpact,
          changeCount: diff.changes.length,
          questionIds: diff.changes.map((c) => c.questionId),
        },
      },
      publication,
    );

    await client.query(
      `INSERT INTO customer_profile_revisions (
         id, customer_id, revision_number, profile_schema_version, profile_data,
         change_source, actor_type, actor_ref, change_impact, status
       ) VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,'active')`,
      [
        randomUUID(),
        input.customerId,
        nextRevision,
        Number(existing.rows[0].profile_schema_version || 1),
        JSON.stringify(nextProfileData),
        input.changeSource || "customer_self_service",
        input.actorType || "customer",
        input.actorRef || null,
        diff.revisionImpact,
      ],
    );

    await markPriorRevisionsSuperseded(client, input.customerId, nextRevision);

    await client.query(
      `UPDATE customer_business_profiles
       SET current_revision = $2,
           profile_data = $3::jsonb,
           updated_at = now()
       WHERE customer_id = $1`,
      [input.customerId, nextRevision, JSON.stringify(nextProfileData)],
    );

    if (diff.requiresTrilletSync) {
      await setTrilletSyncRequired(client, input.customerId);
    }

    await client.query("COMMIT");
    return {
      ok: true,
      revisionNumber: nextRevision,
      diff,
      publication,
      trilletSyncRequired: diff.requiresTrilletSync,
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

export async function updatePublicationState(
  pool: SqlPool,
  customerId: string,
  updater: (current: PublicationState, profileData: Record<string, unknown>) => PublicationState,
): Promise<PublicationState | null> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query(
      `SELECT current_revision, profile_data
       FROM customer_business_profiles
       WHERE customer_id = $1
       FOR UPDATE`,
      [customerId],
    );
    if (!existing.rows[0]) {
      await client.query("ROLLBACK");
      return null;
    }
    const currentRevision = Number(existing.rows[0].current_revision || 0);
    const profileData = (existing.rows[0].profile_data as Record<string, unknown>) || {};
    const current = readPublicationState(profileData, currentRevision);
    const next = updater(current, profileData);
    const nextData = writePublicationIntoProfile(profileData, next);
    await client.query(
      `UPDATE customer_business_profiles
       SET profile_data = $2::jsonb, updated_at = now()
       WHERE customer_id = $1`,
      [customerId, JSON.stringify(nextData)],
    );
    await client.query("COMMIT");
    return next;
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

export async function rollbackToApprovedConfiguration(
  pool: SqlPool,
  input: {
    customerId: string;
    expectedRevision: number;
    actorRef?: string | null;
  },
): Promise<ApplyProfileEditResult> {
  const gate = assertEditingAllowed();
  if (!gate.ok) return { ok: false, reason: "editing_disabled" };

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query(
      `SELECT current_revision, profile_data, profile_schema_version
       FROM customer_business_profiles
       WHERE customer_id = $1
       FOR UPDATE`,
      [input.customerId],
    );
    if (!existing.rows[0]) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "not_found" };
    }
    const currentRevision = Number(existing.rows[0].current_revision || 0);
    if (currentRevision !== input.expectedRevision) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "revision_conflict", details: { currentRevision } };
    }

    const profileData = (existing.rows[0].profile_data as Record<string, unknown>) || {};
    const publication = readPublicationState(profileData, currentRevision);
    const approvedRev = publication.approvedProfileRevision;
    if (approvedRev == null || approvedRev <= 0) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "validation_failed", details: ["no_approved_configuration"] };
    }
    if (approvedRev === currentRevision) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "empty_patch" };
    }

    const approvedRow = await client.query(
      `SELECT profile_data
       FROM customer_profile_revisions
       WHERE customer_id = $1 AND revision_number = $2
       LIMIT 1`,
      [input.customerId, approvedRev],
    );
    if (!approvedRow.rows[0]) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "validation_failed", details: ["approved_revision_missing"] };
    }

    const approvedData = (approvedRow.rows[0].profile_data as Record<string, unknown>) || {};
    const priorFields = asFields(profileData);
    const restoredFields = asFields(approvedData);
    const diff = diffProfileFields(priorFields, restoredFields);
    const nextRevision = currentRevision + 1;

    const nextPublication: PublicationState = {
      ...emptyPublicationState(nextRevision),
      status: "rolled_back",
      profileRevision: nextRevision,
      configContentSha256: publication.approvedConfigContentSha256,
      approvedProfileRevision: approvedRev,
      approvedConfigContentSha256: publication.approvedConfigContentSha256,
      qaRequirements: publication.qaRequirements.map((r) => ({ ...r, satisfied: true })),
    };

    const nextProfileData = writePublicationIntoProfile(
      {
        schema: approvedData.schema || BUSINESS_PROFILE_SCHEMA_NAME,
        questionnaire: approvedData.questionnaire ?? profileData.questionnaire ?? null,
        fields: restoredFields,
        _runtime_config: (approvedData as { _runtime_config?: unknown })._runtime_config ?? null,
        _rollback_from: currentRevision,
        _rollback_to: approvedRev,
      },
      nextPublication,
    );

    await client.query(
      `INSERT INTO customer_profile_revisions (
         id, customer_id, revision_number, profile_schema_version, profile_data,
         change_source, actor_type, actor_ref, change_impact, status
       ) VALUES ($1,$2,$3,$4,$5::jsonb,'internal_admin','system',$6,$7,'active')`,
      [
        randomUUID(),
        input.customerId,
        nextRevision,
        Number(existing.rows[0].profile_schema_version || 1),
        JSON.stringify(nextProfileData),
        input.actorRef || "rollback",
        diff.revisionImpact === "low" ? "low" : "high",
      ],
    );
    await markPriorRevisionsSuperseded(client, input.customerId, nextRevision);
    await client.query(
      `UPDATE customer_business_profiles
       SET current_revision = $2, profile_data = $3::jsonb, updated_at = now()
       WHERE customer_id = $1`,
      [input.customerId, nextRevision, JSON.stringify(nextProfileData)],
    );
    await setTrilletSyncRequired(client, input.customerId);
    await client.query("COMMIT");
    return {
      ok: true,
      revisionNumber: nextRevision,
      diff,
      publication: nextPublication,
      trilletSyncRequired: true,
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
