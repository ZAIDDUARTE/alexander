/**
 * Allowlisted customer dashboard destinations for SES Email #2.
 * Never accept arbitrary operator/client URLs as portal destinations.
 */

export type DashboardUrlEnv = {
  ALEXANDER_CUSTOMER_DASHBOARD_URL?: string;
  ALEXANDER_CUSTOMER_DASHBOARD_ALLOWED_ORIGINS?: string;
  [key: string]: string | undefined;
};

export type DashboardUrlResult =
  | { ok: true; url: string; origin: string; verifiedBy: "allowlist" }
  | {
      ok: false;
      reason:
        | "missing_url"
        | "invalid_url"
        | "insecure_scheme"
        | "credentials_in_url"
        | "origin_not_allowlisted"
        | "allowlist_empty"
        | "vendor_admin_url_blocked";
      detail?: string;
    };

const BLOCKED_HOSTS = new Set([
  "portal.meetalexander.ai",
  "dashboard.meetalexander.ai",
]);

/** Jobber staging/admin and similar vendor ops hosts — never Email #2 destinations. */
const BLOCKED_VENDOR_HOST_RE =
  /(^|\.)jobber\.com$|(^|\.)getjobber\.com$|jobber.*(staging|admin)|(staging|admin).*jobber/i;

/**
 * Shared Trillet sign-in. Origin allowlisting does not make this a customer dashboard.
 * A workspaceId query does not select an isolated tenant (verified on the live host).
 */
export function isSharedTrilletAuthUrl(raw: string | null | undefined): boolean {
  const text = (raw || "").trim();
  if (!text) return false;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  if (url.hostname.toLowerCase() !== "app.trillet.ai") return false;
  const path = url.pathname.replace(/\/+$/, "") || "/";
  return path === "/" || path === "/login" || path === "/auth/login";
}

export function isBlockedVendorDashboardHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  if (!host) return false;
  return BLOCKED_VENDOR_HOST_RE.test(host);
}

function parseAllowlist(env: DashboardUrlEnv): Set<string> {
  const origins = new Set<string>();
  const configured = (env.ALEXANDER_CUSTOMER_DASHBOARD_URL || "").trim();
  if (configured) {
    try {
      const u = new URL(configured);
      if (u.protocol === "https:") origins.add(u.origin.toLowerCase());
    } catch {
      // ignore invalid configured base
    }
  }
  for (const part of (env.ALEXANDER_CUSTOMER_DASHBOARD_ALLOWED_ORIGINS || "").split(",")) {
    const raw = part.trim();
    if (!raw) continue;
    try {
      const u = new URL(raw.includes("://") ? raw : `https://${raw}`);
      if (u.protocol === "https:") origins.add(u.origin.toLowerCase());
    } catch {
      // skip malformed entries
    }
  }
  return origins;
}

/** Resolve the single configured dashboard URL only if it passes allowlist rules. */
export function resolveApprovedDashboardUrl(env: DashboardUrlEnv = process.env): DashboardUrlResult {
  const configured = (env.ALEXANDER_CUSTOMER_DASHBOARD_URL || "").trim();
  if (!configured) return { ok: false, reason: "missing_url" };
  return validateCustomerDashboardUrl(configured, env);
}

export function validateCustomerDashboardUrl(
  raw: string | null | undefined,
  env: DashboardUrlEnv = process.env,
): DashboardUrlResult {
  const text = (raw || "").trim();
  if (!text) return { ok: false, reason: "missing_url" };

  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return { ok: false, reason: "invalid_url" };
  }

  if (url.protocol !== "https:") {
    return { ok: false, reason: "insecure_scheme", detail: url.protocol };
  }
  if (url.username || url.password) {
    return { ok: false, reason: "credentials_in_url" };
  }
  const hostname = url.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(hostname)) {
    return {
      ok: false,
      reason: "origin_not_allowlisted",
      detail: `${url.hostname} is blocked until verified customer portal hosting exists`,
    };
  }
  if (isBlockedVendorDashboardHost(hostname)) {
    return {
      ok: false,
      reason: "vendor_admin_url_blocked",
      detail: `${url.hostname} is a Jobber/vendor staging or admin host and cannot be used for customer Email #2`,
    };
  }

  const allowlist = parseAllowlist(env);
  if (allowlist.size === 0) {
    return {
      ok: false,
      reason: "allowlist_empty",
      detail: "Set ALEXANDER_CUSTOMER_DASHBOARD_URL or ALEXANDER_CUSTOMER_DASHBOARD_ALLOWED_ORIGINS",
    };
  }

  const origin = url.origin.toLowerCase();
  if (!allowlist.has(origin)) {
    return { ok: false, reason: "origin_not_allowlisted", detail: origin };
  }

  // Normalize: drop hash/credentials; keep path/query if present on configured URL.
  url.hash = "";
  return { ok: true, url: url.toString().replace(/\/$/, ""), origin, verifiedBy: "allowlist" };
}
