import { sha256Hex } from "./canonical";
import type { DraftEnvelope, SubmissionRecord } from "./types";

export type SubmissionSqlRow = {
  session_id?: unknown;
  content_revision?: unknown;
  questionnaire_schema_version?: unknown;
  raw_draft_json?: unknown;
  normalized_config_json?: unknown;
  s3_prefix?: unknown;
  s3_raw_key?: unknown;
  s3_normalized_key?: unknown;
  s3_manifest_key?: unknown;
  raw_sha256?: unknown;
  normalized_sha256?: unknown;
  submitted_at?: unknown;
  created_at?: unknown;
  content_hash_algorithm?: unknown;
  persistence_state?: unknown;
};

function textOrEmpty(value: unknown): string {
  if (value == null) return "";
  return String(value);
}

export function isoTimestamp(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  const text = String(value);
  return text || null;
}

/**
 * SQL NULL stays null. Never String(null), which is the word "null".
 * Legacy rows still map their fingerprint text.
 */
export function mapSubmissionRow(row: SubmissionSqlRow): SubmissionRecord {
  return {
    sessionId: textOrEmpty(row.session_id),
    contentRevision: row.content_revision == null ? null : String(row.content_revision),
    questionnaireSchemaVersion: Number(row.questionnaire_schema_version),
    rawDraft: row.raw_draft_json as DraftEnvelope,
    normalized: row.normalized_config_json,
    s3Prefix: textOrEmpty(row.s3_prefix),
    s3RawKey: textOrEmpty(row.s3_raw_key),
    s3NormalizedKey: textOrEmpty(row.s3_normalized_key),
    s3ManifestKey: textOrEmpty(row.s3_manifest_key),
    rawSha256: textOrEmpty(row.raw_sha256),
    normalizedSha256: textOrEmpty(row.normalized_sha256),
    submittedAt: isoTimestamp(row.submitted_at),
    createdAt: isoTimestamp(row.created_at) ?? "",
  };
}

/**
 * v1 readers see committed fingerprint rows only.
 * Missing algorithm/state columns (pre-003) stay visible when the fingerprint text is present.
 * NULL content_revision and questionnaire_answers_v1 / non-committed rows are hidden.
 */
export function isVisibleLegacySubmission(row: SubmissionSqlRow): boolean {
  if (row.content_revision == null) return false;
  if (row.content_hash_algorithm != null && row.content_hash_algorithm !== "fingerprint_v1") {
    return false;
  }
  if (row.persistence_state != null && row.persistence_state !== "committed") return false;
  return true;
}

/** Digest of a real fingerprint. Null means absent — do not hash the word "null". */
export function revisionDigest(contentRevision: string | null): string | null {
  if (contentRevision == null) return null;
  return sha256Hex(contentRevision);
}
