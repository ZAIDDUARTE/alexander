import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import type { SqlPool } from "../persistence/onboarding-access";
import { handleRequestOperation } from "./store";
import { tokenHash } from "./intake";
import { encryptTokens, decryptTokens, JOBBER_API_VERSION } from "./jobber";
import { loadFreshJobberTokens, disconnectJobberTestAccount } from "./jobber-store";

const tenantA = "00000000-0000-4000-8000-000000000001";
const tenantB = "00000000-0000-4000-8000-000000000002";
const installation = "00000000-0000-4000-8000-000000000003";
const webhookHash = tokenHash("synthetic-webhook-token");
const readerHash = tokenHash("synthetic-reader-token");

async function database() {
  const db = new PGlite();
  await db.exec("CREATE TABLE customers (id uuid PRIMARY KEY); CREATE TABLE schema_migrations(version text PRIMARY KEY);");
  await db.exec(readFileSync(new URL("../../../../infra/sql/010_request_only.sql", import.meta.url), "utf8"));
  await db.query("INSERT INTO customers(id) VALUES ($1), ($2)", [tenantA, tenantB]);
  await db.query(`INSERT INTO request_installations
    (id, customer_id, workspace_id, flow_id, agent_id, timezone, webhook_token_hash, reader_token_hash, enabled, activated_at)
    VALUES ($1, $2, 'workspace-test', 'flow-test', 'agent-test', 'America/Los_Angeles', $3, $4, true, now() - interval '1 hour')`,
  [installation, tenantA, webhookHash, readerHash]);
  const query: SqlPool["query"] = async (sql, values) => {
    const result = await db.query<Record<string, unknown>>(sql, values);
    return { rows: result.rows, rowCount: result.affectedRows ?? result.rows.length };
  };
  return { db, pool: { query, connect: async () => ({ query, release() {} }) } as SqlPool };
}

function call(id: string, outcome = "intake_collected", phone = "+12025550123") {
  return { _id: id, workspaceId: "workspace-test", callFlowId: "flow-test", agentId: "agent-test", status: "completed", endTime: Date.now() / 1000,
    analyzedData: { caller_name: "Avery Fictional", callback_number: phone, service_requested: "Sink repair", problem_description: "Contained leak", property_address_or_city: "Fictional test location", call_outcome: outcome } };
}

test("real local SQL: routine, factual, corrected and duplicate records", async () => {
  const { db, pool } = await database();
  try {
    const ingest = (c: ReturnType<typeof call>) => handleRequestOperation({ operation: "persistVerifiedCall", tokenHash: webhookHash, callId: c._id, call: c }, pool);
    const a = call("local-qa-routine");
    assert.equal((await ingest(a)).ok, true);
    assert.equal((await ingest(call("local-qa-factual", "completed_information_only"))).ok, true);
    assert.equal((await ingest(call("local-qa-corrected", "intake_collected", "+12025550199"))).ok, true);
    assert.equal((await ingest(a)).duplicate, true);
    const rows = await db.query<{ call_id: string; status: string; fields_json: { callback_number: string } }>("SELECT call_id, status, fields_json FROM service_requests ORDER BY call_id");
    assert.equal(rows.rows.length, 2);
    assert.equal(rows.rows.find(r => r.call_id === "local-qa-corrected")?.fields_json.callback_number, "+12025550199");
    assert.ok(rows.rows.every(r => r.status === "Pending Review"));
    assert.equal((await db.query("SELECT * FROM request_call_events")).rows.length, 3);
    const replayChanged = { ...a, analyzedData: { ...a.analyzedData, callback_number: "+12025550188" } };
    assert.equal((await ingest(replayChanged)).needsAttention, true);
    assert.equal((await db.query<{ status: string }>("SELECT status FROM service_requests WHERE call_id = 'local-qa-routine'")).rows[0].status, "Needs Attention");
  } finally { await db.close(); }
});

test("real local SQL: wrong tenant and invalid credentials cannot read or persist", async () => {
  const { db, pool } = await database();
  try {
    const foreign = { ...call("local-qa-foreign"), workspaceId: "foreign" };
    const result = await handleRequestOperation({ operation: "persistVerifiedCall", tokenHash: webhookHash, callId: foreign._id, call: foreign }, pool);
    assert.equal(result.ok, false);
    assert.equal((await db.query("SELECT * FROM request_call_events")).rows.length, 0);
    assert.equal((await handleRequestOperation({ operation: "listServiceRequests", tokenHash: webhookHash }, pool)).ok, false);
    assert.equal((await handleRequestOperation({ operation: "listServiceRequests", tokenHash: readerHash }, pool)).ok, true);
    assert.equal((await handleRequestOperation({ operation: "resolveRequestInstallation", tokenHash: tokenHash("foreign") }, pool)).ok, false);
  } finally { await db.close(); }
});

test("real local SQL: transaction rolls back event if request persistence fails", async () => {
  const { db, pool } = await database();
  try {
    await db.exec("ALTER TABLE service_requests ADD CONSTRAINT fail_fixture CHECK (reason <> 'request_only')");
    const c = call("local-qa-db-failure");
    assert.equal((await handleRequestOperation({ operation: "persistVerifiedCall", tokenHash: webhookHash, callId: c._id, call: c }, pool)).ok, false);
    assert.equal((await db.query("SELECT * FROM request_call_events")).rows.length, 0);
  } finally { await db.close(); }
});

test("real local SQL: token rotation is durable, serialized, and disconnect erases credentials", async () => {
  const { db, pool } = await database();
  try {
    const key = "ab".repeat(32), account = "fictional-jobber-account";
    await db.query(`INSERT INTO jobber_test_connections(customer_id, account_id, account_name, encrypted_tokens, state, api_version, granted_scopes, test_account_verified)
      VALUES ($1, $2, 'Fictional Test Business', $3, 'connected', $4, '[]', true)`,
    [tenantA, account, encryptTokens({ accessToken: "expired", refreshToken: "old-refresh", expiresAt: 0 }, key, tenantA, account), JOBBER_API_VERSION]);
    let requests = 0;
    const fetcher = (async () => { requests++; return Response.json({ access_token: "new-access", refresh_token: "new-refresh", expires_in: 3600, token_type: "Bearer" }); }) as typeof fetch;
    const config = { clientId: "test", clientSecret: "test", callbackUrl: "https://example.com/callback" };
    const results = await Promise.allSettled([
      loadFreshJobberTokens(pool, tenantA, account, key, config, fetcher),
      loadFreshJobberTokens(pool, tenantA, account, key, config, fetcher),
    ]);
    assert.ok(results.some(r => r.status === "fulfilled"));
    assert.equal(requests, 1);
    const row = (await db.query<{ encrypted_tokens: string }>("SELECT encrypted_tokens FROM jobber_test_connections")).rows[0];
    assert.equal(decryptTokens(row.encrypted_tokens, key, tenantA, account).refreshToken, "new-refresh");
    await assert.rejects(loadFreshJobberTokens(pool, tenantB, account, key, config, fetcher), /disconnected/);
    await disconnectJobberTestAccount(pool, tenantA, account);
    await assert.rejects(loadFreshJobberTokens(pool, tenantA, account, key, config, fetcher), /disconnected/);
    assert.equal((await db.query<{ encrypted_tokens: null }>("SELECT encrypted_tokens FROM jobber_test_connections")).rows[0].encrypted_tokens, null);
  } finally { await db.close(); }
});

test("real local SQL: lost refresh response prevents reuse of rotated credentials", async () => {
  const { db, pool } = await database();
  try {
    const key = "ab".repeat(32), account = "fictional-jobber-account";
    await db.query(`INSERT INTO jobber_test_connections(customer_id, account_id, account_name, encrypted_tokens, state, api_version, granted_scopes, test_account_verified)
      VALUES ($1, $2, 'Fictional Test Business', $3, 'connected', $4, '[]', true)`,
    [tenantA, account, encryptTokens({ accessToken: "expired", refreshToken: "old-refresh", expiresAt: 0 }, key, tenantA, account), JOBBER_API_VERSION]);
    const fetcher = (async () => { throw new Error("network_timeout"); }) as typeof fetch;
    await assert.rejects(loadFreshJobberTokens(pool, tenantA, account, key, { clientId: "test", clientSecret: "test", callbackUrl: "https://example.com" }, fetcher), /reauthorization/);
    const row = (await db.query<{ state: string; encrypted_tokens: null }>("SELECT state, encrypted_tokens FROM jobber_test_connections")).rows[0];
    assert.equal(row.state, "needs_reauthorization");
    assert.equal(row.encrypted_tokens, null);
  } finally { await db.close(); }
});
