/**
 * Preview-only in-memory business profile store.
 *
 * Enabled when ALEXANDER_PROFILE_EDITOR_MEMORY_STORE=true.
 * Never talks to Lambda or PostgreSQL — used to verify the editor without
 * shared production database writes.
 */

import { diffProfileFields } from "./profile-change-detection";
import { validateFieldPatch, type ApplyProfileEditResult, type BusinessProfileSnapshot } from "./business-profile-editor";
import {
  emptyPublicationState,
  markQaRequirement,
  allRequiredQaSatisfied,
  readPublicationState,
  writePublicationIntoProfile,
  type PublicationState,
} from "./profile-publication";
import { BUSINESS_PROFILE_SCHEMA_NAME } from "./profile-projector";
import { generateToken, hashToken } from "./tokens";

export const FICTIONAL_PROFILE_CUSTOMER_ID = "11111111-1111-4111-8111-111111111099";
export const FICTIONAL_PROFILE_CUSTOMER_NUMBER = "ALX-C000099";

type RevisionRow = {
  revisionNumber: number;
  profileData: Record<string, unknown>;
  changeSource: string;
  changeImpact: string;
  actorType: string;
  actorRef: string | null;
  status: string;
  createdAt: string;
};

type SessionRow = {
  id: string;
  customerId: string;
  tokenHash: string;
  expiresAt: number;
  revoked: boolean;
};

type MemoryState = {
  currentRevision: number;
  profileData: Record<string, unknown>;
  revisions: RevisionRow[];
  sessions: SessionRow[];
  /** Immutable copy of the initial questionnaire projection for comparison. */
  originalQuestionnaireFields: Record<string, unknown>;
};

declare global {
  // eslint-disable-next-line no-var
  var __alexanderProfileMemoryStore: MemoryState | undefined;
}

function seedFields(): Record<string, unknown> {
  return {
    Q1: { question_id: "Q1", answer_kind: "scalar_text", value: "Fictional Plumbing QA" },
    Q4: { question_id: "Q4", answer_kind: "scalar_text", value: "https://fictional-plumbing.example.test" },
    Q8: {
      question_id: "Q8",
      answer_kind: "weekly_schedule",
      value: {
        monday: { closed: false, start: "08:00", end: "17:00" },
        tuesday: { closed: false, start: "08:00", end: "17:00" },
        wednesday: { closed: false, start: "08:00", end: "17:00" },
        thursday: { closed: false, start: "08:00", end: "17:00" },
        friday: { closed: false, start: "08:00", end: "17:00" },
        saturday: { closed: true, start: null, end: null },
        sunday: { closed: true, start: null, end: null },
      },
    },
    Q21: {
      question_id: "Q21",
      answer_kind: "matrix_single_select",
      value: { gas_odor: "emergency", active_flooding: "emergency" },
    },
  };
}

function createSeedState(): MemoryState {
  const fields = seedFields();
  const profileData = writePublicationIntoProfile(
    {
      schema: BUSINESS_PROFILE_SCHEMA_NAME,
      questionnaire: { spec_version: "1.0", raw_schema_version: 10 },
      fields,
      _isolation: {
        mode: "memory_store",
        customerNumber: FICTIONAL_PROFILE_CUSTOMER_NUMBER,
        note: "Preview-only fictional tenant; not persisted to PostgreSQL",
      },
    },
    emptyPublicationState(1),
  );
  return {
    currentRevision: 1,
    profileData,
    originalQuestionnaireFields: structuredClone(fields),
    revisions: [
      {
        revisionNumber: 1,
        profileData: structuredClone(profileData),
        changeSource: "initial_questionnaire",
        changeImpact: "unknown",
        actorType: "system",
        actorRef: null,
        status: "active",
        createdAt: new Date().toISOString(),
      },
    ],
    sessions: [],
  };
}

function state(): MemoryState {
  if (!globalThis.__alexanderProfileMemoryStore) {
    globalThis.__alexanderProfileMemoryStore = createSeedState();
  }
  return globalThis.__alexanderProfileMemoryStore;
}

export function profileMemoryStoreEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return String(env.ALEXANDER_PROFILE_EDITOR_MEMORY_STORE || "").toLowerCase() === "true";
}

function asFields(profileData: Record<string, unknown>): Record<string, unknown> {
  const fields = profileData.fields;
  if (fields && typeof fields === "object" && !Array.isArray(fields)) {
    return { ...(fields as Record<string, unknown>) };
  }
  return {};
}

export function memoryGetBusinessProfile(customerId: string): BusinessProfileSnapshot | null {
  if (customerId !== FICTIONAL_PROFILE_CUSTOMER_ID) return null;
  const s = state();
  return {
    customerId,
    currentRevision: s.currentRevision,
    profileSchemaVersion: 1,
    profileData: structuredClone(s.profileData),
    fields: asFields(s.profileData),
    publication: readPublicationState(s.profileData, s.currentRevision),
    status: "active",
    updatedAt: new Date().toISOString(),
  };
}

export function memoryListRevisions(customerId: string) {
  if (customerId !== FICTIONAL_PROFILE_CUSTOMER_ID) return [];
  return state()
    .revisions.slice()
    .sort((a, b) => b.revisionNumber - a.revisionNumber)
    .map((r) => ({
      revisionNumber: r.revisionNumber,
      changeSource: r.changeSource,
      changeImpact: r.changeImpact,
      actorType: r.actorType,
      actorRef: r.actorRef,
      status: r.status,
      createdAt: r.createdAt,
      fieldCount: Object.keys(asFields(r.profileData)).filter((k) => !k.startsWith("_")).length,
    }));
}

export function memoryCreateSession(customerId: string) {
  if (customerId !== FICTIONAL_PROFILE_CUSTOMER_ID) {
    throw new Error("memory_store_customer_required");
  }
  const token = generateToken();
  const id = `mem-session-${Date.now()}`;
  state().sessions.push({
    id,
    customerId,
    tokenHash: hashToken(token),
    expiresAt: Date.now() + 60 * 60 * 1000,
    revoked: false,
  });
  return { token, expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), sessionId: id };
}

export function memoryResolveSession(rawToken: string): {
  ok: true;
  customerId: string;
  sessionId: string;
} | { ok: false; reason: string } {
  const tokenHash = hashToken(rawToken);
  const row = state().sessions.find((s) => s.tokenHash === tokenHash);
  if (!row) return { ok: false, reason: "invalid_token" };
  if (row.revoked) return { ok: false, reason: "revoked" };
  if (row.expiresAt <= Date.now()) return { ok: false, reason: "expired" };
  return { ok: true, customerId: row.customerId, sessionId: row.id };
}

export function memoryApplyEdit(input: {
  customerId: string;
  expectedRevision: number;
  patch: Record<string, unknown>;
  actorType?: string;
  actorRef?: string | null;
  changeSource?: "customer_self_service" | "internal_admin";
}): ApplyProfileEditResult {
  if (input.customerId !== FICTIONAL_PROFILE_CUSTOMER_ID) {
    return { ok: false, reason: "not_found" };
  }
  const validated = validateFieldPatch(input.patch);
  if (!validated.ok) return { ok: false, reason: "validation_failed", details: validated.errors };

  const s = state();
  if (s.currentRevision !== input.expectedRevision) {
    return { ok: false, reason: "revision_conflict", details: { currentRevision: s.currentRevision } };
  }

  const priorFields = asFields(s.profileData);
  const nextFields = { ...priorFields, ...validated.fields };
  const diff = diffProfileFields(priorFields, nextFields);
  if (!diff.changes.length) return { ok: false, reason: "empty_patch" };

  const nextRevision = s.currentRevision + 1;
  let publication = readPublicationState(s.profileData, s.currentRevision);
  publication = {
    ...publication,
    status: diff.requiresQa ? "qa_required" : "draft",
    profileRevision: nextRevision,
    configContentSha256: null,
    lastFailure: null,
    qaRequirements: publication.qaRequirements.map((r) => ({
      ...r,
      satisfied: false,
      satisfiedAt: null,
    })),
    updatedAt: new Date().toISOString(),
  };

  const nextProfileData = writePublicationIntoProfile(
    {
      schema: BUSINESS_PROFILE_SCHEMA_NAME,
      questionnaire: s.profileData.questionnaire ?? null,
      fields: nextFields,
      _isolation: (s.profileData as { _isolation?: unknown })._isolation,
      _last_diff: {
        revision: nextRevision,
        impact: diff.revisionImpact,
        changeCount: diff.changes.length,
        questionIds: diff.changes.map((c) => c.questionId),
      },
      _original_questionnaire_untouched: true,
    },
    publication,
  );

  for (const rev of s.revisions) {
    if (rev.status === "active") rev.status = "superseded";
  }
  s.revisions.push({
    revisionNumber: nextRevision,
    profileData: structuredClone(nextProfileData),
    changeSource: input.changeSource || "customer_self_service",
    changeImpact: diff.revisionImpact,
    actorType: input.actorType || "customer",
    actorRef: input.actorRef || null,
    status: "active",
    createdAt: new Date().toISOString(),
  });
  s.currentRevision = nextRevision;
  s.profileData = nextProfileData;

  return {
    ok: true,
    revisionNumber: nextRevision,
    diff,
    publication,
    trilletSyncRequired: diff.requiresTrilletSync,
  };
}

export function memoryUpdatePublication(
  customerId: string,
  updater: (current: PublicationState, profileData: Record<string, unknown>) => PublicationState,
): PublicationState | null {
  if (customerId !== FICTIONAL_PROFILE_CUSTOMER_ID) return null;
  const s = state();
  const current = readPublicationState(s.profileData, s.currentRevision);
  const next = updater(current, s.profileData);
  s.profileData = writePublicationIntoProfile(s.profileData, next);
  return next;
}

export function memoryPublish(input: {
  customerId: string;
  action: "mark_qa" | "publish" | "mark_failed";
  requirementId?: string;
  satisfied?: boolean;
}): PublicationState | null {
  return memoryUpdatePublication(input.customerId, (publication) => {
    if (input.action === "mark_qa" && input.requirementId) {
      return markQaRequirement(publication, input.requirementId, input.satisfied !== false);
    }
    if (input.action === "mark_failed") {
      return {
        ...publication,
        status: "sync_failed",
        lastFailure: {
          code: "sync_failed",
          message: "Publication failed",
          at: new Date().toISOString(),
        },
      };
    }
    if (!publication.configContentSha256 || !allRequiredQaSatisfied(publication)) {
      return {
        ...publication,
        status: "qa_required",
        lastFailure: {
          code: "qa_incomplete",
          message: "Generate config and satisfy QA before publish",
          at: new Date().toISOString(),
        },
      };
    }
    return {
      ...publication,
      status: "published",
      approvedProfileRevision: publication.profileRevision,
      approvedConfigContentSha256: publication.configContentSha256,
      lastFailure: null,
    };
  });
}

export function memoryRollback(input: {
  customerId: string;
  expectedRevision: number;
  actorRef?: string | null;
}): ApplyProfileEditResult {
  if (input.customerId !== FICTIONAL_PROFILE_CUSTOMER_ID) {
    return { ok: false, reason: "not_found" };
  }
  const s = state();
  if (s.currentRevision !== input.expectedRevision) {
    return { ok: false, reason: "revision_conflict", details: { currentRevision: s.currentRevision } };
  }
  const publication = readPublicationState(s.profileData, s.currentRevision);
  const approvedRev = publication.approvedProfileRevision;
  if (approvedRev == null) {
    return { ok: false, reason: "validation_failed", details: ["no_approved_configuration"] };
  }
  const approved = s.revisions.find((r) => r.revisionNumber === approvedRev);
  if (!approved) {
    return { ok: false, reason: "validation_failed", details: ["approved_revision_missing"] };
  }

  const priorFields = asFields(s.profileData);
  const restoredFields = asFields(approved.profileData);
  const diff = diffProfileFields(priorFields, restoredFields);
  const nextRevision = s.currentRevision + 1;
  const nextPublication: PublicationState = {
    ...emptyPublicationState(nextRevision),
    status: "rolled_back",
    profileRevision: nextRevision,
    configContentSha256: publication.approvedConfigContentSha256,
    approvedProfileRevision: approvedRev,
    approvedConfigContentSha256: publication.approvedConfigContentSha256,
    qaRequirements: publication.qaRequirements.map((r) => ({ ...r, satisfied: true })),
  };
  const nextProfileData = writePublicationIntoProfile(
    {
      schema: BUSINESS_PROFILE_SCHEMA_NAME,
      questionnaire: approved.profileData.questionnaire ?? s.profileData.questionnaire ?? null,
      fields: restoredFields,
      _isolation: (s.profileData as { _isolation?: unknown })._isolation,
      _rollback_from: s.currentRevision,
      _rollback_to: approvedRev,
      _original_questionnaire_untouched: true,
    },
    nextPublication,
  );

  for (const rev of s.revisions) {
    if (rev.status === "active") rev.status = "superseded";
  }
  s.revisions.push({
    revisionNumber: nextRevision,
    profileData: structuredClone(nextProfileData),
    changeSource: "internal_admin",
    changeImpact: diff.revisionImpact === "low" ? "low" : "high",
    actorType: "system",
    actorRef: input.actorRef || "rollback",
    status: "active",
    createdAt: new Date().toISOString(),
  });
  s.currentRevision = nextRevision;
  s.profileData = nextProfileData;

  return {
    ok: true,
    revisionNumber: nextRevision,
    diff,
    publication: nextPublication,
    trilletSyncRequired: true,
  };
}

export function memoryOriginalQuestionnaireUntouched(customerId: string): boolean {
  if (customerId !== FICTIONAL_PROFILE_CUSTOMER_ID) return false;
  const s = state();
  // Original seed snapshot must remain byte-stable regardless of later edits.
  return JSON.stringify(s.originalQuestionnaireFields) === JSON.stringify(seedFields());
}

export function memoryResetForTests(): void {
  globalThis.__alexanderProfileMemoryStore = createSeedState();
}
