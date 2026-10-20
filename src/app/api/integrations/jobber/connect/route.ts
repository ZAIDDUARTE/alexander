import { NextRequest, NextResponse } from "next/server";
import { beginJobberOAuth } from "@/lib/server/requests/jobber";
import {
  jobberOAuthEnabled,
  loadJobberRuntimeConfig,
  missingJobberAdminConfigNames,
  missingJobberConfigNames,
} from "@/lib/server/requests/jobber-config";
import {
  authorizeJobberAdmin,
  JOBBER_ADMIN_COOKIE,
  JOBBER_OAUTH_COOKIE,
  sealJobberOAuthSession,
  signConnectLink,
} from "@/lib/server/requests/jobber-oauth-session";
import { tokenHash } from "@/lib/server/requests/intake";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function htmlError(status: number, message: string): NextResponse {
  return new NextResponse(
    `<!doctype html><html><body><h1>Jobber connect unavailable</h1><p>${message}</p></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!jobberOAuthEnabled()) {
    return NextResponse.json({ error: "disabled" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  const missingAdmin = missingJobberAdminConfigNames();
  if (missingAdmin.length) {
    return NextResponse.json(
      { error: "not_configured", missing: missingAdmin },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
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

  const missing = missingJobberConfigNames();
  if (missing.length) {
    return NextResponse.json(
      { error: "not_configured", missing },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  let config;
  try {
    config = loadJobberRuntimeConfig();
  } catch {
    return NextResponse.json({ error: "not_configured" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  // Optional helper: authenticated callers can mint a short-lived browser link.
  if (request.nextUrl.searchParams.get("mint") === "1") {
    const exp = Math.floor(Date.now() / 1000) + 600;
    const sig = signConnectLink(config.adminToken, exp);
    const url = new URL("/api/integrations/jobber/connect", config.callbackUrl);
    url.searchParams.set("exp", String(exp));
    url.searchParams.set("sig", sig);
    return NextResponse.json(
      { connectUrl: url.toString(), expiresAt: exp },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  let oauth;
  try {
    oauth = beginJobberOAuth({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      callbackUrl: config.callbackUrl,
    });
  } catch {
    return htmlError(503, "Unable to start Jobber authorization.");
  }

  const sealed = sealJobberOAuthSession({
    state: oauth.state,
    verifier: oauth.verifier,
    customerId: config.stagingCustomerId,
    adminTokenHash: auth.adminTokenHash,
    expiresAt: oauth.expiresAt,
  }, config.encryptionKey);

  const response = NextResponse.redirect(oauth.url, 302);
  response.headers.set("Cache-Control", "no-store");
  response.cookies.set(JOBBER_OAUTH_COOKIE, sealed, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/api/integrations/jobber",
    maxAge: 600,
  });
  response.cookies.set(JOBBER_ADMIN_COOKIE, tokenHash(config.adminToken), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/api/integrations/jobber",
    maxAge: 900,
  });
  return response;
}
