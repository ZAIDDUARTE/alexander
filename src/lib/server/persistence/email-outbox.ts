import type { SqlPool } from "./onboarding-access";

export type EmailClaim = {
  id: string;
  templateType: string;
  recipient: string;
  payload: Record<string, unknown>;
  attemptCount: number;
};

/**
 * Claim queued email jobs for SES worker.
 * Staging guard: EMAIL_DELIVERY_MODE=test requires ALLOWED_TEST_RECIPIENT.
 */
export async function claimEmailJobs(pool: SqlPool, limit = 10): Promise<EmailClaim[]> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const rows = await client.query(
      `SELECT id, template_type, recipient, payload_json, attempt_count
       FROM email_outbox
       WHERE status IN ('queued', 'retry_pending')
         AND next_attempt_at <= now()
       ORDER BY next_attempt_at ASC
       FOR UPDATE SKIP LOCKED
       LIMIT $1`,
      [limit],
    );
    const claimed: EmailClaim[] = [];
    for (const row of rows.rows) {
      const id = String(row.id);
      await client.query(
        `UPDATE email_outbox
         SET status = 'processing', attempt_count = attempt_count + 1, updated_at = now()
         WHERE id = $1`,
        [id],
      );
      claimed.push({
        id,
        templateType: String(row.template_type),
        recipient: String(row.recipient),
        payload: (row.payload_json as Record<string, unknown>) || {},
        attemptCount: Number(row.attempt_count || 0) + 1,
      });
    }
    await client.query("COMMIT");
    return claimed;
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

export function stagingEmailAllowed(recipient: string): { ok: true } | { ok: false; reason: string } {
  const mode = (process.env.EMAIL_DELIVERY_MODE || "test").toLowerCase();
  if (mode !== "test") {
    return { ok: false, reason: "production_email_not_enabled" };
  }
  const allow = (process.env.ALLOWED_TEST_RECIPIENT || "").trim().toLowerCase();
  if (!allow) return { ok: false, reason: "TEST_RECIPIENT_REQUIRED" };
  if (recipient.trim().toLowerCase() !== allow) {
    return { ok: false, reason: "recipient_not_allowlisted" };
  }
  return { ok: true };
}

export async function markEmailBlocked(pool: SqlPool, id: string, code: string): Promise<void> {
  await pool.query(
    `UPDATE email_outbox
     SET status = 'blocked_test_guard', last_error_code = $2, updated_at = now()
     WHERE id = $1`,
    [id, code],
  );
}

export async function markEmailSent(
  pool: SqlPool,
  id: string,
  providerMessageId: string,
): Promise<void> {
  await pool.query(
    `UPDATE email_outbox
     SET status = 'sent', provider_message_id = $2, sent_at = now(), updated_at = now()
     WHERE id = $1`,
    [id, providerMessageId],
  );
}

export async function markEmailRetry(pool: SqlPool, id: string, code: string): Promise<void> {
  await pool.query(
    `UPDATE email_outbox
     SET status = 'retry_pending',
         last_error_code = $2,
         next_attempt_at = now() + interval '5 minutes',
         updated_at = now()
     WHERE id = $1`,
    [id, code],
  );
}
