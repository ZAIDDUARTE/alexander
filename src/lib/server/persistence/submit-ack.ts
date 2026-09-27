import type { PersistenceKind } from "./mode";
import type { PersistenceFailure } from "./engine";

export type SubmitAcknowledgement =
  | { ok: true; httpStatus: 200; duplicate: boolean }
  | { ok: false; httpStatus: 503; reason: PersistenceFailure | "persistence_unavailable" };

/**
 * A submission is acknowledged only after the selected durable store commits.
 * Production cannot acknowledge a local-only write.
 */
export function acknowledgeStoredSubmission(input: {
  mode: PersistenceKind;
  nodeEnv: string | undefined;
  storeResult: { ok: true; duplicate: boolean } | { ok: false; reason: PersistenceFailure };
}): SubmitAcknowledgement {
  if (input.mode === "unavailable") {
    return { ok: false, httpStatus: 503, reason: "persistence_unavailable" };
  }
  if (input.mode === "local" && input.nodeEnv === "production") {
    return { ok: false, httpStatus: 503, reason: "persistence_unavailable" };
  }
  if (!input.storeResult.ok) {
    return { ok: false, httpStatus: 503, reason: input.storeResult.reason };
  }
  return { ok: true, httpStatus: 200, duplicate: input.storeResult.duplicate };
}
