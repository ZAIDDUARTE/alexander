#!/usr/bin/env npx tsx
/**
 * One-command Trillet Sunday demo pack generator.
 * Usage: npm run render:trillet-demo
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import type { CustomerPolicyProfileV1 } from "../src/lib/policy-profile/types";
import { buildFinalAgentInstructions } from "../src/lib/trillet-demo/final-agent-instructions";
import { verifyFinalInstructions } from "../src/lib/trillet-demo/final-instructions-verify";
import { renderTrilletDemoBundle } from "../src/lib/trillet-demo/render";
import { buildDemoScenariosMarkdown } from "../src/lib/trillet-demo/scenarios";
import { buildInstallationInstructions } from "../src/lib/trillet-demo/installation";

const ROOT = resolve(import.meta.dirname, "..");
const DEFAULT_PROFILE = resolve(
  ROOT,
  "docs/alexander-readiness/dev-artifacts/phillip-policy-profile-v1.json",
);
const OUT_DIR = resolve(ROOT, "output/trillet-demo");

function main() {
  const profilePath = process.argv[2] ?? DEFAULT_PROFILE;
  const profile = JSON.parse(readFileSync(profilePath, "utf8")) as CustomerPolicyProfileV1;

  const bundle = renderTrilletDemoBundle(profile, { assumedTimezone: "America/Los_Angeles" });

  mkdirSync(OUT_DIR, { recursive: true });

  writeFileSync(resolve(OUT_DIR, "shared-prompt.md"), bundle.sharedPrompt, "utf8");
  writeFileSync(resolve(OUT_DIR, "company-knowledge.md"), bundle.companyKnowledge, "utf8");
  writeFileSync(resolve(OUT_DIR, "customer-policy-profile-sanitized.json"), bundle.sanitizedProfileJson, "utf8");
  writeFileSync(resolve(OUT_DIR, "greeting-suggestion.txt"), bundle.greetingSuggestion, "utf8");
  writeFileSync(
    resolve(OUT_DIR, "render-meta.json"),
    JSON.stringify(bundle.meta, null, 2),
    "utf8",
  );
  writeFileSync(resolve(OUT_DIR, "demo-call-scenarios.md"), buildDemoScenariosMarkdown(bundle), "utf8");
  writeFileSync(
    resolve(OUT_DIR, "TRILLET_INSTALLATION.md"),
    buildInstallationInstructions(bundle),
    "utf8",
  );

  const finalInstructions = buildFinalAgentInstructions(profile, {
    assumedTimezone: "America/Los_Angeles",
    openingGreeting: bundle.greetingSuggestion,
  });
  const verification = verifyFinalInstructions(
    finalInstructions,
    bundle.meta.companyDisplayName,
    bundle.meta.agentName,
  );
  writeFileSync(resolve(OUT_DIR, "FINAL_AGENT_INSTRUCTIONS.md"), finalInstructions, "utf8");
  writeFileSync(
    resolve(OUT_DIR, "final-instructions-verification.json"),
    JSON.stringify(verification, null, 2),
    "utf8",
  );
  if (!verification.ok) {
    console.error("FINAL_AGENT_INSTRUCTIONS verification failed:");
    for (const e of verification.errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  console.log(`Wrote Trillet demo pack to ${OUT_DIR}`);
  console.log(`Company: ${bundle.meta.companyDisplayName}`);
  console.log(`Agent: ${bundle.meta.agentName}`);
  console.log(`Prompt ~${bundle.meta.approxPromptChars} chars | Knowledge ~${bundle.meta.approxKnowledgeChars} chars`);
}

main();
