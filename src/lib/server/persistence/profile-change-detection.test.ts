import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyQuestionImpact,
  diffProfileFields,
} from "./profile-change-detection";

describe("profile-change-detection", () => {
  it("classifies routine display fields as low impact", () => {
    const c = classifyQuestionImpact("Q1");
    assert.equal(c.classification, "routine");
    assert.equal(c.impact, "low");
  });

  it("classifies emergency and hours fields as operationally sensitive", () => {
    assert.equal(classifyQuestionImpact("Q8").classification, "operationally_sensitive");
    assert.equal(classifyQuestionImpact("Q21").impact, "high");
  });

  it("diffs fields and elevates revision impact when sensitive changes exist", () => {
    const before = {
      Q1: { question_id: "Q1", answer_kind: "scalar_text", value: "Acme" },
      Q8: { question_id: "Q8", answer_kind: "weekly_schedule", value: { monday: { closed: false } } },
    };
    const after = {
      Q1: { question_id: "Q1", answer_kind: "scalar_text", value: "Acme Plumbing" },
      Q8: { question_id: "Q8", answer_kind: "weekly_schedule", value: { monday: { closed: true } } },
    };
    const diff = diffProfileFields(before, after);
    assert.equal(diff.changes.length, 2);
    assert.equal(diff.revisionImpact, "high");
    assert.equal(diff.requiresTrilletSync, true);
    assert.equal(diff.requiresQa, true);
  });

  it("keeps routine-only edits low impact without QA gate", () => {
    const before = {
      Q1: { question_id: "Q1", answer_kind: "scalar_text", value: "Acme" },
    };
    const after = {
      Q1: { question_id: "Q1", answer_kind: "scalar_text", value: "Acme Co" },
    };
    const diff = diffProfileFields(before, after);
    assert.equal(diff.revisionImpact, "low");
    assert.equal(diff.requiresTrilletSync, false);
    assert.equal(diff.requiresQa, false);
  });
});
