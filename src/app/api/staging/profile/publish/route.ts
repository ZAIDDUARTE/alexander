import { NextRequest, NextResponse } from "next/server";
import { callOnboardingAccess, directAccessPool } from "@/lib/server/access-gateway";
import {
  getBusinessProfile,
  updatePublicationState,
} from "@/lib/server/persistence/business-profile-editor";
import {
  allRequiredQaSatisfied,
  markQaRequirement,
} from "@/lib/server/persistence/profile-publication";
import {
  JOBBER_ADMIN_COOKIE_NAME,
  assertCustomerScope,
  authorizeProfileRequest,
} from "@/lib/server/persistence/profile-staging-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const pool = await directAccessPool();
  const auth = await authorizeProfileRequest({
    pool,
    authorizationHeader: request.headers.get("authorization"),
    adminCookie: request.cookies.get(JOBBER_ADMIN_COOKIE_NAME())?.value ?? null,
    profileTokenHeader: request.headers.get("x-alexander-profile-token"),
    exp: request.nextUrl.searchParams.get("exp"),
    sig: request.nextUrl.searchParams.get("sig"),
  });
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, reason: auth.reason },
      { status: auth.status, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (auth.mode !== "staging_admin") {
    return NextResponse.json(
      { ok: false, reason: "admin_required" },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  let body: {
    customerId?: string;
    action?: "mark_qa" | "publish" | "mark_failed";
    requirementId?: string;
    satisfied?: boolean;
    failureCode?: string;
    failureMessage?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { ok: false, reason: "invalid_json" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const customerId = String(body.customerId || "").trim();
  if (!customerId) {
    return NextResponse.json(
      { ok: false, reason: "customer_id_required" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  const scope = assertCustomerScope(auth, customerId);
  if (!scope.ok) {
    return NextResponse.json(
      { ok: false, reason: scope.reason },
      { status: scope.status, headers: { "Cache-Control": "no-store" } },
    );
  }

  const profile = await callOnboardingAccess(
    (db) => getBusinessProfile(db, customerId),
    { operation: "getBusinessProfile", customerId },
  );
  if (!profile) {
    return NextResponse.json(
      { ok: false, reason: "not_found" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  const action = body.action || "publish";
  const updated = await callOnboardingAccess(
    (db) =>
      updatePublicationState(db, customerId, (publication) => {
        if (action === "mark_qa" && body.requirementId) {
          return markQaRequirement(publication, body.requirementId, body.satisfied !== false);
        }
        if (action === "mark_failed") {
          return {
            ...publication,
            status: "sync_failed",
            lastFailure: {
              code: body.failureCode || "sync_failed",
              message: body.failureMessage || "Publication failed",
              at: new Date().toISOString(),
            },
          };
        }
        if (!publication.configContentSha256) {
          return {
            ...publication,
            status: "sync_failed",
            lastFailure: {
              code: "config_required",
              message: "Generate runtime configuration before publish",
              at: new Date().toISOString(),
            },
          };
        }
        if (!allRequiredQaSatisfied(publication)) {
          return {
            ...publication,
            status: "qa_required",
            lastFailure: {
              code: "qa_incomplete",
              message: "All required QA checks must pass before publish",
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
      }),
    {
      operation: "updateProfilePublication",
      customerId,
      action,
      requirementId: body.requirementId,
    },
  );

  return NextResponse.json(
    { ok: true, publication: updated, currentRevision: profile.currentRevision },
    { headers: { "Cache-Control": "no-store" } },
  );
}
