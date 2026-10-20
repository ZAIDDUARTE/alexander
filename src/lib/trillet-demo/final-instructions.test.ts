import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

import type { CustomerPolicyProfileV1 } from "../policy-profile/types";
import { buildFinalAgentInstructions } from "./final-agent-instructions";
import { verifyFinalInstructions, DEMO_SCENARIO_CHECKS } from "./final-instructions-verify";
import { renderTrilletDemoBundle } from "./render";

const PROFILE_PATH = resolve(
  "docs/alexander-readiness/dev-artifacts/phillip-policy-profile-v1.json",
);

describe("FINAL_AGENT_INSTRUCTIONS", () => {
  it("is concise, has no JSON, and passes scenario verification", () => {
    const profile = JSON.parse(readFileSync(PROFILE_PATH, "utf8")) as CustomerPolicyProfileV1;
    const bundle = renderTrilletDemoBundle(profile);
    const final = buildFinalAgentInstructions(profile, {
      openingGreeting: bundle.greetingSuggestion,
    });

    assert.ok(final.length < 20_000, `too long: ${final.length}`);
    assert.ok(!final.includes("```json"));
    assert.ok(!final.includes('"policies"'));
    assert.ok(!final.includes('"callerLanguages"'));
    assert.ok(!final.includes("SUNDAY_CALLABLE_DEMO_V1"));
    assert.ok(!/\b(he|him|his)\s+(should|must|may)\b/i.test(final));
    assert.ok(final.includes("not records you verified"));
    assert.ok(final.includes("Lisa"));
    assert.ok(final.includes("speak naturally"));
    assert.ok(final.includes("Never say or imply"));

    const v = verifyFinalInstructions(final, bundle.meta.companyDisplayName, "Lisa");
    assert.equal(v.ok, true, v.errors.join("; "));
    assert.equal(v.scenarioCoverage.length, DEMO_SCENARIO_CHECKS.length);
  });

  it("pulls guardrails from profile not hardcoded company facts", () => {
    const profile = JSON.parse(readFileSync(PROFILE_PATH, "utf8")) as CustomerPolicyProfileV1;
    const bundle = renderTrilletDemoBundle(profile);
    const final = buildFinalAgentInstructions(profile, { openingGreeting: bundle.greetingSuggestion });
    assert.ok(final.includes("Marina Del Rey"));
    assert.ok(final.includes("BBB") || final.includes("prohibited") || final.includes("Never claim"));
  });
});
