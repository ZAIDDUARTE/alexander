import { NextRequest, NextResponse } from "next/server";
import { callOnboardingAccess, directAccessPool } from "@/lib/server/access-gateway";
import { listProfileRevisions } from "@/lib/server/persistence/business-profile-editor";
import {
  JOBBER_ADMIN_COOKIE_NAME,
  assertCustomerScope,
  authorizeProfileRequest,
} from "@/lib/server/persistence/profile-staging-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
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

  const revisions = await callOnboardingAccess(
    (db) => listProfileRevisions(db, customerId),
    { operation: "listProfileRevisions", customerId },
  );

  return NextResponse.json(
    { ok: true, customerId, revisions: revisions || [] },
    { headers: { "Cache-Control": "no-store" } },
  );
}
