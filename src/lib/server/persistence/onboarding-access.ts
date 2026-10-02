import { randomUUID } from "node:crypto";
import { generateToken, hashToken } from "./tokens";

export type SqlQuery = (
  text: string,
  values?: unknown[],
) => Promise<{ rows: Array<Record<string, unknown>>; rowCount: number | null }>;

export type SqlClient = {
  query: SqlQuery;
  release: () => void;
};

export type SqlPool = {
  query: SqlQuery;
  connect: () => Promise<SqlClient>;
};

const ACCESS_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const INVITATION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type AccessResolved = {
  ok: true;
  onboardingId: string;
  sessionId: string;
  draft: unknown;
  version: number;
};

export type AccessRejected = { ok: false; reason: "rejected" };

function emptyDraft(now: string) {
  return {
    schemaVersion: 10,
    updatedAt: now,
    currentRoute: "/onboarding",
    currentSection: 1,
    completedSections: [] as number[],
    data: {},
  };
}

function timeOf(value: unknown): number | null {
  if (value == null) return null;
  if (value instanceof Date) return value.getTime();
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function asNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function invitationUrl(host: string, token: string): string {
  const bare = host.replace(/^[a-z]+:\/\//i, "").replace(/\/.*$/, "").replace(/\.$/, "");
  return `https://${bare}/i#${token}`;
}

async function withTransaction<T>(pool: SqlPool, run: (client: SqlClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await run(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // The original error is the one to surface.
    }
    throw error;
  } finally {
    client.release();
  }
}

async function ensureDraftSession(
  client: SqlClient,
  onboardingId: string,
): Promise<{ sessionId: string }> {
  const existing = await client.query(
    `SELECT session_id
     FROM onboarding_sessions
     WHERE onboarding_id = $1
     FOR UPDATE`,
    [onboardingId],
  );
  const found = existing.rows[0]?.session_id;
  if (typeof found === "string" && found) return { sessionId: found };

  const sessionId = randomUUID();
  const now = new Date().toISOString();
  const inserted = await client.query(
    `INSERT INTO onboarding_sessions (
       session_id, questionnaire_schema_version, draft_json, onboarding_id, version
     ) VALUES ($1, 10, $2::jsonb, $3, 1)
     ON CONFLICT (onboarding_id) WHERE onboarding_id IS NOT NULL DO NOTHING
     RETURNING session_id`,
    [sessionId, JSON.stringify(emptyDraft(now)), onboardingId],
  );
  const created = inserted.rows[0]?.session_id;
  if (typeof created === "string" && created) return { sessionId: created };

  const again = await client.query(
    `SELECT session_id FROM onboarding_sessions WHERE onboarding_id = $1`,
    [onboardingId],
  );
  const raced = again.rows[0]?.session_id;
  if (typeof raced === "string" && raced) return { sessionId: raced };
  throw new Error("draft_session_missing");
}

export async function provisionCustomerOnboarding(
  pool: SqlPool,
  input: {
    customerFacingName?: string | null;
    dataClassification?: "real_customer" | "synthetic_test";
    invitationTtlDays?: number;
    host: string;
  },
): Promise<{
  customerId: string;
  customerNumber: string;
  onboardingId: string;
  invitationUrl: string;
}> {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const classification = input.dataClassification ?? "real_customer";
  const name = input.customerFacingName?.trim() ? input.customerFacingName.trim() : null;
  const ttlDays = input.invitationTtlDays ?? 30;
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString();

  const created = await withTransaction(pool, async (client) => {
    const customer = await client.query(
      `INSERT INTO customers (customer_facing_name, data_classification)
       VALUES ($1, $2)
       RETURNING id, customer_number`,
      [name, classification],
    );
    const customerId = String(customer.rows[0]?.id ?? "");
    const customerNumber = String(customer.rows[0]?.customer_number ?? "");
    const onboarding = await client.query(
      `INSERT INTO customer_onboardings (customer_id) VALUES ($1) RETURNING id`,
      [customerId],
    );
    const onboardingId = String(onboarding.rows[0]?.id ?? "");
    await client.query(
      `INSERT INTO onboarding_invitations (onboarding_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [onboardingId, tokenHash, expiresAt],
    );
    return { customerId, customerNumber, onboardingId };
  });

  return {
    ...created,
    invitationUrl: invitationUrl(input.host, token),
  };
}

export async function lookupInvitation(
  pool: SqlPool,
  invitationTokenHash: string,
): Promise<{ ok: true; onboardingId: string } | AccessRejected> {
  const invite = await pool.query(
    `SELECT onboarding_id, expires_at, revoked_at
     FROM onboarding_invitations
     WHERE token_hash = $1`,
    [invitationTokenHash],
  );
  const row = invite.rows[0];
  if (!row || row.revoked_at != null) return { ok: false, reason: "rejected" };
  const expires = timeOf(row.expires_at);
  if (row.expires_at != null && (expires == null || expires <= Date.now())) {
    return { ok: false, reason: "rejected" };
  }
  return { ok: true, onboardingId: String(row.onboarding_id) };
}

export async function redeemInvitation(
  pool: SqlPool,
  input: { invitationTokenHash: string; accessTokenHash: string },
): Promise<
  | { ok: true; onboardingId: string; sessionId: string; accessExpiresAt: string }
  | AccessRejected
> {
  return withTransaction(pool, async (client) => {
    const invite = await client.query(
      `SELECT id, onboarding_id, expires_at, revoked_at
       FROM onboarding_invitations
       WHERE token_hash = $1
       FOR UPDATE`,
      [input.invitationTokenHash],
    );
    const row = invite.rows[0];
    if (!row || row.revoked_at != null) return { ok: false as const, reason: "rejected" as const };
    const expires = timeOf(row.expires_at);
    if (row.expires_at != null && (expires == null || expires <= Date.now())) {
      return { ok: false as const, reason: "rejected" as const };
    }
    const onboardingId = String(row.onboarding_id);
    const draft = await ensureDraftSession(client, onboardingId);
    const accessExpiresAt = new Date(Date.now() + ACCESS_TTL_MS).toISOString();
    await client.query(
      `INSERT INTO onboarding_access_sessions (
         onboarding_id, access_token_hash, expires_at
       ) VALUES ($1, $2, $3)`,
      [onboardingId, input.accessTokenHash, accessExpiresAt],
    );
    return {
      ok: true as const,
      onboardingId,
      sessionId: draft.sessionId,
      accessExpiresAt,
    };
  });
}

export async function resolveOnboardingAccess(
  pool: SqlPool,
  accessTokenHash: string,
): Promise<AccessResolved | AccessRejected> {
  const result = await pool.query(
    `SELECT a.onboarding_id, s.session_id, s.draft_json, s.version
     FROM onboarding_access_sessions a
     JOIN onboarding_sessions s ON s.onboarding_id = a.onboarding_id
     WHERE a.access_token_hash = $1
       AND a.revoked_at IS NULL
       AND (a.expires_at IS NULL OR a.expires_at > now())`,
    [accessTokenHash],
  );
  const row = result.rows[0];
  const version = asNumber(row?.version);
  if (!row || typeof row.session_id !== "string" || version == null) {
    return { ok: false, reason: "rejected" };
  }
  return {
    ok: true,
    onboardingId: String(row.onboarding_id),
    sessionId: row.session_id,
    draft: row.draft_json,
    version,
  };
}

export async function saveInvitedDraft(
  pool: SqlPool,
  input: { accessTokenHash: string; expectedVersion: number; draft: unknown },
): Promise<
  | { ok: true; draft: unknown; version: number; onboardingId: string }
  | { ok: false; reason: "rejected" | "stale_draft" | "invalid_payload"; draft?: unknown; version?: number }
> {
  if (!Number.isInteger(input.expectedVersion) || input.expectedVersion < 1) {
    return { ok: false, reason: "invalid_payload" };
  }
  const access = await resolveOnboardingAccess(pool, input.accessTokenHash);
  if (!access.ok) return { ok: false, reason: "rejected" };

  const draft = input.draft as {
    currentRoute?: unknown;
    currentSection?: unknown;
    completedSections?: unknown;
    schemaVersion?: unknown;
  };
  const updated = await pool.query(
    `UPDATE onboarding_sessions
     SET draft_json = $1::jsonb,
         updated_at = now(),
         version = version + 1,
         current_route = $2,
         current_section = $3,
         completed_sections = $4::jsonb,
         questionnaire_schema_version = $5
     WHERE onboarding_id = $6
       AND version = $7
     RETURNING version, draft_json`,
    [
      JSON.stringify(input.draft),
      typeof draft.currentRoute === "string" ? draft.currentRoute : "/onboarding",
      typeof draft.currentSection === "number" ? draft.currentSection : null,
      JSON.stringify(Array.isArray(draft.completedSections) ? draft.completedSections : []),
      typeof draft.schemaVersion === "number" ? draft.schemaVersion : 10,
      access.onboardingId,
      input.expectedVersion,
    ],
  );
  const row = updated.rows[0];
  const version = asNumber(row?.version);
  if (row && version != null) {
    return { ok: true, draft: row.draft_json, version, onboardingId: access.onboardingId };
  }

  const current = await resolveOnboardingAccess(pool, input.accessTokenHash);
  if (!current.ok) return { ok: false, reason: "rejected" };
  return {
    ok: false,
    reason: "stale_draft",
    draft: current.draft,
    version: current.version,
  };
}

export function invitationTokenFromUrl(url: string): string | null {
  const hash = url.includes("#") ? url.slice(url.indexOf("#") + 1) : "";
  if (!hash) return null;
  try {
    const token = decodeURIComponent(hash);
    return token.length > 0 ? token : null;
  } catch {
    return null;
  }
}

function stringField(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export async function handleOnboardingAccessOperation(
  event: Record<string, unknown>,
  pool: SqlPool,
): Promise<unknown> {
  if (event.operation === "lookupInvitation") {
    const invitationTokenHash = stringField(event.invitationTokenHash);
    if (!invitationTokenHash) return { ok: false, reason: "rejected" };
    return lookupInvitation(pool, invitationTokenHash);
  }
  if (event.operation === "redeemInvitation") {
    const invitationTokenHash = stringField(event.invitationTokenHash);
    const accessTokenHash = stringField(event.accessTokenHash);
    if (!invitationTokenHash || !accessTokenHash) return { ok: false, reason: "rejected" };
    return redeemInvitation(pool, { invitationTokenHash, accessTokenHash });
  }
  if (event.operation === "resolveAccess") {
    const accessTokenHash = stringField(event.accessTokenHash);
    if (!accessTokenHash) return { ok: false, reason: "rejected" };
    return resolveOnboardingAccess(pool, accessTokenHash);
  }
  if (event.operation === "saveInvitedDraft") {
    const accessTokenHash = stringField(event.accessTokenHash);
    const expectedVersion = asNumber(event.expectedVersion);
    if (!accessTokenHash || expectedVersion == null) return { ok: false, reason: "invalid_payload" };
    return saveInvitedDraft(pool, {
      accessTokenHash,
      expectedVersion,
      draft: event.draft,
    });
  }
  return { ok: false, reason: "invalid_payload" };
}

export { generateToken, hashToken, INVITATION_TTL_MS };
