import { NextResponse } from "next/server";
import { fromRedisDraft, toRedisDraft, type RedisOnboardingDraft } from "@/lib/onboarding/draft-utils";
import { isValidRedisDraft } from "@/lib/server/draft-store";
import { createDefaultDraft, SCHEMA_VERSION } from "@/lib/onboarding/types";
import {
  deleteOnboardingDraft,
  readOnboardingDraft,
  writeOnboardingDraft,
} from "@/lib/server/draft-store";
import { getRedisClient } from "@/lib/server/redis";
import {
  getOnboardingSessionId,
  getOrCreateOnboardingSessionId,
} from "@/lib/server/session";

// Redis client requires the Node.js runtime on Vercel (not Edge).
export const runtime = "nodejs";

async function redisAvailable(): Promise<boolean> {
  if (!process.env.REDIS_URL) return false;
  const client = await getRedisClient();
  return client !== null;
}

export async function GET() {
  const sessionId = await getOrCreateOnboardingSessionId();
  const available = await redisAvailable();
  const stored = await readOnboardingDraft(sessionId);

  return NextResponse.json({
    draft: stored,
    redisAvailable: available,
  });
}

export async function PUT(request: Request) {
  const sessionId = await getOrCreateOnboardingSessionId();
  const available = await redisAvailable();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, redisAvailable: available }, { status: 400 });
  }

  const incoming = (body as { draft?: unknown })?.draft;
  if (!isValidRedisDraft(incoming)) {
    return NextResponse.json({ ok: false, redisAvailable: available }, { status: 400 });
  }

  const clientDraft = fromRedisDraft(incoming);
  const defaults = createDefaultDraft();
  const merged = {
    ...defaults,
    ...clientDraft,
    schemaVersion: SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    navigation: { ...defaults.navigation, ...clientDraft.navigation },
    section1: { ...defaults.section1, ...clientDraft.section1 },
    section2: { ...defaults.section2, ...clientDraft.section2 },
    section3: { ...defaults.section3, ...clientDraft.section3 },
    section4: { ...defaults.section4, ...clientDraft.section4 },
    section5: { ...defaults.section5, ...clientDraft.section5 },
    section6: { ...defaults.section6, ...clientDraft.section6 },
    section7: { ...defaults.section7, ...clientDraft.section7 },
    section8: { ...defaults.section8, ...clientDraft.section8 },
    contacts: clientDraft.contacts ?? defaults.contacts,
    fees: clientDraft.fees ?? defaults.fees,
    systems: clientDraft.systems ?? defaults.systems,
    submission: {
      ...defaults.submission,
      ...clientDraft.submission,
      confirmations: {
        ...defaults.submission.confirmations,
        ...clientDraft.submission?.confirmations,
      },
    },
  };

  const redisPayload: RedisOnboardingDraft = toRedisDraft(
    merged,
    incoming.currentRoute || "/onboarding",
  );
  redisPayload.updatedAt = merged.updatedAt;

  const saved = await writeOnboardingDraft(sessionId, redisPayload);

  return NextResponse.json({
    ok: true,
    redisAvailable: available,
    savedToRedis: saved,
    draft: redisPayload,
  });
}

export async function DELETE() {
  const sessionId = await getOnboardingSessionId();
  const available = await redisAvailable();
  if (!sessionId) {
    return NextResponse.json({ ok: true, redisAvailable: available });
  }
  const deleted = await deleteOnboardingDraft(sessionId);
  return NextResponse.json({
    ok: deleted || !available,
    redisAvailable: available,
  });
}
