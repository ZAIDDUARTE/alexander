import { NextRequest, NextResponse } from "next/server";
import { callOnboardingAccess } from "@/lib/server/access-gateway";
import {
  encryptTokens,
  exchangeJobberCode,
  readJobberAccount,
} from "@/lib/server/requests/jobber";
import {
  jobberOAuthEnabled,
  loadJobberRuntimeConfig,
  missingJobberConfigNames,
} from "@/lib/server/requests/jobber-config";
import {
  JOBBER_OAUTH_COOKIE,
  openJobberOAuthSession,
} from "@/lib/server/requests/jobber-oauth-session";
import { persistVerifiedJobberConnection } from "@/lib/server/requests/jobber-store";
import { equalSecret, tokenHash } from "@/lib/server/requests/intake";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function page(status: number, title: string, body: string): NextResponse {
  const response = new NextResponse(
    `<!doctype html><html><body><h1>${title}</h1><p>${body}</p></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );
  response.cookies.set(JOBBER_OAUTH_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/api/integrations/jobber",
    maxAge: 0,
  });
  return response;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!jobberOAuthEnabled()) {
    return page(503, "Jobber OAuth disabled", "Staging Jobber OAuth is not enabled.");
  }

  if (missingJobberConfigNames().length) {
    return page(503, "Jobber OAuth not configured", "Required environment variables are missing.");
  }

  let config;
  try {
    config = loadJobberRuntimeConfig();
  } catch {
    return page(503, "Jobber OAuth not configured", "Runtime configuration is invalid.");
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");
  if (error) {
    return page(400, "Authorization denied", "Jobber did not grant access.");
  }
  if (!code || !state) {
    return page(400, "Invalid callback", "Missing authorization code or state.");
  }

  const sealed = request.cookies.get(JOBBER_OAUTH_COOKIE)?.value;
  if (!sealed) {
    return page(400, "Invalid callback", "OAuth session is missing or already consumed.");
  }

  let session;
  try {
    session = openJobberOAuthSession(sealed, config.encryptionKey, state);
  } catch (err) {
    const reason = err instanceof Error ? err.message : "invalid_oauth_session";
    if (reason === "oauth_state_expired") {
      return page(400, "Expired", "The authorization session expired. Start again.");
    }
    if (reason === "oauth_state_mismatch") {
      return page(400, "State mismatch", "The OAuth state did not match this session.");
    }
    return page(400, "Invalid callback", "The OAuth session could not be validated.");
  }

  if (session.customerId !== config.stagingCustomerId) {
    return page(403, "Tenant mismatch", "This OAuth session is not bound to the staging tenant.");
  }
  if (!equalSecret(session.adminTokenHash, tokenHash(config.adminToken))) {
    return page(403, "Admin mismatch", "This OAuth session is not bound to the current staging administrator.");
  }

  let tokens;
  try {
    tokens = await exchangeJobberCode(
      { clientId: config.clientId, clientSecret: config.clientSecret, callbackUrl: config.callbackUrl },
      code,
      session.verifier,
    );
  } catch {
    return page(502, "Token exchange failed", "Jobber did not accept the authorization code.");
  }

  let account;
  try {
    account = await readJobberAccount(tokens.accessToken, fetch, config.apiVersion);
  } catch {
    return page(502, "Account verification failed", "Could not verify the Jobber account after authorization.");
  }

  if (config.expectedAccountId && account.id !== config.expectedAccountId) {
    return page(403, "Unexpected Jobber account", "Authorized account id does not match the expected QA business.");
  }
  if (config.expectedAccountName && account.name !== config.expectedAccountName) {
    return page(403, "Unexpected Jobber account", "Authorized account name does not match the expected QA business.");
  }

  const encryptedTokens = encryptTokens(tokens, config.encryptionKey, session.customerId, account.id);

  try {
    const persisted = await callOnboardingAccess(
      async (pool) => persistVerifiedJobberConnection(pool, {
        customerId: session.customerId,
        account,
        tokens,
        encryptionKey: config.encryptionKey,
        apiVersion: config.apiVersion,
      }),
      {
        operation: "persistVerifiedJobberConnection",
        customerId: session.customerId,
        accountId: account.id,
        accountName: account.name,
        encryptedTokens,
        apiVersion: config.apiVersion,
        grantedScopes: [],
      },
    );
    if (!persisted || typeof persisted !== "object" || !("ok" in persisted) || persisted.ok !== true) {
      return page(503, "Persistence failed", "Tokens were issued but could not be stored securely.");
    }
  } catch {
    return page(503, "Persistence failed", "Tokens were issued but could not be stored securely.");
  }

  return page(
    200,
    "Jobber connected",
    `Staging tenant linked to Jobber account "${account.name}". Request writes remain disabled.`,
  );
}
