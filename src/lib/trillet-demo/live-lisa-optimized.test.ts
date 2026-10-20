import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

import type { CustomerPolicyProfileV1 } from "../policy-profile/types";
import {
  buildLiveLisaPhillipV12OptimizedPrompt,
  estimatePromptTokens,
} from "./build-live-lisa-phillip-v12-optimized";
import { auditMarinaKbCoverage } from "./kb-coverage-audit";
import { qaAbPrompt } from "./ab-prompt-qa";

const PROFILE_PATH = resolve(
  "docs/alexander-readiness/dev-artifacts/phillip-policy-profile-v1.json",
);

describe("LIVE_LISA_PHILLIP_V1_2_OPTIMIZED", () => {
  it("fits target token budget and excludes embedded profile JSON", () => {
    const profile = JSON.parse(readFileSync(PROFILE_PATH, "utf8")) as CustomerPolicyProfileV1;
    const prompt = buildLiveLisaPhillipV12OptimizedPrompt(profile);
    const tokens = estimatePromptTokens(prompt);
    assert.ok(tokens < 5000, `too large: ${tokens} tokens`);
    assert.ok(tokens >= 2000, `too small: ${tokens} tokens`);
    assert.ok(!prompt.includes('"policies"'));
    assert.ok(prompt.includes("3A. CONVERSATIONAL INTELLIGENCE"));
    assert.ok(prompt.includes("9A. CONVERSATION QUALITY CHECK"));
    assert.ok(prompt.includes("11A. NON-BLOCKING"));
    assert.ok(!/ALX-C000001/i.test(prompt));
  });

  it("passes request-only and safety static checks", () => {
    const profile = JSON.parse(readFileSync(PROFILE_PATH, "utf8")) as CustomerPolicyProfileV1;
    const prompt = buildLiveLisaPhillipV12OptimizedPrompt(profile);
    assert.ok(/cannot guarantee when or how the team will follow up/i.test(prompt));
    assert.ok(/Never claim a request was sent when you only collected/i.test(prompt));
    assert.ok(/Connected functions[\s\S]*\*\*None\*\*/i.test(prompt));
    assert.ok(!/they'll contact you/i.test(prompt));
  });

  it("KB audit flags fee gap without requiring live KB edit", () => {
    const profile = JSON.parse(readFileSync(PROFILE_PATH, "utf8")) as CustomerPolicyProfileV1;
    const report = auditMarinaKbCoverage(profile);
    const fee = report.rows.find((r) => r.domain.includes("Cancellation"));
    assert.ok(fee?.status === "gap");
    assert.ok(report.qaSupplementRecommended);
  });
});
