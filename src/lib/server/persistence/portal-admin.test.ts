import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveInviteRecipientEmail } from "./portal-admin";

describe("resolveInviteRecipientEmail", () => {
  it("requires confirmed portal admin status", () => {
    const result = resolveInviteRecipientEmail({
      primary_email: "billing@example.com",
      portal_admin_email: "admin@example.com",
      portal_admin_status: "review_required",
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "portal_admin_not_confirmed");
  });

  it("rejects missing portal admin email even when confirmed", () => {
    const result = resolveInviteRecipientEmail({
      primary_email: "billing@example.com",
      portal_admin_email: null,
      portal_admin_status: "confirmed",
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "missing_portal_admin_email");
  });

  it("does not fall back to billing email alone", () => {
    const result = resolveInviteRecipientEmail({
      primary_email: "billing@example.com",
      portal_admin_status: null,
    });
    assert.equal(result.ok, false);
  });

  it("accepts checkout-confirmed portal admin", () => {
    const result = resolveInviteRecipientEmail({
      primary_email: "billing@example.com",
      portal_admin_email: "billing@example.com",
      portal_admin_status: "confirmed",
    });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.email, "billing@example.com");
  });

  it("accepts alternate verified portal admin", () => {
    const result = resolveInviteRecipientEmail({
      primary_email: "billing@example.com",
      portal_admin_email: "owner@example.com",
      portal_admin_status: "email_verified",
    });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.email, "owner@example.com");
  });

  it("normalizes email case", () => {
    const result = resolveInviteRecipientEmail({
      portal_admin_email: "Owner@Example.COM",
      portal_admin_status: "confirmed",
    });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.email, "owner@example.com");
  });
});
