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

export async function getAlexanderStripeTestSecretKey(): Promise<string> {
  const id =
    process.env.ALEXANDER_STRIPE_SECRET_ARN ||
    process.env.ALEXANDER_STRIPE_SECRET_NAME ||
    "alexander/staging/stripe";
  const raw = await getSecretString(id);
  try {
    const parsed = JSON.parse(raw) as { secretKey?: string };
    if (typeof parsed.secretKey === "string" && parsed.secretKey.startsWith("sk_test_")) {
      return parsed.secretKey;
    }
  } catch {
    // plain string secret
  }
  if (raw.startsWith("sk_test_")) return raw;
  throw new Error("stripe_secret_not_test");
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
