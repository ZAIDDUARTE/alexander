import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { object } from "./intake";

// Latest active version in Jobber's official changelog on 2026-10-14.
export const JOBBER_API_VERSION = "2026-09-25";
export type JobberTokens = { accessToken: string; refreshToken: string; expiresAt: number };
export type JobberAccount = { id: string; name: string };
export type JobberConfig = { clientId: string; clientSecret: string; callbackUrl: string };

function encryptionKey(encoded: string): Buffer {
  if (!/^[a-f0-9]{64}$/i.test(encoded)) throw new Error("invalid_encryption_key");
  return Buffer.from(encoded, "hex");
}

export function encryptTokens(tokens: JobberTokens, key: string, customerId: string, accountId: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(key), iv);
  cipher.setAAD(Buffer.from(JSON.stringify(["jobber-test-v1", customerId, accountId])));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(tokens), "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptTokens(value: string, key: string, customerId: string, accountId: string): JobberTokens {
  const [version, iv, tag, encrypted, extra] = value.split(".");
  if (version !== "v1" || !iv || !tag || !encrypted || extra) throw new Error("invalid_ciphertext");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(key), Buffer.from(iv, "base64url"));
  decipher.setAAD(Buffer.from(JSON.stringify(["jobber-test-v1", customerId, accountId])));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  const data = object(JSON.parse(Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8")));
  if (typeof data.accessToken !== "string" || typeof data.refreshToken !== "string" || typeof data.expiresAt !== "number") throw new Error("invalid_tokens");
  return data as JobberTokens;
}

export function beginJobberOAuth(config: JobberConfig) {
  const callback = new URL(config.callbackUrl);
  if (callback.protocol !== "https:" || callback.search || callback.hash || callback.username || callback.password) throw new Error("invalid_callback");
  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const url = new URL("https://api.getjobber.com/api/oauth/authorize");
  url.search = new URLSearchParams({ response_type: "code", client_id: config.clientId,
    redirect_uri: config.callbackUrl, state, code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256" }).toString();
  return { url: url.toString(), state, verifier, expiresAt: Date.now() + 600_000 };
}

async function tokenRequest(config: JobberConfig, grant: Record<string, string>, fetcher = fetch): Promise<JobberTokens> {
  if (!config.clientId || !config.clientSecret) throw new Error("jobber_not_configured");
  const response = await fetcher("https://api.getjobber.com/api/oauth/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...grant, client_id: config.clientId, client_secret: config.clientSecret }),
    redirect: "error", signal: AbortSignal.timeout(10_000), cache: "no-store",
  });
  if (!response.ok) throw new Error("jobber_reauthorization_required");
  const body = object(await response.json());
  if (typeof body.access_token !== "string" || !body.access_token || typeof body.refresh_token !== "string" || !body.refresh_token ||
      typeof body.expires_in !== "number" || body.expires_in <= 0 || body.warning || String(body.token_type).toLowerCase() !== "bearer") throw new Error("jobber_token_response_invalid");
  return { accessToken: body.access_token, refreshToken: body.refresh_token, expiresAt: Date.now() + body.expires_in * 1000 };
}

// The caller must atomically consume the stored state bound to its authenticated setup session first.
export function exchangeJobberCode(config: JobberConfig, code: string, verifier: string, fetcher = fetch) {
  if (!code || !/^[A-Za-z0-9_-]{43,128}$/.test(verifier)) throw new Error("invalid_oauth_exchange");
  return tokenRequest(config, { grant_type: "authorization_code", code, code_verifier: verifier, redirect_uri: config.callbackUrl }, fetcher);
}

export function refreshJobberTokens(config: JobberConfig, refreshToken: string, fetcher = fetch) {
  return tokenRequest(config, { grant_type: "refresh_token", refresh_token: refreshToken }, fetcher);
}

export function verifyJobberHmac(raw: Uint8Array, signature: string | null, secret: string): boolean {
  if (!secret || !signature || !/^[A-Za-z0-9+/]{43}=$/.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(raw).digest();
  const supplied = Buffer.from(signature, "base64");
  return supplied.length === expected.length && timingSafeEqual(expected, supplied);
}

export function parseJobberResult(raw: unknown, version = JOBBER_API_VERSION): Record<string, unknown> {
  const body = object(raw);
  if (body.errors && (!Array.isArray(body.errors) || body.errors.length)) throw new Error("jobber_graphql_error");
  const versioning = object(object(body.extensions).versioning);
  if (versioning.version !== version || versioning.warning) throw new Error("jobber_version_unverified");
  const data = object(body.data);
  for (const value of Object.values(data)) {
    if (value && typeof value === "object" && "userErrors" in value) {
      const errors = (value as { userErrors: unknown }).userErrors;
      if (!Array.isArray(errors) || errors.length) throw new Error("jobber_user_errors");
    }
  }
  return data;
}

async function queryJobber(
  token: string,
  query: string,
  variables: Record<string, unknown>,
  fetcher = fetch,
  version = JOBBER_API_VERSION,
) {
  if (!token) throw new Error("jobber_disconnected");
  const response = await fetcher("https://api.getjobber.com/api/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-JOBBER-GRAPHQL-VERSION": version,
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(response.status === 401 ? "jobber_disconnected" : "jobber_read_failed");
  return parseJobberResult(await response.json(), version);
}

export async function readJobberAccount(
  token: string,
  fetcher: typeof fetch = fetch,
  version = JOBBER_API_VERSION,
): Promise<JobberAccount> {
  const result = await queryJobber(token, "query GetAccount { account { id name } }", {}, fetcher, version);
  const account = object(result.account);
  if (typeof account.id !== "string" || !account.id || typeof account.name !== "string" || !account.name) throw new Error("jobber_identity_missing");
  return { id: account.id, name: account.name };
}

export async function lookupTestCustomer(token: string, expectedAccountId: string, input: { phone?: string; email?: string }, fetcher = fetch) {
  const account = await readJobberAccount(token, fetcher);
  if (!expectedAccountId || account.id !== expectedAccountId) throw new Error("jobber_account_mismatch");
  const phone = input.phone?.replace(/[^0-9]/g, "");
  const email = input.email?.trim().toLowerCase();
  if (!phone && !email) throw new Error("lookup_identity_required");
  const matches: Array<{ id: string; firstName: string; lastName: string }> = [];
  let cursor: string | null = null;
  for (let page = 0; page < 4; page++) {
    const data = await queryJobber(token, `query AlexanderClients($after: String) {
      clients(first: 25, after: $after) { nodes { id firstName lastName phone email }
        pageInfo { hasNextPage endCursor } }
    }`, { after: cursor }, fetcher);
    const clients = object(data.clients);
    if (!Array.isArray(clients.nodes)) throw new Error("jobber_schema_mismatch");
    for (const raw of clients.nodes) {
      const node = object(raw);
      if ((phone && typeof node.phone === "string" && node.phone.replace(/[^0-9]/g, "") === phone) ||
          (email && typeof node.email === "string" && node.email.toLowerCase() === email)) {
        if (typeof node.id !== "string" || typeof node.firstName !== "string" || typeof node.lastName !== "string") throw new Error("jobber_schema_mismatch");
        matches.push({ id: node.id, firstName: node.firstName, lastName: node.lastName });
      }
    }
    const info = object(clients.pageInfo);
    if (info.hasNextPage === false) return { matches, complete: true };
    if (info.hasNextPage !== true || typeof info.endCursor !== "string" || info.endCursor === cursor) throw new Error("jobber_pagination_invalid");
    cursor = info.endCursor;
  }
  return { matches, complete: false };
}

export function createJobberTestRequest(): never {
  // No guessed mutation: requires an authenticated schema and destination readback first.
  throw new Error("jobber_request_schema_not_verified");
}

/** Read-only GraphQL introspection for request-related mutations. Never executes writes. */
export async function probeJobberRequestMutations(token: string, fetcher = fetch, version = JOBBER_API_VERSION) {
  const result = await queryJobber(
    token,
    `query AlexanderRequestMutationProbe {
      __type(name: "Mutation") {
        fields {
          name
          args { name type { kind name ofType { kind name ofType { kind name } } } }
        }
      }
    }`,
    {},
    fetcher,
    version,
  );
  const type = object(result.__type);
  if (!Array.isArray(type.fields)) throw new Error("jobber_schema_mismatch");
  const requestRelated = type.fields
    .map((raw) => object(raw))
    .filter((field) => typeof field.name === "string" && /request/i.test(field.name))
    .map((field) => ({
      name: String(field.name),
      args: Array.isArray(field.args)
        ? field.args.map((arg) => {
            const a = object(arg);
            return { name: String(a.name || ""), type: a.type };
          })
        : [],
    }));
  return {
    apiVersion: version,
    requestMutationNames: requestRelated.map((f) => f.name),
    requestMutations: requestRelated,
    writesEnabledInApp: false,
    createJobberTestRequestBlocked: true,
  };
}
