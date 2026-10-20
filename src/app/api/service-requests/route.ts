import { NextRequest, NextResponse } from "next/server";
import { invokePersistenceLambda } from "@/lib/server/aws-persistence";
import { bearerToken, tokenHash } from "@/lib/server/requests/intake";

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  if (process.env.ALEXANDER_REQUEST_PIPELINE_ENABLED !== "true") return NextResponse.json({ error: "disabled" }, { status: 503 });
  let hash: string;
  try { hash = tokenHash(bearerToken(request.headers.get("authorization"))); }
  catch { return NextResponse.json({ error: "unauthorized" }, { status: 401 }); }
  try {
    const result = await invokePersistenceLambda({ operation: "listServiceRequests", tokenHash: hash });
    return NextResponse.json(result.ok ? result.payload : { error: "unauthorized" }, {
      status: result.ok ? 200 : 401, headers: { "Cache-Control": "no-store" },
    });
  } catch { return NextResponse.json({ error: "unavailable" }, { status: 503 }); }
}
