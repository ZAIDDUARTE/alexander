import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isBlockedVendorDashboardHost,
  resolveApprovedDashboardUrl,
  validateCustomerDashboardUrl,
} from "./dashboard-url";

describe("dashboard-url allowlist", () => {
  const env = {
    ALEXANDER_CUSTOMER_DASHBOARD_URL: "https://app.trillet.ai/login",
    ALEXANDER_CUSTOMER_DASHBOARD_ALLOWED_ORIGINS: "https://app.trillet.ai",
  };

  it("accepts the configured HTTPS allowlisted URL", () => {
    const result = resolveApprovedDashboardUrl(env);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.url, "https://app.trillet.ai/login");
      assert.equal(result.origin, "https://app.trillet.ai");
    }
  });

  it("rejects missing URL", () => {
    const result = validateCustomerDashboardUrl("", env);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "missing_url");
  });

  it("rejects http", () => {
    const result = validateCustomerDashboardUrl("http://app.trillet.ai/login", env);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "insecure_scheme");
  });

  it("rejects malformed URL", () => {
    const result = validateCustomerDashboardUrl("not a url", env);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "invalid_url");
  });

  it("rejects credentials in URL", () => {
    const result = validateCustomerDashboardUrl(
      "https://user:pass@app.trillet.ai/login",
      env,
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "credentials_in_url");
  });

  it("rejects unapproved origins", () => {
    const result = validateCustomerDashboardUrl("https://evil.example/phish", env);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "origin_not_allowlisted");
  });

  it("blocks portal.meetalexander.ai until verified", () => {
    const result = validateCustomerDashboardUrl(
      "https://portal.meetalexander.ai/",
      {
        ALEXANDER_CUSTOMER_DASHBOARD_URL: "https://portal.meetalexander.ai/",
        ALEXANDER_CUSTOMER_DASHBOARD_ALLOWED_ORIGINS: "https://portal.meetalexander.ai",
      },
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "origin_not_allowlisted");
  });

  it("requires an allowlist", () => {
    const result = validateCustomerDashboardUrl("https://app.trillet.ai/login", {});
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "allowlist_empty");
  });

  it("rejects Jobber staging and admin hosts even if allowlisted", () => {
    assert.equal(isBlockedVendorDashboardHost("secure.getjobber.com"), true);
    assert.equal(isBlockedVendorDashboardHost("staging.jobber.com"), true);
    assert.equal(isBlockedVendorDashboardHost("app.trillet.ai"), false);

    const result = validateCustomerDashboardUrl("https://secure.getjobber.com/admin", {
      ALEXANDER_CUSTOMER_DASHBOARD_URL: "https://secure.getjobber.com/admin",
      ALEXANDER_CUSTOMER_DASHBOARD_ALLOWED_ORIGINS: "https://secure.getjobber.com",
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "vendor_admin_url_blocked");
  });
});
