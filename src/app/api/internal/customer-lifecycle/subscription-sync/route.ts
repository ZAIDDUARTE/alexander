import { NextRequest, NextResponse } from "next/server";
import { invokePersistenceLambda } from "@/lib/server/aws-persistence";
import {
  getAlexanderLifecycleHmacSecret,
  getAlexanderStripeSecretKey,
} from "@/lib/server/aws-secrets";
import { verifyLifecycleSignature } from "@/lib/server/lifecycle-hmac";
import {
  configuredStripeMode,
  resolveStripeSecretMode,
} from "@/lib/server/persistence/stripe-verify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PATH = "/api/internal/customer-lifecycle/subscription-sync";

async function stripeGet(
  path: string,
  secretKey: string,
): Promise<Record<string, unknown>> {
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  const json = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    const err = new Error("stripe_retrieve_failed") as Error & { status?: number };
    err.status = response.status;
    throw err;
  }
  return json;
}

/**
 * Authoritative subscription eligibility sync.
 * WordPress sends subscriptionId after a signed Stripe webhook; Vercel re-fetches
 * Stripe and only then persists status on the customer row. Callers cannot set status.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let secret: string;
  try {
    secret = await getAlexanderLifecycleHmacSecret();
  } catch {
    return NextResponse.json({ ok: false, reason: "hmac_not_configured" }, { status: 503 });
  }

  const rawBody = await request.text();
  const timestamp = request.headers.get("x-alexander-timestamp") || "";
  const idempotencyKey = request.headers.get("x-alexander-idempotency-key") || "";
  const signature = request.headers.get("x-alexander-signature") || "";

  const sig = verifyLifecycleSignature({
    secret,
    method: "POST",
    path: PATH,
    timestamp,
    idempotencyKey,
    rawBody,
    signature,
  });
  if (!sig.ok) {
    return NextResponse.json({ ok: false, reason: sig.reason }, { status: 401 });
  }

  let body: { subscriptionId?: unknown; correlationKey?: unknown };
  try {
    body = JSON.parse(rawBody) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  }

  const subscriptionId =
    typeof body.subscriptionId === "string" ? body.subscriptionId.trim() : "";
  if (!/^sub_[A-Za-z0-9]+$/.test(subscriptionId)) {
    return NextResponse.json({ ok: false, reason: "invalid_subscription" }, { status: 400 });
  }

  let sk: string;
  try {
    sk = await getAlexanderStripeSecretKey();
  } catch {
    return NextResponse.json({ ok: false, reason: "stripe_secret_not_configured" }, { status: 503 });
  }

  const secretMode = resolveStripeSecretMode(sk);
  const configured = configuredStripeMode() || "test";
  if (!secretMode || secretMode !== configured) {
    return NextResponse.json({ ok: false, reason: "mode_secret_mismatch" }, { status: 503 });
  }

  let subscription: Record<string, unknown>;
  try {
    subscription = await stripeGet(
      `/subscriptions/${encodeURIComponent(subscriptionId)}`,
      sk,
    );
  } catch (error) {
    const status = Number((error as { status?: number }).status ?? 0);
    const retryable = status === 0 || status >= 500 || status === 429;
    return NextResponse.json(
      { ok: false, reason: "subscription_retrieve_failed", retryable },
      { status: retryable ? 503 : 400 },
    );
  }

  const livemode = subscription.livemode === true;
  if (configured === "test" && livemode) {
    return NextResponse.json({ ok: false, reason: "livemode_mismatch" }, { status: 400 });
  }
  if (configured === "live" && !livemode) {
    return NextResponse.json({ ok: false, reason: "livemode_mismatch" }, { status: 400 });
  }

  const subscriptionStatus =
    typeof subscription.status === "string" ? subscription.status.trim().toLowerCase() : "";
  if (!subscriptionStatus) {
    return NextResponse.json({ ok: false, reason: "missing_subscription_status" }, { status: 400 });
  }

  const customerRaw = subscription.customer;
  const customerId =
    typeof customerRaw === "string"
      ? customerRaw
      : customerRaw && typeof customerRaw === "object" && typeof (customerRaw as { id?: unknown }).id === "string"
        ? String((customerRaw as { id: string }).id)
        : "";

  const result = await invokePersistenceLambda({
    operation: "syncStripeSubscriptionEligibility",
    verified: {
      subscriptionId,
      subscriptionStatus,
      livemode,
      customerId: customerId || null,
    },
    correlationKey:
      typeof body.correlationKey === "string" && body.correlationKey
        ? body.correlationKey
        : idempotencyKey || `sub_sync:${subscriptionId}`,
  });

  if (!result.ok) {
    const payload = result.payload as { reason?: string; retryable?: boolean } | null;
    const status = payload?.retryable ? 503 : 400;
    return NextResponse.json(
      { ok: false, reason: payload?.reason || "sync_failed" },
      { status },
    );
  }

  return NextResponse.json(result.payload ?? { ok: true }, { status: 200 });
}
