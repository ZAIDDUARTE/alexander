import { NextRequest, NextResponse } from "next/server";
import { callOnboardingAccess, directAccessPool } from "@/lib/server/access-gateway";
import { rollbackToApprovedConfiguration } from "@/lib/server/persistence/business-profile-editor";
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
    profileTokenHeader: null,
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

  let body: { customerId?: string; expectedRevision?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { ok: false, reason: "invalid_json" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const customerId = String(body.customerId || "").trim();
  const expectedRevision = Number(body.expectedRevision);
  if (!customerId || !Number.isFinite(expectedRevision)) {
    return NextResponse.json(
      { ok: false, reason: "customer_id_and_revision_required" },
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
    (db) =>
      rollbackToApprovedConfiguration(db, {
        customerId,
        expectedRevision,
        actorRef: auth.actorRef,
      }),
    {
      operation: "rollbackToApprovedConfiguration",
      customerId,
      expectedRevision,
      actorRef: auth.actorRef,
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
          : 400;
    return NextResponse.json(result, { status, headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
