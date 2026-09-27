import { DB_MIGRATION_VERSION } from "./types";
import type {
  DatabasePort,
  ObjectStorePort,
  PersistencePorts,
  SchemaStatus,
  SessionRecord,
  SubmissionRecord,
} from "./types";

const EXPECTED_SCHEMA: SchemaStatus = {
  migrationVersion: DB_MIGRATION_VERSION,
  tables: ["onboarding_sessions", "onboarding_submissions", "schema_migrations"],
  indexes: [
    "onboarding_sessions_pkey",
    "onboarding_sessions_session_id_key",
    "onboarding_sessions_updated_at_idx",
    "onboarding_sessions_submission_status_idx",
    "onboarding_submissions_pkey",
    "onboarding_submissions_session_revision_sha_key",
  ],
  constraints: [
    "onboarding_sessions_pkey",
    "onboarding_sessions_session_id_key",
    "onboarding_sessions_status_check",
    "onboarding_submissions_pkey",
    "onboarding_submissions_session_revision_sha_key",
    "onboarding_submissions_session_id_fkey",
  ],
};

export function createMemoryDatabase(): DatabasePort & {
  sessions: Map<string, SessionRecord>;
  submissions: SubmissionRecord[];
  failNextCommit: boolean;
} {
  const sessions = new Map<string, SessionRecord>();
  const submissions: SubmissionRecord[] = [];
  const db = {
    sessions,
    submissions,
    failNextCommit: false,
    async ping() {
      return undefined;
    },
    async schemaStatus() {
      return EXPECTED_SCHEMA;
    },
    async getSession(sessionId: string) {
      return sessions.get(sessionId) ?? null;
    },
    async listSubmissions(sessionId: string) {
      return submissions.filter((row) => row.sessionId === sessionId);
    },
    async applyDraft(record: SessionRecord) {
      const existing = sessions.get(record.sessionId);
      if (existing && Date.parse(record.updatedAt) < Date.parse(existing.updatedAt)) {
        return { applied: false, session: existing };
      }
      const next: SessionRecord = {
        ...record,
        normalized: record.normalized ?? existing?.normalized ?? null,
        version: existing ? existing.version + 1 : 1,
        createdAt: existing?.createdAt ?? record.createdAt,
      };
      sessions.set(record.sessionId, next);
      return { applied: true, session: next };
    },
    async commitSubmission(input: { session: SessionRecord; submission: SubmissionRecord }) {
      if (db.failNextCommit) {
        db.failNextCommit = false;
        throw new Error("database_failed");
      }
      const existing = submissions.find(
        (row) =>
          row.sessionId === input.submission.sessionId &&
          row.contentRevision === input.submission.contentRevision,
      );
      const duplicate = Boolean(existing);
      if (!existing) {
        submissions.push(input.submission);
      }
      const previous = sessions.get(input.session.sessionId);
      const session: SessionRecord = {
        ...input.session,
        version: previous ? previous.version + 1 : 1,
        createdAt: previous?.createdAt ?? input.session.createdAt,
      };
      if (duplicate && previous?.submittedAt) {
        session.submittedAt = previous.submittedAt;
        session.draft = {
          ...session.draft,
          updatedAt: previous.updatedAt,
          data: {
            ...session.draft.data,
            submission: {
              ...(session.draft.data.submission ?? {}),
              status: "submitted",
              submittedAt: previous.submittedAt,
              lastSubmittedContentRevision: input.submission.contentRevision,
            },
          },
        };
        session.updatedAt = previous.updatedAt;
      }
      sessions.set(session.sessionId, session);
      return { duplicate, session };
    },
  };
  return db;
}

export function createMemoryObjectStore(): ObjectStorePort & {
  objects: Map<string, Buffer>;
  writeOrder: string[];
  failNextPut: boolean;
  accessAvailable: boolean;
} {
  const objects = new Map<string, Buffer>();
  const store = {
    objects,
    writeOrder: [] as string[],
    failNextPut: false,
    accessAvailable: true,
    async putObject(key: string, body: Buffer) {
      if (store.failNextPut) {
        store.failNextPut = false;
        throw new Error("snapshot_failed");
      }
      objects.set(key, Buffer.from(body));
      store.writeOrder.push(key);
    },
    async getObject(key: string) {
      const found = objects.get(key);
      return found ? Buffer.from(found) : null;
    },
    async checkAccess() {
      if (!store.accessAvailable) throw new Error("snapshot_unavailable");
    },
  };
  return store;
}

export function createMemoryPorts(): PersistencePorts & {
  db: ReturnType<typeof createMemoryDatabase>;
  objects: ReturnType<typeof createMemoryObjectStore>;
} {
  return {
    db: createMemoryDatabase(),
    objects: createMemoryObjectStore(),
  };
}
