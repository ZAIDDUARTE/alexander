#!/usr/bin/env npx tsx
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import type { CustomerPolicyProfileV1 } from "../src/lib/policy-profile/types";
import { buildLiveLisaPhillipV12Prompt } from "../src/lib/trillet-demo/build-live-lisa-phillip-v12";

const ROOT = resolve(import.meta.dirname, "..");
const PROFILE_PATH = resolve(ROOT, "docs/alexander-readiness/dev-artifacts/phillip-policy-profile-v1.json");
const REVIEW_PATH = resolve(ROOT, "docs/alexander-readiness/dev-artifacts/phillip-policy-profile-review.json");
const OUT = resolve(ROOT, "docs/alex-trillet-prompts/LIVE_LISA_PHILLIP_V1_2.txt");

function main() {
  const profile = JSON.parse(readFileSync(PROFILE_PATH, "utf8")) as CustomerPolicyProfileV1;
  const review = JSON.parse(readFileSync(REVIEW_PATH, "utf8")) as {
    issues: Array<{ severity: string; message: string }>;
  };
  const { prompt, meta } = buildLiveLisaPhillipV12Prompt(profile);

  const forbidden = [/ALX-C000001/i, /synthetic test workspace/i, /they'll contact you/i];
  for (const re of forbidden) {
    if (re.test(prompt)) {
      throw new Error(`Prompt failed guard: ${re.source}`);
    }
  }

  writeFileSync(OUT, prompt, "utf8");
  console.log(`Wrote ${OUT}`);
  console.log(`Total chars: ${meta.charCount} (instructions ~${meta.instructionChars}, profile JSON ~${meta.profileJsonChars})`);
  console.log(`Review: ${meta.reviewState}, issues: ${meta.reviewIssueCount}, empty/missing slots: ${meta.emptySlots}`);
  const errors = review.issues.filter((i) => i.severity === "error");
  if (errors.length) {
    console.warn(`PROFILE ERRORS (${errors.length}):`, errors.map((e) => e.message).join(" | "));
  }
}

main();
