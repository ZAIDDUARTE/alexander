import assert from "node:assert/strict";
import test from "node:test";
import {
  ALEXANDER_STRIPE_TEST_PRICE_ID,
  ALEXANDER_STRIPE_TEST_PRODUCT_ID,
  expectedStripeCatalog,
  resolveStripeSecretMode,
  resolveVerificationMode,
  sessionIdMatchesMode,
  verifyPaidCheckoutSession,
} from "./stripe-verify";

const previousEnv: Record<string, string | undefined> = {};

function setEnv(key: string, value: string | undefined): void {
  if (!(key in previousEnv)) previousEnv[key] = process.env[key];
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

function restoreEnv(): void {
  for (const [key, value] of Object.entries(previousEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  for (const key of Object.keys(previousEnv)) delete previousEnv[key];
}

test.afterEach(() => {
  restoreEnv();
});

test("session id mode matching rejects cross-mode sessions", () => {
  assert.equal(sessionIdMatchesMode("cs_test_abc123", "test"), true);
  assert.equal(sessionIdMatchesMode("cs_live_abc123", "live"), true);
  assert.equal(sessionIdMatchesMode("cs_live_abc123", "test"), false);
  assert.equal(sessionIdMatchesMode("cs_test_abc123", "live"), false);
  assert.equal(sessionIdMatchesMode("cs_bogus_abc", "test"), false);
  assert.equal(sessionIdMatchesMode("not_a_session", "test"), false);
});

test("secret mode resolution", () => {
  assert.equal(resolveStripeSecretMode("sk_test_example"), "test");
  assert.equal(resolveStripeSecretMode("rk_test_example"), "test");
  assert.equal(resolveStripeSecretMode("sk_live_example"), "live");
  assert.equal(resolveStripeSecretMode("rk_live_example"), "live");
  assert.equal(resolveStripeSecretMode("pk_test_example"), null);
});

test("mode and secret must agree when ALEXANDER_STRIPE_MODE is set", () => {
  setEnv("ALEXANDER_STRIPE_MODE", "test");
  assert.deepEqual(resolveVerificationMode("sk_test_x"), { ok: true, mode: "test" });
  assert.deepEqual(resolveVerificationMode("sk_live_x"), {
    ok: false,
    reason: "mode_secret_mismatch",
  });

  setEnv("ALEXANDER_STRIPE_MODE", "live");
  assert.deepEqual(resolveVerificationMode("sk_live_x"), { ok: true, mode: "live" });
  assert.deepEqual(resolveVerificationMode("sk_test_x"), {
    ok: false,
    reason: "mode_secret_mismatch",
  });
});

test("live catalogue never falls back to test product or price", () => {
  setEnv("ALEXANDER_STRIPE_MODE", "live");
  setEnv("ALEXANDER_STRIPE_PRICE_ID", undefined);
  setEnv("ALEXANDER_STRIPE_PRODUCT_ID", undefined);
  assert.equal(expectedStripeCatalog("live").ok, false);

  setEnv("ALEXANDER_STRIPE_PRICE_ID", ALEXANDER_STRIPE_TEST_PRICE_ID);
  setEnv("ALEXANDER_STRIPE_PRODUCT_ID", ALEXANDER_STRIPE_TEST_PRODUCT_ID);
  assert.equal(expectedStripeCatalog("live").reason, "test_catalog_rejected_in_live_mode");

  setEnv("ALEXANDER_STRIPE_PRICE_ID", "price_live_example500");
  setEnv("ALEXANDER_STRIPE_PRODUCT_ID", "prod_live_example");
  const live = expectedStripeCatalog("live");
  assert.equal(live.ok, true);
  assert.equal(live.priceId, "price_live_example500");
});

test("verifyPaidCheckoutSession rejects live session under test credentials", async () => {
  setEnv("ALEXANDER_STRIPE_MODE", "test");
  const result = await verifyPaidCheckoutSession("cs_live_abc123XYZ", "sk_test_example");
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "invalid_session_id");
});

test("verifyPaidCheckoutSession rejects test session under live credentials", async () => {
  setEnv("ALEXANDER_STRIPE_MODE", "live");
  setEnv("ALEXANDER_STRIPE_PRICE_ID", "price_live_example500");
  setEnv("ALEXANDER_STRIPE_PRODUCT_ID", "prod_live_example");
  const result = await verifyPaidCheckoutSession("cs_test_abc123XYZ", "sk_live_example");
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "invalid_session_id");
});

test("verifyPaidCheckoutSession rejects livemode mismatch from Stripe API", async () => {
  setEnv("ALEXANDER_STRIPE_MODE", "test");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    Response.json({
      id: "cs_test_abc123XYZ",
      livemode: true,
      mode: "subscription",
      status: "complete",
      payment_status: "paid",
      customer: "cus_test",
      subscription: "sub_test",
      line_items: {
        data: [
          {
            price: {
              id: ALEXANDER_STRIPE_TEST_PRICE_ID,
              product: ALEXANDER_STRIPE_TEST_PRODUCT_ID,
            },
          },
        ],
      },
    })) as typeof fetch;

  try {
    const result = await verifyPaidCheckoutSession("cs_test_abc123XYZ", "sk_test_example");
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "livemode_mismatch");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("verifyPaidCheckoutSession accepts a complete test subscription session", async () => {
  setEnv("ALEXANDER_STRIPE_MODE", "test");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    Response.json({
      id: "cs_test_abc123XYZ",
      livemode: false,
      mode: "subscription",
      status: "complete",
      payment_status: "paid",
      customer: "cus_testCustomer",
      subscription: { id: "sub_testSub", status: "active" },
      customer_details: {
        email: "buyer@example.com",
        name: "Buyer",
        phone: null,
      },
      line_items: {
        data: [
          {
            price: {
              id: ALEXANDER_STRIPE_TEST_PRICE_ID,
              product: ALEXANDER_STRIPE_TEST_PRODUCT_ID,
            },
          },
        ],
      },
    })) as typeof fetch;

  try {
    const result = await verifyPaidCheckoutSession("cs_test_abc123XYZ", "sk_test_example");
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.session.priceId, ALEXANDER_STRIPE_TEST_PRICE_ID);
      assert.equal(result.session.email, "buyer@example.com");
      assert.equal(result.session.subscriptionStatus, "active");
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("verifyPaidCheckoutSession accepts a complete live subscription session with live catalogue", async () => {
  setEnv("ALEXANDER_STRIPE_MODE", "live");
  setEnv("ALEXANDER_STRIPE_PRICE_ID", "price_live_example500");
  setEnv("ALEXANDER_STRIPE_PRODUCT_ID", "prod_live_example");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    Response.json({
      id: "cs_live_abc123XYZ",
      livemode: true,
      mode: "subscription",
      status: "complete",
      payment_status: "paid",
      customer: "cus_liveCustomer",
      subscription: { id: "sub_liveSub", status: "active" },
      customer_details: { email: "live@example.com", name: "Live", phone: null },
      line_items: {
        data: [
          {
            price: {
              id: "price_live_example500",
              product: "prod_live_example",
            },
          },
        ],
      },
    })) as typeof fetch;

  try {
    const result = await verifyPaidCheckoutSession("cs_live_abc123XYZ", "sk_live_example");
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.session.checkoutSessionId.startsWith("cs_live_"), true);
      assert.equal(result.session.priceId, "price_live_example500");
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
