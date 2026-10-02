import { NextResponse } from "next/server";
import { setOnboardingAccessCookie } from "@/lib/server/access-cookie";
import { callOnboardingAccess } from "@/lib/server/access-gateway";
import { invitationsEnabled } from "@/lib/server/onboarding-invitations";
import { generateToken, hashToken, redeemInvitation } from "@/lib/server/persistence/onboarding-access";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!invitationsEnabled()) {
    return NextResponse.json({ ok: false, reason: "rejected" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "rejected" }, { status: 400 });
  }
  const token = (body as { token?: unknown } | null)?.token;
  if (typeof token !== "string" || token.length < 32) {
    return NextResponse.json({ ok: false, reason: "rejected" }, { status: 400 });
  }

  const accessToken = generateToken();
  let result: { ok?: boolean; accessExpiresAt?: string; reason?: string };
  try {
    result = await callOnboardingAccess(
      (pool) =>
        redeemInvitation(pool, {
          invitationTokenHash: hashToken(token),
          accessTokenHash: hashToken(accessToken),
        }),
      {
        operation: "redeemInvitation",
        invitationTokenHash: hashToken(token),
        accessTokenHash: hashToken(accessToken),
      },
    );
  } catch {
    return NextResponse.json({ ok: false, reason: "persistence_unavailable" }, { status: 503 });
  }

  if (!result?.ok || !result.accessExpiresAt) {
    return NextResponse.json({ ok: false, reason: "rejected" }, { status: 404 });
  }

  const maxAge = Math.max(
    0,
    Math.floor((new Date(result.accessExpiresAt).getTime() - Date.now()) / 1000),
  );
  await setOnboardingAccessCookie(accessToken, maxAge);
  return NextResponse.json({ ok: true });
}
