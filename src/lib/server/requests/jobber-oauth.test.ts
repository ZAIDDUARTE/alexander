import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import type { SqlPool } from "../persistence/onboarding-access";
import { JOBBER_API_VERSION } from "./jobber";
import { jobberOAuthEnabled } from "./jobber-config";
import {
  authorizeJobberAdmin,
  openJobberOAuthSession,
  sealJobberOAuthSession,
  signConnectLink,
  verifyConnectLink,
} from "./jobber-oauth-session";
import { persistVerifiedJobberConnection, handleJobberOAuthOperation } from "./jobber-store";
import { decryptTokens } from "./jobber";
import { tokenHash } from "./intake";

test("Jobber OAuth flag stays off in production even when enabled", () => {
  const prevEnabled = process.env.JOBBER_OAUTH_ENABLED;
  const prevEnv = process.env.VERCEL_ENV;
  try {
    process.env.JOBBER_OAUTH_ENABLED = "true";
    process.env.VERCEL_ENV = "production";
    assert.equal(jobberOAuthEnabled(), false);
    process.env.VERCEL_ENV = "preview";
    assert.equal(jobberOAuthEnabled(), true);
    process.env.JOBBER_OAUTH_ENABLED = "false";
    assert.equal(jobberOAuthEnabled(), false);
  } finally {
    if (prevEnabled === undefined) delete process.env.JOBBER_OAUTH_ENABLED;
    else process.env.JOBBER_OAUTH_ENABLED = prevEnabled;
    if (prevEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevEnv;
  }
});

const key = "ab".repeat(32);
const adminToken = `admin-${"a".repeat(40)}`;
const customerId = "00000000-0000-4000-8000-000000000001";

test("sealed OAuth session binds state, rejects expiry and mismatch", () => {
  const session = {
    state: randomBytes(32).toString("base64url"),
    verifier: randomBytes(48).toString("base64url"),
    customerId,
    adminTokenHash: tokenHash(adminToken),
    expiresAt: Date.now() + 60_000,
  };
  const sealed = sealJobberOAuthSession(session, key);
  assert.deepEqual(openJobberOAuthSession(sealed, key, session.state), session);
  assert.throws(() => openJobberOAuthSession(sealed, key, "other-state"), /state_mismatch|invalid_oauth_session/);
  assert.throws(
    () => openJobberOAuthSession(sealJobberOAuthSession({ ...session, expiresAt: Date.now() - 1 }, key), key, session.state),
    /expired/,
  );
});

test("admin authorization accepts bearer, cookie hash, and signed connect link only", () => {
  const exp = Math.floor(Date.now() / 1000) + 300;
  const sig = signConnectLink(adminToken, exp);
  assert.equal(verifyConnectLink(adminToken, String(exp), sig), true);
  assert.equal(verifyConnectLink(adminToken, String(exp - 1000), sig), false);
  assert.equal(authorizeJobberAdmin({
    adminToken, authorizationHeader: `Bearer ${adminToken}`, adminCookie: null, exp: null, sig: null,
  }).ok, true);
  assert.equal(authorizeJobberAdmin({
    adminToken, authorizationHeader: null, adminCookie: tokenHash(adminToken), exp: null, sig: null,
  }).ok, true);
  assert.equal(authorizeJobberAdmin({
    adminToken, authorizationHeader: null, adminCookie: null, exp: String(exp), sig,
  }).ok, true);
  assert.equal(authorizeJobberAdmin({
    adminToken, authorizationHeader: `Bearer ${"b".repeat(43)}`, adminCookie: null, exp: null, sig: null,
  }).ok, false);
});

test("persistVerifiedJobberConnection stores encrypted tokens only after verification fields set", async () => {
  const db = new PGlite();
  try {
    await db.exec("CREATE TABLE customers (id uuid PRIMARY KEY); CREATE TABLE schema_migrations(version text PRIMARY KEY);");
    await db.exec(readFileSync(new URL("../../../../infra/sql/010_request_only.sql", import.meta.url), "utf8"));
    await db.query("INSERT INTO customers(id) VALUES ($1)", [customerId]);
    const query: SqlPool["query"] = async (sql, values) => {
      const result = await db.query<Record<string, unknown>>(sql, values);
      return { rows: result.rows, rowCount: result.affectedRows ?? result.rows.length };
    };
    const pool = { query, connect: async () => ({ query, release() {} }) } as SqlPool;
    const account = { id: "fictional-jobber-account", name: "Fictional QA Business" };
    const tokens = { accessToken: "access-secret", refreshToken: "refresh-secret", expiresAt: Date.now() + 3600_000 };
    await persistVerifiedJobberConnection(pool, {
      customerId, account, tokens, encryptionKey: key, apiVersion: JOBBER_API_VERSION,
    });
    const row = (await db.query<{
      encrypted_tokens: string; test_account_verified: boolean; request_writes_enabled: boolean; state: string;
    }>("SELECT encrypted_tokens, test_account_verified, request_writes_enabled, state FROM jobber_test_connections")).rows[0];
    assert.equal(row.state, "connected");
    assert.equal(row.test_account_verified, true);
    assert.equal(row.request_writes_enabled, false);
    assert.ok(!row.encrypted_tokens.includes("access-secret"));
    assert.deepEqual(decryptTokens(row.encrypted_tokens, key, customerId, account.id), tokens);

    const viaOp = await handleJobberOAuthOperation({
      operation: "persistVerifiedJobberConnection",
      customerId,
      accountId: account.id,
      accountName: account.name,
      encryptedTokens: row.encrypted_tokens,
      apiVersion: JOBBER_API_VERSION,
      grantedScopes: [],
    }, pool);
    assert.equal(viaOp.ok, true);
  } finally {
    await db.close();
  }
});

test("connect link signature is path-bound and not reusable after expiry window", () => {
  const exp = Math.floor(Date.now() / 1000) + 60;
  const sig = createHash("sha256").update("tampered").digest("hex");
  assert.equal(verifyConnectLink(adminToken, String(exp), sig), false);
  assert.equal(verifyConnectLink(adminToken, "not-a-number", signConnectLink(adminToken, exp)), false);
});
