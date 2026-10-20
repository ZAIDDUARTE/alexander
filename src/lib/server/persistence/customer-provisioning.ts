/**
 * Idempotent customer provisioning orchestration after payment + portal admin + questionnaire.
 *
 * Phases (durable on customer_trillet_workspaces):
 *   gates_incomplete → workspace_provisioning_blocked | workspace_mapped
 *   → invite_* → email2_* → complete
 *
 * Never sends duplicate Trillet invitations (terminal invite statuses).
 * Never creates duplicate workspaces (adapter does not auto-create under Agency).
 * Email #2 only when allowlisted dashboard URL + confirmed portal admin exist.
 */

import type { SqlClient, SqlPool } from "./onboarding-access";
import {
  resolveApprovedDashboardUrl,
  validateCustomerDashboardUrl,
  type DashboardUrlEnv,
} from "./dashboard-url";
import { resolveInviteRecipientEmail } from "./portal-admin";
import {
  inviteCustomerToTrilletWorkspace,
  inviteFeatureEnabled,
  inviteLiveEnabled,
  type InviteEnv,
  type InviteOutcome,
} from "./trillet-invite";
import {
  evaluateAgencyWorkspaceContract,
  resolveCustomerWorkspaceProvisioning,
  type AgencyWorkspaceContract,
} from "./trillet-workspace-adapter";
import {
  accountReadinessFromInvite,
  decideInviteRetry,
  type AccountReadiness,
} from "./provisioning-policy";

export type ProvisioningPhase =
  | "gates_incomplete"
  | "workspace_provisioning_blocked"
  | "workspace_mapped"
  | "invite_pending"
  | "invite_dry_run"
  | "invite_sent"
  | "invite_terminal"
  | "invite_failed"
  | "email2_queued"
  | "email2_blocked"
  | "complete";

export type ProvisioningTrigger =
  | "questionnaire_submit"
  | "portal_admin_confirmed"
  | "operator_retry"
  | "mark_workspace_ready"
  | "reconcile"
  | "inspect";

export type ProvisioningGateReason =
  | "customer_not_found"
  | "customer_inactive"
  | "customer_blocked"
  | "payment_not_confirmed"
  | "portal_admin_not_confirmed"
  | "questionnaire_not_submitted"
  | "canonical_profile_not_ready";

export type ProvisioningEnv = InviteEnv & DashboardUrlEnv & {
  TRILLET_WORKSPACE_PROVISION_POLICY?: string;
};

export type CustomerProvisioningStatus = {
  customerId: string;
  customerNumber: string;
  dataClassification: string;
  paymentVerified: boolean;
  portalAdminConfirmed: boolean;
  questionnaireSubmitted: boolean;
  profileReady: boolean;
  workspaceId: string | null;
  trilletStatus: string | null;
  inviteStatus: string | null;
  provisioningPhase: ProvisioningPhase | null;
  provisioningAttemptCount: number;
  provisioningLastError: string | null;
  dashboardUrl: string | null;
  email2Queued: boolean;
  email2BlockedReason: string | null;
  agencyContract: AgencyWorkspaceContract;
  accountReadiness: AccountReadiness;
  nextAction: string;
};

export type ProvisioningRunResult = {
  ok: boolean;
  customerId: string;
  customerNumber: string;
  phase: ProvisioningPhase;
  trilletStatus: string | null;
  workspaceId: string | null;
  gateReason?: ProvisioningGateReason;
  emailJobId?: string | null;
  emailBlockedReason?: string | null;
  invite?: InviteOutcome | { skipped: true; reason: string };
  idempotent: boolean;
  detail?: string;
  correlationKey: string;
};

const BLOCKED_CUSTOMERS = new Set(["ALX-C000002"]);

const TERMINAL_INVITE = new Set(["sent", "already_member", "already_invited"]);

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

function buildCorrelationKey(customerId: string, trigger: ProvisioningTrigger): string {
  return `provision:${customerId}:${trigger}:${new Date().toISOString().slice(0, 13)}`;
}

type LoadedCustomer = {
  customerId: string;
  customerNumber: string;
  dataClassification: string;
  paymentVerified: boolean;
  portalAdminConfirmed: boolean;
  questionnaireSubmitted: boolean;
  profileReady: boolean;
  workspaceId: string | null;
  trilletStatus: string | null;
  inviteStatus: string | null;
  provisioningPhase: string | null;
  provisioningAttemptCount: number;
  provisioningLastError: string | null;
  dashboardUrlStored: string | null;
  dashboardEmailQueuedAt: string | null;
  portalAdminEmail: string | null;
  portalAdminStatus: string | null;
  customerFacingName: string | null;
  inviteAttemptCount: number;
  inviteLastAttemptAt: string | null;
};

async function loadCustomerProvisioningRow(
  pool: SqlPool,
  input: { customerId?: string; customerNumber?: string },
): Promise<LoadedCustomer | null> {
  const customerId = (input.customerId || "").trim();
  const customerNumber = (input.customerNumber || "").trim();
  if (!customerId && !/^ALX-C\d{6}$/.test(customerNumber)) return null;

  const customer = await pool.query(
    `SELECT c.id, c.customer_number, c.status, c.data_classification,
            c.payment_verified_at, c.portal_admin_email, c.portal_admin_status,
            c.customer_facing_name,
            t.workspace_id, t.status AS trillet_status, t.invite_status,
            t.invite_attempt_count, t.invite_last_attempt_at,
            t.provisioning_phase, t.provisioning_attempt_count, t.provisioning_last_error,
            t.dashboard_url, t.dashboard_email_queued_at
     FROM customers c
     LEFT JOIN customer_trillet_workspaces t ON t.customer_id = c.id
     WHERE ($1::uuid IS NOT NULL AND c.id = $1::uuid)
        OR ($2::text IS NOT NULL AND c.customer_number = $2)
     LIMIT 1`,
    [customerId || null, customerNumber || null],
  );
  const row = customer.rows[0];
  if (!row) return null;

  const id = String(row.id);
  const submitted = await pool.query(
    `SELECT id FROM customer_onboardings
     WHERE customer_id = $1 AND status = 'submitted'
     ORDER BY created_at DESC LIMIT 1`,
    [id],
  );
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
    [id],
  );

  const portalStatus = row.portal_admin_status ? String(row.portal_admin_status) : null;
  return {
    customerId: id,
    customerNumber: String(row.customer_number || ""),
    dataClassification: String(row.data_classification || "real_customer"),
    paymentVerified: Boolean(row.payment_verified_at),
    portalAdminConfirmed:
      portalStatus === "confirmed" || portalStatus === "email_verified",
    questionnaireSubmitted: Boolean(submitted.rows[0]),
    profileReady: Boolean(profile.rows[0]),
    workspaceId: row.workspace_id ? String(row.workspace_id) : null,
    trilletStatus: row.trillet_status ? String(row.trillet_status) : null,
    inviteStatus: row.invite_status ? String(row.invite_status) : null,
    provisioningPhase: row.provisioning_phase ? String(row.provisioning_phase) : null,
    provisioningAttemptCount: Number(row.provisioning_attempt_count || 0),
    provisioningLastError: row.provisioning_last_error
      ? String(row.provisioning_last_error)
      : null,
    dashboardUrlStored: row.dashboard_url ? String(row.dashboard_url) : null,
    dashboardEmailQueuedAt: row.dashboard_email_queued_at
      ? String(row.dashboard_email_queued_at)
      : null,
    portalAdminEmail: row.portal_admin_email ? String(row.portal_admin_email) : null,
    portalAdminStatus: portalStatus,
    customerFacingName: row.customer_facing_name ? String(row.customer_facing_name) : null,
    inviteAttemptCount: Number(row.invite_attempt_count || 0),
    inviteLastAttemptAt: row.invite_last_attempt_at ? String(row.invite_last_attempt_at) : null,
  };
}

function evaluateGates(row: LoadedCustomer): ProvisioningGateReason | null {
  if (BLOCKED_CUSTOMERS.has(row.customerNumber)) return "customer_blocked";
  if (!row.paymentVerified) return "payment_not_confirmed";
  if (!row.portalAdminConfirmed) return "portal_admin_not_confirmed";
  if (!row.questionnaireSubmitted) return "questionnaire_not_submitted";
  if (!row.profileReady) return "canonical_profile_not_ready";
  return null;
}

function nextActionFor(status: CustomerProvisioningStatus): string {
  if (!status.paymentVerified) return "Confirm Stripe Test payment and lifecycle handoff.";
  if (!status.portalAdminConfirmed) {
    return "Customer must confirm portal administrator email at /onboarding/account.";
  }
  if (!status.questionnaireSubmitted || !status.profileReady) {
    return "Customer must submit the questionnaire; then re-run provisioning.";
  }
  if (status.trilletStatus === "workspace_provisioning_blocked" || !status.workspaceId) {
    return "Provider blocker: Agency-managed workspace create is not in the confirmed API. Operator must create an isolated Trillet workspace and call markTrilletWorkspaceReady (never Phillip ALX-C000002).";
  }
  if (status.accountReadiness === "invitation_requested" || status.accountReadiness === "membership_observed") {
    const emailNote = status.email2BlockedReason
      ? ` Email #2 remains blocked (${status.email2BlockedReason}) and does not block the native invitation.`
      : "";
    return `Invitation state is ${status.inviteStatus}. Account registration is ${status.accountReadiness} and is not proven by the invite API. Customer must finish Trillet-native accept/register/login.${emailNote}`;
  }
  if (status.inviteStatus && TERMINAL_INVITE.has(status.inviteStatus)) {
    if (status.email2BlockedReason) {
      return `Invitation terminal (${status.inviteStatus}). Fix Email #2 destination: ${status.email2BlockedReason}`;
    }
    return "Invitation already accepted by Trillet API. Customer completes Trillet-native registration/login. invite_status=sent ≠ activation.";
  }
  if (!inviteFeatureEnabled()) {
    return "Workspace mapped. Enable TRILLET_INVITE_ENABLED (and live flags/allowlists after approval) or run prepareTrilletInvite dry-run.";
  }
  if (status.email2BlockedReason) {
    return `Invite path ready. Email #2 blocked: ${status.email2BlockedReason}`;
  }
  return "Provisioning complete or awaiting Trillet-native registration.";
}

export async function loadCustomerProvisioningStatus(
  pool: SqlPool,
  input: { customerId?: string; customerNumber?: string },
  env: ProvisioningEnv = process.env,
): Promise<
  | { ok: true; status: CustomerProvisioningStatus }
  | { ok: false; reason: "customer_not_found" }
> {
  const row = await loadCustomerProvisioningRow(pool, input);
  if (!row) return { ok: false, reason: "customer_not_found" };

  const dash = row.dashboardUrlStored
    ? validateCustomerDashboardUrl(row.dashboardUrlStored, env)
    : resolveApprovedDashboardUrl(env);
  const email2BlockedReason = dash.ok
    ? null
    : `dashboard_url_${dash.reason}${dash.detail ? `:${dash.detail}` : ""}`;

  const status: CustomerProvisioningStatus = {
    customerId: row.customerId,
    customerNumber: row.customerNumber,
    dataClassification: row.dataClassification,
    paymentVerified: row.paymentVerified,
    portalAdminConfirmed: row.portalAdminConfirmed,
    questionnaireSubmitted: row.questionnaireSubmitted,
    profileReady: row.profileReady,
    workspaceId: row.workspaceId,
    trilletStatus: row.trilletStatus,
    inviteStatus: row.inviteStatus,
    provisioningPhase: (row.provisioningPhase as ProvisioningPhase | null) || null,
    provisioningAttemptCount: row.provisioningAttemptCount,
    provisioningLastError: row.provisioningLastError,
    dashboardUrl: dash.ok ? dash.url : row.dashboardUrlStored,
    email2Queued: Boolean(row.dashboardEmailQueuedAt),
    email2BlockedReason: row.dashboardEmailQueuedAt ? null : email2BlockedReason,
    agencyContract: evaluateAgencyWorkspaceContract(),
    accountReadiness: accountReadinessFromInvite(row.inviteStatus),
    nextAction: "",
  };
  status.nextAction = nextActionFor(status);
  return { ok: true, status };
}

async function persistProvisioningState(
  client: SqlClient,
  input: {
    customerId: string;
    phase: ProvisioningPhase;
    /** When set, updates status. When omitted, leaves existing status unchanged. */
    trilletStatus?: string;
    lastError?: string | null;
    correlationKey: string;
    operatorRef?: string | null;
    clearWorkspaceError?: boolean;
  },
): Promise<void> {
  const setStatus = input.trilletStatus !== undefined;
  await client.query(
    `INSERT INTO customer_trillet_workspaces (
       customer_id, status, provisioning_phase, provisioning_attempt_count,
       provisioning_last_attempt_at, provisioning_last_error, provisioning_correlation_key,
       operator_ref, updated_at
     ) VALUES (
       $1,
       COALESCE($2, 'awaiting_internal_setup'),
       $3,
       1,
       now(),
       $4,
       $5,
       $6,
       now()
     )
     ON CONFLICT (customer_id) DO UPDATE SET
       status = CASE
         WHEN $8 THEN COALESCE($2, customer_trillet_workspaces.status)
         ELSE customer_trillet_workspaces.status
       END,
       provisioning_phase = EXCLUDED.provisioning_phase,
       provisioning_attempt_count = customer_trillet_workspaces.provisioning_attempt_count + 1,
       provisioning_last_attempt_at = now(),
       provisioning_last_error = EXCLUDED.provisioning_last_error,
       provisioning_correlation_key = EXCLUDED.provisioning_correlation_key,
       operator_ref = COALESCE(EXCLUDED.operator_ref, customer_trillet_workspaces.operator_ref),
       last_error = CASE
         WHEN $7 THEN NULL
         WHEN EXCLUDED.provisioning_last_error IS NOT NULL THEN EXCLUDED.provisioning_last_error
         ELSE customer_trillet_workspaces.last_error
       END,
       updated_at = now()`,
    [
      input.customerId,
      input.trilletStatus ?? null,
      input.phase,
      input.lastError ?? null,
      input.correlationKey,
      input.operatorRef || null,
      input.clearWorkspaceError === true,
      setStatus,
    ],
  );
}

async function writeProvisioningAudit(
  client: SqlClient,
  input: {
    customerId: string;
    correlationKey: string;
    payload: Record<string, unknown>;
  },
): Promise<void> {
  await client.query(
    `INSERT INTO customer_lifecycle_events (
       customer_id, event_type, correlation_key, payload_json
     ) VALUES ($1, 'customer_provisioning_attempt', $2, $3::jsonb)
     ON CONFLICT (event_type, correlation_key) WHERE correlation_key IS NOT NULL
     DO NOTHING`,
    [input.customerId, input.correlationKey, JSON.stringify(input.payload)],
  );
}

export async function queueDashboardReadyEmail(
  client: SqlClient,
  input: {
    customerId: string;
    workspaceId: string;
    portalAdminEmail: string | null;
    portalAdminStatus: string | null;
    customerFacingName: string | null;
    dashboardUrl: string;
  },
): Promise<{ emailJobId: string | null; blockedReason: string | null }> {
  const recipient = resolveInviteRecipientEmail({
    portal_admin_email: input.portalAdminEmail,
    portal_admin_status: input.portalAdminStatus,
  });
  if (!recipient.ok) {
    return { emailJobId: null, blockedReason: recipient.reason };
  }
  const first =
    String(input.customerFacingName || "there").split(/\s+/)[0] || "there";
  const dedupe = `dashboard_ready:${input.customerId}:${input.workspaceId}`;
  const job = await client.query(
    `INSERT INTO email_outbox (
       customer_id, template_type, recipient, dedupe_key, payload_json, status
     ) VALUES ($1,'dashboard_ready',$2,$3,$4::jsonb,'queued')
     ON CONFLICT (dedupe_key) DO UPDATE SET updated_at = now()
     RETURNING id`,
    [
      input.customerId,
      recipient.email,
      dedupe,
      JSON.stringify({ first_name: first, dashboard_url: input.dashboardUrl }),
    ],
  );
  await client.query(
    `UPDATE customer_trillet_workspaces
     SET dashboard_email_queued_at = COALESCE(dashboard_email_queued_at, now()),
         dashboard_url = COALESCE(dashboard_url, $2),
         updated_at = now()
     WHERE customer_id = $1`,
    [input.customerId, input.dashboardUrl],
  );
  return { emailJobId: job.rows[0]?.id ? String(job.rows[0].id) : null, blockedReason: null };
}

export type RunProvisioningOptions = {
  customerId?: string;
  customerNumber?: string;
  trigger: ProvisioningTrigger;
  /** Attempt Trillet invite when feature flags allow (still dry-run unless live). */
  sendTrilletInvite?: boolean;
  liveInvite?: boolean;
  forceRetry?: boolean;
  operatorRef?: string | null;
  env?: ProvisioningEnv;
};

/**
 * Run one idempotent provisioning step for a customer.
 * Safe to call after questionnaire submit and portal-admin confirmation.
 */
export async function runCustomerProvisioning(
  pool: SqlPool,
  options: RunProvisioningOptions,
): Promise<ProvisioningRunResult> {
  const env = options.env || process.env;
  const row = await loadCustomerProvisioningRow(pool, {
    customerId: options.customerId,
    customerNumber: options.customerNumber,
  });
  if (!row) {
    return {
      ok: false,
      customerId: options.customerId || "",
      customerNumber: options.customerNumber || "",
      phase: "gates_incomplete",
      trilletStatus: null,
      workspaceId: null,
      gateReason: "customer_not_found",
      idempotent: false,
      correlationKey: "provision:missing",
    };
  }

  const correlationKey = buildCorrelationKey(row.customerId, options.trigger);
  const gate = evaluateGates(row);
  if (gate) {
    await withTransaction(pool, async (client) => {
      await persistProvisioningState(client, {
        customerId: row.customerId,
        phase: "gates_incomplete",
        ...(row.trilletStatus && row.trilletStatus !== "not_required"
          ? {}
          : { trilletStatus: "awaiting_internal_setup" }),
        lastError: gate,
        correlationKey,
        operatorRef: options.operatorRef || null,
      });
      await writeProvisioningAudit(client, {
        customerId: row.customerId,
        correlationKey,
        payload: {
          trigger: options.trigger,
          phase: "gates_incomplete",
          gate,
        },
      });
    });
    return {
      ok: false,
      customerId: row.customerId,
      customerNumber: row.customerNumber,
      phase: "gates_incomplete",
      trilletStatus: row.trilletStatus,
      workspaceId: row.workspaceId,
      gateReason: gate,
      idempotent: row.provisioningPhase === "gates_incomplete" && row.provisioningLastError === gate,
      detail: gate,
      correlationKey,
    };
  }

  const workspaceResolved = resolveCustomerWorkspaceProvisioning({
    mappedWorkspaceId: row.workspaceId,
    env,
  });

  if (!workspaceResolved.ok) {
    const detail =
      workspaceResolved.reason === "workspace_hard_blocked"
        ? workspaceResolved.detail
        : workspaceResolved.detail;
    const alreadyBlocked =
      row.trilletStatus === "workspace_provisioning_blocked" &&
      row.provisioningPhase === "workspace_provisioning_blocked";

    await withTransaction(pool, async (client) => {
      await persistProvisioningState(client, {
        customerId: row.customerId,
        phase: "workspace_provisioning_blocked",
        trilletStatus: "workspace_provisioning_blocked",
        lastError: workspaceResolved.reason,
        correlationKey,
        operatorRef: options.operatorRef || options.trigger,
      });
      await writeProvisioningAudit(client, {
        customerId: row.customerId,
        correlationKey,
        payload: {
          trigger: options.trigger,
          phase: "workspace_provisioning_blocked",
          reason: workspaceResolved.reason,
          agencyParentManagementSupported: false,
          detail,
        },
      });
    });

    return {
      ok: false,
      customerId: row.customerId,
      customerNumber: row.customerNumber,
      phase: "workspace_provisioning_blocked",
      trilletStatus: "workspace_provisioning_blocked",
      workspaceId: null,
      idempotent: alreadyBlocked,
      detail,
      correlationKey,
    };
  }

  const workspaceId = workspaceResolved.workspaceId;

  // Resolve Email #2 destination (configurable; Agency portal can swap later via env).
  const configuredDash = resolveApprovedDashboardUrl(env);
  const storedDash = row.dashboardUrlStored
    ? validateCustomerDashboardUrl(row.dashboardUrlStored, env)
    : null;
  const dashResult =
    storedDash && storedDash.ok
      ? storedDash
      : configuredDash.ok
        ? configuredDash
        : storedDash || configuredDash;
  const dashboardUrl = dashResult.ok ? dashResult.url : null;
  const emailBlockedReason = dashResult.ok
    ? null
    : `dashboard_url_${dashResult.reason}${dashResult.detail ? `:${dashResult.detail}` : ""}`;

  let emailJobId: string | null = null;
  let emailBlocked = emailBlockedReason;

  await withTransaction(pool, async (client) => {
    const preserveStatus =
      row.trilletStatus === "ready" ||
      row.trilletStatus === "invitation_created" ||
      row.trilletStatus === "active";
    await persistProvisioningState(client, {
      customerId: row.customerId,
      phase: "workspace_mapped",
      // Do not downgrade ready/invitation_created/active.
      ...(preserveStatus ? {} : {}),
      lastError: null,
      correlationKey,
      operatorRef: options.operatorRef || null,
      clearWorkspaceError: true,
    });

    if (dashboardUrl && row.workspaceId) {
      const queued = await queueDashboardReadyEmail(client, {
        customerId: row.customerId,
        workspaceId,
        portalAdminEmail: row.portalAdminEmail,
        portalAdminStatus: row.portalAdminStatus,
        customerFacingName: row.customerFacingName,
        dashboardUrl,
      });
      emailJobId = queued.emailJobId;
      emailBlocked = queued.blockedReason;
      await persistProvisioningState(client, {
        customerId: row.customerId,
        phase: queued.blockedReason ? "email2_blocked" : "email2_queued",
        lastError: queued.blockedReason,
        correlationKey: `${correlationKey}:email2`,
        operatorRef: options.operatorRef || null,
      });
    } else if (!dashboardUrl) {
      await persistProvisioningState(client, {
        customerId: row.customerId,
        phase: "email2_blocked",
        lastError: emailBlockedReason,
        correlationKey: `${correlationKey}:email2`,
        operatorRef: options.operatorRef || null,
      });
      emailBlocked = emailBlockedReason;
    }

    await writeProvisioningAudit(client, {
      customerId: row.customerId,
      correlationKey,
      payload: {
        trigger: options.trigger,
        phase: "workspace_mapped",
        workspaceId,
        emailJobId,
        emailBlockedReason: emailBlocked,
        inviteFeatureEnabled: inviteFeatureEnabled(env),
      },
    });
  });

  let inviteResult: InviteOutcome | { skipped: true; reason: string } = {
    skipped: true,
    reason: "not_requested",
  };
  const wantInvite =
    options.sendTrilletInvite === true || inviteFeatureEnabled(env);
  const workspaceReadyForInvite =
    row.trilletStatus === "ready" ||
    row.trilletStatus === "invitation_created" ||
    row.trilletStatus === "error" ||
    row.trilletStatus === "trillet_sync_required";

  if (wantInvite && workspaceReadyForInvite) {
    if (
      !options.forceRetry &&
      row.inviteStatus &&
      TERMINAL_INVITE.has(row.inviteStatus)
    ) {
      inviteResult = {
        ok: true,
        mode: "live",
        customerId: row.customerId,
        customerNumber: row.customerNumber,
        workspaceId,
        email: row.portalAdminEmail || "",
        role: "viewer",
        inviteStatus: row.inviteStatus as "sent" | "already_member" | "already_invited",
        httpStatus: null,
        message: "idempotent_skip_terminal_invite",
        idempotent: true,
        lifecycleEventId: null,
      };
      await withTransaction(pool, async (client) => {
        await persistProvisioningState(client, {
          customerId: row.customerId,
          phase: "invite_terminal",
          lastError: null,
          correlationKey: `${correlationKey}:invite`,
          clearWorkspaceError: true,
        });
      });
    } else {
      const retry = decideInviteRetry({
        inviteStatus: row.inviteStatus,
        attemptCount: row.inviteAttemptCount,
        lastAttemptAt: row.inviteLastAttemptAt,
        lastError: row.provisioningLastError,
        forceRetry: options.forceRetry === true,
      });
      if (retry.action === "wait_backoff" || retry.action === "operator_attention") {
        inviteResult = { skipped: true, reason: retry.reason };
        await withTransaction(pool, async (client) => {
          await persistProvisioningState(client, {
            customerId: row.customerId,
            phase: retry.action === "operator_attention" ? "invite_failed" : "invite_pending",
            lastError: retry.reason,
            correlationKey: `${correlationKey}:invite_retry`,
            operatorRef: options.operatorRef || options.trigger,
          });
          if (retry.action === "operator_attention") {
            await writeProvisioningAudit(client, {
              customerId: row.customerId,
              correlationKey: `${correlationKey}:attention`,
              payload: {
                trigger: options.trigger,
                attention: true,
                reason: retry.reason,
                customerNumber: row.customerNumber,
              },
            });
          }
        });
      } else {
      await withTransaction(pool, async (client) => {
        await persistProvisioningState(client, {
          customerId: row.customerId,
          phase: "invite_pending",
          lastError: null,
          correlationKey: `${correlationKey}:invite`,
        });
      });
      const outcome = await inviteCustomerToTrilletWorkspace(pool, {
        customerId: row.customerId,
        live: options.liveInvite === true,
        forceRetry: options.forceRetry === true,
        operatorRef: options.operatorRef || options.trigger,
        env,
      });
      inviteResult = outcome;
      const invitePhase: ProvisioningPhase = !outcome.ok
        ? "invite_failed"
        : outcome.mode === "dry_run"
          ? "invite_dry_run"
          : TERMINAL_INVITE.has(outcome.inviteStatus)
            ? "invite_terminal"
            : "invite_sent";
      await withTransaction(pool, async (client) => {
        await persistProvisioningState(client, {
          customerId: row.customerId,
          phase: invitePhase,
          lastError: !outcome.ok ? outcome.reason : null,
          correlationKey: `${correlationKey}:invite_done`,
          clearWorkspaceError: outcome.ok,
        });
      });
      }
    }
  } else if (wantInvite && !workspaceReadyForInvite) {
    inviteResult = {
      skipped: true,
      reason: "workspace_not_ready_for_invite",
    };
  }

  const inviteOk =
    typeof inviteResult === "object" &&
    "ok" in inviteResult &&
    inviteResult.ok === true;
  const inviteSkipped =
    typeof inviteResult === "object" && "skipped" in inviteResult;
  const phase: ProvisioningPhase =
    emailJobId
      ? "email2_queued"
      : emailBlocked
        ? "email2_blocked"
        : inviteOk && "mode" in inviteResult && inviteResult.mode === "dry_run"
          ? "invite_dry_run"
          : inviteOk &&
              "inviteStatus" in inviteResult &&
              TERMINAL_INVITE.has(String(inviteResult.inviteStatus))
            ? "invite_terminal"
            : inviteSkipped
              ? "workspace_mapped"
              : "complete";

  if (
    phase === "email2_queued" ||
    (phase === "invite_terminal" && !emailBlocked) ||
    (inviteSkipped && dashboardUrl && emailJobId)
  ) {
    await withTransaction(pool, async (client) => {
      await persistProvisioningState(client, {
        customerId: row.customerId,
        phase: emailJobId && !emailBlocked ? "complete" : phase,
        lastError: emailBlocked,
        correlationKey: `${correlationKey}:final`,
        clearWorkspaceError: !emailBlocked,
      });
    });
  }

  return {
    ok: true,
    customerId: row.customerId,
    customerNumber: row.customerNumber,
    phase: emailJobId && !emailBlocked ? "complete" : phase,
    trilletStatus: row.trilletStatus,
    workspaceId,
    emailJobId,
    emailBlockedReason: emailBlocked,
    invite: inviteResult,
    idempotent:
      Boolean(row.dashboardEmailQueuedAt && emailJobId) ||
      (inviteOk && "idempotent" in inviteResult && inviteResult.idempotent === true),
    detail: workspaceResolved.mode,
    correlationKey,
    ...(inviteLiveEnabled(env) ? {} : {}),
  };
}

/**
 * Recover missed submit/portal-admin triggers and transient invite failures.
 * Default is dry-run. execute=true re-runs provisioning without force-resending
 * terminal invitations. ALX-C000002 is excluded. Blocked workspaces are reported,
 * not auto-created.
 */
export async function reconcileCustomerProvisioning(
  pool: SqlPool,
  options: { execute?: boolean; limit?: number; env?: ProvisioningEnv } = {},
): Promise<{
  ok: true;
  execute: boolean;
  scanned: number;
  results: Array<Record<string, unknown>>;
}> {
  const env = options.env || process.env;
  const limit = Math.min(Math.max(options.limit || 25, 1), 50);
  const found = await pool.query(
    `SELECT c.customer_number
     FROM customers c
     JOIN customer_trillet_workspaces t ON t.customer_id = c.id
     WHERE c.customer_number <> 'ALX-C000002'
       AND c.payment_verified_at IS NOT NULL
       AND (
         t.provisioning_phase IS NULL
         OR t.provisioning_phase IN (
           'gates_incomplete',
           'workspace_provisioning_blocked',
           'workspace_mapped',
           'invite_pending',
           'invite_failed',
           'email2_blocked'
         )
       )
     ORDER BY t.updated_at ASC NULLS FIRST
     LIMIT $1`,
    [limit],
  );

  const results: Array<Record<string, unknown>> = [];
  for (const candidate of found.rows) {
    const customerNumber = String(candidate.customer_number || "");
    const loaded = await loadCustomerProvisioningStatus(pool, { customerNumber }, env);
    if (!loaded.ok) {
      results.push({ customerNumber, ok: false, reason: loaded.reason });
      continue;
    }
    const needsWorkspace =
      !loaded.status.workspaceId ||
      loaded.status.trilletStatus === "workspace_provisioning_blocked";
    if (!options.execute) {
      results.push({
        customerNumber,
        dryRun: true,
        phase: loaded.status.provisioningPhase,
        trilletStatus: loaded.status.trilletStatus,
        accountReadiness: loaded.status.accountReadiness,
        inviteStatus: loaded.status.inviteStatus,
        nextAction: loaded.status.nextAction,
        needsWorkspace,
      });
      continue;
    }
    if (needsWorkspace && loaded.status.portalAdminConfirmed && loaded.status.questionnaireSubmitted) {
      results.push({
        customerNumber,
        executed: false,
        action: "operator_map_workspace",
        nextAction: loaded.status.nextAction,
      });
      continue;
    }
    const run = await runCustomerProvisioning(pool, {
      customerNumber,
      trigger: "reconcile",
      forceRetry: false,
      env,
      operatorRef: "reconcileCustomerProvisioning",
    });
    results.push({
      customerNumber,
      executed: true,
      ok: run.ok,
      phase: run.phase,
      gateReason: run.gateReason || null,
      detail: run.detail || null,
    });
  }

  return { ok: true, execute: options.execute === true, scanned: found.rows.length, results };
}
