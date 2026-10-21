import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyTrilletInviteResponse,
  inviteCustomerToTrilletWorkspace,
  type TrilletInviteFetch,
} from "./trillet-invite";
import { validateCustomerDashboardUrl } from "./dashboard-url";

type Handler = () => { rows: Array<Record<string, unknown>> };
function mockPool(handlers: Handler[]) {
  let i = 0;
  const query = async (text?: string) => {
    if (
      typeof text === "string" &&
      text.includes("RETURNING customer_id") &&
      text.includes("invite_status = 'pending'")
    ) {
      return { rows: [{ customer_id: customerId }], rowCount: 1 };
    }
    const h = handlers[i++];
    if (!h) return { rows: [] };
    return h();
  };
  return {
    query,
    connect: async () => ({
      query,
      release: () => undefined,
    }),
  } as unknown as import("./onboarding-access").SqlPool;
}

const customerId = "11111111-1111-1111-1111-111111111111";
const workspaceId = "ws-sandbox";

function eligibleHandlers(): Handler[] {
  return [
    () => ({
      rows: [
        {
          id: customerId,
          customer_number: "ALX-C000001",
          status: "active",
          data_classification: "synthetic_test",
          primary_email: "billing@example.com",
          portal_admin_email: "qa+sandbox@example.com",
          portal_admin_status: "confirmed",
          payment_verified_at: new Date(),
          stripe_subscription_status: "active",
          stripe_livemode: false,
        },
      ],
    }),
    () => ({ rows: [{ id: "onboarding" }] }),
    () => ({ rows: [{ customer_id: customerId }] }),
    () => ({
      rows: [
        {
          workspace_id: workspaceId,
          agent_id: "ag-1",
          status: "ready",
          invite_status: null,
          invite_idempotency_key: null,
        },
      ],
    }),
  ];
}

describe("invitation vs Email #2 separation", () => {
  it("marks Trillet invite accepted without treating it as account activation", () => {
    const classified = classifyTrilletInviteResponse(
      200,
      { success: true, message: "Invitation sent" },
      "Invitation sent",
    );
    assert.equal(classified.success, true);
    assert.equal(classified.inviteStatus, "sent");
    // Lifecycle status "invitation_created" / invite_status "sent" ≠ activated login.
    assert.notEqual(classified.inviteStatus, "activated" as string);
  });

  it("blocks Email #2 when dashboard destination is unavailable", () => {
    const result = validateCustomerDashboardUrl("https://evil.example/phish", {
      ALEXANDER_CUSTOMER_DASHBOARD_URL: "https://app.trillet.ai/login",
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "origin_not_allowlisted");
  });

  it("retries uncertain Trillet outcomes without claiming activation", async () => {
    const pool = mockPool([
      ...eligibleHandlers(),
      () => ({ rows: [] }),
      () => ({ rows: [] }),
      () => ({ rows: [] }),
      () => ({ rows: [] }),
      () => ({ rows: [] }),
      () => ({ rows: [{ id: "33333333-3333-3333-3333-333333333333" }] }),
      () => ({ rows: [] }),
    ]);
    const fetchImpl: TrilletInviteFetch = async () => ({
      ok: false,
      status: 500,
      body: { error: "upstream" },
      text: "upstream",
    });
    const result = await inviteCustomerToTrilletWorkspace(pool, {
      customerNumber: "ALX-C000001",
      live: true,
      fetchImpl,
      env: {
        TRILLET_INVITE_ENABLED: "true",
        TRILLET_INVITE_LIVE_ENABLED: "true",
        TRILLET_INVITE_ALLOWED_CUSTOMER_NUMBERS: "ALX-C000001",
        STAGING_TRILLET_WORKSPACE_ID: workspaceId,
        TRILLET_API_KEY: "test-key",
      },
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.inviteStatus, "uncertain");
      assert.notEqual(result.inviteStatus, "sent");
    }
  });

  it("does not re-send when invite already terminal", async () => {
    let fetches = 0;
    const pool = mockPool([
      () => ({
        rows: [
          {
            id: customerId,
            customer_number: "ALX-C000001",
            status: "active",
            data_classification: "synthetic_test",
            primary_email: "billing@example.com",
            portal_admin_email: "qa+sandbox@example.com",
            portal_admin_status: "confirmed",
            payment_verified_at: new Date(),
            stripe_subscription_status: "active",
            stripe_livemode: false,
          },
        ],
      }),
      () => ({ rows: [{ id: "onboarding" }] }),
      () => ({ rows: [{ customer_id: customerId }] }),
      () => ({
        rows: [
          {
            workspace_id: workspaceId,
            agent_id: "ag-1",
            status: "invitation_created",
            invite_status: "sent",
            invite_idempotency_key: "trillet_invite:x",
          },
        ],
      }),
    ]);
    const result = await inviteCustomerToTrilletWorkspace(pool, {
      customerNumber: "ALX-C000001",
      live: true,
      fetchImpl: async () => {
        fetches += 1;
        return { ok: true, status: 200, body: { success: true }, text: "" };
      },
      env: {
        TRILLET_INVITE_ENABLED: "true",
        TRILLET_INVITE_LIVE_ENABLED: "true",
        TRILLET_INVITE_ALLOWED_CUSTOMER_NUMBERS: "ALX-C000001",
        STAGING_TRILLET_WORKSPACE_ID: workspaceId,
        TRILLET_API_KEY: "test-key",
      },
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.idempotent, true);
      assert.equal(result.inviteStatus, "sent");
    }
    assert.equal(fetches, 0);
  });
});
