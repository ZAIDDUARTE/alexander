import { NextResponse } from "next/server";
import { submitDraftResponse } from "@/lib/server/draft-service";
import { getOrCreateOnboardingSessionId } from "@/lib/server/session";
import { persistenceV2Enabled } from "@/lib/server/persistence/v2-flag";
import { submitPersistenceV2Request } from "@/lib/server/persistence/v2-request";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (persistenceV2Enabled()) {
    return submitPersistenceV2Request(request);
  }
  const sessionId = await getOrCreateOnboardingSessionId();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request", savedDurable: false }, { status: 400 });
  }
  const result = await submitDraftResponse(sessionId, body);
  return NextResponse.json(result.body, { status: result.status });
}
