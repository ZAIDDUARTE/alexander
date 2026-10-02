import { NextResponse } from "next/server";
import { getOnboardingAccessToken } from "@/lib/server/access-cookie";
import { callOnboardingAccess } from "@/lib/server/access-gateway";
import { compileDraftWrite, redisAvailable } from "@/lib/server/draft-service";
import { invitationsEnabled } from "@/lib/server/onboarding-invitations";
import { hashToken, resolveOnboardingAccess, saveInvitedDraft } from "@/lib/server/persistence/onboarding-access";
import { pilotOnboardingAllowed, pilotOnboardingIds } from "@/lib/server/persistence/v2-flag";
import { resolvePersistenceMode } from "@/lib/server/persistence/mode";

async function invitedToken(): Promise<string | null | "unavailable"> {
  const token = await getOnboardingAccessToken();
  if (invitationsEnabled()) return token;
  if (!token || pilotOnboardingIds().length === 0) return null;
  try {
    const accessTokenHash = hashToken(token);
    const resolved = await callOnboardingAccess(
      (pool) => resolveOnboardingAccess(pool, accessTokenHash),
      { operation: "resolveAccess", accessTokenHash },
    );
    if (!resolved.ok || !pilotOnboardingAllowed(resolved.onboardingId)) return null;
    return token;
  } catch {
    return "unavailable";
  }
}

function meta() {
  const persistence = resolvePersistenceMode();
  return {
    persistence,
    durableAvailable: persistence === "durable",
  };
}

export async function respondInvitedGet(): Promise<NextResponse | null> {
  const token = await invitedToken();
  if (token === "unavailable") {
    return NextResponse.json({ ok: false, reason: "persistence_unavailable" }, { status: 503 });
  }
  if (!token) return null;
  const accessTokenHash = hashToken(token);
  let resolved: Awaited<ReturnType<typeof resolveOnboardingAccess>>;
  try {
    resolved = await callOnboardingAccess(
      (pool) => resolveOnboardingAccess(pool, accessTokenHash),
      { operation: "resolveAccess", accessTokenHash },
    );
  } catch {
    return NextResponse.json({ ok: false, reason: "persistence_unavailable" }, { status: 503 });
  }
  if (!resolved.ok) {
    return NextResponse.json({ ok: false, reason: "rejected" }, { status: 401 });
  }
  const available = await redisAvailable();
  return NextResponse.json({
    draft: resolved.draft,
    draftVersion: resolved.version,
    invited: true,
    redisAvailable: available,
    ...meta(),
    savedDurable: false,
  });
}

export async function respondInvitedPut(body: unknown): Promise<NextResponse | null> {
  const token = await invitedToken();
  if (token === "unavailable") {
    return NextResponse.json({ ok: false, reason: "persistence_unavailable", invited: true }, { status: 503 });
  }
  if (!token) return null;
  const expectedVersion = (body as { expectedVersion?: unknown } | null)?.expectedVersion;
  if (typeof expectedVersion !== "number" || !Number.isInteger(expectedVersion)) {
    return NextResponse.json({ ok: false, reason: "invalid_payload", invited: true }, { status: 400 });
  }
  const compiled = await compileDraftWrite(body);
  if (!compiled.ok) {
    return NextResponse.json({ ...compiled.body, invited: true }, { status: compiled.status });
  }
  const accessTokenHash = hashToken(token);
  let saved: Awaited<ReturnType<typeof saveInvitedDraft>>;
  try {
    saved = await callOnboardingAccess(
      (pool) =>
        saveInvitedDraft(pool, {
          accessTokenHash,
          expectedVersion,
          draft: compiled.payload,
        }),
      {
        operation: "saveInvitedDraft",
        accessTokenHash,
        expectedVersion,
        draft: compiled.payload,
      },
    );
  } catch {
    return NextResponse.json({ ok: false, reason: "persistence_unavailable", invited: true }, { status: 503 });
  }
  const available = await redisAvailable();
  const base = { redisAvailable: available, ...meta(), savedToRedis: false, invited: true };
  if (!saved.ok && saved.reason === "stale_draft") {
    return NextResponse.json(
      {
        ok: false,
        reason: "stale_draft",
        draft: saved.draft ?? null,
        draftVersion: saved.version ?? null,
        savedDurable: false,
        ...base,
      },
      { status: 409 },
    );
  }
  if (!saved.ok) {
    const status = saved.reason === "rejected" ? 401 : 400;
    return NextResponse.json({ ok: false, reason: saved.reason, savedDurable: false, ...base }, { status });
  }
  return NextResponse.json({
    ok: true,
    draft: saved.draft,
    draftVersion: saved.version,
    savedDurable: base.persistence === "durable" || base.persistence === "local",
    ...base,
  });
}
