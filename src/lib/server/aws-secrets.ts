import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { awsCredentialsProvider } from "@vercel/oidc-aws-credentials-provider";

function region(): string {
  const value = process.env.AWS_REGION || "";
  if (!value) throw new Error("aws_region_missing");
  return value;
}

function roleArn(): string {
  const value = process.env.AWS_ROLE_ARN || "";
  if (!value) throw new Error("aws_role_missing");
  return value;
}

let client: SecretsManagerClient | null = null;

function secretsClient(): SecretsManagerClient {
  if (!client) {
    client = new SecretsManagerClient({
      region: region(),
      credentials: awsCredentialsProvider({ roleArn: roleArn() }),
    });
  }
  return client;
}

/**
 * Load a JSON or string secret by ARN/name via Vercel OIDC → IAM role.
 * Never logs secret values.
 */
export async function getSecretString(secretId: string): Promise<string> {
  const result = await secretsClient().send(
    new GetSecretValueCommand({ SecretId: secretId }),
  );
  if (!result.SecretString) throw new Error("secret_empty");
  return result.SecretString;
}

/**
 * Load the Stripe secret that matches ALEXANDER_STRIPE_MODE.
 * Defaults to the staging test secret path when MODE is unset or test.
 * Never logs secret values.
 */
export async function getAlexanderStripeSecretKey(): Promise<string> {
  const mode = (process.env.ALEXANDER_STRIPE_MODE || "test").trim().toLowerCase();
  // Optional direct key (Vercel). Used when it matches the configured mode so a
  // live secret in Secrets Manager cannot verify test Checkout sessions.
  const direct = (process.env.ALEXANDER_STRIPE_SECRET_KEY || "").trim();
  if (direct && !direct.startsWith("__")) {
    if (mode === "live" && (direct.startsWith("sk_live_") || direct.startsWith("rk_live_"))) {
      return direct;
    }
    if (mode !== "live" && (direct.startsWith("sk_test_") || direct.startsWith("rk_test_"))) {
      return direct;
    }
  }
  const id =
    process.env.ALEXANDER_STRIPE_SECRET_ARN ||
    process.env.ALEXANDER_STRIPE_SECRET_NAME ||
    (mode === "live" ? "alexander/production/stripe" : "alexander/staging/stripe");
  const raw = await getSecretString(id);
  let key = "";
  try {
    const parsed = JSON.parse(raw) as { secretKey?: string };
    if (typeof parsed.secretKey === "string") key = parsed.secretKey.trim();
  } catch {
    key = raw.trim();
  }
  if (mode === "live") {
    if (!key.startsWith("sk_live_") && !key.startsWith("rk_live_")) {
      throw new Error("stripe_secret_not_live");
    }
    return key;
  }
  if (!key.startsWith("sk_test_") && !key.startsWith("rk_test_")) {
    throw new Error("stripe_secret_not_test");
  }
  return key;
}

/** @deprecated Prefer getAlexanderStripeSecretKey(). */
export async function getAlexanderStripeTestSecretKey(): Promise<string> {
  const previous = process.env.ALEXANDER_STRIPE_MODE;
  if (!previous) process.env.ALEXANDER_STRIPE_MODE = "test";
  try {
    const key = await getAlexanderStripeSecretKey();
    if (!key.startsWith("sk_test_") && !key.startsWith("rk_test_")) {
      throw new Error("stripe_secret_not_test");
    }
    return key;
  } finally {
    if (previous === undefined) delete process.env.ALEXANDER_STRIPE_MODE;
    else process.env.ALEXANDER_STRIPE_MODE = previous;
  }
}

export async function getAlexanderLifecycleHmacSecret(): Promise<string> {
  const id =
    process.env.ALEXANDER_LIFECYCLE_HMAC_SECRET_ARN ||
    process.env.ALEXANDER_LIFECYCLE_HMAC_SECRET_NAME ||
    "alexander/staging/lifecycle-hmac";
  // Prefer ARN/name from AWS; fall back to env only if already injected (local).
  const envDirect = (process.env.ALEXANDER_LIFECYCLE_HMAC_SECRET || "").trim();
  if (envDirect && !envDirect.startsWith("__") && envDirect !== "undefined") {
    return envDirect;
  }
  const raw = await getSecretString(id);
  try {
    const parsed = JSON.parse(raw) as { hmacSecret?: string };
    if (typeof parsed.hmacSecret === "string" && parsed.hmacSecret.length >= 32) {
      return parsed.hmacSecret;
    }
  } catch {
    if (raw.length >= 32) return raw;
  }
  throw new Error("hmac_secret_unavailable");
}
