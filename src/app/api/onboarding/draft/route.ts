import { NextResponse } from "next/server";
import {
  getDraftResponse,
  putDraftResponse,
  redisAvailable,
} from "@/lib/server/draft-service";
import {
  getOnboardingSessionId,
  getOrCreateOnboardingSessionId,
} from "@/lib/server/session";
import { deleteOnboardingDraft } from "@/lib/server/draft-store";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  const sessionId = await getOrCreateOnboardingSessionId();
  const result = await getDraftResponse(sessionId);
  return NextResponse.json(result.body, { status: result.status });
}

export async function PUT(request: Request) {
  const sessionId = await getOrCreateOnboardingSessionId();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    const available = await redisAvailable();
    return NextResponse.json(
      { ok: false, redisAvailable: available, savedDurable: false, savedToRedis: false },
      { status: 400 },
    );
  }
  const result = await putDraftResponse(sessionId, body);
  return NextResponse.json(result.body, { status: result.status });
}

export async function DELETE() {
  const sessionId = await getOnboardingSessionId();
  const available = await redisAvailable();
  if (!sessionId) {
    return NextResponse.json({ ok: true, redisAvailable: available });
  }
  // Redis is a temporary cache. PostgreSQL drafts are never deleted here.
  const deleted = await deleteOnboardingDraft(sessionId);
  return NextResponse.json({
    ok: deleted || !available,
    redisAvailable: available,
  });
}
