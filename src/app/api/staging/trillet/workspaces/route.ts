import { NextRequest, NextResponse } from "next/server";
import { jobberOAuthEnabled, missingJobberAdminConfigNames } from "@/lib/server/requests/jobber-config";
import { authorizeJobberAdmin, JOBBER_ADMIN_COOKIE } from "@/lib/server/requests/jobber-oauth-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function probe(apiKey: string, workspaceHint: string, path: string) {
  const response = await fetch(`https://api.trillet.ai${path}`, {
    headers: {
      "x-api-key": apiKey,
      "x-workspace-id": workspaceHint,
      "Content-Type": "application/json",
    },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  });
  const text = await response.text();
  let body: unknown = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text.slice(0, 300) }; }
  const record = body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  const rows = Array.isArray(body)
    ? body
    : Array.isArray(record?.workspaces)
      ? (record!.workspaces as unknown[])
      : Array.isArray(record?.phoneNumbers)
        ? (record!.phoneNumbers as unknown[])
        : Array.isArray(record?.data)
          ? (record!.data as unknown[])
          : null;
  const summary = Array.isArray(rows)
    ? rows.slice(0, 50).map((raw) => {
        const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
        return {
          id: typeof r._id === "string" ? r._id : typeof r.id === "string" ? r.id : null,
          name: typeof r.name === "string" ? r.name : typeof r.phoneNumber === "string" ? r.phoneNumber : null,
          pathwayId: typeof r.pathwayId === "string" ? r.pathwayId : null,
          agentId: typeof r.agentId === "string" ? r.agentId : null,
          workspaceId: typeof r.workspaceId === "string" ? r.workspaceId : null,
          status: typeof r.status === "string" ? r.status : null,
        };
      })
    : null;
  return {
    path,
    status: response.status,
    ok: response.ok,
    isArray: Array.isArray(body),
    count: Array.isArray(rows) ? rows.length : null,
    summary,
    keys: record ? Object.keys(record).slice(0, 20) : null,
    error: response.ok ? null : (record ? { message: record.message || record.error || null } : null),
  };
}

export async function GET(request: NextRequest) {
  if (!jobberOAuthEnabled()) return NextResponse.json({ error: "disabled" }, { status: 503 });
  if (missingJobberAdminConfigNames().length) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const adminToken = (process.env.JOBBER_OAUTH_ADMIN_TOKEN || "").trim();
  const auth = authorizeJobberAdmin({
    adminToken,
    authorizationHeader: request.headers.get("authorization"),
    adminCookie: request.cookies.get(JOBBER_ADMIN_COOKIE)?.value ?? null,
    exp: request.nextUrl.searchParams.get("exp"),
    sig: request.nextUrl.searchParams.get("sig"),
  });
  if (!auth.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const apiKey = (process.env.TRILLET_API_KEY || "").trim();
  const hint = (process.env.STAGING_TRILLET_WORKSPACE_ID || "").trim() || "bootstrap";
  if (!apiKey) return NextResponse.json({ error: "trillet_api_key_missing" }, { status: 503 });

  const paths = [
    "/v1/api/workspaces",
    "/v1/api/workspace",
    "/v1/api/user/workspaces",
    "/v1/api/me/workspaces",
    "/v1/api/workspaces/list",
    "/v2/api/workspaces",
  ];
  const results = [];
  for (const path of paths) results.push(await probe(apiKey, hint, path));

  const phones = await probe(apiKey, hint, "/v1/api/twilio/user-phone-numbers");
  const phonesAlt = await probe(apiKey, hint, "/v1/api/phone-numbers");
  const kbs = await probe(apiKey, hint, "/v1/api/knowledge-bases");

  const candidate = (request.nextUrl.searchParams.get("workspaceId") || "").trim();
  let candidateInfo = null;
  if (candidate) {
    candidateInfo = {
      get: await probe(apiKey, candidate, `/v1/api/workspaces/${encodeURIComponent(candidate)}`),
      flows: await probe(apiKey, candidate, "/v1/api/call-flows"),
      agents: await probe(apiKey, candidate, "/v1/api/agents"),
      phones: await probe(apiKey, candidate, "/v1/api/twilio/user-phone-numbers"),
    };
  }

  return NextResponse.json({ hint, results, phones, phonesAlt, kbs, candidateInfo }, { headers: { "Cache-Control": "no-store" } });
}
