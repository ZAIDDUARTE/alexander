import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { bearerToken, equalSecret, object, tokenHash } from "./intake";

export const JOBBER_OAUTH_COOKIE = "alexander_jobber_oauth";
export const JOBBER_ADMIN_COOKIE = "alexander_jobber_admin";

export type JobberOAuthSession = {
  state: string;
  verifier: string;
  customerId: string;
  adminTokenHash: string;
  expiresAt: number;
};

function encryptionKey(encoded: string): Buffer {
  if (!/^[a-f0-9]{64}$/i.test(encoded)) throw new Error("invalid_encryption_key");
  return Buffer.from(encoded, "hex");
}

export function sealJobberOAuthSession(session: JobberOAuthSession, key: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(key), iv);
  cipher.setAAD(Buffer.from(JSON.stringify(["jobber-oauth-session-v1", session.state])));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(session), "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function openJobberOAuthSession(value: string, key: string, expectedState: string): JobberOAuthSession {
  const [version, iv, tag, encrypted, extra] = value.split(".");
  if (version !== "v1" || !iv || !tag || !encrypted || extra) throw new Error("invalid_oauth_session");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(key), Buffer.from(iv, "base64url"));
  decipher.setAAD(Buffer.from(JSON.stringify(["jobber-oauth-session-v1", expectedState])));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  let data: Record<string, unknown>;
  try {
    data = object(JSON.parse(Buffer.concat([
      decipher.update(Buffer.from(encrypted, "base64url")),
      decipher.final(),
    ]).toString("utf8")));
  } catch {
    throw new Error("invalid_oauth_session");
  }
  if (typeof data.state !== "string" || typeof data.verifier !== "string" ||
      typeof data.customerId !== "string" || typeof data.adminTokenHash !== "string" ||
      typeof data.expiresAt !== "number") throw new Error("invalid_oauth_session");
  if (data.state !== expectedState) throw new Error("oauth_state_mismatch");
  if (data.expiresAt <= Date.now()) throw new Error("oauth_state_expired");
  if (!/^[0-9a-f-]{36}$/i.test(data.customerId)) throw new Error("invalid_oauth_session");
  if (!/^[a-f0-9]{64}$/.test(data.adminTokenHash)) throw new Error("invalid_oauth_session");
  if (!/^[A-Za-z0-9_-]{43,128}$/.test(data.verifier)) throw new Error("invalid_oauth_session");
  return data as JobberOAuthSession;
}

export function signConnectLink(adminToken: string, expiresAtUnix: number): string {
  return createHmac("sha256", adminToken).update(`GET\n/api/integrations/jobber/connect\n${expiresAtUnix}`).digest("hex");
}

export function verifyConnectLink(adminToken: string, expiresAtRaw: string | null, signature: string | null): boolean {
  if (!expiresAtRaw || !signature || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expiresAtUnix = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAtUnix)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (expiresAtUnix < now || expiresAtUnix > now + 900) return false;
  const expected = signConnectLink(adminToken, expiresAtUnix);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature.trim().toLowerCase(), "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function authorizeJobberAdmin(input: {
  adminToken: string;
  authorizationHeader: string | null;
  adminCookie: string | null;
  exp: string | null;
  sig: string | null;
}): { ok: true; adminTokenHash: string } | { ok: false; reason: string } {
  try {
    const bearer = bearerToken(input.authorizationHeader);
    if (equalSecret(bearer, input.adminToken)) {
      return { ok: true, adminTokenHash: tokenHash(input.adminToken) };
    }
  } catch {
    // fall through to cookie / signed link
  }
  if (input.adminCookie && equalSecret(input.adminCookie, tokenHash(input.adminToken))) {
    return { ok: true, adminTokenHash: tokenHash(input.adminToken) };
  }
  if (verifyConnectLink(input.adminToken, input.exp, input.sig)) {
    return { ok: true, adminTokenHash: tokenHash(input.adminToken) };
  }
  return { ok: false, reason: "unauthorized" };
}
