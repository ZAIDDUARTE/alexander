import { NextResponse } from "next/server";
import { callOnboardingAccess } from "@/lib/server/access-gateway";
import { verifyPortalAdminToken } from "@/lib/server/persistence/portal-admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "rejected" }, { status: 400 });
  }
  const rawToken = (body as { token?: unknown } | null)?.token;
  if (typeof rawToken !== "string" || rawToken.length < 32) {
    return NextResponse.json({ ok: false, reason: "rejected" }, { status: 400 });
  }

  let result: Awaited<ReturnType<typeof verifyPortalAdminToken>>;
  try {
    result = await callOnboardingAccess(
      (pool) => verifyPortalAdminToken(pool, rawToken),
      { operation: "verifyPortalAdmin", rawToken },
    );
  } catch {
    return NextResponse.json({ ok: false, reason: "persistence_unavailable" }, { status: 503 });
  }

  if (!result?.ok) {
    return NextResponse.json({ ok: false, reason: "rejected" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, customerNumber: result.customerNumber });
}
