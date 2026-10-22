import { NextRequest, NextResponse } from "next/server";
import { directAccessPool } from "@/lib/server/access-gateway";
import { profileGet, profilePublish } from "@/lib/server/persistence/profile-backend";
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
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { ok: false, reason: "invalid_json" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const customerId = String(body.customerId || FICTIONAL_PROFILE_CUSTOMER_ID).trim();
  const scope = assertCustomerScope(auth, customerId);
  if (!scope.ok) {
    return NextResponse.json(
      { ok: false, reason: scope.reason },
      { status: scope.status, headers: { "Cache-Control": "no-store" } },
    );
  }

  const loaded = await profileGet(customerId);
  if ("reason" in loaded && loaded.reason === "shared_backend_blocked") {
    return NextResponse.json(loaded, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (!loaded.profile) {
    return NextResponse.json(
      { ok: false, reason: "not_found" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  const updated = await profilePublish({
    customerId,
    action: body.action || "publish",
    requirementId: body.requirementId,
    satisfied: body.satisfied,
  });
  if ("reason" in updated && updated.reason === "shared_backend_blocked") {
    return NextResponse.json(updated, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json(
    {
      ok: true,
      mode: loaded.mode,
      publication: updated.publication,
      currentRevision: loaded.profile.currentRevision,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
