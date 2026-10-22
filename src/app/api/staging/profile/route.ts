import { NextRequest, NextResponse } from "next/server";
import { directAccessPool } from "@/lib/server/access-gateway";
import { profileApplyEdit, profileGet } from "@/lib/server/persistence/profile-backend";
import { groupEditableSettingsBySection } from "@/lib/server/persistence/profile-editable-catalog";
import {
  JOBBER_ADMIN_COOKIE_NAME,
  assertCustomerScope,
  authorizeProfileRequest,
} from "@/lib/server/persistence/profile-staging-auth";
import { FICTIONAL_PROFILE_CUSTOMER_ID } from "@/lib/server/persistence/profile-memory-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authorize(request: NextRequest) {
  const pool = await directAccessPool();
  return authorizeProfileRequest({
    pool,
    authorizationHeader: request.headers.get("authorization"),
    adminCookie: request.cookies.get(JOBBER_ADMIN_COOKIE_NAME())?.value ?? null,
    profileTokenHeader: request.headers.get("x-alexander-profile-token"),
    exp: request.nextUrl.searchParams.get("exp"),
    sig: request.nextUrl.searchParams.get("sig"),
  });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await authorize(request);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, reason: auth.reason },
      { status: auth.status, headers: { "Cache-Control": "no-store" } },
    );
  }

  const customerId =
    auth.mode === "customer_session"
      ? auth.customerId
      : request.nextUrl.searchParams.get("customerId") || FICTIONAL_PROFILE_CUSTOMER_ID;
  const scope = assertCustomerScope(auth, customerId);
  if (!scope.ok) {
    return NextResponse.json(
      { ok: false, reason: scope.reason },
      { status: scope.status, headers: { "Cache-Control": "no-store" } },
    );
  }

  const result = await profileGet(customerId);
  if ("reason" in result && result.reason === "shared_backend_blocked") {
    return NextResponse.json(result, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (!result.profile) {
    return NextResponse.json(
      { ok: false, reason: "not_found", mode: result.mode },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      mode: result.mode,
      profile: result.profile,
      originalQuestionnaireUntouched: result.originalQuestionnaireUntouched,
      editableCatalog: groupEditableSettingsBySection(),
      authMode: auth.mode,
      fictionalCustomerId: FICTIONAL_PROFILE_CUSTOMER_ID,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const auth = await authorize(request);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, reason: auth.reason },
      { status: auth.status, headers: { "Cache-Control": "no-store" } },
    );
  }

  let body: {
    customerId?: string;
    expectedRevision?: number;
    patch?: Record<string, unknown>;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { ok: false, reason: "invalid_json" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const customerId =
    auth.mode === "customer_session"
      ? auth.customerId
      : String(body.customerId || FICTIONAL_PROFILE_CUSTOMER_ID);
  const scope = assertCustomerScope(auth, customerId);
  if (!scope.ok) {
    return NextResponse.json(
      { ok: false, reason: scope.reason },
      { status: scope.status, headers: { "Cache-Control": "no-store" } },
    );
  }

  const expectedRevision = Number(body.expectedRevision);
  if (!Number.isFinite(expectedRevision) || expectedRevision < 0) {
    return NextResponse.json(
      { ok: false, reason: "expected_revision_required" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const result = await profileApplyEdit({
    customerId,
    expectedRevision,
    patch: body.patch || {},
    actorType: auth.mode === "staging_admin" ? "internal_admin" : "customer",
    actorRef: auth.actorRef,
    changeSource: auth.mode === "staging_admin" ? "internal_admin" : "customer_self_service",
  });

  if ("reason" in result && result.reason === "shared_backend_blocked") {
    return NextResponse.json(result, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (!("ok" in result) || !result.ok) {
    const reason = "reason" in result ? String(result.reason) : "failed";
    const status =
      reason === "revision_conflict"
        ? 409
        : reason === "not_found"
          ? 404
          : reason === "editing_disabled"
            ? 503
            : 400;
    return NextResponse.json(result, { status, headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
