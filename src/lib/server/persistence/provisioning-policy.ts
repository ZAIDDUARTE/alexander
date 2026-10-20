/**
 * Pure provisioning policy: retry backoff, account-readiness interpretation,
 * and operator workspace assignment checks.
 *
 * Account registration is NOT inferred from a successful invite API response.
 * Trillet "Get Pending Invitations" is the authenticated invitee's inbox and
 * returns invitation tokens — Alexander must not call it to scrape readiness.
 */

export const MAX_TRANSIENT_INVITE_ATTEMPTS = 5;
export const INVITE_BACKOFF_BASE_MS = 30_000;
export const INVITE_BACKOFF_CAP_MS = 15 * 60_000;
export const INVITE_IN_FLIGHT_LOCK_MS = 120_000;

export type AccountReadiness =
  | "not_invited"
  | "invitation_requested"
  | "membership_observed"
  | "registration_unverified";

export type InviteRetryAction = "proceed" | "wait_backoff" | "operator_attention" | "skip_terminal";

const TERMINAL = new Set(["sent", "already_member", "already_invited"]);

const PERMANENT_REASON =
  /^(invalid_role|customer_blocked|workspace_not_authorized|missing_api_key|portal_admin_not_confirmed)$/;

export function isTransientInviteFailure(input: {
  inviteStatus: string | null | undefined;
  httpStatus?: number | null;
  reason?: string | null;
}): boolean {
  const status = input.inviteStatus || "";
  if (status === "uncertain") return true;
  const http = input.httpStatus ?? null;
  if (http === 0 || http === 408 || http === 429 || (http != null && http >= 500)) return true;
  const reason = input.reason || "";
  return reason === "trillet_api_error" && (http == null || http >= 500 || http === 429 || http === 0);
}

export function isPermanentInviteFailure(input: {
  inviteStatus: string | null | undefined;
  httpStatus?: number | null;
  reason?: string | null;
}): boolean {
  const http = input.httpStatus ?? null;
  if (http === 401 || http === 403) return true;
  const reason = (input.reason || "").trim();
  if (PERMANENT_REASON.test(reason)) return true;
  const status = input.inviteStatus || "";
  return status === "failed" && !isTransientInviteFailure(input);
}

export function inviteBackoffMs(attemptCount: number): number {
  const n = Math.max(0, Math.min(attemptCount, 8));
  // Never shorter than the in-flight claim window, so a timeout/uncertain
  // outcome cannot be resent while that claim still applies.
  return Math.max(
    INVITE_IN_FLIGHT_LOCK_MS,
    Math.min(INVITE_BACKOFF_CAP_MS, INVITE_BACKOFF_BASE_MS * 2 ** n),
  );
}

const CLAIM_HOLD_STATUSES = new Set(["pending", "uncertain"]);

/**
 * Whether a live invite POST may be claimed.
 * Terminal statuses never send again.
 * `pending` (in flight or crash before classification) and `uncertain`
 * (timeout, 5xx, 429) stay locked for 120s from invite_last_attempt_at.
 * A dry-run does not hold the lock.
 */
export function liveInviteClaimAllowed(input: {
  inviteStatus: string | null | undefined;
  lastAttemptAt?: string | Date | null;
  now?: number;
}): boolean {
  const status = (input.inviteStatus || "").trim();
  if (status === "sent" || status === "already_member" || status === "already_invited") {
    return false;
  }
  if (!CLAIM_HOLD_STATUSES.has(status)) return true;
  if (input.lastAttemptAt == null || input.lastAttemptAt === "") return true;
  const last =
    input.lastAttemptAt instanceof Date
      ? input.lastAttemptAt.getTime()
      : Date.parse(String(input.lastAttemptAt));
  if (!Number.isFinite(last)) return true;
  const now = input.now ?? Date.now();
  return now - last >= INVITE_IN_FLIGHT_LOCK_MS;
}

export function decideInviteRetry(input: {
  inviteStatus: string | null | undefined;
  attemptCount: number;
  lastAttemptAt: string | Date | null | undefined;
  lastError: string | null | undefined;
  lastHttpStatus?: number | null;
  forceRetry?: boolean;
  now?: number;
}): { action: InviteRetryAction; retryAfterMs?: number; reason: string } {
  const status = input.inviteStatus || "";
  if (TERMINAL.has(status) && !input.forceRetry) {
    return { action: "skip_terminal", reason: "idempotent_skip_terminal_invite" };
  }
  if (TERMINAL.has(status) && input.forceRetry) {
    // Never re-send a terminal invitation, even on force.
    return { action: "skip_terminal", reason: "terminal_invite_not_resent" };
  }

  if (
    !liveInviteClaimAllowed({
      inviteStatus: status,
      lastAttemptAt: input.lastAttemptAt,
      now: input.now,
    })
  ) {
    const last =
      input.lastAttemptAt instanceof Date
        ? input.lastAttemptAt.getTime()
        : Date.parse(String(input.lastAttemptAt || ""));
    const now = input.now ?? Date.now();
    const elapsed = Number.isFinite(last) ? now - last : 0;
    return {
      action: "wait_backoff",
      retryAfterMs: Math.max(0, INVITE_IN_FLIGHT_LOCK_MS - elapsed),
      reason: "invite_claim_window",
    };
  }

  const permanent = isPermanentInviteFailure({
    inviteStatus: status,
    httpStatus: input.lastHttpStatus,
    reason: input.lastError,
  });
  if (permanent && !input.forceRetry) {
    return { action: "operator_attention", reason: input.lastError || "permanent_invite_failure" };
  }

  const transient =
    status === "uncertain" ||
    status === "failed" ||
    status === "pending" ||
    isTransientInviteFailure({
      inviteStatus: status,
      httpStatus: input.lastHttpStatus,
      reason: input.lastError,
    });

  if (!transient || input.forceRetry || !input.lastAttemptAt) {
    if ((input.attemptCount || 0) >= MAX_TRANSIENT_INVITE_ATTEMPTS && transient && !input.forceRetry) {
      return { action: "operator_attention", reason: "transient_retries_exhausted" };
    }
    return { action: "proceed", reason: "eligible" };
  }

  if ((input.attemptCount || 0) >= MAX_TRANSIENT_INVITE_ATTEMPTS) {
    return { action: "operator_attention", reason: "transient_retries_exhausted" };
  }

  const last = input.lastAttemptAt instanceof Date
    ? input.lastAttemptAt.getTime()
    : Date.parse(String(input.lastAttemptAt));
  const now = input.now ?? Date.now();
  const wait = inviteBackoffMs(input.attemptCount);
  if (Number.isFinite(last) && now - last < wait) {
    return { action: "wait_backoff", retryAfterMs: wait - (now - last), reason: "backoff" };
  }
  return { action: "proceed", reason: "backoff_elapsed" };
}

/**
 * Separate invitation delivery from account registration.
 * already_member is the only documented API signal of existing membership.
 * It is still not proof of a completed returning login.
 */
export function accountReadinessFromInvite(inviteStatus: string | null | undefined): AccountReadiness {
  const status = inviteStatus || "";
  if (!status || status === "not_started" || status === "dry_run" || status === "failed") {
    return "not_invited";
  }
  if (status === "already_member") return "membership_observed";
  if (status === "sent" || status === "already_invited" || status === "pending" || status === "uncertain") {
    return status === "sent" || status === "already_invited"
      ? "invitation_requested"
      : "registration_unverified";
  }
  return "registration_unverified";
}

export type WorkspaceDenyEnv = { TRILLET_WORKSPACE_DENY_IDS?: string; [key: string]: string | undefined };

export function deniedWorkspaceIds(env: WorkspaceDenyEnv = process.env): Set<string> {
  const ids = new Set<string>();
  for (const part of (env.TRILLET_WORKSPACE_DENY_IDS || "").split(",")) {
    const id = part.trim();
    if (id) ids.add(id);
  }
  return ids;
}

export function assertOperatorWorkspaceAssignment(
  workspaceId: string,
  env: WorkspaceDenyEnv = process.env,
): { ok: true; workspaceId: string } | { ok: false; reason: "invalid_workspace_id" | "workspace_denied"; detail: string } {
  const id = workspaceId.trim();
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(id)) {
    return {
      ok: false,
      reason: "invalid_workspace_id",
      detail: "workspaceId must be 8–128 chars of letters, digits, underscore, or hyphen",
    };
  }
  if (deniedWorkspaceIds(env).has(id)) {
    return {
      ok: false,
      reason: "workspace_denied",
      detail: "workspaceId is on TRILLET_WORKSPACE_DENY_IDS (Phillip / shared workspace protection)",
    };
  }
  return { ok: true, workspaceId: id };
}
