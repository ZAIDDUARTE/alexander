export function persistenceV2Enabled(env?: { PERSISTENCE_V2_ENABLED?: string }): boolean {
  const source = env ?? (process.env as { PERSISTENCE_V2_ENABLED?: string });
  return source.PERSISTENCE_V2_ENABLED === "true";
}
