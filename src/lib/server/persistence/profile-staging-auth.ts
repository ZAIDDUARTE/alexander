import {
  authorizeJobberAdmin,
  JOBBER_ADMIN_COOKIE,
} from "@/lib/server/requests/jobber-oauth-session";
import type { SqlPool } from "./onboarding-access";
import { assertEditingAllowed } from "./business-profile-editor";
import { profileResolveSessionToken } from "./profile-backend";
import { profileMemoryStoreEnabled } from "./profile-memory-store";

export type ProfileAuth =
  | { ok: true; mode: "staging_admin"; actorRef: string }
  | { ok: true; mode: "customer_session"; customerId: string; sessionId: string; actorRef: string }
  | { ok: false; reason: string; status: number };

export async function authorizeProfileRequest(input: {
  pool: SqlPool | null;
  authorizationHeader: string | null;
  adminCookie: string | null;
  profileTokenHeader: string | null;
  exp?: string | null;
  sig?: string | null;
}): Promise<ProfileAuth> {
  const gate = assertEditingAllowed();
  if (!gate.ok) {
    return { ok: false, reason: "editing_disabled", status: 503 };
  }

  const adminToken = process.env.JOBBER_OAUTH_ADMIN_TOKEN || "";
  if (adminToken) {
    const admin = authorizeJobberAdmin({
      adminToken,
      authorizationHeader: input.authorizationHeader,
      adminCookie: input.adminCookie,
      exp: input.exp ?? null,
      sig: input.sig ?? null,
    });
    if (admin.ok) {
      return { ok: true, mode: "staging_admin", actorRef: "staging_admin" };
    }
  }

  // Preview memory-store isolation: allow a dedicated non-production editor token.
  const memoryAdmin = (process.env.ALEXANDER_PROFILE_EDITOR_PREVIEW_TOKEN || "").trim();
  const bearer = extractBearer(input.authorizationHeader) || input.profileTokenHeader;
  if (
    profileMemoryStoreEnabled() &&
    memoryAdmin &&
    bearer &&
    bearer === memoryAdmin &&
    String(process.env.VERCEL_ENV || "").toLowerCase() !== "production"
  ) {
    return { ok: true, mode: "staging_admin", actorRef: "preview_memory_admin" };
  }

  if (bearer) {
    const session = await profileResolveSessionToken(bearer);
    if (session.ok) {
      return {
        ok: true,
        mode: "customer_session",
        customerId: session.customerId,
        sessionId: session.sessionId,
        actorRef: `session:${session.sessionId}`,
      };
    }
    return { ok: false, reason: session.reason, status: 401 };
  }

  return { ok: false, reason: "unauthorized", status: 401 };
}

export function extractBearer(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authorizationHeader.trim());
  return match ? match[1].trim() : null;
}

export function JOBBER_ADMIN_COOKIE_NAME(): string {
  return JOBBER_ADMIN_COOKIE;
}

export function assertCustomerScope(
  auth: Extract<ProfileAuth, { ok: true }>,
  customerId: string,
): { ok: true } | { ok: false; reason: string; status: number } {
  if (auth.mode === "staging_admin") return { ok: true };
  if (auth.customerId !== customerId) {
    return { ok: false, reason: "customer_scope_mismatch", status: 403 };
  }
  return { ok: true };
}
