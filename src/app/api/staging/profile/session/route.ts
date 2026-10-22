import { NextRequest, NextResponse } from "next/server";
import { directAccessPool } from "@/lib/server/access-gateway";
import { profileCreateSession } from "@/lib/server/persistence/profile-backend";
import {
  JOBBER_ADMIN_COOKIE_NAME,
  authorizeProfileRequest,
} from "@/lib/server/persistence/profile-staging-auth";
import { FICTIONAL_PROFILE_CUSTOMER_ID } from "@/lib/server/persistence/profile-memory-store";

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
    body = {};
  }
  const customerId = String(body.customerId || FICTIONAL_PROFILE_CUSTOMER_ID).trim();
  const session = await profileCreateSession(customerId);
  if ("reason" in session && session.reason === "shared_backend_blocked") {
    return NextResponse.json(session, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (!("token" in session)) {
    return NextResponse.json(
      { ...session, ok: false, reason: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { ok: true, ...session, customerId },
    { headers: { "Cache-Control": "no-store" } },
  );
}
