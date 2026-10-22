import { NextRequest, NextResponse } from "next/server";
import { directAccessPool } from "@/lib/server/access-gateway";
import { profileListHistory } from "@/lib/server/persistence/profile-backend";
import {
  JOBBER_ADMIN_COOKIE_NAME,
  assertCustomerScope,
  authorizeProfileRequest,
} from "@/lib/server/persistence/profile-staging-auth";
import { FICTIONAL_PROFILE_CUSTOMER_ID } from "@/lib/server/persistence/profile-memory-store";

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
      : request.nextUrl.searchParams.get("customerId") || FICTIONAL_PROFILE_CUSTOMER_ID;
  const scope = assertCustomerScope(auth, customerId);
  if (!scope.ok) {
    return NextResponse.json(
      { ok: false, reason: scope.reason },
      { status: scope.status, headers: { "Cache-Control": "no-store" } },
    );
  }

  const result = await profileListHistory(customerId);
  if ("reason" in result && result.reason === "shared_backend_blocked") {
    return NextResponse.json(result, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json(
    { ok: true, customerId, mode: result.mode, revisions: result.revisions || [] },
    { headers: { "Cache-Control": "no-store" } },
  );
}
