import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  answersFromProfileFields,
  generateRuntimeConfiguration,
  runtimeConfigContentSha256,
} from "./generator";

describe("runtime-config generator", () => {
  it("rebuilds answers shelves from flattened profile fields via registry", () => {
    const answers = answersFromProfileFields({
      Q1: { question_id: "Q1", answer_kind: "scalar_text", value: "Acme Plumbing QA" },
      Q8: {
        question_id: "Q8",
        answer_kind: "weekly_schedule",
        value: { monday: { closed: false, start: "08:00", end: "17:00" } },
      },
    });
    assert.ok(answers.sections.S1?.answers?.Q1);
    // Registry places office hours (Q8) on S1 for the frozen 137-question contract.
    assert.ok(answers.sections.S1?.answers?.Q8);
  });

  it("generates KB, instructions, and request-only integration hints", () => {
    const config = generateRuntimeConfiguration({
      customerId: "cust-1",
      customerNumber: "ALX-C000099",
      profileRevision: 3,
      fields: {
        Q1: { question_id: "Q1", answer_kind: "scalar_text", value: "Fictional Plumbing QA" },
      },
    });
    assert.equal(config.schema.name, "alexander.runtime_configuration");
    assert.ok(config.artifacts.agentInstructions.length > 20);
    assert.ok(config.artifacts.companyKnowledge.length > 20);
    assert.equal(config.artifacts.callFlow.promptType, "simple");
    assert.equal(config.artifacts.integrationHints.jobberWritesEnabled, false);
    assert.equal(config.artifacts.integrationHints.googleCalendarWritesEnabled, false);
    assert.equal(runtimeConfigContentSha256(config).length, 64);
  });
});
