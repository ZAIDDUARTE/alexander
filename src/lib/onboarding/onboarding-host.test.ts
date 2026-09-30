import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { requestHostMatchesOnboardingHost } from "./onboarding-host";

describe("onboarding hostname", () => {
  it("matches the configured host and ignores case, port, and a trailing dot", () => {
    assert.equal(
      requestHostMatchesOnboardingHost("onboard.meetalexander.ai:443", "Onboard.MeetAlexander.ai."),
      true,
    );
  });

  it("does not treat Vercel, preview, or localhost hosts as the onboarding host", () => {
    const configured = "onboard.meetalexander.ai";
    assert.equal(requestHostMatchesOnboardingHost("alexander-orcin.vercel.app", configured), false);
    assert.equal(requestHostMatchesOnboardingHost("alexander-abc123.vercel.app", configured), false);
    assert.equal(requestHostMatchesOnboardingHost("localhost", configured), false);
  });

  it("does nothing when the hostname is not configured", () => {
    assert.equal(requestHostMatchesOnboardingHost("onboard.meetalexander.ai", undefined), false);
    assert.equal(requestHostMatchesOnboardingHost("onboard.meetalexander.ai", "  "), false);
  });
});
