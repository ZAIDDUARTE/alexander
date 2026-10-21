import { NextResponse } from "next/server";
import { getOnboardingAccessToken } from "@/lib/server/access-cookie";
import { invokePersistenceLambda } from "@/lib/server/aws-persistence";
import { fromRedisDraft, toRedisDraft } from "@/lib/onboarding/draft-utils";
import { migrateDraft } from "@/lib/onboarding/migrate";
import type { OnboardingDraft } from "@/lib/onboarding/types";
import { isValidRedisDraft } from "@/lib/server/draft-store";
import { hashToken } from "@/lib/server/persistence/onboarding-access";
import { persistenceV2Enabled, pilotOnboardingIds } from "@/lib/server/persistence/v2-flag";

/** Pure routing decision used by submitPersistenceV2IfEnabled (unit-tested). */
export function shouldRouteSubmitThroughPersistenceV2(input: {
  persistenceV2Enabled: boolean;
  hasAccessToken: boolean;
}): boolean {
  if (input.persistenceV2Enabled) return true;
  // Invited browser sessions carry alexander_onboarding_access. Those must never fall
  // through to anonymous onboarding_sessions (which orphan the submission from the customer).
  return input.hasAccessToken;
}

export async function submitPersistenceV2IfEnabled(request: Request): Promise<NextResponse | null> {
  const accessToken = await getOnboardingAccessToken();
  if (
    !shouldRouteSubmitThroughPersistenceV2({
      persistenceV2Enabled: persistenceV2Enabled(),
      hasAccessToken: Boolean(accessToken),
    })
  ) {
    if (pilotOnboardingIds().length === 0) return null;
    return null;
  }
  return submitPersistenceV2Request(request);
}

export async function submitPersistenceV2Request(request: Request): Promise<NextResponse> {
  const token = await getOnboardingAccessToken();
  if (!token) {
    return NextResponse.json({ ok: false, reason: "rejected", savedDurable: false }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request", savedDurable: false }, { status: 400 });
  }
  const incoming = (body as { draft?: unknown } | null)?.draft;
  if (!isValidRedisDraft(incoming)) {
    return NextResponse.json({ ok: false, reason: "missing_draft", savedDurable: false }, { status: 400 });
  }
  const draft = migrateDraft(fromRedisDraft(incoming));
  try {
    const invoked = await invokePersistenceLambda({
      operation: "submitPersistenceV2",
      accessTokenHash: hashToken(token),
      draft,
    });
    const payload = (invoked.payload ?? { ok: false, reason: "database_failed" }) as {
      ok?: boolean;
      reason?: string;
      submittedAt?: string;
      duplicate?: boolean;
    };
    return NextResponse.json(httpBody(payload, draft), { status: httpStatus(payload) });
  } catch {
    return NextResponse.json({ ok: false, reason: "database_failed", savedDurable: false }, { status: 503 });
  }
}

function httpStatus(result: { ok?: boolean; reason?: string }): number {
  if (result.ok) return 200;
  if (result.reason === "invalid_sections" || result.reason === "missing_confirmations") return 422;
  if (result.reason === "rejected") return 401;
  if (result.reason === "missing_draft" || result.reason === "bad_request") return 400;
  return 503;
}

function httpBody(
  result: { ok?: boolean; reason?: string; submittedAt?: string | null; duplicate?: boolean },
  draft: OnboardingDraft,
): Record<string, unknown> {
  if (!result.ok) {
    const reason = result.reason === "storage_integrity_conflict" ? "snapshot_failed" : result.reason;
    return { ok: false, reason, savedDurable: false };
  }
  const submittedAt = result.submittedAt ?? null;
  const submitted = {
    ...draft,
    submission: {
      ...draft.submission,
      status: "submitted" as const,
      submittedAt,
    },
  };
  return {
    ok: true,
    duplicate: result.duplicate === true,
    submittedAt,
    savedDurable: true,
    draft: toRedisDraft(submitted, draft.currentRoute || "/onboarding/review"),
  };
}
