import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

import type { QuestionnaireAnswersV1 } from "../onboarding/questionnaire-v1/types";
import { QUESTION_REGISTRY_V1 } from "../onboarding/questionnaire-v1/registry";
import {
  countSlotsByState,
  importQuestionnaireAnswersToPolicyProfile,
  listProfileSlots,
  PHILLIP_GOLDEN_ANSWERS_PATH,
  PHILLIP_GOLDEN_ANSWERS_SHA256,
  POLICY_GROUPS,
  POLICY_MAPPING_ENTRIES,
  validateRegistryContract,
} from "./index";

const EVIDENCE = resolve("docs/evidence/questionnaire-v1");
const DEV_ARTIFACTS = resolve("docs/alexander-readiness/dev-artifacts");

function loadAnswers(path: string): QuestionnaireAnswersV1 {
  return JSON.parse(readFileSync(path, "utf8")) as QuestionnaireAnswersV1;
}

function sha256Hex(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

describe("policy-profile mapping contract", () => {
  it("covers all 137 registry Q-IDs with unique profile fields per group", () => {
    assert.equal(validateRegistryContract().length, 0);
    assert.equal(POLICY_MAPPING_ENTRIES.length, 137);
    const registryIds = QUESTION_REGISTRY_V1.map((q) => q.questionId).sort();
    const mappingIds = POLICY_MAPPING_ENTRIES.map((e) => e.question_id).sort();
    assert.deepEqual(mappingIds, registryIds);

    const fieldKeys = new Set<string>();
    for (const entry of POLICY_MAPPING_ENTRIES) {
      const key = `${entry.policy_group}:${entry.profile_field}`;
      assert.ok(!fieldKeys.has(key), `duplicate profile field ${key}`);
      fieldKeys.add(key);
      assert.ok(POLICY_GROUPS.includes(entry.policy_group));
      assert.ok(entry.source_pointer.includes(entry.question_id));
    }
  });
});

describe("importQuestionnaireAnswersToPolicyProfile", () => {
  it("rejects incompatible answers schema versions", () => {
    const minimal = loadAnswers(resolve(EVIDENCE, "questionnaire-answers-minimal-v1.json"));
    const broken = {
      ...minimal,
      schema: { ...minimal.schema, version: 999 },
    } as unknown as QuestionnaireAnswersV1;
    const profile = importQuestionnaireAnswersToPolicyProfile(broken);
    assert.equal(profile.review.state, "REJECTED");
    assert.ok(profile.review.issues.some((i) => i.code === "SOURCE_answers_schema_version"));
  });

  it("imports complete evidence fixture with 137 slots", () => {
    const answers = loadAnswers(resolve(EVIDENCE, "questionnaire-answers-complete-v1.json"));
    const profile = importQuestionnaireAnswersToPolicyProfile(answers);
    assert.equal(listProfileSlots(profile).length, 137);
    for (const group of POLICY_GROUPS) {
      assert.ok(Object.keys(profile.policies[group]).length > 0, `empty group ${group}`);
    }
  });

  it("marks supplied inactive-branch answers INVALID when injected into clean answers", () => {
    const answers = loadAnswers(resolve(EVIDENCE, "questionnaire-answers-minimal-v1.json"));
    answers.sections.S1.answers.Q5A = {
      question_id: "Q5A",
      answer_kind: "scalar_text",
      value: "stale child while parent inactive",
    };
    const profile = importQuestionnaireAnswersToPolicyProfile(answers);
    const q5a = profile.policies.company.additional_permitted_claim;
    assert.equal(q5a.state, "INVALID");
    assert.ok(profile.review.issues.some((i) => i.code === "STALE_INACTIVE_ANSWER"));
  });
});

describe("Phillip golden fixture — policy profile Day 1 gate", () => {
  const answersPath = resolve(PHILLIP_GOLDEN_ANSWERS_PATH);

  it("matches pinned SHA-256 and produces 137-slot profile", () => {
    const bytes = readFileSync(answersPath);
    assert.equal(sha256Hex(bytes), PHILLIP_GOLDEN_ANSWERS_SHA256);

    const answers = loadAnswers(answersPath);
    const profile = importQuestionnaireAnswersToPolicyProfile(answers);

    assert.equal(profile.schema.name, "alexander.customer_policy_profile");
    assert.equal(profile.schema.version, "1.0");
    assert.equal(listProfileSlots(profile).length, 137);

    const counts = countSlotsByState(profile);
    assert.equal(counts.INACTIVE, 29);
    assert.equal(counts.PRESENT, 103);
    assert.equal(counts.EMPTY, 5);
    assert.equal(counts.MISSING, 0);
    assert.equal(counts.INVALID, 0);

    assert.equal(profile.review.state, "REVIEW_REQUIRED");
    assert.equal(profile.review.full_specification_validation_completed, true);
    assert.ok(profile.review.issues.some((i) => i.code === "PROFILE-01"));
    assert.ok(profile.review.issues.some((i) => i.code === "PROFILE-08"));

    const q35 = profile.policies.scheduling.onsite_presence;
    assert.equal(q35.question_id, "Q35");
    assert.equal(q35.state, "PRESENT");
    assert.equal(q35.value, "no");

    const q38 = profile.policies.scheduling.booking_horizon;
    assert.equal(q38.question_id, "Q38");
    assert.equal(q38.state, "PRESENT");
    assert.deepEqual(q38.value, { bookingHorizonDays: "30", bookingHorizonNoMaximum: false });

    const q40 = profile.policies.scheduling.required_booking_information;
    assert.equal(q40.question_id, "Q40");
    assert.ok(Array.isArray(q40.value));

    const q83 = profile.policies.conversation.preferred_phrases;
    const q84 = profile.policies.conversation.avoided_phrases;
    assert.equal(q83.state, "EMPTY");
    assert.equal(q83.source_pointer, "/sections/S7/answers/Q83");
    assert.equal(q84.state, "EMPTY");

    const q64 = profile.policies.customer_care.prior_work_handling;
    assert.equal(q64.question_id, "Q64");
    assert.equal(q64.state, "PRESENT");

    assert.deepEqual(profile.entities, answers.entities);

    mkdirSync(DEV_ARTIFACTS, { recursive: true });
    writeFileSync(resolve(DEV_ARTIFACTS, "phillip-policy-profile-v1.json"), JSON.stringify(profile, null, 2));
    writeFileSync(
      resolve(DEV_ARTIFACTS, "phillip-policy-profile-review.json"),
      JSON.stringify(
        {
          review_state: profile.review.state,
          issue_count: profile.review.issues.length,
          issues: profile.review.issues.map((i) => ({
            code: i.code,
            severity: i.severity,
            message: i.message,
            scope: i.scope,
          })),
          slot_counts: counts,
          source: {
            answers_sha256: PHILLIP_GOLDEN_ANSWERS_SHA256,
            answers_content_sha256: profile.source.answers_content_sha256,
          },
        },
        null,
        2,
      ),
    );
  });
});
