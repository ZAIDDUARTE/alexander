export type PersistenceKind = "durable" | "local" | "unavailable";

export type PersistenceEnv = Record<string, string | undefined>;

export function awsPersistenceConfigured(env: PersistenceEnv): boolean {
  return Boolean(env.AWS_REGION && env.AWS_ROLE_ARN && env.ALEXANDER_PERSISTENCE_LAMBDA_ARN);
}

/**
 * Local-only persistence is an explicit development switch.
 * Production ignores ALLOW_LOCAL_ONLY_PERSISTENCE.
 */
export function resolvePersistenceMode(env: PersistenceEnv = process.env): PersistenceKind {
  if (env.NODE_ENV === "production") {
    return awsPersistenceConfigured(env) ? "durable" : "unavailable";
  }
  if (awsPersistenceConfigured(env)) return "durable";
  if (env.ALLOW_LOCAL_ONLY_PERSISTENCE === "true") return "local";
  return "unavailable";
}
