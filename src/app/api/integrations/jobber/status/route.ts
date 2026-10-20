import { NextRequest, NextResponse } from "next/server";
import { callOnboardingAccess } from "@/lib/server/access-gateway";
import { decryptTokens, readJobberAccount, refreshJobberTokens } from "@/lib/server/requests/jobber";
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

  if (missingJobberConfigNames().length) {
    return NextResponse.json({ error: "not_configured", missing: missingJobberConfigNames() }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  let config;
  try {
    config = loadJobberRuntimeConfig();
  } catch {
    return NextResponse.json({ error: "not_configured" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  const inspected = await callOnboardingAccess(
    (pool) => inspectJobberTestConnection(pool, config.stagingCustomerId),
    { operation: "inspectJobberTestConnection", customerId: config.stagingCustomerId },
  );

  if (!inspected || typeof inspected !== "object" || !("ok" in inspected) || inspected.ok !== true) {
    return NextResponse.json(
      { ok: false, stage: "persistence", reason: (inspected as { reason?: string })?.reason || "not_found" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  const connection = {
    customerId: inspected.customerId,
    accountId: inspected.accountId,
    accountName: inspected.accountName,
    state: inspected.state,
    apiVersion: inspected.apiVersion,
    testAccountVerified: inspected.testAccountVerified,
    requestWritesEnabled: inspected.requestWritesEnabled,
    revision: inspected.revision,
    updatedAt: inspected.updatedAt,
    hasEncryptedTokens: inspected.hasEncryptedTokens,
  };

  if (!inspected.hasEncryptedTokens || !inspected.encryptedTokens) {
    return NextResponse.json(
      { ok: false, stage: "persistence", connection, reason: "missing_encrypted_tokens" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  let tokens;
  try {
    tokens = decryptTokens(
      inspected.encryptedTokens,
      config.encryptionKey,
      inspected.customerId,
      inspected.accountId,
    );
  } catch {
    return NextResponse.json(
      { ok: false, stage: "decrypt", connection, reason: "decrypt_failed" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  let account;
  try {
    account = await readJobberAccount(tokens.accessToken, fetch, config.apiVersion);
  } catch (err) {
    const reason = err instanceof Error ? err.message : "graphql_failed";
    // Attempt one refresh then re-read (rotation-aware).
    try {
      const refreshed = await refreshJobberTokens(
        { clientId: config.clientId, clientSecret: config.clientSecret, callbackUrl: config.callbackUrl },
        tokens.refreshToken,
      );
      account = await readJobberAccount(refreshed.accessToken, fetch, config.apiVersion);
      return NextResponse.json(
        {
          ok: true,
          stage: "graphql_after_refresh",
          connection,
          graphqlAccount: account,
          accountMatch: account.id === inspected.accountId && account.name === inspected.accountName,
          tokenExpiresAt: refreshed.expiresAt,
          refreshRotated: refreshed.refreshToken !== tokens.refreshToken,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    } catch {
      return NextResponse.json(
        { ok: false, stage: "graphql", connection, reason },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }
  }

  return NextResponse.json(
    {
      ok: true,
      stage: "graphql",
      connection,
      graphqlAccount: account,
      accountMatch: account.id === inspected.accountId && account.name === inspected.accountName,
      tokenExpiresAt: tokens.expiresAt,
      accessTokenValid: tokens.expiresAt > Date.now(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
