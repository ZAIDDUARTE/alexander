import { NextRequest, NextResponse } from "next/server";
import { directAccessPool } from "@/lib/server/access-gateway";
import { profileRollback } from "@/lib/server/persistence/profile-backend";
import {
  JOBBER_ADMIN_COOKIE_NAME,
  assertCustomerScope,
  authorizeProfileRequest,
} from "@/lib/server/persistence/profile-staging-auth";
import { FICTIONAL_PROFILE_CUSTOMER_ID } from "@/lib/server/persistence/profile-memory-store";

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

  const customerId = String(body.customerId || FICTIONAL_PROFILE_CUSTOMER_ID).trim();
  const expectedRevision = Number(body.expectedRevision);
  if (!Number.isFinite(expectedRevision)) {
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

  const result = await profileRollback({
    customerId,
    expectedRevision,
    actorRef: auth.actorRef,
  });
  if ("reason" in result && result.reason === "shared_backend_blocked") {
    return NextResponse.json(result, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (!("ok" in result) || !result.ok) {
    const reason = "reason" in result ? String(result.reason) : "failed";
    const status =
      reason === "revision_conflict" ? 409 : reason === "not_found" ? 404 : 400;
    return NextResponse.json(result, { status, headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
