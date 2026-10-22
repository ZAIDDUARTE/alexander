import { NextRequest, NextResponse } from "next/server";
import { callOnboardingAccess, directAccessPool } from "@/lib/server/access-gateway";
import {
  applyCustomerProfileEdit,
  getBusinessProfile,
} from "@/lib/server/persistence/business-profile-editor";
import { groupEditableSettingsBySection } from "@/lib/server/persistence/profile-editable-catalog";
import {
  JOBBER_ADMIN_COOKIE_NAME,
  assertCustomerScope,
  authorizeProfileRequest,
} from "@/lib/server/persistence/profile-staging-auth";

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
      : request.nextUrl.searchParams.get("customerId") || "";
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

  const result = await callOnboardingAccess(
    (pool) => getBusinessProfile(pool, customerId),
    { operation: "getBusinessProfile", customerId },
  );

  if (!result) {
    return NextResponse.json(
      { ok: false, reason: "not_found" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      profile: result,
      editableCatalog: groupEditableSettingsBySection(),
      authMode: auth.mode,
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
    auth.mode === "customer_session" ? auth.customerId : String(body.customerId || "");
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

  const expectedRevision = Number(body.expectedRevision);
  if (!Number.isFinite(expectedRevision) || expectedRevision < 0) {
    return NextResponse.json(
      { ok: false, reason: "expected_revision_required" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const result = await callOnboardingAccess(
    (pool) =>
      applyCustomerProfileEdit(pool, {
        customerId,
        expectedRevision,
        patch: body.patch || {},
        actorType: auth.mode === "staging_admin" ? "internal_admin" : "customer",
        actorRef: auth.actorRef,
        changeSource:
          auth.mode === "staging_admin" ? "internal_admin" : "customer_self_service",
      }),
    {
      operation: "applyCustomerProfileEdit",
      customerId,
      expectedRevision,
      patch: body.patch || {},
      actorRef: auth.actorRef,
      changeSource:
        auth.mode === "staging_admin" ? "internal_admin" : "customer_self_service",
    },
  );

  if (!result || typeof result !== "object" || !("ok" in result)) {
    return NextResponse.json(
      { ok: false, reason: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (!result.ok) {
    const status =
      result.reason === "revision_conflict"
        ? 409
        : result.reason === "not_found"
          ? 404
          : result.reason === "editing_disabled"
            ? 503
            : 400;
    return NextResponse.json(result, { status, headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
