import { NextRequest, NextResponse } from "next/server";
import { callOnboardingAccess } from "@/lib/server/access-gateway";
import {
  jobberOAuthEnabled,
  loadJobberRuntimeConfig,
  missingJobberAdminConfigNames,
} from "@/lib/server/requests/jobber-config";
import {
  authorizeJobberAdmin,
  JOBBER_ADMIN_COOKIE,
} from "@/lib/server/requests/jobber-oauth-session";
import { listServiceRequestsByCustomer } from "@/lib/server/requests/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Staging-only request board backed by real persisted rows. Admin-gated. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!jobberOAuthEnabled()) {
    return NextResponse.json({ error: "disabled" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (missingJobberAdminConfigNames().length) {
    return NextResponse.json({ error: "not_configured" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  let config;
  try {
    config = loadJobberRuntimeConfig();
  } catch {
    return NextResponse.json({ error: "not_configured" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  const auth = authorizeJobberAdmin({
    adminToken: config.adminToken,
    authorizationHeader: request.headers.get("authorization"),
    adminCookie: request.cookies.get(JOBBER_ADMIN_COOKIE)?.value ?? null,
    exp: request.nextUrl.searchParams.get("exp"),
    sig: request.nextUrl.searchParams.get("sig"),
  });
  if (!auth.ok) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const listed = await callOnboardingAccess(
    (pool) => listServiceRequestsByCustomer(pool, config.stagingCustomerId),
    { operation: "listServiceRequestsByCustomer", customerId: config.stagingCustomerId },
  );

  if (!listed || typeof listed !== "object" || !("ok" in listed) || listed.ok !== true) {
    return NextResponse.json(
      { ok: false, reason: (listed as { reason?: string })?.reason || "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(listed, { headers: { "Cache-Control": "no-store" } });
}
