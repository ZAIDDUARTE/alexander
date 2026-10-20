import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

import type { CustomerPolicyProfileV1 } from "../policy-profile/types";
import { buildLiveLisaPhillipV12Prompt } from "./build-live-lisa-phillip-v12";
import { loadV12SharedPrompt } from "./v12-shared-prompt";

const PROFILE_PATH = resolve(
  "docs/alexander-readiness/dev-artifacts/phillip-policy-profile-v1.json",
);

describe("LIVE_LISA_PHILLIP_V1_2", () => {
  it("includes v1.2 with 3A, Marina identity, profile JSON, no synthetic workspace", () => {
    const profile = JSON.parse(readFileSync(PROFILE_PATH, "utf8")) as CustomerPolicyProfileV1;
    const { prompt } = buildLiveLisaPhillipV12Prompt(profile);
    assert.ok(prompt.includes("3A. CONVERSATIONAL INTELLIGENCE"));
    assert.ok(prompt.includes(loadV12SharedPrompt().slice(0, 60)));
    assert.ok(prompt.includes("Marina Del Rey Plumbing"));
    assert.ok(prompt.includes("Lisa"));
    assert.ok(prompt.includes("alexander.customer_policy_profile"));
    assert.ok(!/ALX-C000001/i.test(prompt));
    assert.ok(!/synthetic test workspace/i.test(prompt));
    assert.ok(!/they'll contact you/i.test(prompt));
    assert.ok(prompt.includes("post-call") || prompt.includes("Post-call"));
    assert.ok(prompt.includes("cannot guarantee"));
  });
});
