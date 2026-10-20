import { NextResponse } from "next/server";
import { getOnboardingAccessToken } from "@/lib/server/access-cookie";
import { callOnboardingAccess } from "@/lib/server/access-gateway";
import { hashToken } from "@/lib/server/persistence/tokens";
import {
  confirmPortalAdminFromAccess,
  loadPortalAdminForAccess,
} from "@/lib/server/persistence/portal-admin";

export const runtime = "nodejs";

function onboardingHost(request: Request): string {
  const configured =
    process.env.ALEXANDER_ONBOARDING_BASE_URL ||
    process.env.ONBOARDING_HOST ||
    "";
  if (configured) {
    try {
      const u = new URL(configured.includes("://") ? configured : `https://${configured}`);
      return u.host;
    } catch {
      // fall through
    }
  }
  const fromHeader = request.headers.get("x-forwarded-host") || request.headers.get("host");
  return (fromHeader || "onboard.meetalexander.ai").split(",")[0]!.trim();
}

export async function GET() {
  const token = await getOnboardingAccessToken();
  if (!token) {
    return NextResponse.json({ ok: false, reason: "rejected" }, { status: 401 });
  }
  const accessTokenHash = hashToken(token);
  let result: Awaited<ReturnType<typeof loadPortalAdminForAccess>>;
  try {
    result = await callOnboardingAccess(
      (pool) => loadPortalAdminForAccess(pool, accessTokenHash),
      { operation: "loadPortalAdmin", accessTokenHash },
    );
  } catch {
    return NextResponse.json({ ok: false, reason: "persistence_unavailable" }, { status: 503 });
  }
  if (!result?.ok) {
    return NextResponse.json({ ok: false, reason: "rejected" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, view: result.view });
}

export async function POST(request: Request) {
  const token = await getOnboardingAccessToken();
  if (!token) {
    return NextResponse.json({ ok: false, reason: "rejected" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_payload" }, { status: 400 });
  }

  const mode = (body as { mode?: unknown } | null)?.mode;
  const accessTokenHash = hashToken(token);
  const host = onboardingHost(request);

  let result: Awaited<ReturnType<typeof confirmPortalAdminFromAccess>>;
  try {
    if (mode === "checkout") {
      result = await callOnboardingAccess(
        (pool) =>
          confirmPortalAdminFromAccess(
            pool,
            accessTokenHash,
            { mode: "checkout", confirm: true },
            host,
          ),
        {
          operation: "confirmPortalAdmin",
          accessTokenHash,
          mode: "checkout",
          confirm: true,
          host,
        },
      );
    } else if (mode === "alternate") {
      const email = String((body as { email?: unknown })?.email || "");
      const confirmEmail = String((body as { confirmEmail?: unknown })?.confirmEmail || "");
      result = await callOnboardingAccess(
        (pool) =>
          confirmPortalAdminFromAccess(
            pool,
            accessTokenHash,
            { mode: "alternate", email, confirmEmail },
            host,
          ),
        {
          operation: "confirmPortalAdmin",
          accessTokenHash,
          mode: "alternate",
          email,
          confirmEmail,
          host,
        },
      );
    } else {
      return NextResponse.json({ ok: false, reason: "invalid_payload" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ ok: false, reason: "persistence_unavailable" }, { status: 503 });
  }

  if (!result?.ok) {
    const status =
      result?.reason === "rejected" || result?.reason === "payment_not_confirmed" ? 401 : 400;
    return NextResponse.json({ ok: false, reason: result?.reason || "rejected" }, { status });
  }

  return NextResponse.json({
    ok: true,
    view: result.view,
    verificationEmailQueued: result.verificationEmailQueued,
  });
}
