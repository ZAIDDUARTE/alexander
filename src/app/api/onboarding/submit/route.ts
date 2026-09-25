import { NextResponse } from "next/server";
import { fromRedisDraft, toRedisDraft } from "@/lib/onboarding/draft-utils";
import { migrateDraft } from "@/lib/onboarding/migrate";
import { prepareSubmission } from "@/lib/onboarding/submission";
import { isValidRedisDraft, writeOnboardingDraft } from "@/lib/server/draft-store";
import { getRedisClient } from "@/lib/server/redis";
import { getOrCreateOnboardingSessionId } from "@/lib/server/session";
import { SCHEMA_VERSION } from "@/lib/onboarding/types";

export const runtime = "nodejs";

async function redisAvailable(): Promise<boolean> {
  if (!process.env.REDIS_URL) return false;
  const client = await getRedisClient();
  return client !== null;
}

export async function POST(request: Request) {
  const sessionId = await getOrCreateOnboardingSessionId();
  const available = await redisAvailable();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request", redisAvailable: available }, { status: 400 });
  }

  const incoming = (body as { draft?: unknown })?.draft;
  if (!incoming || !isValidRedisDraft(incoming)) {
    return NextResponse.json(
      { ok: false, reason: "missing_draft", redisAvailable: available },
      { status: 400 },
    );
  }

  const draft = migrateDraft(fromRedisDraft(incoming));
  if (draft.schemaVersion !== SCHEMA_VERSION) {
    return NextResponse.json({ ok: false, reason: "schema_mismatch", redisAvailable: available }, { status: 400 });
  }

  const result = prepareSubmission(draft);
  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        reason: result.reason,
        invalidSectionIds: result.invalidSectionIds,
        redisAvailable: available,
      },
      { status: 422 },
    );
  }

  const submitted = result.draft;
  const redisPayload = toRedisDraft(submitted, submitted.currentRoute || "/onboarding/review");
  redisPayload.updatedAt = submitted.updatedAt;

  const saved = await writeOnboardingDraft(sessionId, redisPayload);

  return NextResponse.json({
    ok: true,
    duplicate: result.duplicate,
    redisAvailable: available,
    savedToRedis: saved,
    draft: redisPayload,
    submittedAt: submitted.submission.submittedAt,
    submission: submitted.submission,
  });
}
