import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  deriveOperationalProfile,
  flattenQuestionnaireAnswerFields,
} from "./profile-projector";

describe("profile-projector", () => {
  it("flattens QuestionnaireAnswersV1 section and submission answers into fields", () => {
    const answers = {
      schema: { name: "alexander.questionnaire_answers", version: 1 },
      questionnaire: { spec_version: "1.0", raw_schema_version: 10 },
      sections: {
        S1: {
          answers: {
            Q1: { question_id: "Q1", answer_kind: "scalar_text", value: "Acme" },
          },
        },
      },
      submission: {
        answers: {
          Q99: { question_id: "Q99", answer_kind: "acknowledgement_group", value: true },
        },
      },
      entities: { contacts: {}, fees: {}, systems: {} },
    };
    const fields = flattenQuestionnaireAnswerFields(answers);
    assert.equal(Object.keys(fields).length, 3);
    assert.ok(fields.Q1);
    assert.ok(fields.Q99);
    assert.ok(fields._entities);
    const profile = deriveOperationalProfile(answers);
    assert.equal(profile.schema, "alexander_business_profile_v1");
    assert.deepEqual((profile.fields as Record<string, unknown>).Q1, fields.Q1);
  });
});
