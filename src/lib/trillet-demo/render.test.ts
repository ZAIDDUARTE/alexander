import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

import type { CustomerPolicyProfileV1 } from "../policy-profile/types";
import { renderTrilletDemoBundle, listActivePolicyFields } from "./render";

const PROFILE_PATH = resolve(
  "docs/alexander-readiness/dev-artifacts/phillip-policy-profile-v1.json",
);

function loadProfile(): CustomerPolicyProfileV1 {
  return JSON.parse(readFileSync(PROFILE_PATH, "utf8")) as CustomerPolicyProfileV1;
}

const FORBIDDEN_IN_PUBLIC = [
  /contact-[a-z0-9]+/i,
  /\bsw-[a-z0-9]+\b/i,
  /Housecall Pro/i,
  /Jobber/i,
  /I've updated your (crm|account)/i,
  /appointment is confirmed/i,
  /I booked you/i,
];

const REQUIRED_IN_PROMPT = [
  "SUNDAY CALLABLE DEMO",
  "MUST NOT",
  "scheduling team will contact you",
  "ALEXANDER REUSABLE AGENT INSTRUCTIONS",
  "Lisa",
  "Marina Del Rey Plumbing",
];

describe("trillet demo renderer", () => {
  it("renders prompt and knowledge from Phillip profile without hardcoded answers", () => {
    const profile = loadProfile();
    const bundle = renderTrilletDemoBundle(profile);

    assert.ok(bundle.sharedPrompt.length > 10_000);
    assert.ok(bundle.companyKnowledge.length > 2_000);
    assert.ok(bundle.meta.agentName === "Lisa");
    assert.ok(bundle.meta.companyDisplayName.includes("Marina Del Rey"));

    for (const phrase of REQUIRED_IN_PROMPT) {
      assert.ok(
        bundle.sharedPrompt.includes(phrase) || bundle.companyKnowledge.includes(phrase),
        `missing expected phrase: ${phrase}`,
      );
    }

    assert.ok(listActivePolicyFields(profile).length >= 100);

    for (const pattern of FORBIDDEN_IN_PUBLIC) {
      assert.ok(!pattern.test(bundle.companyKnowledge), `knowledge failed: ${pattern}`);
    }

    assert.ok(!bundle.companyKnowledge.includes("contact-ber7146zmuumcwes"));
    assert.ok(!bundle.sanitizedProfileJson.includes("contact-ber7146zmuumcwes"));
    assert.ok(bundle.sanitizedProfileJson.includes('"contacts": {}'));

    assert.ok(bundle.greetingSuggestion.toLowerCase().includes("ai receptionist"));
    assert.ok(!bundle.companyKnowledge.includes("Alexander"));
    assert.ok(!/\bhe should\b/i.test(bundle.companyKnowledge));
    assert.ok(!bundle.companyKnowledge.includes('"callerLanguages"'));
    assert.ok(bundle.companyKnowledge.includes("onboarding-supplied reference data"));
  });

  it("includes emergency and pricing policy excerpts derived from profile slots", () => {
    const profile = loadProfile();
    const bundle = renderTrilletDemoBundle(profile);
    assert.ok(bundle.companyKnowledge.includes("suspected-gas-leak-or-odor"));
    assert.ok(bundle.companyKnowledge.includes("starting_at") || bundle.companyKnowledge.includes("189"));
    assert.ok(bundle.companyKnowledge.includes("90292"));
  });

  it("does not instruct confirmed booking in demo overlay", () => {
    const bundle = renderTrilletDemoBundle(loadProfile());
    assert.ok(bundle.sharedPrompt.includes("Do NOT say"));
    assert.ok(bundle.sharedPrompt.includes("Confirm an appointment is booked"));
  });
});
