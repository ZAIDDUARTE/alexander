import type { SqlClient, SqlPool } from "./onboarding-access";

export const BUSINESS_PROFILE_SCHEMA_NAME = "alexander_business_profile_v1" as const;

/**
 * Project an immutable submission into the canonical business profile + revision #N.
 * Does not mutate questionnaire answers.
 */
export async function projectSubmissionToBusinessProfile(
  pool: SqlPool,
  input: {
    customerId: string;
    submissionId: string;
    answers: Record<string, unknown>;
  },
): Promise<{ revisionNumber: number; profileUpdated: boolean }> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await projectWithClient(client, input);
    await client.query("COMMIT");
    return result;
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

/** True when customer already has profile revision #1 from a committed submission. */
export async function customerHasInitialProfileRevision(
  pool: SqlPool,
  customerId: string,
): Promise<boolean> {
  const row = await pool.query(
    `SELECT 1
     FROM customer_profile_revisions
     WHERE customer_id = $1 AND revision_number = 1 AND change_source = 'initial_questionnaire'
     LIMIT 1`,
    [customerId],
  );
  return row.rows.length > 0;
}

export async function ensureBusinessProfileProjectedAfterSubmit(
  pool: SqlPool,
  input: {
    customerId: string;
    submissionId: string;
    answers: Record<string, unknown>;
  },
): Promise<{ revisionNumber: number; profileUpdated: boolean }> {
  return projectSubmissionToBusinessProfile(pool, input);
}

async function projectWithClient(
  client: SqlClient,
  input: {
    customerId: string;
    submissionId: string;
    answers: Record<string, unknown>;
  },
): Promise<{ revisionNumber: number; profileUpdated: boolean }> {
  const profileData = deriveOperationalProfile(input.answers);

  const existing = await client.query(
    `SELECT current_revision, source_submission_id
     FROM customer_business_profiles
     WHERE customer_id = $1
     FOR UPDATE`,
    [input.customerId],
  );

  // Idempotent: same source submission must not create another revision.
  if (existing.rows[0]) {
    const current = Number(existing.rows[0].current_revision || 0);
    const sourceId =
      existing.rows[0].source_submission_id == null
        ? ""
        : String(existing.rows[0].source_submission_id);
    if (sourceId && sourceId === input.submissionId && current >= 1) {
      await upsertTrilletAwaitingInternalSetup(client, input.customerId);
      return { revisionNumber: current, profileUpdated: false };
    }
  }

  const priorRevision = await client.query(
    `SELECT revision_number
     FROM customer_profile_revisions
     WHERE customer_id = $1
       AND source_submission_id = $2
       AND change_source = 'initial_questionnaire'
     ORDER BY revision_number ASC
     LIMIT 1`,
    [input.customerId, input.submissionId],
  );
  if (priorRevision.rows[0]) {
    const revisionNumber = Number(priorRevision.rows[0].revision_number);
    await client.query(
      `INSERT INTO customer_business_profiles (
         customer_id, current_revision, profile_schema_version, profile_data,
         source_submission_id, status, updated_at
       ) VALUES ($1,$2,1,$3::jsonb,$4,'active',now())
       ON CONFLICT (customer_id) DO UPDATE SET
         current_revision = EXCLUDED.current_revision,
         profile_data = EXCLUDED.profile_data,
         source_submission_id = EXCLUDED.source_submission_id,
         updated_at = now()`,
      [input.customerId, revisionNumber, JSON.stringify(profileData), input.submissionId],
    );
    await upsertTrilletAwaitingInternalSetup(client, input.customerId);
    return { revisionNumber, profileUpdated: false };
  }

  const revisionCount = await client.query(
    `SELECT COUNT(*)::int AS n FROM customer_profile_revisions WHERE customer_id = $1`,
    [input.customerId],
  );
  const priorCount = Number(revisionCount.rows[0]?.n || 0);
  const current = existing.rows[0] ? Number(existing.rows[0].current_revision || 0) : 0;
  const next = priorCount === 0 ? 1 : Math.max(current + 1, priorCount + 1);

  await client.query(
    `INSERT INTO customer_profile_revisions (
       customer_id, revision_number, profile_schema_version, profile_data,
       change_source, source_submission_id, actor_type, change_impact, status
     ) VALUES ($1,$2,1,$3::jsonb,'initial_questionnaire',$4,'system','unknown','active')
     ON CONFLICT (customer_id, revision_number) DO NOTHING`,
    [input.customerId, next, JSON.stringify(profileData), input.submissionId],
  );

  await client.query(
    `INSERT INTO customer_business_profiles (
       customer_id, current_revision, profile_schema_version, profile_data,
       source_submission_id, status, updated_at
     ) VALUES ($1,$2,1,$3::jsonb,$4,'active',now())
     ON CONFLICT (customer_id) DO UPDATE SET
       current_revision = EXCLUDED.current_revision,
       profile_data = EXCLUDED.profile_data,
       source_submission_id = EXCLUDED.source_submission_id,
       updated_at = now()`,
    [input.customerId, next, JSON.stringify(profileData), input.submissionId],
  );

  await upsertTrilletAwaitingInternalSetup(client, input.customerId);

  return { revisionNumber: next, profileUpdated: true };
}

async function upsertTrilletAwaitingInternalSetup(
  client: SqlClient,
  customerId: string,
): Promise<void> {
  await client.query(
    `INSERT INTO customer_trillet_workspaces (customer_id, status, updated_at)
     VALUES ($1, 'awaiting_internal_setup', now())
     ON CONFLICT (customer_id) DO UPDATE SET
       status = CASE
         WHEN customer_trillet_workspaces.status IN (
           'ready','active','invitation_created','workspace_provisioning_blocked'
         )
           THEN customer_trillet_workspaces.status
         ELSE 'awaiting_internal_setup'
       END,
       updated_at = now()`,
    [customerId],
  );
}

/** Flatten QuestionnaireAnswersV1 (or legacy shapes) into question_id → answer payload. */
export function flattenQuestionnaireAnswerFields(
  answers: Record<string, unknown>,
): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  const sections = answers.sections;
  if (sections && typeof sections === "object") {
    for (const section of Object.values(sections as Record<string, unknown>)) {
      if (!section || typeof section !== "object") continue;
      const sectionAnswers = (section as { answers?: Record<string, unknown> }).answers;
      if (!sectionAnswers || typeof sectionAnswers !== "object") continue;
      for (const [questionId, payload] of Object.entries(sectionAnswers)) {
        if (payload === null || payload === undefined) continue;
        fields[questionId] = payload;
      }
    }
  }
  const submission = answers.submission;
  if (submission && typeof submission === "object") {
    const submissionAnswers = (submission as { answers?: Record<string, unknown> }).answers;
    if (submissionAnswers && typeof submissionAnswers === "object") {
      for (const [questionId, payload] of Object.entries(submissionAnswers)) {
        if (payload === null || payload === undefined) continue;
        fields[questionId] = payload;
      }
    }
  }
  const entities = answers.entities;
  if (entities && typeof entities === "object") {
    fields._entities = entities;
  }
  return fields;
}

/** Conservative mapping — only operational fields present in questionnaire answers. */
export function deriveOperationalProfile(answers: Record<string, unknown>): Record<string, unknown> {
  const fields = flattenQuestionnaireAnswerFields(answers);
  return {
    schema: BUSINESS_PROFILE_SCHEMA_NAME,
    questionnaire: answers.questionnaire ?? null,
    fields,
  };
}
