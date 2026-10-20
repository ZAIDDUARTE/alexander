import type { SqlPool } from "../persistence/onboarding-access";
import {
  decryptTokens,
  encryptTokens,
  refreshJobberTokens,
  type JobberAccount,
  type JobberConfig,
  type JobberTokens,
} from "./jobber";

export type PersistVerifiedJobberConnectionInput = {
  customerId: string;
  account: JobberAccount;
  tokens: JobberTokens;
  encryptionKey: string;
  apiVersion: string;
  grantedScopes?: unknown[];
};

export async function persistVerifiedJobberConnection(
  pool: SqlPool,
  input: PersistVerifiedJobberConnectionInput,
): Promise<{ ok: true }> {
  const { customerId, account, tokens, encryptionKey, apiVersion } = input;
  if (!/^[0-9a-f-]{36}$/i.test(customerId)) throw new Error("invalid_customer_id");
  if (!account.id || !account.name) throw new Error("jobber_identity_missing");
  const encrypted = encryptTokens(tokens, encryptionKey, customerId, account.id);
  const scopes = JSON.stringify(input.grantedScopes ?? []);
  await pool.query(
    `INSERT INTO jobber_test_connections (
       customer_id, account_id, account_name, encrypted_tokens, state, api_version,
       granted_scopes, test_account_verified, request_writes_enabled, revision, updated_at
     ) VALUES ($1, $2, $3, $4, 'connected', $5, $6::jsonb, true, false, 1, now())
     ON CONFLICT (customer_id) DO UPDATE SET
       account_id = EXCLUDED.account_id,
       account_name = EXCLUDED.account_name,
       encrypted_tokens = EXCLUDED.encrypted_tokens,
       state = 'connected',
       api_version = EXCLUDED.api_version,
       granted_scopes = EXCLUDED.granted_scopes,
       test_account_verified = true,
       request_writes_enabled = false,
       revision = jobber_test_connections.revision + 1,
       updated_at = now()`,
    [customerId, account.id, account.name, encrypted, apiVersion, scopes],
  );
  return { ok: true };
}

export async function inspectJobberTestConnection(pool: SqlPool, customerId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(customerId)) return { ok: false as const, reason: "invalid_customer_id" };
  const found = await pool.query(
    `SELECT customer_id, account_id, account_name, state, api_version, test_account_verified,
            request_writes_enabled, revision, updated_at, encrypted_tokens
     FROM jobber_test_connections WHERE customer_id = $1`,
    [customerId],
  );
  const row = found.rows[0];
  if (!row) return { ok: false as const, reason: "not_found" };
  return {
    ok: true as const,
    customerId: String(row.customer_id),
    accountId: String(row.account_id),
    accountName: String(row.account_name),
    state: String(row.state),
    apiVersion: String(row.api_version),
    testAccountVerified: row.test_account_verified === true,
    requestWritesEnabled: row.request_writes_enabled === true,
    revision: Number(row.revision),
    updatedAt: row.updated_at ? new Date(String(row.updated_at)).toISOString() : null,
    hasEncryptedTokens: typeof row.encrypted_tokens === "string" && row.encrypted_tokens.length > 0,
    encryptedTokens: typeof row.encrypted_tokens === "string" ? row.encrypted_tokens : null,
  };
}

export async function handleJobberOAuthOperation(event: Record<string, unknown>, pool: SqlPool) {
  if (event.operation === "inspectJobberTestConnection") {
    const customerId = event.customerId;
    if (typeof customerId !== "string") return { ok: false, reason: "invalid_customer_id" };
    return inspectJobberTestConnection(pool, customerId);
  }
  if (event.operation === "disconnectJobberTestConnection") {
    const customerId = event.customerId;
    const accountId = event.accountId;
    if (typeof customerId !== "string" || typeof accountId !== "string" ||
        !/^[0-9a-f-]{36}$/i.test(customerId) || !accountId) {
      return { ok: false, reason: "invalid_connection_payload" };
    }
    await disconnectJobberTestAccount(pool, customerId, accountId);
    return { ok: true, disconnected: true };
  }
  if (event.operation === "persistVerifiedJobberConnection") {
    const customerId = event.customerId;
    const accountId = event.accountId;
    const accountName = event.accountName;
    const encryptedTokens = event.encryptedTokens;
    const apiVersion = event.apiVersion;
    const grantedScopes = event.grantedScopes;
    if (typeof customerId !== "string" || typeof accountId !== "string" || typeof accountName !== "string" ||
        typeof encryptedTokens !== "string" || typeof apiVersion !== "string") {
      return { ok: false, reason: "invalid_connection_payload" };
    }
    if (!/^[0-9a-f-]{36}$/i.test(customerId) || !accountId || !accountName || !encryptedTokens) {
      return { ok: false, reason: "invalid_connection_payload" };
    }
    await pool.query(
      `INSERT INTO jobber_test_connections (
         customer_id, account_id, account_name, encrypted_tokens, state, api_version,
         granted_scopes, test_account_verified, request_writes_enabled, revision, updated_at
       ) VALUES ($1, $2, $3, $4, 'connected', $5, $6::jsonb, true, false, 1, now())
       ON CONFLICT (customer_id) DO UPDATE SET
         account_id = EXCLUDED.account_id,
         account_name = EXCLUDED.account_name,
         encrypted_tokens = EXCLUDED.encrypted_tokens,
         state = 'connected',
         api_version = EXCLUDED.api_version,
         granted_scopes = EXCLUDED.granted_scopes,
         test_account_verified = true,
         request_writes_enabled = false,
         revision = jobber_test_connections.revision + 1,
         updated_at = now()`,
      [customerId, accountId, accountName, encryptedTokens, apiVersion, JSON.stringify(grantedScopes ?? [])],
    );
    return { ok: true, accountId, accountName };
  }
  return { ok: false, reason: "invalid_operation" };
}

// Invoke from an authenticated server worker with a server-derived customer/account binding.
export async function loadFreshJobberTokens(pool: SqlPool, customerId: string, accountId: string, key: string, config: JobberConfig, fetcher = fetch): Promise<JobberTokens> {
  const found = await pool.query("SELECT * FROM jobber_test_connections WHERE customer_id = $1 AND account_id = $2 AND test_account_verified = true", [customerId, accountId]);
  const row = found.rows[0];
  if (!row || row.state !== "connected" || typeof row.encrypted_tokens !== "string") throw new Error("jobber_disconnected");
  const tokens = decryptTokens(row.encrypted_tokens, key, customerId, accountId);
  if (tokens.expiresAt > Date.now() + 60_000) return tokens;
  // Commit the claim BEFORE using the rotating refresh token. A crash leaves it blocked,
  // never reusable by a second worker. Reauthorization resolves abandoned claims.
  const claim = await pool.query(
    `UPDATE jobber_test_connections SET state = 'refreshing', revision = revision + 1, updated_at = now()
     WHERE customer_id = $1 AND account_id = $2 AND revision = $3 AND state = 'connected'
     RETURNING revision`, [customerId, accountId, row.revision]);
  if (!claim.rowCount) throw new Error("jobber_refresh_in_progress");
  const revision = claim.rows[0].revision;
  try {
    const fresh = await refreshJobberTokens(config, tokens.refreshToken, fetcher);
    const encrypted = encryptTokens(fresh, key, customerId, accountId);
    const saved = await pool.query(
      `UPDATE jobber_test_connections SET encrypted_tokens = $4, state = 'connected', revision = revision + 1, updated_at = now()
       WHERE customer_id = $1 AND account_id = $2 AND revision = $3 AND state = 'refreshing' RETURNING revision`,
      [customerId, accountId, revision, encrypted]);
    if (!saved.rowCount) throw new Error("jobber_connection_changed");
    return fresh;
  } catch {
    await pool.query(
      `UPDATE jobber_test_connections SET state = 'needs_reauthorization', encrypted_tokens = NULL, request_writes_enabled = false, updated_at = now()
       WHERE customer_id = $1 AND account_id = $2 AND revision = $3 AND state = 'refreshing'`, [customerId, accountId, revision]);
    throw new Error("jobber_reauthorization_required");
  }
}

export async function disconnectJobberTestAccount(pool: SqlPool, customerId: string, accountId: string) {
  await pool.query(
    `UPDATE jobber_test_connections SET state = 'disconnected', encrypted_tokens = NULL,
      request_writes_enabled = false, revision = revision + 1, updated_at = now()
     WHERE customer_id = $1 AND account_id = $2`, [customerId, accountId]);
}
