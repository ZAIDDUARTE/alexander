import type { SqlPool } from "./onboarding-access";

/**
 * Post-questionnaire "We're Setting Up Your Alexander Account" notification.
 *
 * Reuses the reserved outbox template `profile_updated` (schema 008/014) so this
 * ships without a new CHECK-constraint migration. Payload.kind distinguishes it
 * from a future true profile-update notice.
 */
export const ACCOUNT_SETUP_EMAIL_TEMPLATE = "profile_updated" as const;
export const ACCOUNT_SETUP_EMAIL_KIND = "account_setup_in_progress" as const;

export type QueueAccountSetupEmailResult =
  | { ok: true; emailJobId: string; created: boolean; dedupeKey: string }
  | { ok: false; reason: string };

export async function queueAccountSetupEmail(
  pool: SqlPool,
  input: {
    customerId: string;
    submissionId: string;
    recipient: string;
    firstName?: string;
    companyDisplayName?: string;
  },
): Promise<QueueAccountSetupEmailResult> {
  const recipient = (input.recipient || "").trim();
  if (!recipient) {
    return { ok: false, reason: "missing_recipient" };
  }

  const dedupeKey = `account_setup:${input.customerId}:${input.submissionId}:v1`;
  const existing = await pool.query(
    `SELECT id FROM email_outbox WHERE dedupe_key = $1 LIMIT 1`,
    [dedupeKey],
  );
  if (existing.rows[0]) {
    return {
      ok: true,
      emailJobId: String(existing.rows[0].id),
      created: false,
      dedupeKey,
    };
  }

  const firstName = (input.firstName || "there").trim() || "there";
  const company = (input.companyDisplayName || "").trim();
  const job = await pool.query(
    `INSERT INTO email_outbox (
       customer_id, template_type, recipient, dedupe_key, payload_json, status
     ) VALUES ($1,$2,$3,$4,$5::jsonb,'queued')
     ON CONFLICT (dedupe_key) DO UPDATE SET updated_at = now()
     RETURNING id`,
    [
      input.customerId,
      ACCOUNT_SETUP_EMAIL_TEMPLATE,
      recipient,
      dedupeKey,
      JSON.stringify({
        kind: ACCOUNT_SETUP_EMAIL_KIND,
        first_name: firstName,
        company_display_name: company || null,
        submission_id: input.submissionId,
      }),
    ],
  );

  return {
    ok: true,
    emailJobId: String(job.rows[0]?.id ?? ""),
    created: true,
    dedupeKey,
  };
}
