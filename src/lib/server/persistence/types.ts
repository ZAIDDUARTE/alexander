export const DB_MIGRATION_VERSION = "002";

export type SubmissionStatus = "draft" | "submitted";

export type DraftEnvelope = {
  schemaVersion: number;
  updatedAt: string;
  currentRoute: string;
  currentSection: number;
  completedSections: number[];
  data: {
    navigation?: { sectionId?: number; completedSections?: number[] };
    section1?: unknown;
    section2?: unknown;
    section3?: unknown;
    section4?: unknown;
    section5?: unknown;
    section6?: unknown;
    section7?: unknown;
    section8?: unknown;
    contacts?: unknown;
    fees?: unknown;
    systems?: unknown;
    submission?: {
      status?: string;
      submittedAt?: string | null;
      lastSubmittedContentRevision?: string | null;
      confirmations?: unknown;
    };
    [key: string]: unknown;
  };
};

export type SessionRecord = {
  sessionId: string;
  questionnaireSchemaVersion: number;
  draft: DraftEnvelope;
  normalized: unknown | null;
  currentRoute: string | null;
  currentSection: number | null;
  completedSections: number[];
  submissionStatus: SubmissionStatus;
  lastSubmittedContentRevision: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type SubmissionRecord = {
  sessionId: string;
  contentRevision: string | null;
  questionnaireSchemaVersion: number;
  rawDraft: DraftEnvelope;
  normalized: unknown;
  s3Prefix: string;
  s3RawKey: string;
  s3NormalizedKey: string;
  s3ManifestKey: string;
  rawSha256: string;
  normalizedSha256: string;
  submittedAt: string | null;
  createdAt: string;
};

export type SchemaStatus = {
  migrationVersion: string | null;
  tables: string[];
  indexes: string[];
  constraints: string[];
};

export type ObjectStorePort = {
  putObject(key: string, body: Buffer): Promise<void>;
  getObject(key: string): Promise<Buffer | null>;
  checkAccess(): Promise<void>;
};

export type DatabasePort = {
  ping(): Promise<void>;
  schemaStatus(): Promise<SchemaStatus>;
  getSession(sessionId: string): Promise<SessionRecord | null>;
  listSubmissions(sessionId: string): Promise<SubmissionRecord[]>;
  applyDraft(record: SessionRecord): Promise<{ applied: boolean; session: SessionRecord }>;
  commitSubmission(input: {
    session: SessionRecord;
    submission: SubmissionRecord;
  }): Promise<{ duplicate: boolean; session: SessionRecord }>;
};

export type PersistencePorts = {
  objects: ObjectStorePort;
  db: DatabasePort;
};

export type SnapshotManifest = {
  formatVersion: 1;
  sessionId: string;
  contentRevision: string;
  questionnaireSchemaVersion: number;
  submittedAt: string;
  rawKey: string;
  normalizedKey: string;
  rawSha256: string;
  normalizedSha256: string;
};
