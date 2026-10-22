import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dryRunTrilletConfigSync } from "./trillet-config-sync";
import type { RuntimeConfigurationV1 } from "@/lib/runtime-config/types";

function sampleConfig(): RuntimeConfigurationV1 {
  return {
    schema: { name: "alexander.runtime_configuration", version: 1 },
    customer: {
      customerId: "c1",
      customerNumber: "ALX-C000099",
      companyDisplayName: "Fictional Plumbing QA",
      agentName: "Alex",
    },
    source: {
      profileRevision: 2,
      answersContentSha256: "abc",
      profileContentSha256: "def",
      policyReviewState: "READY",
    },
    artifacts: {
      agentInstructions: "Be concise.",
      companyKnowledge: "We fix pipes.",
      greeting: "Thanks for calling.",
      policyProfileJson: "{}",
      callFlow: {
        promptType: "simple",
        prompt: "Be concise.",
        welcomeMessage: "customMessage",
        customWelcomeMessage: "Thanks for calling.",
        knowledgeBaseName: "Fictional Plumbing QA — Company Knowledge",
      },
      integrationHints: {
        requestOnly: true,
        jobberWritesEnabled: false,
        googleCalendarWritesEnabled: false,
        notes: [],
      },
    },
    meta: {
      generatedAt: new Date().toISOString(),
      generator: "test",
      approxInstructionsChars: 11,
      approxKnowledgeChars: 13,
    },
  };
}

describe("trillet-config-sync dry-run", () => {
  it("plans writes but does not execute mutating methods", async () => {
    const calls: Array<{ method: string; url: string }> = [];
    const fetcher: typeof fetch = async (input, init) => {
      const url = String(input);
      const method = String(init?.method || "GET");
      calls.push({ method, url });
      if (url.includes("/workspaces/")) {
        return new Response(JSON.stringify({ _id: "ws1", name: "Alexander Sandbox" }), { status: 200 });
      }
      if (url.endsWith("/agents")) {
        return new Response(
          JSON.stringify([
            { _id: "agent-qa", name: "Alexander Plumbing — E2E QA" },
            { _id: "agent-lisa", name: "Lisa Marina" },
          ]),
          { status: 200 },
        );
      }
      if (url.endsWith("/call-flows")) {
        return new Response(
          JSON.stringify([{ _id: "flow-qa", name: "Alexander Plumbing — E2E QA Flow" }]),
          { status: 200 },
        );
      }
      if (url.includes("/knowledge-base")) {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      if (url.includes("/agents/agent-qa") || url.includes("/call-flows/flow-qa")) {
        return new Response(JSON.stringify({ _id: "x", name: "QA", prompt: "old" }), { status: 200 });
      }
      return new Response("{}", { status: 404 });
    };

    const result = await dryRunTrilletConfigSync({
      apiKey: "test-key",
      workspaceId: "ws1",
      agentId: "agent-qa",
      callFlowId: "flow-qa",
      runtimeConfig: sampleConfig(),
      fetcher,
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.mode, "dry_run");
    assert.equal(result.wouldWrite, true);
    assert.ok(result.blockedTargets.some((t) => /lisa/i.test(t)));
    assert.ok(result.plan.every((op) => op.method === "GET" || op.executeInDryRun === false));
    assert.ok(calls.every((c) => c.method === "GET"));
    assert.ok(result.plan.some((op) => op.op === "update_call_flow_prompt" && op.executeInDryRun === false));
  });

  it("refuses blocked Lisa/Phillip agent ids", async () => {
    const fetcher: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes("/workspaces/")) {
        return new Response(JSON.stringify({ _id: "ws1", name: "Alexander Sandbox" }), { status: 200 });
      }
      if (url.endsWith("/agents")) {
        return new Response(JSON.stringify([{ _id: "lisa-id", name: "Lisa" }]), { status: 200 });
      }
      if (url.endsWith("/call-flows") || url.includes("/knowledge-base")) {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      return new Response(JSON.stringify({ _id: "lisa-id", name: "Lisa" }), { status: 200 });
    };

    const result = await dryRunTrilletConfigSync({
      apiKey: "test-key",
      workspaceId: "ws1",
      agentId: "lisa-id",
      runtimeConfig: sampleConfig(),
      fetcher,
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.reason, "refusing_blocked_agent");
  });
});
