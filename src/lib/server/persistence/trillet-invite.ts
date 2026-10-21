/**
 * Automated Trillet workspace invitations.
 *
 * Official endpoint (docs: Invite Team Member):
 *   POST https://api.trillet.ai/v1/api/workspaces/{workspaceId}/invite
 * Auth headers (docs: Authentication):
 *   x-api-key, x-workspace-id (must match path workspaceId), Content-Type: application/json
 * Body: { email, role } where role ∈ admin | editor | viewer
 *
 * Trillet sends the invitation email with the accept link. Alexander SES Email #2
 * remains separate and must not invent invitation URLs.
 */

import type { SqlClient, SqlPool } from "./onboarding-access";
import { resolveApprovedDashboardUrl } from "./dashboard-url";
import { resolveInviteRecipientEmail } from "./portal-admin";
import { resolveStoredSubscriptionEligibility } from "./provisioning-policy";
import { resolveTrilletApiKeySync } from "./trillet-secret";
import { TRILLET_WORKSPACE_HARD_BLOCKLIST } from "./trillet-workspace-ids";

export const TRILLET_API_BASE = "https://api.trillet.ai";
export const TRILLET_INVITE_PATH = (workspaceId: string) =>
  `${TRILLET_API_BASE}/v1/api/workspaces/${encodeURIComponent(workspaceId)}/invite`;

/** Hard blocklist — never invite these customers via automation. */
export const TRILLET_INVITE_BLOCKED_CUSTOMER_NUMBERS = new Set([
  "ALX-C000002", // Phillip / real customer
]);

export type TrilletInviteRole = "viewer" | "editor" | "admin";

export type TrilletInviteStatus =
  | "not_started"
  | "dry_run"
  | "pending"
  | "sent"
  | "already_member"
  | "already_invited"
  | "failed"
  | "uncertain";

export type InviteEligibilityReason =
  | "customer_not_found"
  | "customer_inactive"
  | "payment_not_confirmed"
  | "subscription_not_eligible"
  | "questionnaire_not_submitted"
  | "canonical_profile_not_ready"
  | "workspace_not_mapped"
  | "workspace_status_not_eligible"
  | "missing_primary_email"
  | "portal_admin_not_confirmed"
  | "missing_portal_admin_email"
  | "customer_blocked"
  | "workspace_not_authorized"
  | "missing_api_key"
  | "invalid_role"
  | "invite_already_terminal";

export type EligibleInviteContext = {
  customerId: string;
  customerNumber: string;
  dataClassification: string;
  email: string;
  workspaceId: string;
  agentId: string | null;
  trilletStatus: string;
  inviteStatus: string | null;
  inviteIdempotencyKey: string | null;
};

export type InviteOutcome =
  | {
      ok: true;
      mode: "live" | "dry_run";
      customerId: string;
      customerNumber: string;
      workspaceId: string;
      email: string;
      role: TrilletInviteRole;
      inviteStatus: TrilletInviteStatus;
      httpStatus: number | null;
      message: string | null;
      idempotent: boolean;
      lifecycleEventId: string | null;
    }
  | {
      ok: false;
      reason: InviteEligibilityReason | "trillet_api_error" | "invite_feature_disabled"
      | "invite_live_disabled"
      | "persist_failed";
      detail?: string;
      httpStatus?: number | null;
      customerId?: string;
      customerNumber?: string;
      workspaceId?: string;
      inviteStatus?: TrilletInviteStatus;
    };

export type TrilletFetchResult = {
  ok: boolean;
  status: number;
  body: unknown;
  text: string;
};

export type TrilletInviteFetch = (
  method: string,
  url: string,
  headers: Record<string, string>,
  body?: unknown,
) => Promise<TrilletFetchResult>;

export type InviteEnv = {
  TRILLET_API_KEY?: string;
  TRILLET_INVITE_ENABLED?: string;
  TRILLET_INVITE_LIVE_ENABLED?: string;
  TRILLET_CUSTOMER_INVITE_ROLE?: string;
  TRILLET_INVITE_ALLOWED_WORKSPACE_IDS?: string;
  TRILLET_INVITE_ALLOWED_CUSTOMER_NUMBERS?: string;
  ALEXANDER_CUSTOMER_DASHBOARD_URL?: string;
  STAGING_TRILLET_WORKSPACE_ID?: string;
  [key: string]: string | undefined;
};

const TERMINAL_INVITE_STATUSES = new Set<string>([
  "sent",
  "already_member",
  "already_invited",
]);

const ELIGIBLE_WORKSPACE_STATUSES = new Set([
  "ready",
  "invitation_created",
  "error",
  "trillet_sync_required",
]);

export function parseInviteRole(raw: string | undefined | null): TrilletInviteRole | null {
  const role = (raw || "").trim().toLowerCase();
  if (role === "viewer" || role === "editor" || role === "admin") return role;
  return null;
}

/** Least-privileged documented role. Override via TRILLET_CUSTOMER_INVITE_ROLE after permission testing. */
export function resolveCustomerInviteRole(env: InviteEnv = process.env): TrilletInviteRole {
  return parseInviteRole(env.TRILLET_CUSTOMER_INVITE_ROLE) || "viewer";
}

export function inviteFeatureEnabled(env: InviteEnv = process.env): boolean {
  return (env.TRILLET_INVITE_ENABLED || "").trim().toLowerCase() === "true";
}

export function inviteLiveEnabled(env: InviteEnv = process.env): boolean {
  return (env.TRILLET_INVITE_LIVE_ENABLED || "").trim().toLowerCase() === "true";
}

export function resolveDashboardUrl(env: InviteEnv = process.env): string | null {
  const approved = resolveApprovedDashboardUrl(env);
  return approved.ok ? approved.url : null;
}

export function allowedWorkspaceIds(env: InviteEnv = process.env): Set<string> {
  const ids = new Set<string>();
  const staging = (env.STAGING_TRILLET_WORKSPACE_ID || "").trim();
  if (staging) ids.add(staging);
  for (const part of (env.TRILLET_INVITE_ALLOWED_WORKSPACE_IDS || "").split(",")) {
    const id = part.trim();
    if (id) ids.add(id);
  }
  return ids;
}

export function allowedCustomerNumbers(env: InviteEnv = process.env): Set<string> | null {
  const raw = (env.TRILLET_INVITE_ALLOWED_CUSTOMER_NUMBERS || "").trim();
  if (!raw) return null;
  return new Set(
    raw
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean),
  );
}

export function buildInviteIdempotencyKey(
  customerId: string,
  workspaceId: string,
  email: string,
): string {
  return `trillet_invite:${customerId}:${workspaceId}:${email.trim().toLowerCase()}`;
}

export function classifyTrilletInviteResponse(
  httpStatus: number,
  body: unknown,
  text: string,
): {
  inviteStatus: TrilletInviteStatus;
  message: string | null;
  success: boolean;
} {
  const record = asRecord(body);
  const message =
    (record && typeof record.message === "string" && record.message) ||
    (record && typeof record.error === "string" && record.error) ||
    (text ? text.slice(0, 400) : null);
  const lower = (message || "").toLowerCase();
  const successFlag = record && record.success === true;

  if (httpStatus >= 200 && httpStatus < 300) {
    if (/already.*(member|belong)/i.test(lower)) {
      return { inviteStatus: "already_member", message, success: true };
    }
    if (/already.*(invit|pending)/i.test(lower)) {
      return { inviteStatus: "already_invited", message, success: true };
    }
    if (successFlag || httpStatus === 200 || httpStatus === 201) {
      return { inviteStatus: "sent", message, success: true };
    }
  }

  if (httpStatus === 409 || /already.*(invit|pending|member)/i.test(lower)) {
    if (/member|belong/i.test(lower)) {
      return { inviteStatus: "already_member", message, success: true };
    }
    return { inviteStatus: "already_invited", message, success: true };
  }

  if (httpStatus === 401 || httpStatus === 403) {
    return { inviteStatus: "failed", message, success: false };
  }

  if (httpStatus >= 500 || httpStatus === 0 || httpStatus === 408 || httpStatus === 429) {
    return { inviteStatus: "uncertain", message, success: false };
  }

  return { inviteStatus: "failed", message, success: false };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export const defaultTrilletInviteFetch: TrilletInviteFetch = async (
  method,
  url,
  headers,
  body,
) => {
  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(20_000),
    });
    const text = await response.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = { raw: text.slice(0, 200) };
    }
    return { ok: response.ok, status: response.status, body: parsed, text };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "fetch_failed";
    return { ok: false, status: 0, body: { error: detail }, text: detail };
  }
};

async function withTransaction<T>(
  pool: SqlPool,
  run: (client: SqlClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await run(client);
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

export async function loadInviteEligibility(
  pool: SqlPool,
  input: { customerId?: string; customerNumber?: string },
  env: InviteEnv = process.env,
): Promise<{ ok: true; context: EligibleInviteContext } | { ok: false; reason: InviteEligibilityReason }> {
  const customerId = (input.customerId || "").trim();
  const customerNumber = (input.customerNumber || "").trim();
  if (!customerId && !/^ALX-C\d{6}$/.test(customerNumber)) {
    return { ok: false, reason: "customer_not_found" };
  }

  const customer = await pool.query(
    `SELECT id, customer_number, status, data_classification, primary_email, payment_verified_at,
            portal_admin_email, portal_admin_status,
            stripe_subscription_status, stripe_livemode
     FROM customers
     WHERE ($1::uuid IS NOT NULL AND id = $1::uuid)
        OR ($2::text IS NOT NULL AND customer_number = $2)
     LIMIT 1`,
    [customerId || null, customerNumber || null],
  );
  const row = customer.rows[0];
  if (!row) return { ok: false, reason: "customer_not_found" };

  const number = String(row.customer_number || "");
  if (TRILLET_INVITE_BLOCKED_CUSTOMER_NUMBERS.has(number)) {
    return { ok: false, reason: "customer_blocked" };
  }
  const allowlist = allowedCustomerNumbers(env);
  if (allowlist && !allowlist.has(number)) {
    return { ok: false, reason: "customer_blocked" };
  }
  if (String(row.status) !== "active") {
    return { ok: false, reason: "customer_inactive" };
  }
  if (!row.payment_verified_at) {
    return { ok: false, reason: "payment_not_confirmed" };
  }
  // After migration 016, null/canceled/ineligible status fails closed — payment_verified_at is not enough.
  const subscriptionEligibility = resolveStoredSubscriptionEligibility({
    dataClassification: String(row.data_classification || ""),
    stripeSubscriptionStatus: row.stripe_subscription_status
      ? String(row.stripe_subscription_status)
      : null,
    stripeLivemode:
      typeof row.stripe_livemode === "boolean" ? (row.stripe_livemode as boolean) : null,
  });
  if (!subscriptionEligibility.ok) {
    return { ok: false, reason: "subscription_not_eligible" };
  }
  if (!row.primary_email) {
    return { ok: false, reason: "missing_primary_email" };
  }
  const recipient = resolveInviteRecipientEmail(row);
  if (!recipient.ok) {
    return { ok: false, reason: recipient.reason };
  }
  const email = recipient.email;

  const submitted = await pool.query(
    `SELECT id FROM customer_onboardings
     WHERE customer_id = $1 AND status = 'submitted'
     ORDER BY created_at DESC LIMIT 1`,
    [row.id],
  );
  if (!submitted.rows[0]) {
    return { ok: false, reason: "questionnaire_not_submitted" };
  }

  const profile = await pool.query(
    `SELECT p.customer_id
     FROM customer_business_profiles p
     JOIN customer_profile_revisions r
       ON r.customer_id = p.customer_id
      AND r.revision_number = 1
      AND r.change_source = 'initial_questionnaire'
      AND r.status = 'active'
     WHERE p.customer_id = $1 AND p.current_revision >= 1
     LIMIT 1`,
    [row.id],
  );
  if (!profile.rows[0]) {
    return { ok: false, reason: "canonical_profile_not_ready" };
  }

  const trillet = await pool.query(
    `SELECT workspace_id, agent_id, status, invite_status, invite_idempotency_key
     FROM customer_trillet_workspaces
     WHERE customer_id = $1
     LIMIT 1`,
    [row.id],
  );
  const t = trillet.rows[0];
  if (!t || !t.workspace_id) {
    return { ok: false, reason: "workspace_not_mapped" };
  }
  const workspaceId = String(t.workspace_id);
  if (TRILLET_WORKSPACE_HARD_BLOCKLIST.has(workspaceId)) {
    return { ok: false, reason: "workspace_not_authorized" };
  }
  const allowedWs = allowedWorkspaceIds(env);
  // Live invites require an explicit workspace allowlist (staging id and/or TRILLET_INVITE_ALLOWED_WORKSPACE_IDS).
  // Dry-run eligibility still enforces the allowlist when one is configured.
  if (allowedWs.size > 0 && !allowedWs.has(workspaceId)) {
    return { ok: false, reason: "workspace_not_authorized" };
  }
  if (!ELIGIBLE_WORKSPACE_STATUSES.has(String(t.status || ""))) {
    return { ok: false, reason: "workspace_status_not_eligible" };
  }

  return {
    ok: true,
    context: {
      customerId: String(row.id),
      customerNumber: number,
      dataClassification: String(row.data_classification || "real_customer"),
      email,
      workspaceId,
      agentId: t.agent_id ? String(t.agent_id) : null,
      trilletStatus: String(t.status),
      inviteStatus: t.invite_status ? String(t.invite_status) : null,
      inviteIdempotencyKey: t.invite_idempotency_key
        ? String(t.invite_idempotency_key)
        : null,
    },
  };
}

export type InviteCustomerOptions = {
  customerId?: string;
  customerNumber?: string;
  /** When false (default unless TRILLET_INVITE_LIVE_ENABLED), do not call Trillet. */
  live?: boolean;
  /** Force retry even when prior outcome was uncertain/failed. */
  forceRetry?: boolean;
  role?: TrilletInviteRole;
  fetchImpl?: TrilletInviteFetch;
  env?: InviteEnv;
  operatorRef?: string | null;
};

export async function inviteCustomerToTrilletWorkspace(
  pool: SqlPool,
  options: InviteCustomerOptions,
): Promise<InviteOutcome> {
  const env = options.env || process.env;
  if (!inviteFeatureEnabled(env)) {
    return {
      ok: false,
      reason: "invite_feature_disabled",
      detail: "TRILLET_INVITE_ENABLED is not true",
    };
  }

  const configuredRole = resolveCustomerInviteRole(env);
  const role = options.role || configuredRole;
  if (!parseInviteRole(role)) {
    return { ok: false, reason: "invalid_role" };
  }
  // Reject escalation above the explicitly configured role (default viewer).
  if (role !== configuredRole) {
    return {
      ok: false,
      reason: "invalid_role",
      detail: `role ${role} is not authorized; configured TRILLET_CUSTOMER_INVITE_ROLE=${configuredRole}`,
    };
  }

  const eligibility = await loadInviteEligibility(
    pool,
    { customerId: options.customerId, customerNumber: options.customerNumber },
    env,
  );
  if (!eligibility.ok) {
    return { ok: false, reason: eligibility.reason };
  }
  const ctx = eligibility.context;

  const idempotencyKey =
    ctx.inviteIdempotencyKey ||
    buildInviteIdempotencyKey(ctx.customerId, ctx.workspaceId, ctx.email);

  if (
    !options.forceRetry &&
    ctx.inviteStatus &&
    TERMINAL_INVITE_STATUSES.has(ctx.inviteStatus)
  ) {
    return {
      ok: true,
      mode: "live",
      customerId: ctx.customerId,
      customerNumber: ctx.customerNumber,
      workspaceId: ctx.workspaceId,
      email: ctx.email,
      role,
      inviteStatus: ctx.inviteStatus as TrilletInviteStatus,
      httpStatus: null,
      message: "idempotent_skip_terminal_invite",
      idempotent: true,
      lifecycleEventId: null,
    };
  }

  const live = options.live === true && inviteLiveEnabled(env);
  if (options.live === true && !inviteLiveEnabled(env)) {
    return {
      ok: false,
      reason: "invite_live_disabled",
      detail: "TRILLET_INVITE_LIVE_ENABLED must be true to send a live invitation",
      customerId: ctx.customerId,
      customerNumber: ctx.customerNumber,
      workspaceId: ctx.workspaceId,
    };
  }

  if (live && allowedWorkspaceIds(env).size === 0) {
    return {
      ok: false,
      reason: "workspace_not_authorized",
      detail:
        "Live invites require STAGING_TRILLET_WORKSPACE_ID or TRILLET_INVITE_ALLOWED_WORKSPACE_IDS",
      customerId: ctx.customerId,
      customerNumber: ctx.customerNumber,
      workspaceId: ctx.workspaceId,
    };
  }

  if (live) {
    const allowCustomers = allowedCustomerNumbers(env);
    if (!allowCustomers || allowCustomers.size === 0) {
      return {
        ok: false,
        reason: "customer_blocked",
        detail: "Live invites require TRILLET_INVITE_ALLOWED_CUSTOMER_NUMBERS",
        customerId: ctx.customerId,
        customerNumber: ctx.customerNumber,
        workspaceId: ctx.workspaceId,
      };
    }
  }

  if (!live) {
    await persistInviteAttempt(pool, {
      customerId: ctx.customerId,
      workspaceId: ctx.workspaceId,
      email: ctx.email,
      role,
      inviteStatus: "dry_run",
      httpStatus: null,
      message: "dry_run_prepared",
      idempotencyKey,
      operatorRef: options.operatorRef || null,
      setInvitationCreated: false,
    });
    return {
      ok: true,
      mode: "dry_run",
      customerId: ctx.customerId,
      customerNumber: ctx.customerNumber,
      workspaceId: ctx.workspaceId,
      email: ctx.email,
      role,
      inviteStatus: "dry_run",
      httpStatus: null,
      message: "dry_run_prepared",
      idempotent: false,
      lifecycleEventId: null,
    };
  }

  const apiKey = resolveTrilletApiKeySync(env);
  if (!apiKey) {
    return { ok: false, reason: "missing_api_key", customerId: ctx.customerId };
  }

  const claimed = await pool.query(
    `UPDATE customer_trillet_workspaces
     SET invite_status = 'pending',
         invite_last_attempt_at = now(),
         updated_at = now()
     WHERE customer_id = $1
       AND COALESCE(invite_status, '') NOT IN ('sent', 'already_member', 'already_invited')
       AND (
         COALESCE(invite_status, '') NOT IN ('pending', 'uncertain')
         OR invite_last_attempt_at IS NULL
         OR invite_last_attempt_at < now() - interval '120 seconds'
       )
     RETURNING customer_id`,
    [ctx.customerId],
  );
  if (!claimed.rows[0]) {
    return {
      ok: true,
      mode: "live",
      customerId: ctx.customerId,
      customerNumber: ctx.customerNumber,
      workspaceId: ctx.workspaceId,
      email: ctx.email,
      role,
      inviteStatus: "pending",
      httpStatus: null,
      message: "concurrent_or_in_flight_invite_suppressed",
      idempotent: true,
      lifecycleEventId: null,
    };
  }

  await persistInviteAttempt(pool, {
    customerId: ctx.customerId,
    workspaceId: ctx.workspaceId,
    email: ctx.email,
    role,
    inviteStatus: "pending",
    httpStatus: null,
    message: null,
    idempotencyKey,
    operatorRef: options.operatorRef || null,
    setInvitationCreated: false,
  });

  const fetchImpl = options.fetchImpl || defaultTrilletInviteFetch;
  const response = await fetchImpl(
    "POST",
    TRILLET_INVITE_PATH(ctx.workspaceId),
    {
      "x-api-key": apiKey,
      "x-workspace-id": ctx.workspaceId,
      "Content-Type": "application/json",
    },
    { email: ctx.email, role },
  );

  const classified = classifyTrilletInviteResponse(
    response.status,
    response.body,
    response.text,
  );

  const lifecycleEventId = await persistInviteAttempt(pool, {
    customerId: ctx.customerId,
    workspaceId: ctx.workspaceId,
    email: ctx.email,
    role,
    inviteStatus: classified.inviteStatus,
    httpStatus: response.status,
    message: classified.message,
    idempotencyKey,
    operatorRef: options.operatorRef || null,
    setInvitationCreated: classified.success,
    writeLifecycleEvent: true,
    eventPayload: {
      http_status: response.status,
      invite_status: classified.inviteStatus,
      role,
      email_domain: ctx.email.split("@")[1] || null,
      trillet_message: classified.message,
      mode: "live",
    },
  });

  if (!classified.success) {
    return {
      ok: false,
      reason: "trillet_api_error",
      detail: classified.message || `http_${response.status}`,
      httpStatus: response.status,
      customerId: ctx.customerId,
      customerNumber: ctx.customerNumber,
      workspaceId: ctx.workspaceId,
      inviteStatus: classified.inviteStatus,
    };
  }

  return {
    ok: true,
    mode: "live",
    customerId: ctx.customerId,
    customerNumber: ctx.customerNumber,
    workspaceId: ctx.workspaceId,
    email: ctx.email,
    role,
    inviteStatus: classified.inviteStatus,
    httpStatus: response.status,
    message: classified.message,
    idempotent: classified.inviteStatus !== "sent",
    lifecycleEventId,
  };
}

async function persistInviteAttempt(
  pool: SqlPool,
  input: {
    customerId: string;
    workspaceId: string;
    email: string;
    role: TrilletInviteRole;
    inviteStatus: TrilletInviteStatus;
    httpStatus: number | null;
    message: string | null;
    idempotencyKey: string;
    operatorRef: string | null;
    setInvitationCreated: boolean;
    writeLifecycleEvent?: boolean;
    eventPayload?: Record<string, unknown>;
  },
): Promise<string | null> {
  return withTransaction(pool, async (client) => {
    await client.query(
      `UPDATE customer_trillet_workspaces SET
         invite_email = $2,
         invite_role = $3,
         invite_status = $4,
         invite_attempt_count = invite_attempt_count + 1,
         invite_last_attempt_at = now(),
         invite_last_http_status = $5,
         invite_idempotency_key = $6,
         invitation_ref = COALESCE($7, invitation_ref),
         last_error = CASE WHEN $4 IN ('failed','uncertain') THEN $7 ELSE NULL END,
         status = CASE
           WHEN $8 THEN 'invitation_created'
           ELSE status
         END,
         invitation_created_at = CASE
           WHEN $8 THEN COALESCE(invitation_created_at, now())
           ELSE invitation_created_at
         END,
         operator_ref = COALESCE($9, operator_ref),
         updated_at = now()
       WHERE customer_id = $1`,
      [
        input.customerId,
        input.email,
        input.role,
        input.inviteStatus,
        input.httpStatus,
        input.idempotencyKey,
        input.message,
        input.setInvitationCreated,
        input.operatorRef,
      ],
    );

    if (!input.writeLifecycleEvent) return null;

    // INSERT-only grant on customer_lifecycle_events — use unique attempt keys, never UPDATE.
    const attemptKey = `${input.idempotencyKey}:${input.inviteStatus}:${Date.now()}`;
    const event = await client.query(
      `INSERT INTO customer_lifecycle_events (
         customer_id, event_type, correlation_key, payload_json
       ) VALUES ($1, 'trillet_invite_attempt', $2, $3::jsonb)
       ON CONFLICT (event_type, correlation_key) WHERE correlation_key IS NOT NULL
       DO NOTHING
       RETURNING id`,
      [
        input.customerId,
        attemptKey,
        JSON.stringify({
          ...(input.eventPayload || {}),
          invite_idempotency_key: input.idempotencyKey,
        }),
      ],
    );
    return event.rows[0]?.id ? String(event.rows[0].id) : null;
  });
}
