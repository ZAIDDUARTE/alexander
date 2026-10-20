import { NextRequest, NextResponse } from "next/server";
import {
  jobberOAuthEnabled,
  missingJobberAdminConfigNames,
} from "@/lib/server/requests/jobber-config";
import {
  authorizeJobberAdmin,
  JOBBER_ADMIN_COOKIE,
} from "@/lib/server/requests/jobber-oauth-session";
import { discoverTrilletSandbox } from "@/lib/server/requests/trillet-discover";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!jobberOAuthEnabled()) {
    return NextResponse.json({ error: "disabled" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (missingJobberAdminConfigNames().length) {
    return NextResponse.json({ error: "not_configured" }, { status: 503, headers: { "Cache-Control": "no-store" } });
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

  const apiKey = (process.env.TRILLET_API_KEY || "").trim();
  if (!apiKey) {
    return NextResponse.json({ error: "trillet_api_key_missing" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  const workspaceHint = (process.env.STAGING_TRILLET_WORKSPACE_ID || "").trim() || null;
  const envFlowId = (process.env.STAGING_TRILLET_FLOW_ID || "").trim() || null;
  const envAgentId = (process.env.STAGING_TRILLET_AGENT_ID || "").trim() || null;
  try {
    const discovered = await discoverTrilletSandbox(apiKey, workspaceHint, envFlowId, envAgentId);
    return NextResponse.json(
      {
        ...discovered,
        envHints: {
          STAGING_TRILLET_WORKSPACE_ID: Boolean(workspaceHint),
          STAGING_TRILLET_FLOW_ID: Boolean(envFlowId),
          STAGING_TRILLET_AGENT_ID: Boolean(envAgentId),
          TRILLET_API_KEY: true,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, reason: err instanceof Error ? err.message : "discover_failed" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
