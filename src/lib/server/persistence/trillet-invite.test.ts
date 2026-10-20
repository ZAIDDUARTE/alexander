import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SqlClient, SqlPool } from "./onboarding-access";
import {
  TRILLET_INVITE_BLOCKED_CUSTOMER_NUMBERS,
  TRILLET_INVITE_PATH,
  buildInviteIdempotencyKey,
  classifyTrilletInviteResponse,
  inviteCustomerToTrilletWorkspace,
  loadInviteEligibility,
  parseInviteRole,
  resolveCustomerInviteRole,
  type TrilletFetchResult,
  type TrilletInviteFetch,
} from "./trillet-invite";

type Row = Record<string, unknown>;

function mockPool(
  handlers: Array<(text: string, values?: unknown[]) => { rows: Row[] }>,
  options: { autoClaim?: boolean } = {},
): SqlPool {
  let call = 0;
  const safeQuery = async (text: string, values?: unknown[]) => {
    if (
      options.autoClaim !== false &&
      text.includes("RETURNING customer_id") &&
      text.includes("invite_status = 'pending'")
    ) {
      return {
        rows: [{ customer_id: "11111111-1111-1111-1111-111111111111" }],
        rowCount: 1,
      };
    }
    const handler = handlers[call++];
    if (!handler) throw new Error(`unexpected query #${call}: ${text.slice(0, 120)}`);
    const result = handler(text, values);
    return { rows: result.rows, rowCount: result.rows.length };
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

describe("trillet-invite helpers", () => {
  it("uses documented invite path and least-privileged default role", () => {
    assert.equal(
      TRILLET_INVITE_PATH("ws_abc"),
      "https://api.trillet.ai/v1/api/workspaces/ws_abc/invite",
    );
    assert.equal(resolveCustomerInviteRole({}), "viewer");
    assert.equal(resolveCustomerInviteRole({ TRILLET_CUSTOMER_INVITE_ROLE: "editor" }), "editor");
    assert.equal(parseInviteRole("admin"), "admin");
    assert.equal(parseInviteRole("owner"), null);
    assert.ok(TRILLET_INVITE_BLOCKED_CUSTOMER_NUMBERS.has("ALX-C000002"));
  });

  it("builds stable idempotency keys", () => {
    assert.equal(
      buildInviteIdempotencyKey("c1", "w1", "A@Example.com"),
      "trillet_invite:c1:w1:a@example.com",
    );
  });

  it("classifies Trillet invite responses", () => {
    assert.equal(
      classifyTrilletInviteResponse(200, { success: true, message: "Invitation sent" }, "").inviteStatus,
      "sent",
    );
    assert.equal(
      classifyTrilletInviteResponse(409, { message: "Already invited" }, "").inviteStatus,
      "already_invited",
    );
    assert.equal(
      classifyTrilletInviteResponse(409, { message: "User is already a member" }, "").inviteStatus,
      "already_member",
    );
    assert.equal(
      classifyTrilletInviteResponse(500, { error: "boom" }, "").inviteStatus,
      "uncertain",
    );
    assert.equal(
      classifyTrilletInviteResponse(403, { message: "Only owners can invite" }, "").inviteStatus,
      "failed",
    );
    assert.equal(classifyTrilletInviteResponse(0, null, "timeout").inviteStatus, "uncertain");
  });
});

describe("trillet-invite eligibility", () => {
  it("rejects invalid customer state", async () => {
    const pool = mockPool([
      () => ({
        rows: [
          {
            id: "11111111-1111-1111-1111-111111111111",
            customer_number: "ALX-C000001",
            status: "inactive",
            data_classification: "synthetic_test",
            primary_email: "qa@example.com",
            portal_admin_email: "qa@example.com",
            portal_admin_status: "confirmed",
            payment_verified_at: new Date(),
          },
        ],
      }),
    ]);
    const result = await loadInviteEligibility(
      pool,
      { customerNumber: "ALX-C000001" },
      { TRILLET_INVITE_ALLOWED_CUSTOMER_NUMBERS: "ALX-C000001" },
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "customer_inactive");
  });

  it("blocks ALX-C000002", async () => {
    const pool = mockPool([
      () => ({
        rows: [
          {
            id: "22222222-2222-2222-2222-222222222222",
            customer_number: "ALX-C000002",
            status: "active",
            data_classification: "real_customer",
            primary_email: "phillip@example.com",
            portal_admin_email: "phillip@example.com",
            portal_admin_status: "confirmed",
            payment_verified_at: new Date(),
          },
        ],
      }),
    ]);
    const result = await loadInviteEligibility(pool, { customerNumber: "ALX-C000002" }, {});
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "customer_blocked");
  });

  it("rejects missing workspace mapping", async () => {
    const customerId = "11111111-1111-1111-1111-111111111111";
    const pool = mockPool([
      () => ({
        rows: [
          {
            id: customerId,
            customer_number: "ALX-C000001",
            status: "active",
            data_classification: "synthetic_test",
            primary_email: "qa@example.com",
            portal_admin_email: "qa@example.com",
            portal_admin_status: "confirmed",
            payment_verified_at: new Date(),
          },
        ],
      }),
      () => ({ rows: [{ id: "onboarding" }] }),
      () => ({ rows: [{ customer_id: customerId }] }),
      () => ({ rows: [{ workspace_id: null, agent_id: null, status: "ready", invite_status: null, invite_idempotency_key: null }] }),
    ]);
    const result = await loadInviteEligibility(
      pool,
      { customerNumber: "ALX-C000001" },
      { TRILLET_INVITE_ALLOWED_CUSTOMER_NUMBERS: "ALX-C000001" },
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "workspace_not_mapped");
  });

  it("rejects unauthorized workspace", async () => {
    const customerId = "11111111-1111-1111-1111-111111111111";
    const pool = mockPool([
      () => ({
        rows: [
          {
            id: customerId,
            customer_number: "ALX-C000001",
            status: "active",
            data_classification: "synthetic_test",
            primary_email: "qa@example.com",
            portal_admin_email: "qa@example.com",
            portal_admin_status: "confirmed",
            payment_verified_at: new Date(),
          },
        ],
      }),
      () => ({ rows: [{ id: "onboarding" }] }),
      () => ({ rows: [{ customer_id: customerId }] }),
      () => ({
        rows: [
          {
            workspace_id: "ws-phillip",
            agent_id: "ag-1",
            status: "ready",
            invite_status: null,
            invite_idempotency_key: null,
          },
        ],
      }),
    ]);
    const result = await loadInviteEligibility(
      pool,
      { customerNumber: "ALX-C000001" },
      {
        TRILLET_INVITE_ALLOWED_CUSTOMER_NUMBERS: "ALX-C000001",
        STAGING_TRILLET_WORKSPACE_ID: "ws-sandbox",
      },
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "workspace_not_authorized");
  });
});

function eligibleHandlers(workspaceId = "ws-sandbox"): Array<(text: string, values?: unknown[]) => { rows: Row[] }> {
  const customerId = "11111111-1111-1111-1111-111111111111";
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

describe("trillet-invite orchestration", () => {
  const envBase = {
    TRILLET_INVITE_ENABLED: "true",
    TRILLET_INVITE_LIVE_ENABLED: "false",
    TRILLET_INVITE_ALLOWED_CUSTOMER_NUMBERS: "ALX-C000001",
    STAGING_TRILLET_WORKSPACE_ID: "ws-sandbox",
    TRILLET_API_KEY: "test-key",
  };

  it("valid invitation dry-run does not call Trillet", async () => {
    let fetchCalls = 0;
    const fetchImpl: TrilletInviteFetch = async () => {
      fetchCalls += 1;
      return { ok: true, status: 200, body: {}, text: "" };
    };
    // eligibility queries + transaction BEGIN/UPDATE/COMMIT
    const pool = mockPool([
      ...eligibleHandlers(),
      () => ({ rows: [] }), // BEGIN
      () => ({ rows: [] }), // UPDATE
      () => ({ rows: [] }), // COMMIT
    ]);
    const result = await inviteCustomerToTrilletWorkspace(pool, {
      customerNumber: "ALX-C000001",
      live: false,
      fetchImpl,
      env: envBase,
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.mode, "dry_run");
      assert.equal(result.role, "viewer");
      assert.equal(result.inviteStatus, "dry_run");
    }
    assert.equal(fetchCalls, 0);
  });

  it("duplicate terminal invite is idempotent", async () => {
    const customerId = "11111111-1111-1111-1111-111111111111";
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
            portal_admin_status: "email_verified",
            payment_verified_at: new Date(),
          },
        ],
      }),
      () => ({ rows: [{ id: "onboarding" }] }),
      () => ({ rows: [{ customer_id: customerId }] }),
      () => ({
        rows: [
          {
            workspace_id: "ws-sandbox",
            agent_id: "ag-1",
            status: "invitation_created",
            invite_status: "sent",
            invite_idempotency_key: "trillet_invite:x",
          },
        ],
      }),
    ]);
    let fetchCalls = 0;
    const result = await inviteCustomerToTrilletWorkspace(pool, {
      customerNumber: "ALX-C000001",
      live: true,
      fetchImpl: async () => {
        fetchCalls += 1;
        return { ok: true, status: 200, body: { success: true }, text: "" };
      },
      env: { ...envBase, TRILLET_INVITE_LIVE_ENABLED: "true" },
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.idempotent, true);
      assert.equal(result.inviteStatus, "sent");
    }
    assert.equal(fetchCalls, 0);
  });

  it("refuses live send when live flag disabled", async () => {
    const pool = mockPool(eligibleHandlers());
    const result = await inviteCustomerToTrilletWorkspace(pool, {
      customerNumber: "ALX-C000001",
      live: true,
      env: envBase,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "invite_live_disabled");
  });

  it("sends valid live invitation with required headers", async () => {
    const calls: Array<{ url: string; headers: Record<string, string>; body: unknown }> = [];
    const fetchImpl: TrilletInviteFetch = async (_method, url, headers, body) => {
      calls.push({ url, headers, body });
      return {
        ok: true,
        status: 200,
        body: { success: true, message: "Invitation sent" },
        text: '{"success":true}',
      } satisfies TrilletFetchResult;
    };
    const pool = mockPool([
      ...eligibleHandlers(),
      () => ({ rows: [] }), // BEGIN pending
      () => ({ rows: [] }), // UPDATE pending
      () => ({ rows: [] }), // COMMIT pending
      () => ({ rows: [] }), // BEGIN final
      () => ({ rows: [] }), // UPDATE final
      () => ({ rows: [{ id: "33333333-3333-3333-3333-333333333333" }] }), // lifecycle
      () => ({ rows: [] }), // COMMIT final
    ]);
    const result = await inviteCustomerToTrilletWorkspace(pool, {
      customerNumber: "ALX-C000001",
      live: true,
      fetchImpl,
      env: { ...envBase, TRILLET_INVITE_LIVE_ENABLED: "true" },
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.mode, "live");
      assert.equal(result.inviteStatus, "sent");
      assert.equal(result.role, "viewer");
    }
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://api.trillet.ai/v1/api/workspaces/ws-sandbox/invite");
    assert.equal(calls[0].headers["x-api-key"], "test-key");
    assert.equal(calls[0].headers["x-workspace-id"], "ws-sandbox");
    assert.deepEqual(calls[0].body, { email: "qa+sandbox@example.com", role: "viewer" });
  });

  it("treats already invited as success without failure", async () => {
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
    const result = await inviteCustomerToTrilletWorkspace(pool, {
      customerNumber: "ALX-C000001",
      live: true,
      fetchImpl: async () => ({
        ok: false,
        status: 409,
        body: { message: "Pending invitation already exists" },
        text: "Pending invitation already exists",
      }),
      env: { ...envBase, TRILLET_INVITE_LIVE_ENABLED: "true" },
    });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.inviteStatus, "already_invited");
  });

  it("marks Trillet 5xx as uncertain for retry", async () => {
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
    const result = await inviteCustomerToTrilletWorkspace(pool, {
      customerNumber: "ALX-C000001",
      live: true,
      fetchImpl: async () => ({
        ok: false,
        status: 503,
        body: { error: "unavailable" },
        text: "unavailable",
      }),
      env: { ...envBase, TRILLET_INVITE_LIVE_ENABLED: "true" },
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.reason, "trillet_api_error");
      assert.equal(result.inviteStatus, "uncertain");
    }
  });

  it("rejects unauthorized tenant when allowlist excludes customer", async () => {
    const pool = mockPool([
      () => ({
        rows: [
          {
            id: "11111111-1111-1111-1111-111111111111",
            customer_number: "ALX-C000001",
            status: "active",
            data_classification: "synthetic_test",
            primary_email: "qa@example.com",
            portal_admin_email: "qa@example.com",
            portal_admin_status: "confirmed",
            payment_verified_at: new Date(),
          },
        ],
      }),
    ]);
    const result = await inviteCustomerToTrilletWorkspace(pool, {
      customerNumber: "ALX-C000001",
      live: false,
      env: {
        ...envBase,
        TRILLET_INVITE_ALLOWED_CUSTOMER_NUMBERS: "ALX-C009999",
      },
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "customer_blocked");
  });

  it("blocks invite when portal admin is not confirmed", async () => {
    const pool = mockPool([
      () => ({
        rows: [
          {
            id: "11111111-1111-1111-1111-111111111111",
            customer_number: "ALX-C000001",
            status: "active",
            data_classification: "synthetic_test",
            primary_email: "billing@example.com",
            portal_admin_email: null,
            portal_admin_status: "review_required",
            payment_verified_at: new Date(),
          },
        ],
      }),
    ]);
    const result = await loadInviteEligibility(
      pool,
      { customerNumber: "ALX-C000001" },
      { TRILLET_INVITE_ALLOWED_CUSTOMER_NUMBERS: "ALX-C000001" },
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "portal_admin_not_confirmed");
  });

  it("fails closed without API key on live send", async () => {
    const pool = mockPool(eligibleHandlers());
    const result = await inviteCustomerToTrilletWorkspace(pool, {
      customerNumber: "ALX-C000001",
      live: true,
      env: {
        ...envBase,
        TRILLET_INVITE_LIVE_ENABLED: "true",
        TRILLET_API_KEY: "",
      },
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "missing_api_key");
  });

  it("marks HTTP 403 as failed", async () => {
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
    const result = await inviteCustomerToTrilletWorkspace(pool, {
      customerNumber: "ALX-C000001",
      live: true,
      fetchImpl: async () => ({
        ok: false,
        status: 403,
        body: { error: "forbidden" },
        text: "forbidden",
      }),
      env: { ...envBase, TRILLET_INVITE_LIVE_ENABLED: "true" },
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.inviteStatus, "failed");
  });

  it("marks HTTP 429 as uncertain", async () => {
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
    const result = await inviteCustomerToTrilletWorkspace(pool, {
      customerNumber: "ALX-C000001",
      live: true,
      fetchImpl: async () => ({
        ok: false,
        status: 429,
        body: { error: "rate_limited" },
        text: "rate_limited",
      }),
      env: { ...envBase, TRILLET_INVITE_LIVE_ENABLED: "true" },
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.inviteStatus, "uncertain");
  });

  it("marks network timeout as uncertain", async () => {
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
    const result = await inviteCustomerToTrilletWorkspace(pool, {
      customerNumber: "ALX-C000001",
      live: true,
      fetchImpl: async () => ({
        ok: false,
        status: 0,
        body: { error: "AbortError" },
        text: "AbortError",
      }),
      env: { ...envBase, TRILLET_INVITE_LIVE_ENABLED: "true" },
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.inviteStatus, "uncertain");
  });

  it("suppresses a second live invite while one is in flight", async () => {
    let fetches = 0;
    const pool = mockPool(
      [
        ...eligibleHandlers(),
        () => ({ rows: [] }),
      ],
      { autoClaim: false },
    );
    const result = await inviteCustomerToTrilletWorkspace(pool, {
      customerNumber: "ALX-C000001",
      live: true,
      fetchImpl: async () => {
        fetches += 1;
        return { ok: true, status: 200, body: { success: true }, text: "" };
      },
      env: { ...envBase, TRILLET_INVITE_LIVE_ENABLED: "true" },
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.idempotent, true);
      assert.equal(result.message, "concurrent_or_in_flight_invite_suppressed");
    }
    assert.equal(fetches, 0);
  });

  it("rejects unauthorized role escalation to admin", async () => {
    const pool = mockPool(eligibleHandlers());
    const result = await inviteCustomerToTrilletWorkspace(pool, {
      customerNumber: "ALX-C000001",
      live: false,
      role: "admin",
      env: { ...envBase, TRILLET_CUSTOMER_INVITE_ROLE: "viewer" },
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "invalid_role");
  });
});
