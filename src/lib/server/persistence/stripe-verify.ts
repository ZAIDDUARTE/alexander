/**
 * Defense-in-depth Stripe Checkout verification for paid customer provisioning.
 * Secrets are loaded from AWS Secrets Manager at runtime — never from source.
 */

export const ALEXANDER_STRIPE_TEST_PRICE_ID = "price_1UPnnEQKy1Smykv0n8NSuxFG";
export const ALEXANDER_STRIPE_TEST_PRODUCT_ID = "prod_VQf7oFN8EMgfWF";

export type StripeVerifiedCheckout = {
  checkoutSessionId: string;
  customerId: string;
  subscriptionId: string;
  priceId: string;
  productId: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  subscriptionStatus: string;
};

export type StripeVerifyResult =
  | { ok: true; session: StripeVerifiedCheckout }
  | { ok: false; reason: string; retryable: boolean };

type StripeSecretShape = {
  secretKey?: string;
  webhookSecret?: string;
};

export async function loadStripeSecretKey(secretArn: string): Promise<string> {
  const { SecretsManagerClient, GetSecretValueCommand } = await import(
    "@aws-sdk/client-secrets-manager"
  );
  const client = new SecretsManagerClient({});
  const result = await client.send(new GetSecretValueCommand({ SecretId: secretArn }));
  if (!result.SecretString) throw new Error("stripe_secret_missing");
  const parsed = JSON.parse(result.SecretString) as StripeSecretShape | string;
  if (typeof parsed === "string") {
    if (!parsed.startsWith("sk_test_")) throw new Error("stripe_secret_not_test");
    return parsed;
  }
  const key = typeof parsed.secretKey === "string" ? parsed.secretKey.trim() : "";
  if (!key.startsWith("sk_test_")) throw new Error("stripe_secret_not_test");
  return key;
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

export async function verifyPaidCheckoutSession(
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
  const subObj = session.subscription;
  if (subObj && typeof subObj === "object") {
    subscriptionStatus = asString((subObj as { status?: unknown }).status);
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
  return {
    ok: true,
    session: {
      checkoutSessionId: sessionId,
      customerId,
      subscriptionId,
      priceId,
      productId: productId || ALEXANDER_STRIPE_TEST_PRODUCT_ID,
      email: asString(details?.email) || null,
      name: asString(details?.name) || null,
      phone: asString(details?.phone) || null,
      subscriptionStatus,
    },
  };
}
