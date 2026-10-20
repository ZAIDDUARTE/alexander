import { NextRequest, NextResponse } from "next/server";
import { callOnboardingAccess } from "@/lib/server/access-gateway";
import {
  decryptTokens,
  probeJobberRequestMutations,
  refreshJobberTokens,
} from "@/lib/server/requests/jobber";
import {
  jobberOAuthEnabled,
  loadJobberRuntimeConfig,
  missingJobberAdminConfigNames,
  missingJobberConfigNames,
} from "@/lib/server/requests/jobber-config";
import {
  authorizeJobberAdmin,
  JOBBER_ADMIN_COOKIE,
} from "@/lib/server/requests/jobber-oauth-session";
import { inspectJobberTestConnection } from "@/lib/server/requests/jobber-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Read-only Jobber mutation discovery. Never creates CRM records. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!jobberOAuthEnabled()) {
    return NextResponse.json({ error: "disabled" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (missingJobberAdminConfigNames().length || missingJobberConfigNames().length) {
    return NextResponse.json({ error: "not_configured" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  const config = loadJobberRuntimeConfig();
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

  const inspected = await callOnboardingAccess(
    (pool) => inspectJobberTestConnection(pool, config.stagingCustomerId),
    { operation: "inspectJobberTestConnection", customerId: config.stagingCustomerId },
  );
  if (!inspected || typeof inspected !== "object" || !("ok" in inspected) || inspected.ok !== true || !inspected.encryptedTokens) {
    return NextResponse.json({ ok: false, reason: "jobber_disconnected" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  let tokens = decryptTokens(
    inspected.encryptedTokens,
    config.encryptionKey,
    inspected.customerId,
    inspected.accountId,
  );
  try {
    const probe = await probeJobberRequestMutations(tokens.accessToken, fetch, config.apiVersion);
    return NextResponse.json(
      {
        ok: true,
        account: { id: inspected.accountId, name: inspected.accountName },
        requestWritesEnabled: inspected.requestWritesEnabled,
        ...probe,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    tokens = await refreshJobberTokens(
      { clientId: config.clientId, clientSecret: config.clientSecret, callbackUrl: config.callbackUrl },
      tokens.refreshToken,
    );
    const probe = await probeJobberRequestMutations(tokens.accessToken, fetch, config.apiVersion);
    return NextResponse.json(
      {
        ok: true,
        account: { id: inspected.accountId, name: inspected.accountName },
        requestWritesEnabled: inspected.requestWritesEnabled,
        refreshed: true,
        ...probe,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
