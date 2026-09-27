import { NextResponse } from "next/server";
import { getOnboardingStore } from "@/lib/server/onboarding-store";
import { resolvePersistenceMode } from "@/lib/server/persistence/mode";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  const persistence = resolvePersistenceMode();
  if (persistence !== "durable") {
    return NextResponse.json({
      durablePersistence: false,
      database: "unavailable",
      snapshotStorage: "unavailable",
    });
  }
  try {
    const health = await getOnboardingStore().health();
    return NextResponse.json({
      durablePersistence: health.durablePersistence && health.database === "ok" && health.snapshotStorage === "ok",
      database: health.database === "ok" ? "ok" : "error",
      snapshotStorage: health.snapshotStorage === "ok" ? "ok" : "error",
    });
  } catch {
    return NextResponse.json({
      durablePersistence: false,
      database: "error",
      snapshotStorage: "error",
    });
  }
}
