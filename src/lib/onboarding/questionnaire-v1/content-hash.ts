/**
 * Future clean-answer content hash helpers.
 *
 * NOT wired into production submit yet.
 * Excludes persistence identity (customer_id, onboarding_id, submission_id, etc.).
 */

import { createHash } from "node:crypto";
import type { QuestionnaireAnswersV1 } from "./types";
import {
  QUESTIONNAIRE_ANSWERS_SCHEMA_VERSION,
  QUESTIONNAIRE_SPEC_VERSION,
} from "./types";

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableSerialize(obj[k])}`).join(",")}}`;
}

/**
 * Canonical content payload for future idempotency / content hashing.
 * Includes spec + schema versions and effective answer content.
 * Excludes persistence identity envelope fields.
 */
export function questionnaireAnswersContentPayloadV1(answers: QuestionnaireAnswersV1): {
  questionnaire_spec_version: string;
  questionnaire_answers_schema_version: number;
  sections: QuestionnaireAnswersV1["sections"];
  submission: QuestionnaireAnswersV1["submission"];
  entities: QuestionnaireAnswersV1["entities"];
} {
  return {
    questionnaire_spec_version: QUESTIONNAIRE_SPEC_VERSION,
    questionnaire_answers_schema_version: QUESTIONNAIRE_ANSWERS_SCHEMA_VERSION,
    sections: answers.sections,
    submission: answers.submission,
    entities: answers.entities,
  };
}

export function hashQuestionnaireAnswersContentV1(answers: QuestionnaireAnswersV1): string {
  const payload = questionnaireAnswersContentPayloadV1(answers);
  return createHash("sha256").update(stableSerialize(payload), "utf8").digest("hex");
}
