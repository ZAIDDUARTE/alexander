import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  accountReadinessFromInvite,
  assertOperatorWorkspaceAssignment,
  decideInviteRetry,
  inviteBackoffMs,
  INVITE_IN_FLIGHT_LOCK_MS,
  liveInviteClaimAllowed,
  MAX_TRANSIENT_INVITE_ATTEMPTS,
} from "./provisioning-policy";

describe("provisioning policy", () => {
  it("does not treat invite sent as registration", () => {
    assert.equal(accountReadinessFromInvite("sent"), "invitation_requested");
    assert.equal(accountReadinessFromInvite("already_invited"), "invitation_requested");
    assert.equal(accountReadinessFromInvite("already_member"), "membership_observed");
    assert.equal(accountReadinessFromInvite("dry_run"), "not_invited");
    assert.equal(accountReadinessFromInvite(null), "not_invited");
  });

  it("never resends a terminal invitation", () => {
    const decision = decideInviteRetry({
      inviteStatus: "sent",
      attemptCount: 1,
      lastAttemptAt: new Date().toISOString(),
      lastError: null,
      forceRetry: true,
    });
    assert.equal(decision.action, "skip_terminal");
  });

  it("backs off transient failures and stops after the cap", () => {
    const now = Date.parse("2026-10-20T12:00:00Z");
    const waiting = decideInviteRetry({
      inviteStatus: "uncertain",
      attemptCount: 1,
      lastAttemptAt: new Date(now - 1_000).toISOString(),
      lastError: "trillet_api_error",
      lastHttpStatus: 503,
      now,
    });
    assert.equal(waiting.action, "wait_backoff");
    assert.ok((waiting.retryAfterMs || 0) > 0);
    assert.ok(inviteBackoffMs(1) <= 15 * 60_000);

    const exhausted = decideInviteRetry({
      inviteStatus: "uncertain",
      attemptCount: MAX_TRANSIENT_INVITE_ATTEMPTS,
      lastAttemptAt: new Date(now - 60 * 60_000).toISOString(),
      lastError: "trillet_api_error",
      lastHttpStatus: 503,
      now,
    });
    assert.equal(exhausted.action, "operator_attention");
    assert.equal(exhausted.reason, "transient_retries_exhausted");
  });

  it("requires operator attention for permanent auth failures", () => {
    const decision = decideInviteRetry({
      inviteStatus: "failed",
      attemptCount: 1,
      lastAttemptAt: new Date(0).toISOString(),
      lastError: "trillet_api_error",
      lastHttpStatus: 403,
      now: Date.now(),
    });
    assert.equal(decision.action, "operator_attention");
  });

  it("keeps the 120s claim after timeout or uncertain, then allows one later retry", () => {
    const now = Date.parse("2026-10-20T12:00:00Z");
    const recent = new Date(now - 10_000).toISOString();
    const expired = new Date(now - INVITE_IN_FLIGHT_LOCK_MS - 1_000).toISOString();

    assert.equal(liveInviteClaimAllowed({ inviteStatus: "pending", lastAttemptAt: recent, now }), false);
    assert.equal(liveInviteClaimAllowed({ inviteStatus: "uncertain", lastAttemptAt: recent, now }), false);
    assert.equal(liveInviteClaimAllowed({ inviteStatus: "uncertain", lastAttemptAt: expired, now }), true);
    assert.equal(liveInviteClaimAllowed({ inviteStatus: "sent", lastAttemptAt: expired, now }), false);
    assert.equal(liveInviteClaimAllowed({ inviteStatus: "dry_run", lastAttemptAt: recent, now }), true);
    assert.equal(liveInviteClaimAllowed({ inviteStatus: null, now }), true);

    const retry = decideInviteRetry({
      inviteStatus: "uncertain",
      attemptCount: 1,
      lastAttemptAt: recent,
      lastError: "trillet_api_error",
      lastHttpStatus: 0,
      forceRetry: true,
      now,
    });
    assert.equal(retry.action, "wait_backoff");
    assert.ok((retry.retryAfterMs || 0) > 0);
    assert.ok(inviteBackoffMs(1) >= INVITE_IN_FLIGHT_LOCK_MS);
  });

  it("rejects denied and malformed workspace ids", () => {
    const denied = assertOperatorWorkspaceAssignment("ws-phillip-prod", {
      TRILLET_WORKSPACE_DENY_IDS: "ws-phillip-prod,ws-shared",
    });
    assert.equal(denied.ok, false);
    if (!denied.ok) assert.equal(denied.reason, "workspace_denied");

    const bad = assertOperatorWorkspaceAssignment("short", {});
    assert.equal(bad.ok, false);

    const ok = assertOperatorWorkspaceAssignment("ws-isolated-01", {
      TRILLET_WORKSPACE_DENY_IDS: "ws-phillip-prod",
    });
    assert.equal(ok.ok, true);
  });
});
