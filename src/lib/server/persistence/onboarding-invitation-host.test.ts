import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  invitationUrl,
  isForbiddenQuestionnaireHost,
  normalizeOnboardingHost,
  relocateInvitationUrlToCanonicalHost,
  resolveOnboardingInvitationHost,
} from "./onboarding-access";
import { hashToken } from "./tokens";

const ENV_KEYS = ["ALEXANDER_ONBOARDING_BASE_URL", "ONBOARDING_HOST"] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = saved[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("onboarding invitation host", () => {
  it("normalizes hosts and rejects WordPress questionnaire hosts", () => {
    assert.equal(normalizeOnboardingHost("https://Onboard.MeetAlexander.ai/path"), "onboard.meetalexander.ai");
    assert.equal(isForbiddenQuestionnaireHost("alexander1stg.wpenginepowered.com"), true);
    assert.equal(isForbiddenQuestionnaireHost("https://alexander1stg.wpenginepowered.com"), true);
    assert.equal(isForbiddenQuestionnaireHost("www.meetalexander.ai"), true);
    assert.equal(isForbiddenQuestionnaireHost("onboard.meetalexander.ai"), false);
  });

  it("ignores WordPress / payment callback host when env is configured", () => {
    process.env.ALEXANDER_ONBOARDING_BASE_URL = "https://onboard.meetalexander.ai";
    assert.equal(
      resolveOnboardingInvitationHost("alexander1stg.wpenginepowered.com"),
      "onboard.meetalexander.ai",
    );
    assert.equal(resolveOnboardingInvitationHost("https://evil.example"), "onboard.meetalexander.ai");
    const url = invitationUrl("alexander1stg.wpenginepowered.com", "tok_test_abc");
    assert.equal(url.startsWith("https://onboard.meetalexander.ai/i#"), true);
    assert.equal(url.includes("wpengine"), false);
    assert.equal(url.endsWith("tok_test_abc"), true);
  });

  it("uses ONBOARDING_HOST when ALEXANDER_ONBOARDING_BASE_URL is unset", () => {
    process.env.ONBOARDING_HOST = "onboard.meetalexander.ai";
    assert.equal(resolveOnboardingInvitationHost("alexander1stg.wpenginepowered.com"), "onboard.meetalexander.ai");
  });

  it("rejects WordPress host when no env is set", () => {
    assert.throws(() => resolveOnboardingInvitationHost("alexander1stg.wpenginepowered.com"), /forbidden/);
    assert.throws(() => invitationUrl("alexander1stg.wpenginepowered.com", "tok"), /forbidden/);
  });

  it("keeps /i# token format and relocates without changing the token", () => {
    process.env.ALEXANDER_ONBOARDING_BASE_URL = "https://onboard.meetalexander.ai";
    const token = "existing-token-value-does-not-change";
    const bad = `https://alexander1stg.wpenginepowered.com/i#${token}`;
    const fixed = relocateInvitationUrlToCanonicalHost(bad);
    assert.equal(fixed, `https://onboard.meetalexander.ai/i#${token}`);
    assert.equal(hashToken(token), hashToken(fixed.split("/i#")[1] || ""));
  });
});
