import { canonicalJsonBytes, canonicalStringify, sha256Hex } from "./canonical";
import { revisionDigest } from "./submission-row";
import { isSafeSubmissionKey, submissionObjectKeys } from "./keys";
import type { PersistenceLogEvent } from "./logger";
import type {
  DatabasePort,
  DraftEnvelope,
  PersistencePorts,
  SchemaStatus,
  SessionRecord,
  SnapshotManifest,
  SubmissionRecord,
} from "./types";

const SESSION_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type PersistenceFailure =
  | "invalid_payload"
  | "stale_draft"
  | "snapshot_failed"
  | "database_failed";

export function isDraftEnvelope(value: unknown): value is DraftEnvelope {
  if (!value || typeof value !== "object") return false;
  const draft = value as DraftEnvelope;
  if (typeof draft.schemaVersion !== "number" || !Number.isInteger(draft.schemaVersion)) return false;
  if (typeof draft.updatedAt !== "string" || !draft.updatedAt) return false;
  if (typeof draft.currentRoute !== "string") return false;
  if (typeof draft.currentSection !== "number") return false;
  if (!Array.isArray(draft.completedSections)) return false;
  if (!draft.data || typeof draft.data !== "object" || Array.isArray(draft.data)) return false;
  return true;
}

export function sessionRecordFromEnvelope(
  sessionId: string,
  draft: DraftEnvelope,
  normalized: unknown | null,
  existing: SessionRecord | null,
): SessionRecord {
  const submission = draft.data.submission;
  const status = submission?.status === "submitted" ? "submitted" : "draft";
  return {
    sessionId,
    questionnaireSchemaVersion: draft.schemaVersion,
    draft,
    normalized: normalized ?? existing?.normalized ?? null,
    currentRoute: draft.currentRoute,
    currentSection: draft.currentSection,
    completedSections: [...draft.completedSections],
    submissionStatus: status,
    lastSubmittedContentRevision:
      typeof submission?.lastSubmittedContentRevision === "string"
        ? submission.lastSubmittedContentRevision
        : null,
    submittedAt: typeof submission?.submittedAt === "string" ? submission.submittedAt : null,
    createdAt: existing?.createdAt ?? draft.updatedAt,
    updatedAt: draft.updatedAt,
    version: existing?.version ?? 1,
  };
}

function clone<T>(value: T): T {
  return JSON.parse(canonicalStringify(value)) as T;
}

export async function getDraft(
  db: DatabasePort,
  sessionId: string,
): Promise<
  | { ok: true; draft: DraftEnvelope | null; updatedAt: string | null; version: number | null }
  | { ok: false; reason: "invalid_payload" }
> {
  if (!SESSION_ID.test(sessionId)) return { ok: false, reason: "invalid_payload" };
  const session = await db.getSession(sessionId);
  if (!session) return { ok: true, draft: null, updatedAt: null, version: null };
  return {
    ok: true,
    draft: session.draft,
    updatedAt: session.updatedAt,
    version: session.version,
  };
}

export async function upsertDraft(
  db: DatabasePort,
  sessionId: string,
  draft: unknown,
): Promise<
  | { ok: true; draft: DraftEnvelope; version: number; updatedAt: string }
  | { ok: false; reason: "invalid_payload" | "stale_draft"; draft?: DraftEnvelope; version?: number }
> {
  if (!SESSION_ID.test(sessionId) || !isDraftEnvelope(draft)) {
    return { ok: false, reason: "invalid_payload" };
  }
  const existing = await db.getSession(sessionId);
  if (existing) {
    const stored = Date.parse(existing.updatedAt);
    const incoming = Date.parse(draft.updatedAt);
    if (Number.isFinite(stored) && Number.isFinite(incoming) && incoming < stored) {
      return { ok: false, reason: "stale_draft", draft: existing.draft, version: existing.version };
    }
  }
  const record = sessionRecordFromEnvelope(sessionId, draft, null, existing);
  const applied = await db.applyDraft(record);
  return {
    ok: true,
    draft: applied.session.draft,
    version: applied.session.version,
    updatedAt: applied.session.updatedAt,
  };
}

function withPreservedSubmission(
  incoming: DraftEnvelope,
  existingSubmission: SubmissionRecord,
  existingSession: SessionRecord | null,
): DraftEnvelope {
  const next = clone(incoming);
  const previous = next.data.submission ?? {};
  next.data = {
    ...next.data,
    submission: {
      ...previous,
      status: "submitted",
      submittedAt: existingSubmission.submittedAt,
      lastSubmittedContentRevision: existingSubmission.contentRevision,
    },
  };
  if (existingSession && existingSession.lastSubmittedContentRevision === existingSubmission.contentRevision) {
    next.updatedAt = existingSession.updatedAt;
  }
  return next;
}

export async function submitDraft(
  ports: PersistencePorts,
  input: {
    sessionId: string;
    draft: unknown;
    normalized: unknown;
    contentRevision: string;
    submittedAt: string;
  },
): Promise<
  | {
      ok: true;
      duplicate: boolean;
      draft: DraftEnvelope;
      submittedAt: string;
      rawSha256: string;
      normalizedSha256: string;
      keys: { raw: string; normalized: string; manifest: string };
    }
  | { ok: false; reason: PersistenceFailure }
> {
  if (!SESSION_ID.test(input.sessionId) || !isDraftEnvelope(input.draft)) {
    return { ok: false, reason: "invalid_payload" };
  }
  if (!input.contentRevision || typeof input.submittedAt !== "string" || !input.normalized) {
    return { ok: false, reason: "invalid_payload" };
  }

  const existingSession = await ports.db.getSession(input.sessionId);
  const existingSubmissions = await ports.db.listSubmissions(input.sessionId);
  const existingSubmission = existingSubmissions.find(
    (row) => row.contentRevision === input.contentRevision,
  );
  const draft = existingSubmission
    ? withPreservedSubmission(input.draft, existingSubmission, existingSession)
    : input.draft;
const submittedAt = existingSubmission?.submittedAt ?? input.submittedAt;

  let keys;
  try {
    keys = submissionObjectKeys(input.sessionId, input.contentRevision);
  } catch {
    return { ok: false, reason: "invalid_payload" };
  }
  if (![keys.raw, keys.normalized, keys.manifest].every(isSafeSubmissionKey)) {
    return { ok: false, reason: "invalid_payload" };
  }

  const rawBytes = canonicalJsonBytes(draft);
  const normalizedBytes = canonicalJsonBytes(input.normalized);
  const rawSha256 = sha256Hex(rawBytes);
  const normalizedSha256 = sha256Hex(normalizedBytes);
  const manifest: SnapshotManifest = {
    formatVersion: 1,
    sessionId: input.sessionId,
    contentRevision: input.contentRevision,
    questionnaireSchemaVersion: draft.schemaVersion,
    submittedAt,
    rawKey: keys.raw,
    normalizedKey: keys.normalized,
    rawSha256,
    normalizedSha256,
  };
  const manifestBytes = canonicalJsonBytes(manifest);

  const manifestAlreadyStored = existingSubmission
    ? await ports.objects.getObject(keys.manifest)
    : null;
  if (!manifestAlreadyStored) {
    try {
      const rawAlready = await ports.objects.getObject(keys.raw);
      if (!rawAlready) await ports.objects.putObject(keys.raw, rawBytes);
      const normalizedAlready = await ports.objects.getObject(keys.normalized);
      if (!normalizedAlready) await ports.objects.putObject(keys.normalized, normalizedBytes);
      await ports.objects.putObject(keys.manifest, manifestBytes);
    } catch {
      return { ok: false, reason: "snapshot_failed" };
    }
  }

  const session = sessionRecordFromEnvelope(input.sessionId, draft, input.normalized, existingSession);
  session.submissionStatus = "submitted";
  session.lastSubmittedContentRevision = input.contentRevision;
  session.submittedAt = submittedAt;
  session.normalized = input.normalized;

  const submission: SubmissionRecord = {
    sessionId: input.sessionId,
    contentRevision: input.contentRevision,
    questionnaireSchemaVersion: draft.schemaVersion,
    rawDraft: draft,
    normalized: input.normalized,
    s3Prefix: keys.prefix,
    s3RawKey: keys.raw,
    s3NormalizedKey: keys.normalized,
    s3ManifestKey: keys.manifest,
    rawSha256,
    normalizedSha256,
    submittedAt,
    createdAt: existingSubmission?.createdAt ?? submittedAt,
  };

  try {
    const committed = await ports.db.commitSubmission({ session, submission });
    return {
      ok: true,
      duplicate: committed.duplicate,
      draft: committed.session.draft,
      submittedAt: committed.session.submittedAt ?? submittedAt,
      rawSha256,
      normalizedSha256,
      keys,
    };
  } catch {
    return { ok: false, reason: "database_failed" };
  }
}

export async function healthCheck(ports: PersistencePorts): Promise<{
  ok: boolean;
  durablePersistence: true;
  database: "ok" | "error";
  snapshotStorage: "ok" | "error";
  databaseCode?: string;
}> {
  let database: "ok" | "error" = "ok";
  let snapshotStorage: "ok" | "error" = "ok";
  let databaseCode: string | undefined;
  try {
    await ports.db.ping();
  } catch (error) {
    database = "error";
    const err = error as { code?: string; name?: string };
    databaseCode = err.code || err.name || "Error";
  }
  try {
    await ports.objects.checkAccess();
  } catch {
    snapshotStorage = "error";
  }
  return {
    ok: database === "ok" && snapshotStorage === "ok",
    durablePersistence: true,
    database,
    snapshotStorage,
    ...(databaseCode ? { databaseCode } : {}),
  };
}

export async function inspectSession(ports: PersistencePorts, sessionId: string) {
  if (!SESSION_ID.test(sessionId)) return { ok: false as const, reason: "invalid_payload" as const };
  const session = await ports.db.getSession(sessionId);
  if (!session) {
    return { ok: true as const, found: false as const, submissions: [] as const };
  }
  const draftBytes = canonicalJsonBytes(session.draft);
  const submissions = await ports.db.listSubmissions(sessionId);
  const inspected = [];
  for (const row of submissions) {
    const raw = await ports.objects.getObject(row.s3RawKey);
    const normalized = await ports.objects.getObject(row.s3NormalizedKey);
    const manifest = await ports.objects.getObject(row.s3ManifestKey);
    inspected.push({
      contentRevisionSha256: revisionDigest(row.contentRevision),
      rawSha256: row.rawSha256,
      normalizedSha256: row.normalizedSha256,
      rawBytes: raw?.byteLength ?? 0,
      normalizedBytes: normalized?.byteLength ?? 0,
      s3RawKey: row.s3RawKey,
      s3NormalizedKey: row.s3NormalizedKey,
      s3ManifestKey: row.s3ManifestKey,
      s3RawMatches: raw ? sha256Hex(raw) === row.rawSha256 : false,
      s3NormalizedMatches: normalized ? sha256Hex(normalized) === row.normalizedSha256 : false,
      manifestPresent: manifest !== null,
      manifestLastKey: row.s3ManifestKey.endsWith("/manifest.json"),
    });
  }
  return {
    ok: true as const,
    found: true as const,
    draftSha256: sha256Hex(draftBytes),
    draftBytes: draftBytes.byteLength,
    submissionStatus: session.submissionStatus,
    submittedAtPresent: Boolean(session.submittedAt),
    contentRevisionPresent: Boolean(session.lastSubmittedContentRevision),
    version: session.version,
    questionnaireSchemaVersion: session.questionnaireSchemaVersion,
    submissions: inspected,
  };
}

export async function readSchemaStatus(db: DatabasePort): Promise<{ ok: true; schema: SchemaStatus }> {
  return { ok: true, schema: await db.schemaStatus() };
}

type OperationResult = { ok: boolean; reason?: string; [key: string]: unknown };

export async function handlePersistenceOperation(
  event: unknown,
  ports: PersistencePorts,
  log: (event: PersistenceLogEvent) => void,
): Promise<OperationResult> {
  const started = Date.now();
  const operation =
    event && typeof event === "object" && "operation" in event
      ? String((event as { operation?: unknown }).operation ?? "")
      : "";
  const sessionId =
    event && typeof event === "object" && "sessionId" in event
      ? String((event as { sessionId?: unknown }).sessionId ?? "")
      : undefined;
  const contentRevision =
    event && typeof event === "object" && "contentRevision" in event &&
    typeof (event as { contentRevision?: unknown }).contentRevision === "string"
      ? (event as { contentRevision: string }).contentRevision
      : undefined;

  try {
    if (!event || typeof event !== "object" || Array.isArray(event)) {
      return { ok: false, reason: "invalid_payload" };
    }
    if ("sql" in event || "statement" in event) {
      return { ok: false, reason: "invalid_payload" };
    }
    const body = event as Record<string, unknown>;
    let result: OperationResult;
    switch (body.operation) {
      case "health":
        result = await healthCheck(ports);
        break;
      case "schemaStatus":
        result = await readSchemaStatus(ports.db);
        break;
      case "getDraft":
        result = await getDraft(ports.db, String(body.sessionId ?? ""));
        break;
      case "upsertDraft":
        result = await upsertDraft(ports.db, String(body.sessionId ?? ""), body.draft);
        break;
      case "submitDraft":
        result = await submitDraft(ports, {
          sessionId: String(body.sessionId ?? ""),
          draft: body.draft,
          normalized: body.normalized,
          contentRevision: String(body.contentRevision ?? ""),
          submittedAt: String(body.submittedAt ?? ""),
        });
        break;
      case "inspectSession":
        result = await inspectSession(ports, String(body.sessionId ?? ""));
        break;
      default:
        result = { ok: false, reason: "invalid_payload" };
    }
    log({
      operation: operation || "unknown",
      status: result.ok ? "ok" : "error",
      durationMs: Date.now() - started,
      sessionId,
      contentRevision,
      errorName: result.ok ? undefined : result.reason,
    });
    return result;
  } catch (error) {
    log({
      operation: operation || "unknown",
      status: "error",
      durationMs: Date.now() - started,
      sessionId,
      contentRevision,
      errorName: error instanceof Error ? error.name : "Error",
    });
    return { ok: false, reason: "database_failed" };
  }
}
