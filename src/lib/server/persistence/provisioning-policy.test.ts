import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  accountReadinessFromInvite,
  assertOperatorWorkspaceAssignment,
  assertSubscriptionEligibleForDashboardActivation,
  canceledSyntheticMayUseProductionDashboard,
  decideInviteRetry,
  inviteBackoffMs,
  INVITE_IN_FLIGHT_LOCK_MS,
  liveInviteClaimAllowed,
  MAX_TRANSIENT_INVITE_ATTEMPTS,
  rejectCallerSuppliedSubscriptionOverride,
  resolveStoredSubscriptionEligibility,
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

  it("denies Phillip even when TRILLET_WORKSPACE_DENY_IDS is empty and allows the QA id", () => {
    const phillip = assertOperatorWorkspaceAssignment("6abab4bdf22720afb93099c6", {});
    assert.equal(phillip.ok, false);
    if (!phillip.ok) assert.equal(phillip.reason, "workspace_denied");

    const qa = assertOperatorWorkspaceAssignment("6ad84631243624378abbcfc6", {
      TRILLET_WORKSPACE_DENY_IDS: "6abab4bdf22720afb93099c6",
    });
    assert.equal(qa.ok, true);
    if (qa.ok) assert.equal(qa.workspaceId, "6ad84631243624378abbcfc6");

    assert.equal(
      canceledSyntheticMayUseProductionDashboard({
        dataClassification: "synthetic_test",
        stripeSubscriptionStatus: "canceled",
        stripeLivemode: false,
      }),
      false,
    );
  });

  it("requires a current eligible subscription for dashboard activation, not payment_verified alone", () => {
    const missing = assertSubscriptionEligibleForDashboardActivation({
      dataClassification: "synthetic_test",
      stripeSubscriptionStatus: null,
      stripeLivemode: false,
    });
    assert.equal(missing.ok, false);
    if (!missing.ok) assert.equal(missing.reason, "subscription_status_required");

    const canceled = assertSubscriptionEligibleForDashboardActivation({
      dataClassification: "synthetic_test",
      stripeSubscriptionStatus: "canceled",
      stripeLivemode: false,
    });
    assert.equal(canceled.ok, false);
    if (!canceled.ok) assert.equal(canceled.reason, "canceled_synthetic_blocked");

    const qaIsolated = assertSubscriptionEligibleForDashboardActivation({
      dataClassification: "synthetic_test",
      stripeSubscriptionStatus: "canceled",
      stripeLivemode: false,
      allowCanceledSyntheticQa: true,
    });
    assert.equal(qaIsolated.ok, false);
    if (!qaIsolated.ok) {
      assert.equal(qaIsolated.reason, "synthetic_qa_isolated_only");
      assert.equal(qaIsolated.syntheticQaIsolated, true);
    }

    const unpaid = assertSubscriptionEligibleForDashboardActivation({
      dataClassification: "real_customer",
      stripeSubscriptionStatus: "unpaid",
      stripeLivemode: true,
    });
    assert.equal(unpaid.ok, false);
    if (!unpaid.ok) assert.equal(unpaid.reason, "subscription_not_eligible");

    const active = assertSubscriptionEligibleForDashboardActivation({
      dataClassification: "synthetic_test",
      stripeSubscriptionStatus: "active",
      stripeLivemode: false,
    });
    assert.equal(active.ok, true);

    const trialing = assertSubscriptionEligibleForDashboardActivation({
      dataClassification: "real_customer",
      stripeSubscriptionStatus: "trialing",
      stripeLivemode: true,
    });
    assert.equal(trialing.ok, true);
  });

  it("never lets caller-supplied status override persisted eligibility", () => {
    const historicalNull = resolveStoredSubscriptionEligibility({
      dataClassification: "synthetic_test",
      stripeSubscriptionStatus: null,
      stripeLivemode: null,
    });
    assert.equal(historicalNull.ok, false);
    if (!historicalNull.ok) assert.equal(historicalNull.reason, "subscription_status_required");

    const storedCanceled = resolveStoredSubscriptionEligibility({
      dataClassification: "synthetic_test",
      stripeSubscriptionStatus: "canceled",
      stripeLivemode: false,
    });
    assert.equal(storedCanceled.ok, false);

    const overrideStatus = rejectCallerSuppliedSubscriptionOverride({
      stripeSubscriptionStatus: "active",
    });
    assert.equal(overrideStatus.ok, false);
    if (!overrideStatus.ok) assert.equal(overrideStatus.reason, "caller_subscription_override_rejected");

    const overrideLive = rejectCallerSuppliedSubscriptionOverride({ stripeLivemode: false });
    assert.equal(overrideLive.ok, false);

    const overrideQa = rejectCallerSuppliedSubscriptionOverride({ allowCanceledSyntheticQa: true });
    assert.equal(overrideQa.ok, false);

    const clean = rejectCallerSuppliedSubscriptionOverride({});
    assert.equal(clean.ok, true);
  });
});
