import { NextRequest, NextResponse } from "next/server";
import { callOnboardingAccess, directAccessPool } from "@/lib/server/access-gateway";
import { getBusinessProfile } from "@/lib/server/persistence/business-profile-editor";
import { dryRunTrilletConfigSync } from "@/lib/server/persistence/trillet-config-sync";
import {
  JOBBER_ADMIN_COOKIE_NAME,
  assertCustomerScope,
  authorizeProfileRequest,
} from "@/lib/server/persistence/profile-staging-auth";
import { generateRuntimeConfiguration } from "@/lib/runtime-config/generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Dry-run only. Never writes to Trillet. Refuses Phillip/Lisa/Marina targets.
 * Requires staging admin — not customer session — because it reads Trillet API keys.
 */
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

  let body: {
    customerId?: string;
    workspaceId?: string;
    agentId?: string;
    callFlowId?: string;
  };
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
  const scope = assertCustomerScope(auth, customerId);
  if (!scope.ok) {
    return NextResponse.json(
      { ok: false, reason: scope.reason },
      { status: scope.status, headers: { "Cache-Control": "no-store" } },
    );
  }

  const apiKey = process.env.TRILLET_API_KEY || "";
  const workspaceId =
    body.workspaceId || process.env.STAGING_TRILLET_WORKSPACE_ID || "";
  if (!apiKey || !workspaceId) {
    return NextResponse.json(
      { ok: false, reason: "trillet_not_configured" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const profile = await callOnboardingAccess(
    (db) => getBusinessProfile(db, customerId),
    { operation: "getBusinessProfile", customerId },
  );
  if (!profile) {
    return NextResponse.json(
      { ok: false, reason: "not_found" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  const runtimeConfig = generateRuntimeConfiguration({
    fields: profile.fields,
    profileRevision: profile.currentRevision,
    customerId,
    questionnaire: profile.profileData.questionnaire,
  });

  const dryRun = await dryRunTrilletConfigSync({
    apiKey,
    workspaceId,
    agentId: body.agentId || process.env.STAGING_TRILLET_AGENT_ID || null,
    callFlowId: body.callFlowId || process.env.STAGING_TRILLET_FLOW_ID || null,
    runtimeConfig,
  });

  return NextResponse.json(dryRun, {
    status: dryRun.ok ? 200 : 400,
    headers: { "Cache-Control": "no-store" },
  });
}
