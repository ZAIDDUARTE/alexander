/**
 * Server-side Stripe verification for Vercel (internet-capable).
 * Persistence Lambda sits in an isolated VPC without NAT — it cannot call Stripe.
 * Defense-in-depth: Vercel verifies with Test secret, then IAM-invokes Lambda to persist.
 */

import {
  ALEXANDER_STRIPE_TEST_PRICE_ID,
  ALEXANDER_STRIPE_TEST_PRODUCT_ID,
  type StripeVerifyResult,
  type StripeVerifiedCheckout,
} from "@/lib/server/persistence/stripe-verify";

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function expandId(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value) {
    return asString((value as { id?: unknown }).id);
  }
  return "";
}

async function stripeGet(path: string, secretKey: string): Promise<Record<string, unknown>> {
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Stripe-Version": "2024-06-20",
    },
  });
  const body = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    const err = body.error as { message?: string } | undefined;
    throw Object.assign(new Error(err?.message || "stripe_api_error"), {
      status: response.status,
    });
  }
  return body;
}

export async function verifyPaidCheckoutSessionServer(
  checkoutSessionId: string,
  secretKey: string,
): Promise<StripeVerifyResult> {
  const sessionId = checkoutSessionId.trim();
  if (!/^cs_test_[A-Za-z0-9]+$/.test(sessionId)) {
    return { ok: false, reason: "invalid_session_id", retryable: false };
  }
  if (!secretKey.startsWith("sk_test_")) {
    return { ok: false, reason: "live_or_invalid_secret", retryable: false };
  }

  let session: Record<string, unknown>;
  try {
    session = await stripeGet(
      `/checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=line_items.data.price&expand[]=subscription&expand[]=customer`,
      secretKey,
    );
  } catch (error) {
    const status = Number((error as { status?: number }).status ?? 0);
    const retryable = status === 0 || status >= 500 || status === 429;
    return { ok: false, reason: "stripe_retrieve_failed", retryable };
  }

  if (session.livemode === true) {
    return { ok: false, reason: "livemode_not_allowed", retryable: false };
  }
  if (asString(session.mode) !== "subscription") {
    return { ok: false, reason: "mode_not_subscription", retryable: false };
  }
  if (asString(session.status) !== "complete") {
    return { ok: false, reason: "session_not_complete", retryable: false };
  }
  if (asString(session.payment_status) !== "paid") {
    return { ok: false, reason: "payment_status_not_paid", retryable: false };
  }

  const lineItems = session.line_items as { data?: Array<Record<string, unknown>> } | undefined;
  const first = Array.isArray(lineItems?.data) ? lineItems?.data[0] : null;
  const price = first?.price as Record<string, unknown> | undefined;
  const priceId = asString(price?.id);
  const productId = expandId(price?.product);
  if (priceId !== ALEXANDER_STRIPE_TEST_PRICE_ID) {
    return { ok: false, reason: "price_mismatch", retryable: false };
  }
  if (productId && productId !== ALEXANDER_STRIPE_TEST_PRODUCT_ID) {
    return { ok: false, reason: "product_mismatch", retryable: false };
  }

  const customerId = expandId(session.customer);
  if (!customerId.startsWith("cus_")) {
    return { ok: false, reason: "missing_customer", retryable: false };
  }
  const subscriptionId = expandId(session.subscription);
  if (!subscriptionId.startsWith("sub_")) {
    return { ok: false, reason: "missing_subscription", retryable: false };
  }

  let subscriptionStatus = "";
  if (session.subscription && typeof session.subscription === "object") {
    subscriptionStatus = asString((session.subscription as { status?: unknown }).status);
  } else {
    try {
      const sub = await stripeGet(`/subscriptions/${encodeURIComponent(subscriptionId)}`, secretKey);
      subscriptionStatus = asString(sub.status);
    } catch {
      return { ok: false, reason: "subscription_retrieve_failed", retryable: true };
    }
  }
  if (subscriptionStatus !== "active") {
    return { ok: false, reason: "subscription_not_active", retryable: false };
  }

  const details = session.customer_details as Record<string, unknown> | undefined;
  const verified: StripeVerifiedCheckout = {
    checkoutSessionId: sessionId,
    customerId,
    subscriptionId,
    priceId,
    productId: productId || ALEXANDER_STRIPE_TEST_PRODUCT_ID,
    email: asString(details?.email) || null,
    name: asString(details?.name) || null,
    phone: asString(details?.phone) || null,
    subscriptionStatus,
  };
  return { ok: true, session: verified };
}
