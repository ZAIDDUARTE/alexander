import type { SqlPool } from "./onboarding-access";
import { queueAccountSetupEmail } from "./account-setup-email";

/**
 * Best-effort, idempotent enqueue of the post-questionnaire setup email.
 * Failures must never undo a committed submission.
 */
export async function queueAccountSetupAfterSubmit(
  pool: SqlPool,
  input: {
    customerId: string;
    submissionId: string;
    companyDisplayName?: string;
  },
): Promise<{ ok: true; emailJobId: string; created: boolean } | { ok: false; reason: string }> {
  const row = await pool.query(
    `SELECT primary_email, portal_admin_email, customer_facing_name
     FROM customers
     WHERE id = $1
     LIMIT 1`,
    [input.customerId],
  );
  if (!row.rows[0]) return { ok: false, reason: "customer_not_found" };

  const recipient = String(
    row.rows[0].portal_admin_email || row.rows[0].primary_email || "",
  ).trim();
  if (!recipient) return { ok: false, reason: "missing_recipient" };

  const display =
    input.companyDisplayName ||
    String(row.rows[0].customer_facing_name || "").trim();
  const firstName = "there";

  const queued = await queueAccountSetupEmail(pool, {
    customerId: input.customerId,
    submissionId: input.submissionId,
    recipient,
    firstName,
    companyDisplayName: display || undefined,
  });
  if (!queued.ok) return queued;
  return { ok: true, emailJobId: queued.emailJobId, created: queued.created };
}
