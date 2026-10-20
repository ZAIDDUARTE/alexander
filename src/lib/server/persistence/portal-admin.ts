/**
 * Portal administrator email — distinct from Stripe billing primary_email.
 * Bound to authenticated paid-onboarding access sessions only.
 */

import { generateToken, hashToken } from "./tokens";
import type { SqlPool } from "./onboarding-access";
import { resolveOnboardingAccess } from "./onboarding-access";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const VERIFY_TTL_MS = 48 * 60 * 60 * 1000;

export type PortalAdminStatus =
  | "pending_verification"
  | "confirmed"
  | "email_verified"
  | "review_required";

export type PortalAdminView = {
  customerId: string;
  customerNumber: string;
  billingEmail: string | null;
  portalAdminEmail: string | null;
  portalAdminStatus: PortalAdminStatus | null;
  portalAdminSource: string | null;
  confirmed: boolean;
  canBeginQuestionnaire: boolean;
};

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function isConfirmedStatus(status: string | null): boolean {
  return status === "confirmed" || status === "email_verified";
}

export async function loadPortalAdminForAccess(
  pool: SqlPool,
  accessTokenHash: string,
): Promise<{ ok: true; view: PortalAdminView; onboardingId: string } | { ok: false; reason: "rejected" }> {
  const access = await resolveOnboardingAccess(pool, accessTokenHash);
  if (!access.ok) return { ok: false, reason: "rejected" };

  const row = await pool.query(
    `SELECT c.id, c.customer_number, c.primary_email,
            c.portal_admin_email, c.portal_admin_status, c.portal_admin_source
     FROM customer_onboardings o
     JOIN customers c ON c.id = o.customer_id
     WHERE o.id = $1
     LIMIT 1`,
    [access.onboardingId],
  );
  const c = row.rows[0];
  if (!c) return { ok: false, reason: "rejected" };

  const status = (c.portal_admin_status as PortalAdminStatus | null) || null;
  const confirmed = isConfirmedStatus(status);
  return {
    ok: true,
    onboardingId: access.onboardingId,
    view: {
      customerId: String(c.id),
      customerNumber: String(c.customer_number || ""),
      billingEmail: c.primary_email ? String(c.primary_email) : null,
      portalAdminEmail: c.portal_admin_email ? String(c.portal_admin_email) : null,
      portalAdminStatus: status,
      portalAdminSource: c.portal_admin_source ? String(c.portal_admin_source) : null,
      confirmed,
      canBeginQuestionnaire: confirmed,
    },
  };
}

export type ConfirmPortalAdminInput =
  | { mode: "checkout"; confirm: true }
  | { mode: "alternate"; email: string; confirmEmail: string };

export async function confirmPortalAdminFromAccess(
  pool: SqlPool,
  accessTokenHash: string,
  input: ConfirmPortalAdminInput,
  host: string,
): Promise<
  | { ok: true; view: PortalAdminView; verificationEmailQueued: boolean }
  | {
      ok: false;
      reason:
        | "rejected"
        | "invalid_email"
        | "email_mismatch"
        | "confirmation_required"
        | "missing_billing_email"
        | "payment_not_confirmed"
        | "email_in_use";
    }
> {
  const access = await resolveOnboardingAccess(pool, accessTokenHash);
  if (!access.ok) return { ok: false, reason: "rejected" };

  const meta = await pool.query(
    `SELECT c.id, c.customer_number, c.primary_email, c.payment_verified_at,
            c.portal_admin_email, c.portal_admin_status, c.portal_admin_source
     FROM customer_onboardings o
     JOIN customers c ON c.id = o.customer_id
     WHERE o.id = $1
     LIMIT 1`,
    [access.onboardingId],
  );
  const c = meta.rows[0];
  if (!c) return { ok: false, reason: "rejected" };
  if (!c.payment_verified_at) return { ok: false, reason: "payment_not_confirmed" };

  const billing = c.primary_email ? normalizeEmail(String(c.primary_email)) : "";
  const previous = c.portal_admin_email ? String(c.portal_admin_email) : null;
  const actorRef = `access:${accessTokenHash.slice(0, 12)}`;

  if (input.mode === "checkout") {
    if (!input.confirm) return { ok: false, reason: "confirmation_required" };
    if (!billing || !EMAIL_RE.test(billing)) return { ok: false, reason: "missing_billing_email" };

    await pool.query(
      `UPDATE customers SET
         portal_admin_email = $2,
         portal_admin_status = 'confirmed',
         portal_admin_source = 'checkout_confirmed',
         portal_admin_confirmed_at = now(),
         updated_at = now()
       WHERE id = $1`,
      [c.id, billing],
    );
    await pool.query(
      `INSERT INTO portal_admin_email_events (
         customer_id, previous_email, new_email, actor_type, actor_ref, verification_state
       ) VALUES ($1,$2,$3,'onboarding_access',$4,'confirmed')`,
      [c.id, previous, billing, actorRef],
    );

    const loaded = await loadPortalAdminForAccess(pool, accessTokenHash);
    if (!loaded.ok) return { ok: false, reason: "rejected" };
    try {
      const { runCustomerProvisioning } = await import("./customer-provisioning");
      await runCustomerProvisioning(pool, {
        customerId: String(c.id),
        trigger: "portal_admin_confirmed",
      });
    } catch {
      // Confirmation must succeed even if provisioning is blocked/retryable.
    }
    return { ok: true, view: loaded.view, verificationEmailQueued: false };
  }

  const email = normalizeEmail(input.email || "");
  const confirmEmail = normalizeEmail(input.confirmEmail || "");
  if (!EMAIL_RE.test(email)) return { ok: false, reason: "invalid_email" };
  if (email !== confirmEmail) return { ok: false, reason: "email_mismatch" };

  // Same as billing → treat as checkout confirmation (no second email needed).
  if (billing && email === billing) {
    return confirmPortalAdminFromAccess(pool, accessTokenHash, { mode: "checkout", confirm: true }, host);
  }

  // Prevent cross-tenant takeover via an email already confirmed for another customer.
  const taken = await pool.query(
    `SELECT customer_number FROM customers
     WHERE id <> $1
       AND lower(portal_admin_email) = $2
       AND portal_admin_status IN ('confirmed', 'email_verified')
     LIMIT 1`,
    [c.id, email],
  );
  if (taken.rows[0]) {
    await pool.query(
      `INSERT INTO portal_admin_email_events (
         customer_id, previous_email, new_email, actor_type, actor_ref, verification_state
       ) VALUES ($1,$2,$3,'onboarding_access',$4,'rejected')`,
      [c.id, previous, email, actorRef],
    );
    return { ok: false, reason: "email_in_use" };
  }

  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + VERIFY_TTL_MS).toISOString();

  await pool.query(
    `UPDATE customers SET
       portal_admin_email = $2,
       portal_admin_status = 'pending_verification',
       portal_admin_source = NULL,
       portal_admin_confirmed_at = NULL,
       updated_at = now()
     WHERE id = $1`,
    [c.id, email],
  );
  await pool.query(
    `INSERT INTO portal_admin_verifications (
       customer_id, onboarding_id, email, token_hash, expires_at
     ) VALUES ($1,$2,$3,$4,$5)`,
    [c.id, access.onboardingId, email, tokenHash, expiresAt],
  );
  await pool.query(
    `INSERT INTO portal_admin_email_events (
       customer_id, previous_email, new_email, actor_type, actor_ref, verification_state
     ) VALUES ($1,$2,$3,'onboarding_access',$4,'pending_verification')`,
    [c.id, previous, email, actorRef],
  );

  const verifyUrl = `https://${host.replace(/^https?:\/\//, "").replace(/\/$/, "")}/onboarding/account/verify#${token}`;
  const dedupe = `portal_admin_verification:${c.id}:${email}:${tokenHash.slice(0, 16)}`;
  await pool.query(
    `INSERT INTO email_outbox (
       customer_id, onboarding_id, template_type, recipient, dedupe_key, payload_json, status
     ) VALUES ($1,$2,'portal_admin_verification',$3,$4,$5::jsonb,'queued')
     ON CONFLICT (dedupe_key) DO NOTHING`,
    [
      c.id,
      access.onboardingId,
      email,
      dedupe,
      JSON.stringify({ verification_url: verifyUrl, first_name: "there" }),
    ],
  );

  const loaded = await loadPortalAdminForAccess(pool, accessTokenHash);
  if (!loaded.ok) return { ok: false, reason: "rejected" };
  return { ok: true, view: loaded.view, verificationEmailQueued: true };
}

export async function verifyPortalAdminToken(
  pool: SqlPool,
  rawToken: string,
): Promise<{ ok: true; customerNumber: string } | { ok: false; reason: "rejected" }> {
  const token = (rawToken || "").trim();
  if (token.length < 32) return { ok: false, reason: "rejected" };
  const tokenHash = hashToken(token);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const row = await client.query(
      `SELECT id, customer_id, email, expires_at, consumed_at
       FROM portal_admin_verifications
       WHERE token_hash = $1
       FOR UPDATE`,
      [tokenHash],
    );
    const v = row.rows[0];
    if (!v || v.consumed_at != null) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "rejected" };
    }
    if (new Date(String(v.expires_at)).getTime() <= Date.now()) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "rejected" };
    }

    const email = normalizeEmail(String(v.email));
    await client.query(
      `UPDATE customers SET
         portal_admin_email = $2,
         portal_admin_status = 'email_verified',
         portal_admin_source = 'alternate_verified',
         portal_admin_confirmed_at = now(),
         updated_at = now()
       WHERE id = $1`,
      [v.customer_id, email],
    );
    await client.query(
      `UPDATE portal_admin_verifications SET consumed_at = now() WHERE id = $1`,
      [v.id],
    );
    await client.query(
      `INSERT INTO portal_admin_email_events (
         customer_id, previous_email, new_email, actor_type, actor_ref, verification_state
       ) VALUES ($1,NULL,$2,'onboarding_access','verify_token','email_verified')`,
      [v.customer_id, email],
    );
    const cust = await client.query(`SELECT customer_number FROM customers WHERE id = $1`, [
      v.customer_id,
    ]);
    await client.query("COMMIT");
    const customerId = String(v.customer_id);
    const customerNumber = String(cust.rows[0]?.customer_number || "");
    try {
      const { runCustomerProvisioning } = await import("./customer-provisioning");
      await runCustomerProvisioning(pool, {
        customerId,
        trigger: "portal_admin_confirmed",
      });
    } catch {
      // Verification must succeed even if provisioning is blocked/retryable.
    }
    return { ok: true, customerNumber };
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

/** Invite recipient: confirmed portal admin only — never billing email alone. */
export function resolveInviteRecipientEmail(row: {
  portal_admin_email?: unknown;
  portal_admin_status?: unknown;
  primary_email?: unknown;
}): { ok: true; email: string } | { ok: false; reason: "portal_admin_not_confirmed" | "missing_portal_admin_email" } {
  const status = row.portal_admin_status ? String(row.portal_admin_status) : null;
  if (!isConfirmedStatus(status)) {
    return { ok: false, reason: "portal_admin_not_confirmed" };
  }
  const email = row.portal_admin_email
    ? normalizeEmail(String(row.portal_admin_email))
    : "";
  if (!email || !EMAIL_RE.test(email)) {
    return { ok: false, reason: "missing_portal_admin_email" };
  }
  return { ok: true, email };
}
