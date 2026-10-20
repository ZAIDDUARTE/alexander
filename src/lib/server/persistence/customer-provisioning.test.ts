import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  loadCustomerProvisioningStatus,
  runCustomerProvisioning,
} from "./customer-provisioning";
import type { SqlClient, SqlPool } from "./onboarding-access";

type Row = Record<string, unknown>;
type Handler = (text: string, values?: unknown[]) => { rows: Row[] };

function mockPool(handlers: Handler[]): SqlPool {
  let call = 0;
  const safeQuery = async (text: string, values?: unknown[]) => {
    const handler = handlers[call++];
    if (!handler) throw new Error(`unexpected query #${call}: ${text.slice(0, 160)}`);
    return { rows: handler(text, values).rows, rowCount: 0 };
  };
  const client: SqlClient = {
    query: safeQuery,
    release: () => undefined,
  };
  return {
    query: safeQuery,
    connect: async () => client,
  };
}

const customerId = "11111111-1111-1111-1111-111111111111";

function baseCustomer(overrides: Row = {}): Row {
  return {
    id: customerId,
    customer_number: "ALX-C000009",
    status: "active",
    data_classification: "synthetic_test",
    payment_verified_at: new Date(),
    portal_admin_email: "qa+synth@example.com",
    portal_admin_status: "confirmed",
    customer_facing_name: "Synth",
    workspace_id: null,
    trillet_status: "awaiting_internal_setup",
    invite_status: null,
    provisioning_phase: null,
    provisioning_attempt_count: 0,
    provisioning_last_error: null,
    dashboard_url: null,
    dashboard_email_queued_at: null,
    ...overrides,
  };
}

describe("customer provisioning state machine", () => {
  it("blocks on missing portal admin (gates_incomplete)", async () => {
    const pool = mockPool([
      () => ({
        rows: [
          baseCustomer({
            portal_admin_status: "review_required",
            portal_admin_email: null,
          }),
        ],
      }),
      () => ({ rows: [{ id: "onb" }] }),
      () => ({ rows: [{ customer_id: customerId }] }),
      // BEGIN + persist + audit + COMMIT path via connect()
      () => ({ rows: [] }), // BEGIN
      () => ({ rows: [] }), // persist upsert
      () => ({ rows: [] }), // audit
      () => ({ rows: [] }), // COMMIT
    ]);

    const result = await runCustomerProvisioning(pool, {
      customerId,
      trigger: "questionnaire_submit",
    });
    assert.equal(result.ok, false);
    assert.equal(result.phase, "gates_incomplete");
    assert.equal(result.gateReason, "portal_admin_not_confirmed");
  });

  it("returns workspace_provisioning_blocked when Agency nesting is unsupported", async () => {
    const pool = mockPool([
      () => ({ rows: [baseCustomer()] }),
      () => ({ rows: [{ id: "onb" }] }),
      () => ({ rows: [{ customer_id: customerId }] }),
      () => ({ rows: [] }), // BEGIN
      () => ({ rows: [] }), // persist
      () => ({ rows: [] }), // audit
      () => ({ rows: [] }), // COMMIT
    ]);

    const result = await runCustomerProvisioning(pool, {
      customerId,
      trigger: "questionnaire_submit",
      env: {
        STAGING_TRILLET_WORKSPACE_ID: "ws-should-not-auto-assign",
      },
    });
    assert.equal(result.ok, false);
    assert.equal(result.phase, "workspace_provisioning_blocked");
    assert.equal(result.workspaceId, null);
    assert.match(String(result.detail || ""), /Agency/i);
  });

  it("hard-blocks ALX-C000002", async () => {
    const pool = mockPool([
      () => ({
        rows: [baseCustomer({ customer_number: "ALX-C000002", workspace_id: "ws-x" })],
      }),
      () => ({ rows: [{ id: "onb" }] }),
      () => ({ rows: [{ customer_id: customerId }] }),
      () => ({ rows: [] }),
      () => ({ rows: [] }),
      () => ({ rows: [] }),
      () => ({ rows: [] }),
    ]);
    const result = await runCustomerProvisioning(pool, {
      customerId,
      trigger: "operator_retry",
    });
    assert.equal(result.ok, false);
    assert.equal(result.gateReason, "customer_blocked");
  });

  it("is idempotent for terminal invite when workspace already ready", async () => {
    const workspaceId = "ws-isolated";
    const handlers: Handler[] = [
      // load
      () => ({
        rows: [
          baseCustomer({
            workspace_id: workspaceId,
            trillet_status: "ready",
            invite_status: "sent",
            dashboard_email_queued_at: new Date(),
            dashboard_url: "https://app.trillet.ai/login",
          }),
        ],
      }),
      () => ({ rows: [{ id: "onb" }] }),
      () => ({ rows: [{ customer_id: customerId }] }),
      // transaction workspace_mapped + email2
      () => ({ rows: [] }), // BEGIN
      () => ({ rows: [] }), // persist workspace_mapped
      () => ({ rows: [{ id: "email-job" }] }), // queue email
      () => ({ rows: [] }), // update dashboard_email_queued_at
      () => ({ rows: [] }), // persist email2 phase
      () => ({ rows: [] }), // audit
      () => ({ rows: [] }), // COMMIT
      // terminal invite skip persist
      () => ({ rows: [] }), // BEGIN
      () => ({ rows: [] }), // persist invite_terminal
      () => ({ rows: [] }), // COMMIT
      // final
      () => ({ rows: [] }),
      () => ({ rows: [] }),
      () => ({ rows: [] }),
    ];
    const pool = mockPool(handlers);
    const result = await runCustomerProvisioning(pool, {
      customerId,
      trigger: "operator_retry",
      sendTrilletInvite: true,
      env: {
        TRILLET_INVITE_ENABLED: "true",
        ALEXANDER_CUSTOMER_DASHBOARD_URL: "https://app.trillet.ai/login",
        ALEXANDER_CUSTOMER_DASHBOARD_ALLOWED_ORIGINS: "https://app.trillet.ai",
      },
    });
    assert.equal(result.ok, true);
    assert.equal(result.workspaceId, workspaceId);
    assert.ok(result.invite && "ok" in result.invite && result.invite.ok);
    if (result.invite && "ok" in result.invite && result.invite.ok) {
      assert.equal(result.invite.idempotent, true);
      assert.equal(result.invite.inviteStatus, "sent");
    }
  });

  it("exposes actionable nextAction for operators via inspect", async () => {
    const pool = mockPool([
      () => ({
        rows: [
          baseCustomer({
            trillet_status: "workspace_provisioning_blocked",
            provisioning_phase: "workspace_provisioning_blocked",
            provisioning_last_error: "workspace_provisioning_blocked",
          }),
        ],
      }),
      () => ({ rows: [{ id: "onb" }] }),
      () => ({ rows: [{ customer_id: customerId }] }),
    ]);
    const loaded = await loadCustomerProvisioningStatus(pool, { customerId });
    assert.equal(loaded.ok, true);
    if (loaded.ok) {
      assert.equal(loaded.status.agencyContract.agencyParentManagementSupported, false);
      assert.match(loaded.status.nextAction, /markTrilletWorkspaceReady/);
      assert.match(loaded.status.nextAction, /ALX-C000002/);
    }
  });
});
