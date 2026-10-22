import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACCOUNT_SETUP_EMAIL_KIND,
  ACCOUNT_SETUP_EMAIL_TEMPLATE,
} from "./account-setup-email";
import { renderAccountSetupEmail, renderDashboardReadyEmail } from "./email-templates";

describe("account-setup email isolation from other notifications", () => {
  it("uses reserved profile_updated template with explicit kind discriminator", () => {
    assert.equal(ACCOUNT_SETUP_EMAIL_TEMPLATE, "profile_updated");
    assert.equal(ACCOUNT_SETUP_EMAIL_KIND, "account_setup_in_progress");
  });

  it("renders setup subject and never dashboard-ready copy", () => {
    const setup = renderAccountSetupEmail({ firstName: "Zaid", companyDisplayName: "Acme" });
    const dash = renderDashboardReadyEmail({
      firstName: "Zaid",
      dashboardUrl: "https://example.test/dashboard",
    });
    assert.equal(setup.subject, "We're Setting Up Your Alexander Account");
    assert.notEqual(setup.subject, dash.subject);
    assert.match(setup.text, /configuring Alexander/);
    assert.doesNotMatch(setup.html, /Open My Alexander Dashboard/i);
    assert.doesNotMatch(setup.text, /Use the secure link below to access your Alexander dashboard/i);
  });

  it("documents that worker must branch on template+kind before any profile-update notice", () => {
    // Guard contract: only profile_updated jobs with kind=account_setup_in_progress
    // are setup emails. A future true profile-update notice must use a different kind
    // or a migrated template name — never reuse this subject/body.
    const payload = { kind: ACCOUNT_SETUP_EMAIL_KIND, first_name: "Zaid" };
    assert.equal(payload.kind, "account_setup_in_progress");
    assert.notEqual(payload.kind, "profile_field_changed");
    assert.notEqual(payload.kind, "dashboard_ready");
  });
});
