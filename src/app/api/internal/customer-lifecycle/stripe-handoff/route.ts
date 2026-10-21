import { NextRequest, NextResponse } from "next/server";
import { invokePersistenceLambda } from "@/lib/server/aws-persistence";
import {
  getAlexanderLifecycleHmacSecret,
  getAlexanderStripeSecretKey,
} from "@/lib/server/aws-secrets";
import { verifyLifecycleSignature } from "@/lib/server/lifecycle-hmac";
import {
  configuredStripeMode,
  sessionIdMatchesMode,
  type StripeRuntimeMode,
} from "@/lib/server/persistence/stripe-verify";
import { verifyPaidCheckoutSessionServer } from "@/lib/server/stripe-verify-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PATH = "/api/internal/customer-lifecycle/stripe-handoff";

export async function POST(request: NextRequest): Promise<NextResponse> {
  let secret: string;
  try {
    // Prefer AWS Secrets Manager via Vercel OIDC (no secret value in Vercel env).
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

  let body: { checkoutSessionId?: unknown; correlationKey?: unknown; host?: unknown };
  try {
    body = JSON.parse(rawBody) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  }

  const checkoutSessionId =
    typeof body.checkoutSessionId === "string" ? body.checkoutSessionId.trim() : "";
  const mode: StripeRuntimeMode = configuredStripeMode() || "test";
  if (!sessionIdMatchesMode(checkoutSessionId, mode)) {
    return NextResponse.json({ ok: false, reason: "invalid_session" }, { status: 400 });
  }

  let sk: string;
  try {
    sk = await getAlexanderStripeSecretKey();
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    let reason = "stripe_secret_not_configured";
    if (
      message === "stripe_secret_not_test" ||
      message === "stripe_secret_not_live" ||
      message === "aws_region_missing" ||
      message === "aws_role_missing" ||
      message === "secret_empty" ||
      message === "stripe_secret_invalid_prefix"
    ) {
      reason = message;
    } else if (/AccessDenied|not authorized/i.test(message)) {
      reason = "stripe_secret_access_denied";
    } else if (/ResourceNotFound|Secrets Manager can't find/i.test(message)) {
      reason = "stripe_secret_not_found";
    } else if (/ExpiredToken|CredentialsProvider|OIDC|Could not load credentials/i.test(message)) {
      reason = "aws_credentials_unavailable";
    }
    return NextResponse.json({ ok: false, reason }, { status: 503 });
  }

  // Authoritative Stripe re-verification (Vercel has internet; VPC Lambda does not).
  const stripeCheck = await verifyPaidCheckoutSessionServer(checkoutSessionId, sk);
  if (!stripeCheck.ok) {
    const status = stripeCheck.retryable ? 503 : 400;
    return NextResponse.json({ ok: false, reason: stripeCheck.reason }, { status });
  }

  // Do not forward WordPress/payment Host headers for invitation URLs.
  // Persistence uses ALEXANDER_ONBOARDING_BASE_URL / ONBOARDING_HOST only.
  const result = await invokePersistenceLambda({
    operation: "provisionFromVerifiedStripe",
    verified: stripeCheck.session,
    correlationKey:
      typeof body.correlationKey === "string" && body.correlationKey
        ? body.correlationKey
        : idempotencyKey,
  });

  if (!result.ok) {
    const payload = result.payload as { reason?: string; retryable?: boolean } | null;
    const status = payload?.retryable ? 503 : 400;
    return NextResponse.json(
      { ok: false, reason: payload?.reason || "provision_failed" },
      { status },
    );
  }

  return NextResponse.json(result.payload ?? { ok: true }, { status: 200 });
}
