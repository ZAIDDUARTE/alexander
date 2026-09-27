export type TimestampedDraft = { updatedAt?: string | null };

/**
 * Redis may seed PostgreSQL once. A newer RDS draft always wins.
 * Equal timestamps stay on RDS so an older cache cannot clobber it.
 */
export function selectDraftSource(
  durable: TimestampedDraft | null,
  redis: TimestampedDraft | null,
): "durable" | "redis" | "none" {
  const durableAt = durable?.updatedAt ? Date.parse(durable.updatedAt) : NaN;
  const redisAt = redis?.updatedAt ? Date.parse(redis.updatedAt) : NaN;
  const durableHas = Number.isFinite(durableAt);
  const redisHas = Number.isFinite(redisAt);
  if (!durableHas && !redisHas) return "none";
  if (!redisHas) return "durable";
  if (!durableHas) return "redis";
  if (redisAt > durableAt) return "redis";
  return "durable";
}
