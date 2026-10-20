import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { bearerToken, classifyIntake, normalizeIntake, verifyCall, type Binding } from "./intake";
import { beginJobberOAuth, decryptTokens, encryptTokens, parseJobberResult, verifyJobberHmac, JOBBER_API_VERSION, createJobberTestRequest } from "./jobber";
import { checkTestCalendar } from "./google-calendar";

const now = Date.now();
const binding: Binding = { id: "binding", customerId: "tenant-a", workspaceId: "workspace-a", flowId: "flow-a", agentId: "agent-a", timezone: "America/Los_Angeles", activatedAt: new Date(now - 3600_000).toISOString() };
const fields = { caller_name: "Avery Test", callback_number: "+12025550123", service_requested: "Sink repair", problem_description: "Contained sink leak", property_address_or_city: "Fictional test property", call_outcome: "intake_collected" };
const call = { _id: "call-test-001", workspaceId: binding.workspaceId, callFlowId: binding.flowId, agentId: binding.agentId, status: "completed", endTime: now / 1000, analyzedData: fields };

test("routine intake stays pending and contains exactly the 13 observed fields", () => {
  const result = verifyCall(call, call._id, binding, now);
  assert.equal(result.create, true);
  assert.equal(result.status, "Pending Review");
  assert.equal(Object.keys(result.fields).length, 13);
});
test("factual call cannot create a request even with contact/service fields", () => {
  assert.equal(classifyIntake(normalizeIntake({ ...fields, call_outcome: "completed_information_only" })).create, false);
});
test("ambiguous follow-up is held for review, not converted to service intent", () => {
  assert.equal(classifyIntake(normalizeIntake({ ...fields, call_outcome: "human_follow_up_needed", human_follow_up_required: true })).create, false);
});
test("missing details preserve intent but require attention", () => {
  assert.equal(classifyIntake(normalizeIntake({ ...fields, callback_number: null })).status, "Needs Attention");
});
test("final corrected contact fields are retained without falling back to caller ID", () => {
  const verified = verifyCall({ ...call, fromPhoneNumber: "+12025550111", analyzedData: { ...fields, callback_number: "+12025550199" } }, call._id, binding, now);
  assert.equal(verified.fields.callback_number, "+12025550199");
});
test("foreign tenant, flow, agent and call identity each fail closed", () => {
  for (const key of ["workspaceId", "callFlowId", "agentId", "_id"]) assert.throws(() => verifyCall({ ...call, [key]: "foreign" }, call._id, binding, now), /binding_mismatch/);
});
test("ongoing, stale, future and preactivation calls are rejected", () => {
  assert.throws(() => verifyCall({ ...call, status: "ongoing" }, call._id, binding, now));
  for (const endTime of [(now - 86401_000) / 1000, (now + 120_000) / 1000, (now - 7200_000) / 1000]) assert.throws(() => verifyCall({ ...call, endTime }, call._id, binding, now), /ingestion_window/);
});
test("untrusted nested values and oversized extraction are rejected", () => {
  assert.throws(() => normalizeIntake({ ...fields, caller_name: { value: "foreign" } }));
  assert.throws(() => normalizeIntake({ ...fields, call_summary: "x".repeat(8001) }));
});
test("bearer credentials require high entropy token format", () => {
  assert.throws(() => bearerToken("Bearer short"));
  assert.equal(bearerToken(`Bearer ${"a".repeat(43)}`), "a".repeat(43));
});
test("encrypted tokens authenticate tenant and account and detect tampering", () => {
  const tokens = { accessToken: "test-access", refreshToken: "test-refresh", expiresAt: now };
  const key = "ab".repeat(32);
  const encrypted = encryptTokens(tokens, key, "tenant-a", "account-a");
  assert.ok(!encrypted.includes("test-access"));
  assert.deepEqual(decryptTokens(encrypted, key, "tenant-a", "account-a"), tokens);
  assert.throws(() => decryptTokens(encrypted, key, "tenant-b", "account-a"));
  assert.throws(() => decryptTokens(encrypted, key, "tenant-a", "account-b"));
  assert.throws(() => decryptTokens(encrypted, "cd".repeat(32), "tenant-a", "account-a"));
});
test("OAuth uses independent expiring states, PKCE S256 and exact HTTPS callback", () => {
  const config = { clientId: "test", clientSecret: "test", callbackUrl: "https://preview.example.com/api/integrations/jobber/callback" };
  const a = beginJobberOAuth(config), b = beginJobberOAuth(config);
  const url = new URL(a.url);
  assert.notEqual(a.state, b.state);
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.get("redirect_uri"), config.callbackUrl);
  assert.ok(!url.searchParams.has("client_secret"));
  assert.throws(() => beginJobberOAuth({ ...config, callbackUrl: "http://preview.example.com" }));
});
test("HTTP 200 GraphQL errors, userErrors and version drift do not report success", () => {
  const base = { data: { account: { id: "a", name: "Fictional business" } }, extensions: { versioning: { version: JOBBER_API_VERSION } } };
  assert.deepEqual(parseJobberResult(base), base.data);
  assert.throws(() => parseJobberResult({ ...base, errors: [{ message: "denied" }] }), /graphql_error/);
  assert.throws(() => parseJobberResult({ ...base, data: { requestCreate: { userErrors: [{ message: "invalid" }] } } }), /user_errors/);
  assert.throws(() => parseJobberResult({ ...base, extensions: { versioning: { version: "future-version" } } }), /version_unverified/);
  assert.throws(() => parseJobberResult({ ...base, extensions: { versioning: { version: JOBBER_API_VERSION, warning: "unsupported" } } }), /version_unverified/);
});
test("Jobber webhook signature authenticates exact raw bytes", () => {
  const raw = Buffer.from('{"data":{"test":true}}');
  const signature = createHmac("sha256", "test-secret").update(raw).digest("base64");
  assert.equal(verifyJobberHmac(raw, signature, "test-secret"), true);
  assert.equal(verifyJobberHmac(Buffer.from("{}"), signature, "test-secret"), false);
  assert.equal(verifyJobberHmac(raw, "invalid", "test-secret"), false);
});
test("unverified Jobber request mutation cannot execute", () => { assert.throws(createJobberTestRequest, /schema_not_verified/); });
test("unavailable calendar is unknown rather than an open slot", async () => {
  const fakeFetch = (async () => new Response("{}", { status: 404 })) as typeof fetch;
  await assert.rejects(checkTestCalendar("test-token", "test-calendar", "2026-10-15T10:00:00-07:00", "2026-10-15T11:00:00-07:00", fakeFetch), /calendar_unavailable/);
});
test("per-calendar freebusy error cannot masquerade as empty availability", async () => {
  let i = 0;
  const fakeFetch = (async () => Response.json(i++ === 0 ? { id: "test-calendar", timeZone: "America/Los_Angeles" } : { calendars: { "test-calendar": { busy: [], errors: [{ reason: "notFound" }] } } })) as typeof fetch;
  await assert.rejects(checkTestCalendar("test-token", "test-calendar", "2026-10-15T10:00:00-07:00", "2026-10-15T11:00:00-07:00", fakeFetch), /availability_unknown/);
});
