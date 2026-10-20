import { NextRequest, NextResponse } from "next/server";
import {
  jobberOAuthEnabled,
  missingJobberAdminConfigNames,
} from "@/lib/server/requests/jobber-config";
import {
  authorizeJobberAdmin,
  JOBBER_ADMIN_COOKIE,
} from "@/lib/server/requests/jobber-oauth-session";
import { equalSecret } from "@/lib/server/requests/intake";
import { parseApprovedCallIds, pollStagingCompletedCalls } from "@/lib/server/requests/trillet-poll";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorizePoll(request: NextRequest): boolean {
  const cronSecret = (process.env.STAGING_TRILLET_POLL_SECRET || "").trim();
  const header = request.headers.get("authorization") || "";
  if (cronSecret && /^Bearer /.test(header)) {
    const token = header.slice("Bearer ".length).trim();
    try {
      if (equalSecret(token, cronSecret)) return true;
    } catch {
      /* fall through */
    }
  }

  const adminToken = (process.env.JOBBER_OAUTH_ADMIN_TOKEN || "").trim();
  if (!adminToken || missingJobberAdminConfigNames().length) return false;
  return authorizeJobberAdmin({
    adminToken,
    authorizationHeader: request.headers.get("authorization"),
    adminCookie: request.cookies.get(JOBBER_ADMIN_COOKIE)?.value ?? null,
    exp: request.nextUrl.searchParams.get("exp"),
    sig: request.nextUrl.searchParams.get("sig"),
  }).ok;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (process.env.ALEXANDER_REQUEST_PIPELINE_ENABLED !== "true") {
    return NextResponse.json({ error: "disabled" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (!jobberOAuthEnabled()) {
    return NextResponse.json({ error: "disabled" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (!authorizePoll(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const apiKey = (process.env.TRILLET_API_KEY || "").trim();
  const workspaceId = (process.env.STAGING_TRILLET_WORKSPACE_ID || "").trim();
  const flowId = (process.env.STAGING_TRILLET_FLOW_ID || "").trim();
  const agentId = (process.env.STAGING_TRILLET_AGENT_ID || "").trim();
  const webhookToken = (process.env.STAGING_REQUEST_WEBHOOK_TOKEN || "").trim();
  if (!apiKey || !workspaceId || !flowId || !agentId || !webhookToken) {
    return NextResponse.json({ error: "not_configured" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  // Explicit enable flag + approved-call allowlist. Empty allowlist => process nothing.
  if ((process.env.STAGING_TRILLET_POLL_ENABLED || "").trim() !== "true") {
    return NextResponse.json(
      { ok: true, listed: 0, processed: 0, results: [], isolation: "poll_disabled" },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const approvedCallIds = parseApprovedCallIds(process.env.STAGING_TRILLET_APPROVED_CALL_IDS);

  try {
    const result = await pollStagingCompletedCalls({
      apiKey,
      workspaceId,
      flowId,
      agentId,
      webhookToken,
      approvedCallIds,
    });
    return NextResponse.json(result, {
      status: result.ok ? 200 : 502,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, reason: err instanceof Error ? err.message : "poll_failed" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
