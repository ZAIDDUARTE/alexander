import { sha256Hex } from "./canonical";

const SESSION_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Object keys use the session id and a SHA-256 of the content revision.
 * The revision itself is the questionnaire fingerprint and must not appear
 * in the key, because that fingerprint contains answer text.
 */
export function submissionObjectKeys(sessionId: string, contentRevision: string): {
  prefix: string;
  raw: string;
  normalized: string;
  manifest: string;
} {
  if (!SESSION_ID.test(sessionId)) {
    throw new Error("invalid_session_id");
  }
  if (!contentRevision) {
    throw new Error("invalid_content_revision");
  }
  const revisionKey = sha256Hex(contentRevision);
  const prefix = `onboarding/${sessionId}/submissions/${revisionKey}`;
  return {
    prefix,
    raw: `${prefix}/raw-draft.json`,
    normalized: `${prefix}/normalized-config.json`,
    manifest: `${prefix}/manifest.json`,
  };
}

export function isSafeSubmissionKey(key: string): boolean {
  return /^onboarding\/[0-9a-f-]{36}\/submissions\/[0-9a-f]{64}\/(raw-draft|normalized-config|manifest)\.json$/i.test(
    key,
  );
}
