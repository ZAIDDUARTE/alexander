import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { CustomerPolicyProfileV1 } from "../policy-profile/types";
import { buildFinalAgentInstructions } from "./final-agent-instructions";
import {
  AB_TEST_SHARED_SAFETY_FOOTER,
  C000001_RUNTIME_HEADER,
  SHARED_CONNECTED_FUNCTIONS,
  SHARED_REQUEST_ONLY_CLOSING,
  SHARED_SANDBOX_SAFETY,
  sharedGreetingBlock,
  sharedProfileInstallBlock,
} from "./ab-sandbox-overlay";
import { renderTrilletDemoBundle } from "./render";
import { loadV12SharedPrompt } from "./v12-shared-prompt";

const SANDBOX_V11_PATH = resolve(
  import.meta.dirname,
  "../../../docs/alex-trillet-prompts/v1.1",
);

export const AB_PROFILE_JSON_FILENAME = "customer-policy-profile.json";

/** Conversational-only body from current sandbox baseline (no duplicate install layers). */
export function loadSandboxBaselineConversationalLayer(): string {
  const raw = readFileSync(SANDBOX_V11_PATH, "utf8");
  const start = raw.indexOf("# Factual Questions");
  const end = raw.indexOf("# Closing");
  if (start < 0 || end < 0) {
    throw new Error("Could not extract conversational layer from sandbox v1.1 file");
  }
  return [
    "# Conversational agent instructions — sandbox baseline (Version A only)",
    "",
    raw.slice(start, end).trim(),
  ].join("\n");
}

export type AbPromptBundle = {
  versionA: string;
  versionB: string;
  versionALabel: string;
  versionBLabel: string;
  greeting: string;
  companyDisplayName: string;
  agentName: string;
  profileJsonPath: string;
  knowledgeBasePath: string;
  sharedInstall: string;
};

function buildSharedInstall(
  profile: CustomerPolicyProfileV1,
  greeting: string,
): { sharedInstall: string; guardrailBlock: string } {
  const profileGuardrails = buildFinalAgentInstructions(profile, {
    assumedTimezone: "America/Los_Angeles",
    openingGreeting: greeting,
  });
  const guardrailStart = profileGuardrails.indexOf("## Company-specific guardrails");
  const guardrailBlock =
    guardrailStart >= 0
      ? profileGuardrails.slice(guardrailStart).trim()
      : "## Company-specific guardrails\nSee knowledge base and Customer Policy Profile JSON.";

  const sharedInstall = [
    C000001_RUNTIME_HEADER,
    "",
    SHARED_SANDBOX_SAFETY,
    "",
    sharedGreetingBlock(greeting),
    "",
    SHARED_CONNECTED_FUNCTIONS,
    "",
    sharedProfileInstallBlock(AB_PROFILE_JSON_FILENAME),
    "",
    guardrailBlock,
  ].join("\n");

  return { sharedInstall, guardrailBlock };
}

function buildSharedTail(): string {
  return [SHARED_REQUEST_ONLY_CLOSING, "", AB_TEST_SHARED_SAFETY_FOOTER].join("\n");
}

/**
 * Version A: shared install + sandbox conversational layer.
 * Version B: shared install + Phillip v1.2 shared conversational layer.
 */
export function buildAbPromptBundle(profile: CustomerPolicyProfileV1): AbPromptBundle {
  const bundle = renderTrilletDemoBundle(profile, { assumedTimezone: "America/Los_Angeles" });
  const { sharedInstall } = buildSharedInstall(profile, bundle.greetingSuggestion);
  const tail = buildSharedTail();

  const versionA = [
    sharedInstall,
    "",
    loadSandboxBaselineConversationalLayer(),
    "",
    tail,
  ].join("\n");

  const versionB = [
    sharedInstall,
    "",
    "# Conversational agent instructions — Phillip reusable v1.2 (Version B only)",
    "",
    loadV12SharedPrompt(),
    "",
    tail,
  ].join("\n");

  return {
    versionA,
    versionB,
    versionALabel: "sandbox conversational baseline (from docs/alex-trillet-prompts/v1.1 body)",
    versionBLabel: "Phillip reusable Agent Instructions v1.2 shared prompt",
    greeting: bundle.greetingSuggestion,
    companyDisplayName: bundle.meta.companyDisplayName,
    agentName: bundle.meta.agentName,
    profileJsonPath: AB_PROFILE_JSON_FILENAME,
    knowledgeBasePath: "company-knowledge.md",
    sharedInstall,
  };
}
