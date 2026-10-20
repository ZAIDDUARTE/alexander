import { NextRequest, NextResponse } from "next/server";
import { invokePersistenceLambda } from "@/lib/server/aws-persistence";
import { bearerToken, object, tokenHash, verifyCall, type Binding } from "@/lib/server/requests/intake";
import { readLimitedBody } from "@/lib/server/requests/http";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  if (process.env.ALEXANDER_REQUEST_PIPELINE_ENABLED !== "true") return NextResponse.json({ error: "disabled" }, { status: 503 });
  let hash: string;
  try { hash = tokenHash(bearerToken(request.headers.get("authorization"))); }
  catch { return NextResponse.json({ error: "unauthorized" }, { status: 401 }); }
  try {
    const resolution = await invokePersistenceLambda({ operation: "resolveRequestInstallation", tokenHash: hash });
    if (!resolution.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const binding = object(resolution.payload).binding as Binding;
    const bytes = await readLimitedBody(request);
    const body = object(JSON.parse(Buffer.from(bytes).toString("utf8")));
    const callId = body.callId;
    const timestamp = typeof body.timestamp === "string" ? Date.parse(body.timestamp) : NaN;
    if (typeof callId !== "string" || !/^[a-zA-Z0-9_-]{8,128}$/.test(callId) || !Number.isFinite(timestamp) ||
        Math.abs(Date.now() - timestamp) > 300_000) return NextResponse.json({ error: "invalid_event" }, { status: 400 });
    const apiKey = process.env.TRILLET_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "not_configured" }, { status: 503 });
    // The webhook is only a wake-up signal. Persist exclusively authenticated API data.
    const response = await fetch(`https://api.trillet.ai/v2/api/call-history/${encodeURIComponent(callId)}`, {
      headers: { "x-api-key": apiKey, "x-workspace-id": binding.workspaceId },
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return NextResponse.json({ error: "provider_read_failed" }, { status: 502 });
    const call: unknown = await response.json();
    verifyCall(call, callId, binding);
    const persisted = await invokePersistenceLambda({ operation: "persistVerifiedCall", tokenHash: hash, callId, call });
    if (!persisted.ok) return NextResponse.json({ error: "persistence_failed" }, { status: 503 });
    return NextResponse.json({ accepted: true }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "verification_or_processing_failed" }, { status: 503 }); }
}
