import { NextRequest, NextResponse } from "next/server";
import { directAccessPool } from "@/lib/server/access-gateway";
import { profileGet, profileUpdatePublication } from "@/lib/server/persistence/profile-backend";
import {
  JOBBER_ADMIN_COOKIE_NAME,
  assertCustomerScope,
  authorizeProfileRequest,
} from "@/lib/server/persistence/profile-staging-auth";
import { FICTIONAL_PROFILE_CUSTOMER_ID } from "@/lib/server/persistence/profile-memory-store";
import {
  generateRuntimeConfiguration,
  runtimeConfigContentSha256,
} from "@/lib/runtime-config/generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const pool = await directAccessPool();
  const auth = await authorizeProfileRequest({
    pool,
    authorizationHeader: request.headers.get("authorization"),
    adminCookie: request.cookies.get(JOBBER_ADMIN_COOKIE_NAME())?.value ?? null,
    profileTokenHeader: request.headers.get("x-alexander-profile-token"),
    exp: request.nextUrl.searchParams.get("exp"),
    sig: request.nextUrl.searchParams.get("sig"),
  });
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, reason: auth.reason },
      { status: auth.status, headers: { "Cache-Control": "no-store" } },
    );
  }

  let body: { customerId?: string; customerNumber?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const customerId =
    auth.mode === "customer_session"
      ? auth.customerId
      : String(body.customerId || FICTIONAL_PROFILE_CUSTOMER_ID);
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

  let config;
  try {
    config = generateRuntimeConfiguration({
      fields: loaded.profile.fields,
      profileRevision: loaded.profile.currentRevision,
      customerId,
      customerNumber: body.customerNumber || "ALX-C000099",
      questionnaire: loaded.profile.profileData.questionnaire,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        reason: "generate_failed",
        detail: error instanceof Error ? error.message : "unknown_error",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
  const contentSha = runtimeConfigContentSha256(config);

  await profileUpdatePublication(customerId, (publication, profileData) => {
    (profileData as { _runtime_config?: unknown })._runtime_config = {
      contentSha256: contentSha,
      generatedAt: config.meta.generatedAt,
      artifacts: {
        agentInstructions: config.artifacts.agentInstructions,
        companyKnowledge: config.artifacts.companyKnowledge,
        greeting: config.artifacts.greeting,
        callFlow: config.artifacts.callFlow,
        integrationHints: config.artifacts.integrationHints,
      },
      customer: config.customer,
      source: config.source,
    };
    return {
      ...publication,
      status: publication.qaRequirements.some((r) => r.required && !r.satisfied)
        ? "qa_required"
        : "config_generated",
      profileRevision: loaded.profile!.currentRevision,
      configContentSha256: contentSha,
      lastFailure: null,
    };
  });

  return NextResponse.json(
    {
      ok: true,
      mode: loaded.mode,
      contentSha256: contentSha,
      config: {
        schema: config.schema,
        customer: config.customer,
        source: config.source,
        meta: config.meta,
        artifacts: {
          greeting: config.artifacts.greeting,
          callFlow: config.artifacts.callFlow,
          integrationHints: config.artifacts.integrationHints,
          agentInstructionsPreview: config.artifacts.agentInstructions.slice(0, 1200),
          companyKnowledgePreview: config.artifacts.companyKnowledge.slice(0, 1200),
          agentInstructionsChars: config.artifacts.agentInstructions.length,
          companyKnowledgeChars: config.artifacts.companyKnowledge.length,
        },
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
