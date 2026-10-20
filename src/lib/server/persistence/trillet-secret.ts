/**
 * Resolve Trillet API credentials for the persistence runtime.
 * Prefer Secrets Manager (TRILLET_SECRET_ARN) over plain env TRILLET_API_KEY.
 * Never log secret values.
 */

export type TrilletSecretEnv = {
  TRILLET_API_KEY?: string;
  TRILLET_SECRET_ARN?: string;
  [key: string]: string | undefined;
};

export type TrilletSecretShape = {
  TRILLET_API_KEY?: string;
  apiKey?: string;
  api_key?: string;
};

let cached: { arn: string; key: string } | null = null;

export function readTrilletApiKeyFromEnv(env: TrilletSecretEnv = process.env): string | null {
  const direct = (env.TRILLET_API_KEY || "").trim();
  return direct || null;
}

export function parseTrilletSecretJson(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw) as TrilletSecretShape;
    const key =
      (parsed.TRILLET_API_KEY || parsed.apiKey || parsed.api_key || "").trim() || null;
    return key;
  } catch {
    // Allow raw secret string that is itself the key (no JSON).
    const text = raw.trim();
    return text.length >= 16 ? text : null;
  }
}

/** Sync path used by invite code when env already holds the key. */
export function resolveTrilletApiKeySync(env: TrilletSecretEnv = process.env): string | null {
  return readTrilletApiKeyFromEnv(env);
}

/**
 * Async resolver for Lambda: load from Secrets Manager when TRILLET_SECRET_ARN is set.
 * Does not print or return secret material to logs.
 */
export async function resolveTrilletApiKey(
  env: TrilletSecretEnv = process.env,
  fetchSecret?: (arn: string) => Promise<string | null>,
): Promise<{ ok: true; key: string; source: "env" | "secrets_manager" } | { ok: false; reason: "missing_api_key" }> {
  const fromEnv = readTrilletApiKeyFromEnv(env);
  if (fromEnv) return { ok: true, key: fromEnv, source: "env" };

  const arn = (env.TRILLET_SECRET_ARN || "").trim();
  if (!arn) return { ok: false, reason: "missing_api_key" };

  if (cached && cached.arn === arn) {
    return { ok: true, key: cached.key, source: "secrets_manager" };
  }

  if (!fetchSecret) {
    return { ok: false, reason: "missing_api_key" };
  }

  const raw = await fetchSecret(arn);
  if (!raw) return { ok: false, reason: "missing_api_key" };
  const key = parseTrilletSecretJson(raw);
  if (!key) return { ok: false, reason: "missing_api_key" };
  cached = { arn, key };
  return { ok: true, key, source: "secrets_manager" };
}

/** Test helper. */
export function clearTrilletSecretCache(): void {
  cached = null;
}
