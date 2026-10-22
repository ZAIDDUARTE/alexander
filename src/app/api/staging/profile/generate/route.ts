import { NextRequest, NextResponse } from "next/server";
import { callOnboardingAccess, directAccessPool } from "@/lib/server/access-gateway";
import {
  getBusinessProfile,
  updatePublicationState,
} from "@/lib/server/persistence/business-profile-editor";
import {
  JOBBER_ADMIN_COOKIE_NAME,
  assertCustomerScope,
  authorizeProfileRequest,
} from "@/lib/server/persistence/profile-staging-auth";
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
    auth.mode === "customer_session" ? auth.customerId : String(body.customerId || "");
  if (!customerId) {
    return NextResponse.json(
      { ok: false, reason: "customer_id_required" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  const scope = assertCustomerScope(auth, customerId);
  if (!scope.ok) {
    return NextResponse.json(
      { ok: false, reason: scope.reason },
      { status: scope.status, headers: { "Cache-Control": "no-store" } },
    );
  }

  const profile = await callOnboardingAccess(
    (db) => getBusinessProfile(db, customerId),
    { operation: "getBusinessProfile", customerId },
  );
  if (!profile) {
    return NextResponse.json(
      { ok: false, reason: "not_found" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  const config = generateRuntimeConfiguration({
    fields: profile.fields,
    profileRevision: profile.currentRevision,
    customerId,
    customerNumber: body.customerNumber || null,
    questionnaire: profile.profileData.questionnaire,
  });
  const contentSha = runtimeConfigContentSha256(config);

  await callOnboardingAccess(
    (db) =>
      updatePublicationState(db, customerId, (publication, profileData) => {
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
          profileRevision: profile.currentRevision,
          configContentSha256: contentSha,
          lastFailure: null,
        };
      }),
    {
      operation: "storeGeneratedRuntimeConfig",
      customerId,
      contentSha256: contentSha,
      profileRevision: profile.currentRevision,
    },
  );

  return NextResponse.json(
    {
      ok: true,
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
