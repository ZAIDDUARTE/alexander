import { NextRequest, NextResponse } from "next/server";
import { directAccessPool } from "@/lib/server/access-gateway";
import { profileGet } from "@/lib/server/persistence/profile-backend";
import { dryRunTrilletConfigSync } from "@/lib/server/persistence/trillet-config-sync";
import {
  JOBBER_ADMIN_COOKIE_NAME,
  assertCustomerScope,
  authorizeProfileRequest,
} from "@/lib/server/persistence/profile-staging-auth";
import { FICTIONAL_PROFILE_CUSTOMER_ID } from "@/lib/server/persistence/profile-memory-store";
import { generateRuntimeConfiguration } from "@/lib/runtime-config/generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Dry-run only. Never writes to Trillet. Refuses Phillip/Lisa/Marina targets.
 * Requires staging admin. Uses generated config from isolated memory profile when enabled.
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
    body = {};
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

  const runtimeConfig = generateRuntimeConfiguration({
    fields: loaded.profile.fields,
    profileRevision: loaded.profile.currentRevision,
    customerId,
    questionnaire: loaded.profile.profileData.questionnaire,
  });

  const apiKey = process.env.TRILLET_API_KEY || "";
  const workspaceId = body.workspaceId || process.env.STAGING_TRILLET_WORKSPACE_ID || "";
  if (!apiKey || !workspaceId) {
    // Still return a planned dry-run payload without contacting Trillet.
    return NextResponse.json(
      {
        ok: true,
        mode: "dry_run",
        backendMode: loaded.mode,
        skippedLiveReads: true,
        reason: "trillet_not_configured",
        wouldWrite: true,
        plan: [
          {
            op: "update_call_flow_prompt",
            method: "PUT",
            path: "/v1/api/call-flows/{id}",
            executeInDryRun: false,
            reasonHeld: "dry_run_only",
            plannedBody: {
              promptType: "simple",
              promptChars: runtimeConfig.artifacts.callFlow.prompt.length,
            },
          },
        ],
        observations: {
          note: "No Trillet credentials in this environment; plan only.",
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const dryRun = await dryRunTrilletConfigSync({
    apiKey,
    workspaceId,
    agentId: body.agentId || process.env.STAGING_TRILLET_AGENT_ID || null,
    callFlowId: body.callFlowId || process.env.STAGING_TRILLET_FLOW_ID || null,
    runtimeConfig,
  });

  return NextResponse.json(
    { ...dryRun, backendMode: loaded.mode },
    {
      status: dryRun.ok ? 200 : 400,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
