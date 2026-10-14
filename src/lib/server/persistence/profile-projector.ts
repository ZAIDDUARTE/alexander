import type { SqlClient, SqlPool } from "./onboarding-access";

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
    `SELECT current_revision FROM customer_business_profiles WHERE customer_id = $1 FOR UPDATE`,
    [input.customerId],
  );
  const current = existing.rows[0] ? Number(existing.rows[0].current_revision || 0) : 0;
  const next = current + 1;

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

  await client.query(
    `INSERT INTO customer_trillet_workspaces (customer_id, status, updated_at)
     VALUES ($1, 'awaiting_internal_setup', now())
     ON CONFLICT (customer_id) DO UPDATE SET
       status = CASE
         WHEN customer_trillet_workspaces.status IN ('ready','active','invitation_created')
           THEN customer_trillet_workspaces.status
         ELSE 'awaiting_internal_setup'
       END,
       updated_at = now()`,
    [input.customerId],
  );

  return { revisionNumber: next, profileUpdated: true };
}

/** Conservative mapping — only include values actually present in answers. */
export function deriveOperationalProfile(answers: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {
    schema: "alexander_business_profile_v1",
    fields: {},
  };
  const fields = out.fields as Record<string, unknown>;
  for (const [key, value] of Object.entries(answers)) {
    if (value === null || value === undefined || value === "") continue;
    fields[key] = value;
  }
  return out;
}
