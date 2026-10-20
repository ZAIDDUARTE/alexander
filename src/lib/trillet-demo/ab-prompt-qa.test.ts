import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

import type { CustomerPolicyProfileV1 } from "../policy-profile/types";
import { buildAbPromptBundle, loadSandboxBaselineConversationalLayer } from "./build-ab-prompts";
import { qaAbPrompts } from "./ab-prompt-qa";
import { loadV12SharedPrompt } from "./v12-shared-prompt";

const PROFILE_PATH = resolve(
  "docs/alexander-readiness/dev-artifacts/phillip-policy-profile-v1.json",
);

describe("ALX-C000001 A/B prompts (v1.2 vs sandbox baseline)", () => {
  it("uses identical shared install layers; only conversational sections differ", () => {
    const profile = JSON.parse(readFileSync(PROFILE_PATH, "utf8")) as CustomerPolicyProfileV1;
    const { versionA, versionB, sharedInstall } = buildAbPromptBundle(profile);
    assert.ok(versionA.startsWith(sharedInstall));
    assert.ok(versionB.startsWith(sharedInstall));
    assert.ok(versionA.includes(loadSandboxBaselineConversationalLayer().slice(0, 40)));
    assert.ok(versionB.includes("3A. CONVERSATIONAL INTELLIGENCE"));
    assert.ok(!versionA.includes("3A. CONVERSATIONAL INTELLIGENCE"));
    assert.ok(!versionB.includes("Conversational agent instructions — sandbox baseline"));
  });

  it("excludes unsupported callback guarantee and forbidden production claims", () => {
    const profile = JSON.parse(readFileSync(PROFILE_PATH, "utf8")) as CustomerPolicyProfileV1;
    const { versionA, versionB } = buildAbPromptBundle(profile);
    assert.ok(!/they'll contact you/i.test(versionA));
    assert.ok(!/they'll contact you/i.test(versionB));
    assert.ok(versionA.includes("cannot guarantee when or how the team will follow up"));
    assert.ok(versionB.includes("cannot guarantee when or how the team will follow up"));
  });

  it("automated static QA — both versions PASS", () => {
    const profile = JSON.parse(readFileSync(PROFILE_PATH, "utf8")) as CustomerPolicyProfileV1;
    const { versionA, versionB } = buildAbPromptBundle(profile);
    const { a, b } = qaAbPrompts(versionA, versionB);
    assert.equal(a.ok, true, a.checks.filter((c) => !c.pass && !c.skipped).map((c) => c.id).join(", "));
    assert.equal(b.ok, true, b.checks.filter((c) => !c.pass && !c.skipped).map((c) => c.id).join(", "));
  });

  it("Version B includes full v1.2 shared prompt core", () => {
    const profile = JSON.parse(readFileSync(PROFILE_PATH, "utf8")) as CustomerPolicyProfileV1;
    const { versionB } = buildAbPromptBundle(profile);
    assert.ok(versionB.includes(loadV12SharedPrompt().slice(0, 80)));
  });
});
