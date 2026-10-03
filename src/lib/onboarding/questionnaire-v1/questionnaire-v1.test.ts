import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { describe, it } from "node:test";
import { resolve } from "node:path";

import { APPROVED_CLAIM_OPTIONS, ANSWERING_MODE_OPTIONS } from "../validation/section1";
import { COMMUNICATION_STYLE_OPTIONS, LANGUAGE_OPTIONS } from "../section7Catalog";
import { CRM_FSM_OPTIONS, Q114_CONFIRMATIONS } from "../section8Catalog";
import { PLUMBING_SERVICES } from "../section2Catalog";
import { EMERGENCY_SCENARIOS } from "../section3Catalog";
import type { OnboardingDraft } from "../types";

import {
  QUESTION_REGISTRY_V1,
  QUESTION_REGISTRY_ROOT_IDS,
  QUESTION_REGISTRY_CONDITIONAL_IDS,
  QUESTION_REGISTRY_BY_ID,
  SECTION_IDS,
  isQuestionActive,
  serializeQuestionnaireAnswersV1,
  hashQuestionnaireAnswersContentV1,
  questionnaireAnswersContentPayloadV1,
} from "./index";

const EVIDENCE = resolve("docs/evidence/questionnaire-v1");

function loadDraft(name: string): OnboardingDraft {
  return JSON.parse(readFileSync(resolve(EVIDENCE, name), "utf8")) as OnboardingDraft;
}

function parseIdMapQids(): { roots: string[]; children: string[] } {
  const md = readFileSync(resolve("docs/questionnaire-v1-id-map.md"), "utf8");
  const roots: string[] = [];
  const children: string[] = [];
  for (const line of md.split("\n")) {
    const root = line.match(/^\| (Q\d+) \|/);
    if (root) roots.push(root[1]);
    const child = line.match(/^\| (Q\d+[A-Z]+) \|/);
    if (child) children.push(child[1]);
  }
  return { roots, children };
}

describe("question-registry-v1 completeness", () => {
  it("matches permanent Q-ID map exactly (93 roots + 44 children)", () => {
    const map = parseIdMapQids();
    assert.equal(QUESTION_REGISTRY_ROOT_IDS.length, 93);
    assert.equal(QUESTION_REGISTRY_CONDITIONAL_IDS.length, 44);
    assert.equal(QUESTION_REGISTRY_V1.length, 137);

    assert.deepEqual([...QUESTION_REGISTRY_ROOT_IDS].sort(), [...map.roots].sort());
    assert.deepEqual([...QUESTION_REGISTRY_CONDITIONAL_IDS].sort(), [...map.children].sort());

    const ids = QUESTION_REGISTRY_V1.map((q) => q.questionId);
    assert.equal(new Set(ids).size, ids.length, "duplicate Q-IDs");

    for (let n = 1; n <= 93; n++) {
      assert.ok(QUESTION_REGISTRY_BY_ID.has(`Q${n}`), `missing Q${n}`);
    }

    for (const q of QUESTION_REGISTRY_V1) {
      if (q.kind === "conditional") {
        assert.ok(q.parentQuestionId, `${q.questionId} missing parent`);
        assert.ok(
          QUESTION_REGISTRY_BY_ID.has(q.parentQuestionId!),
          `${q.questionId} invalid parent ${q.parentQuestionId}`,
        );
      }
      if (q.questionId === "Q93") {
        assert.equal(q.sectionId, "SUBMISSION");
      } else {
        assert.ok(
          (SECTION_IDS as readonly string[]).includes(q.sectionId),
          `${q.questionId} bad section ${q.sectionId}`,
        );
      }
      assert.notEqual(q.sectionId, "S9");
    }
  });
});

describe("question-registry-v1 option conformance", () => {
  it("matches frozen catalog option IDs for key enumerated questions", () => {
    const q5 = QUESTION_REGISTRY_BY_ID.get("Q5")!;
    assert.deepEqual(
      q5.optionIds,
      APPROVED_CLAIM_OPTIONS.map((o) => o.value),
    );

    const q10 = QUESTION_REGISTRY_BY_ID.get("Q10")!;
    assert.deepEqual(
      q10.optionIds,
      ANSWERING_MODE_OPTIONS.map((o) => o.value),
    );

    const q73 = QUESTION_REGISTRY_BY_ID.get("Q73")!;
    assert.deepEqual(
      q73.optionIds,
      LANGUAGE_OPTIONS.map((o) => o.id),
    );

    const q75 = QUESTION_REGISTRY_BY_ID.get("Q75")!;
    assert.deepEqual(
      q75.optionIds,
      COMMUNICATION_STYLE_OPTIONS.map((o) => o.id),
    );

    const q85 = QUESTION_REGISTRY_BY_ID.get("Q85")!;
    assert.deepEqual(
      q85.optionIds,
      CRM_FSM_OPTIONS.map((o) => o.id),
    );

    const q93 = QUESTION_REGISTRY_BY_ID.get("Q93")!;
    assert.deepEqual(
      q93.optionIds,
      Q114_CONFIRMATIONS.map((c) => c.key),
    );

    const q12 = QUESTION_REGISTRY_BY_ID.get("Q12")!;
    assert.deepEqual(
      q12.matrixItemIds,
      PLUMBING_SERVICES.map((s) => s.id),
    );

    const q21 = QUESTION_REGISTRY_BY_ID.get("Q21")!;
    assert.deepEqual(
      q21.matrixItemIds,
      EMERGENCY_SCENARIOS.map((s) => s.id),
    );
  });
});

describe("phone answer kind", () => {
  it("keeps Q3 main phone as exact text with scalar_text kind", () => {
    const q3 = QUESTION_REGISTRY_BY_ID.get("Q3");
    assert.equal(q3?.answerKind, "scalar_text");
    assert.equal(q3?.rawPath, "section1.mainPhone");
    const draft = loadDraft("raw-complete.json");
    draft.section1.mainPhone = "+14155552671";
    const answers = serializeQuestionnaireAnswersV1(draft);
    const phone = answers.sections.S1.answers.Q3;
    assert.ok(phone);
    assert.equal(phone.answer_kind, "scalar_text");
    assert.equal(phone.value, "+14155552671");
    assert.equal(typeof phone.value, "string");
  });
});

describe("serializeQuestionnaireAnswersV1", () => {
  it("serializes raw-complete without UI/navigation/migration leakage", () => {
    const draft = loadDraft("raw-complete.json");
    const answers = serializeQuestionnaireAnswersV1(draft);
    writeFileSync(
      resolve(EVIDENCE, "questionnaire-answers-complete-v1.json"),
      JSON.stringify(answers, null, 2) + "\n",
    );

    assert.equal(answers.schema.name, "alexander.questionnaire_answers");
    assert.equal(answers.schema.version, 1);
    assert.equal(answers.questionnaire.spec_version, "1.0");
    assert.equal(answers.questionnaire.raw_schema_version, 10);
    assert.equal(
      answers.questionnaire.freeze_commit,
      "f6feb475ddb8d3f8d2ff03d3b8af280eee6713f1",
    );

    for (const sid of SECTION_IDS) {
      assert.ok(answers.sections[sid], sid);
    }
    assert.ok(answers.submission.answers.Q93);
    assert.equal(
      (answers.submission.answers.Q93.value as { answersAccurate: boolean }).answersAccurate,
      true,
    );

    const json = JSON.stringify(answers);
    assert.equal(json.includes("currentRoute"), false);
    assert.equal(json.includes("updatedAt"), false);
    assert.equal(json.includes("completedSections"), false);
    assert.equal(json.includes("stage2Migration"), false);
    assert.equal(json.includes("Company Truth"), false);
    assert.equal(json.includes("Prompt Zero"), false);
    assert.equal(json.includes("\"S9\""), false);

    // Customer-written values preserved
    assert.equal(answers.sections.S1.answers.Q1.value, "Acme Plumbing");
    assert.ok(Object.keys(answers.entities.contacts).length > 0);

    // Matrix item IDs preserved
    const q21 = answers.sections.S3.answers.Q21.value as Record<string, { value: string }>;
    assert.ok(q21["uncontrolled-water-leak-inside-property"]);

    // Option IDs preserved (not labels)
    assert.ok((answers.sections.S1.answers.Q5.value as string[]).includes("licensed"));

    // Deterministic
    const again = serializeQuestionnaireAnswersV1(draft);
    assert.equal(hashQuestionnaireAnswersContentV1(answers), hashQuestionnaireAnswersContentV1(again));
  });

  it("excludes inactive conditional / stale values from raw-conditional-stale", () => {
    const draft = loadDraft("raw-conditional-stale.json");
    const answers = serializeQuestionnaireAnswersV1(draft);
    writeFileSync(
      resolve(EVIDENCE, "questionnaire-answers-conditional-stale-v1.json"),
      JSON.stringify(answers, null, 2) + "\n",
    );

    // Matrix condition text omitted when policy is not with_conditions
    const plumbing = answers.sections.S2.answers.Q12.value as Record<
      string,
      { value: string; fields?: { condition?: string } }
    >;
    assert.equal(plumbing["general-plumbing-repair"].value, "offered");
    assert.equal(plumbing["general-plumbing-repair"].fields?.condition, undefined);

    // Markup explanation inactive when policy is no
    assert.equal(isQuestionActive("Q58A", draft), false);
    assert.equal(answers.sections.S5.answers.Q58A, undefined);

    // Spending limits inactive when hasSpendingLimits is no
    assert.equal(isQuestionActive("Q35A", draft), false);
    assert.equal(answers.sections.S4.answers.Q35A, undefined);

    // Integration custom names inactive
    assert.equal(isQuestionActive("Q85A", draft), false);
    assert.equal(answers.sections.S8.answers.Q85A, undefined);
    assert.equal(isQuestionActive("Q86A", draft), false);
    assert.equal(isQuestionActive("Q87A", draft), false);
    assert.equal(isQuestionActive("Q89A", draft), false);
    assert.equal(isQuestionActive("Q91A", draft), false);
    assert.equal(answers.sections.S8.answers.Q91A, undefined);

    // Stale additional software card not included when categories = none
    const q88 = answers.sections.S8.answers.Q88.value as {
      categories: string[];
      cards: unknown[];
    };
    assert.deepEqual(q88.categories, ["none"]);
    assert.equal(q88.cards.length, 0);

    // Raw fixture still contains stale strings (untouched)
    assert.ok(JSON.stringify(draft).includes("STALE markup explanation"));
    assert.ok(JSON.stringify(draft).includes("STALE custom CRM name"));
  });

  it("serializes raw-minimal with defaults and no placeholder contact entity", () => {
    const draft = loadDraft("raw-minimal.json");
    const answers = serializeQuestionnaireAnswersV1(draft);
    writeFileSync(
      resolve(EVIDENCE, "questionnaire-answers-minimal-v1.json"),
      JSON.stringify(answers, null, 2) + "\n",
    );

    assert.equal(Object.keys(answers.entities.contacts).length, 0);
    const q25 = answers.sections.S3.answers.Q25.value as { contact_id: string | null };
    assert.equal(q25.contact_id, null);

    // Preselected defaults represented (e.g. may quote not_allowed)
    assert.equal(answers.sections.S5.answers.Q54.value, "not_allowed");

    // No invented provenance
    const json = JSON.stringify(answers);
    assert.equal(json.includes("customer_confirmed"), false);
    assert.equal(json.includes("default_untouched"), false);
    assert.equal(json.includes("\"touched\""), false);
  });

  it("content hash payload excludes persistence identity keys", () => {
    const draft = loadDraft("raw-complete.json");
    const answers = serializeQuestionnaireAnswersV1(draft);
    const payload = questionnaireAnswersContentPayloadV1(answers);
    const json = JSON.stringify(payload);
    assert.equal(json.includes("customer_id"), false);
    assert.equal(json.includes("onboarding_id"), false);
    assert.equal(json.includes("submission_id"), false);
    assert.equal(typeof hashQuestionnaireAnswersContentV1(answers), "string");
    assert.equal(hashQuestionnaireAnswersContentV1(answers).length, 64);
  });
});

describe("isQuestionActive shared evaluator", () => {
  it("activates answering schedule only for specific_hours", () => {
    const draft = loadDraft("raw-conditional-stale.json");
    assert.equal(draft.section1.answeringMode, "24_7");
    assert.equal(isQuestionActive("Q10A", draft), false);

    draft.section1.answeringMode = "specific_hours";
    assert.equal(isQuestionActive("Q10A", draft), true);
  });
});
