import { NextRequest, NextResponse } from "next/server";
import {
  jobberOAuthEnabled,
  missingJobberAdminConfigNames,
} from "@/lib/server/requests/jobber-config";
import {
  authorizeJobberAdmin,
  JOBBER_ADMIN_COOKIE,
} from "@/lib/server/requests/jobber-oauth-session";
import { parseApprovedCallIds, pollStagingCompletedCalls } from "@/lib/server/requests/trillet-poll";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Secure one-call QA import.
 * Requires admin auth + callId present in STAGING_TRILLET_APPROVED_CALL_IDS.
 * Does not scan historical calls.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (process.env.ALEXANDER_REQUEST_PIPELINE_ENABLED !== "true") {
    return NextResponse.json({ error: "disabled" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (!jobberOAuthEnabled() || missingJobberAdminConfigNames().length) {
    return NextResponse.json({ error: "disabled" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  const adminToken = (process.env.JOBBER_OAUTH_ADMIN_TOKEN || "").trim();
  const auth = authorizeJobberAdmin({
    adminToken,
    authorizationHeader: request.headers.get("authorization"),
    adminCookie: request.cookies.get(JOBBER_ADMIN_COOKIE)?.value ?? null,
    exp: request.nextUrl.searchParams.get("exp"),
    sig: request.nextUrl.searchParams.get("sig"),
  });
  if (!auth.ok) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  let callId = "";
  try {
    const body = (await request.json()) as { callId?: unknown };
    callId = typeof body.callId === "string" ? body.callId.trim() : "";
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  if (!/^[a-zA-Z0-9_-]{8,128}$/.test(callId)) {
    return NextResponse.json({ error: "invalid_call_id" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const apiKey = (process.env.TRILLET_API_KEY || "").trim();
  const workspaceId = (process.env.STAGING_TRILLET_WORKSPACE_ID || "").trim();
  const flowId = (process.env.STAGING_TRILLET_FLOW_ID || "").trim();
  const agentId = (process.env.STAGING_TRILLET_AGENT_ID || "").trim();
  const webhookToken = (process.env.STAGING_REQUEST_WEBHOOK_TOKEN || "").trim();
  const approvedCallIds = parseApprovedCallIds(process.env.STAGING_TRILLET_APPROVED_CALL_IDS);
  if (!apiKey || !workspaceId || !flowId || !agentId || !webhookToken) {
    return NextResponse.json({ error: "not_configured" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const result = await pollStagingCompletedCalls({
      apiKey,
      workspaceId,
      flowId,
      agentId,
      webhookToken,
      approvedCallIds,
      onlyCallId: callId,
    });
    return NextResponse.json(result, {
      status: result.ok ? 200 : 400,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, reason: err instanceof Error ? err.message : "import_failed" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
