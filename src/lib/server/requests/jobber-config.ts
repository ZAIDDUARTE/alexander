import { JOBBER_API_VERSION, type JobberConfig } from "./jobber";

export type JobberRuntimeConfig = JobberConfig & {
  encryptionKey: string;
  adminToken: string;
  stagingCustomerId: string;
  apiVersion: string;
  expectedAccountId: string | null;
  expectedAccountName: string | null;
};

function required(name: string): string {
  const value = (process.env[name] || "").trim();
  if (!value || value.startsWith("__") || value === "undefined") {
    throw new Error(`missing_${name.toLowerCase()}`);
  }
  return value;
}

function optional(name: string): string | null {
  const value = (process.env[name] || "").trim();
  if (!value || value.startsWith("__") || value === "undefined") return null;
  return value;
}

export function jobberOAuthEnabled(): boolean {
  // Explicit opt-in only. Production must never activate Jobber OAuth even if
  // credentials were mistakenly added to the Production environment.
  if (process.env.JOBBER_OAUTH_ENABLED !== "true") return false;
  if (process.env.VERCEL_ENV === "production") return false;
  return true;
}

export function loadJobberRuntimeConfig(): JobberRuntimeConfig {
  const clientId = required("JOBBER_CLIENT_ID");
  const clientSecret = required("JOBBER_CLIENT_SECRET");
  const callbackUrl = required("JOBBER_REDIRECT_URI");
  const encryptionKey = required("JOBBER_OAUTH_ENCRYPTION_KEY");
  const adminToken = required("JOBBER_OAUTH_ADMIN_TOKEN");
  const stagingCustomerId = required("JOBBER_STAGING_CUSTOMER_ID");
  if (!/^[0-9a-f-]{36}$/i.test(stagingCustomerId)) throw new Error("invalid_staging_customer_id");
  if (!/^[a-f0-9]{64}$/i.test(encryptionKey)) throw new Error("invalid_encryption_key");
  if (!/^[A-Za-z0-9_-]{43,256}$/.test(adminToken)) throw new Error("invalid_admin_token");
  const callback = new URL(callbackUrl);
  if (callback.protocol !== "https:" || callback.search || callback.hash || callback.username || callback.password) {
    throw new Error("invalid_callback");
  }
  const apiVersion = optional("JOBBER_GRAPHQL_VERSION") || JOBBER_API_VERSION;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(apiVersion)) throw new Error("invalid_graphql_version");
  return {
    clientId,
    clientSecret,
    callbackUrl,
    encryptionKey,
    adminToken,
    stagingCustomerId,
    apiVersion,
    expectedAccountId: optional("JOBBER_EXPECTED_ACCOUNT_ID"),
    expectedAccountName: optional("JOBBER_EXPECTED_ACCOUNT_NAME"),
  };
}

function isMissing(name: string): boolean {
  const value = (process.env[name] || "").trim();
  return !value || value.startsWith("__") || value === "undefined";
}

/** Secrets required before an admin can be authenticated. */
export function missingJobberAdminConfigNames(): string[] {
  return (["JOBBER_OAUTH_ADMIN_TOKEN"] as const).filter(isMissing);
}

export function missingJobberConfigNames(): string[] {
  const names = [
    "JOBBER_CLIENT_ID",
    "JOBBER_CLIENT_SECRET",
    "JOBBER_REDIRECT_URI",
    "JOBBER_OAUTH_ENCRYPTION_KEY",
    "JOBBER_OAUTH_ADMIN_TOKEN",
    "JOBBER_STAGING_CUSTOMER_ID",
  ] as const;
  return names.filter(isMissing);
}
