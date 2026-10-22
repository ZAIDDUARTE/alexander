import { NextRequest, NextResponse } from "next/server";
import { callOnboardingAccess, directAccessPool } from "@/lib/server/access-gateway";
import { createProfileUpdateSession } from "@/lib/server/persistence/business-profile-editor";
import {
  JOBBER_ADMIN_COOKIE_NAME,
  authorizeProfileRequest,
} from "@/lib/server/persistence/profile-staging-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Staging admin only — issues a short-lived customer profile edit session. */
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

  let body: { customerId?: string };
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

  const session = await callOnboardingAccess(
    (db) => createProfileUpdateSession(db, customerId),
    { operation: "createProfileUpdateSession", customerId },
  );

  if (!session || typeof session !== "object" || !("token" in session)) {
    return NextResponse.json(
      { ok: false, reason: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { ok: true, ...session, customerId },
    { headers: { "Cache-Control": "no-store" } },
  );
}
