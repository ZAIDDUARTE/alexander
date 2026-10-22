import { directAccessPool } from "@/lib/server/access-gateway";
import {
  applyCustomerProfileEdit,
  createProfileUpdateSession,
  getBusinessProfile,
  listProfileRevisions,
  rollbackToApprovedConfiguration,
  updatePublicationState,
  resolveProfileUpdateSession,
} from "./business-profile-editor";
import {
  FICTIONAL_PROFILE_CUSTOMER_ID,
  memoryApplyEdit,
  memoryCreateSession,
  memoryGetBusinessProfile,
  memoryListRevisions,
  memoryOriginalQuestionnaireUntouched,
  memoryPublish,
  memoryResolveSession,
  memoryRollback,
  memoryUpdatePublication,
  profileMemoryStoreEnabled,
} from "./profile-memory-store";
import type { PublicationState } from "./profile-publication";

export type ProfileBackendMode = "memory_store" | "direct_sql" | "shared_lambda_blocked";

export function resolveProfileBackendMode(
  env: NodeJS.ProcessEnv = process.env,
): ProfileBackendMode {
  if (profileMemoryStoreEnabled(env)) return "memory_store";
  if (env.ONBOARDING_DATABASE_URL && String(env.ALEXANDER_PROFILE_EDITOR_ALLOW_SHARED_BACKEND || "").toLowerCase() !== "true") {
    // Direct SQL against a dedicated URL is allowed only when explicitly marked isolated.
    if (String(env.ALEXANDER_PROFILE_EDITOR_ISOLATED_DATABASE || "").toLowerCase() === "true") {
      return "direct_sql";
    }
  }
  if (String(env.ALEXANDER_PROFILE_EDITOR_ALLOW_SHARED_BACKEND || "").toLowerCase() === "true") {
    return "direct_sql";
  }
  // Default Preview/Production path uses shared Lambda/Postgres — refuse writes.
  return "shared_lambda_blocked";
}

export function sharedBackendBlockedResponse() {
  return {
    ok: false as const,
    reason: "shared_backend_blocked",
    detail:
      "Preview shares Production Lambda/PostgreSQL. Profile editor writes require ALEXANDER_PROFILE_EDITOR_MEMORY_STORE=true (isolated fictional tenant) or an approved isolated database (ALEXANDER_PROFILE_EDITOR_ISOLATED_DATABASE=true + ONBOARDING_DATABASE_URL).",
    fictionalCustomerId: FICTIONAL_PROFILE_CUSTOMER_ID,
  };
}

export async function profileGet(customerId: string) {
  const mode = resolveProfileBackendMode();
  if (mode === "memory_store") {
    return {
      mode,
      profile: memoryGetBusinessProfile(customerId),
      originalQuestionnaireUntouched: memoryOriginalQuestionnaireUntouched(customerId),
    };
  }
  if (mode === "shared_lambda_blocked") {
    return { mode, ...sharedBackendBlockedResponse(), profile: null };
  }
  const pool = await directAccessPool();
  if (!pool) return { mode, profile: null, reason: "database_unavailable" };
  return {
    mode,
    profile: await getBusinessProfile(pool, customerId),
    originalQuestionnaireUntouched: null,
  };
}

export async function profileListHistory(customerId: string) {
  const mode = resolveProfileBackendMode();
  if (mode === "memory_store") {
    return { mode, revisions: memoryListRevisions(customerId) };
  }
  if (mode === "shared_lambda_blocked") {
    return { mode, ...sharedBackendBlockedResponse(), revisions: [] };
  }
  const pool = await directAccessPool();
  if (!pool) return { mode, revisions: [], reason: "database_unavailable" };
  return { mode, revisions: await listProfileRevisions(pool, customerId) };
}

export async function profileCreateSession(customerId: string) {
  const mode = resolveProfileBackendMode();
  if (mode === "memory_store") {
    return { mode, ...memoryCreateSession(customerId) };
  }
  if (mode === "shared_lambda_blocked") {
    return { mode, ...sharedBackendBlockedResponse() };
  }
  const pool = await directAccessPool();
  if (!pool) return { mode, ok: false as const, reason: "database_unavailable" };
  return { mode, ...(await createProfileUpdateSession(pool, customerId)) };
}

export async function profileApplyEdit(input: {
  customerId: string;
  expectedRevision: number;
  patch: Record<string, unknown>;
  actorType?: string;
  actorRef?: string | null;
  changeSource?: "customer_self_service" | "internal_admin";
}) {
  const mode = resolveProfileBackendMode();
  if (mode === "memory_store") {
    return { mode, ...(await Promise.resolve(memoryApplyEdit(input))) };
  }
  if (mode === "shared_lambda_blocked") {
    return { mode, ...sharedBackendBlockedResponse() };
  }
  const pool = await directAccessPool();
  if (!pool) return { mode, ok: false as const, reason: "database_unavailable" };
  return { mode, ...(await applyCustomerProfileEdit(pool, input)) };
}

export async function profileUpdatePublication(
  customerId: string,
  updater: (current: PublicationState, profileData: Record<string, unknown>) => PublicationState,
) {
  const mode = resolveProfileBackendMode();
  if (mode === "memory_store") {
    return { mode, publication: memoryUpdatePublication(customerId, updater) };
  }
  if (mode === "shared_lambda_blocked") {
    return { mode, ...sharedBackendBlockedResponse() };
  }
  const pool = await directAccessPool();
  if (!pool) return { mode, publication: null, reason: "database_unavailable" };
  return { mode, publication: await updatePublicationState(pool, customerId, updater) };
}

export async function profilePublish(input: {
  customerId: string;
  action: "mark_qa" | "publish" | "mark_failed";
  requirementId?: string;
  satisfied?: boolean;
}) {
  const mode = resolveProfileBackendMode();
  if (mode === "memory_store") {
    return { mode, publication: memoryPublish(input) };
  }
  if (mode === "shared_lambda_blocked") {
    return { mode, ...sharedBackendBlockedResponse() };
  }
  // SQL path uses updatePublicationState via route-specific logic.
  return { mode, publication: null, reason: "use_sql_publish_route" };
}

export async function profileRollback(input: {
  customerId: string;
  expectedRevision: number;
  actorRef?: string | null;
}) {
  const mode = resolveProfileBackendMode();
  if (mode === "memory_store") {
    return { mode, ...memoryRollback(input) };
  }
  if (mode === "shared_lambda_blocked") {
    return { mode, ...sharedBackendBlockedResponse() };
  }
  const pool = await directAccessPool();
  if (!pool) return { mode, ok: false as const, reason: "database_unavailable" };
  return { mode, ...(await rollbackToApprovedConfiguration(pool, input)) };
}

export async function profileResolveSessionToken(rawToken: string) {
  if (profileMemoryStoreEnabled()) {
    return memoryResolveSession(rawToken);
  }
  const pool = await directAccessPool();
  if (!pool) return { ok: false as const, reason: "database_unavailable" };
  return resolveProfileUpdateSession(pool, rawToken);
}
