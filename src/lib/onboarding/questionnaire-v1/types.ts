/**
 * Questionnaire Answers v1 + Question Registry v1 — shared types.
 *
 * This is the clean answer CONTRACT for frozen questionnaire schemaVersion 10.
 * It does NOT define Company Truth, Prompt Zero, or persistence identity.
 */

export const QUESTIONNAIRE_ANSWERS_SCHEMA_NAME = "alexander.questionnaire_answers" as const;
export const QUESTIONNAIRE_ANSWERS_SCHEMA_VERSION = 1 as const;
export const QUESTIONNAIRE_SPEC_VERSION = "1.0" as const;
export const QUESTIONNAIRE_RAW_SCHEMA_VERSION = 10 as const;
export const QUESTIONNAIRE_FREEZE_COMMIT =
  "f6feb475ddb8d3f8d2ff03d3b8af280eee6713f1" as const;

export type SectionId = "S1" | "S2" | "S3" | "S4" | "S5" | "S6" | "S7" | "S8";
export type ShelfId = SectionId | "SUBMISSION";

export type QuestionKind = "root" | "conditional";

export type AnswerKind =
  | "scalar_text"
  | "scalar_number"
  | "scalar_currency"
  | "scalar_boolean"
  | "single_select"
  | "multi_select"
  | "ordered_select"
  | "weekly_schedule"
  | "matrix_single_select"
  | "repeatable"
  | "contact_reference"
  | "entity_reference"
  | "composite"
  | "acknowledgement_group";

export type RegistryQuestion = {
  questionId: string;
  sectionId: ShelfId;
  kind: QuestionKind;
  parentQuestionId?: string;
  rawPath: string;
  answerKind: AnswerKind;
  required: string;
  /** Human-readable condition summary from the Q-ID map (debug). */
  conditionSummary?: string;
  /** Stable option IDs scoped to this question (order is meaningful). */
  optionIds?: string[];
  /** Stable matrix/catalog row IDs when answerKind is matrix_*. */
  matrixItemIds?: string[];
  /** Documented default when frozen source has a real preselected default. */
  defaultValue?: string;
  /** Short label for tests/debug — not a second prose source of truth. */
  debugLabel?: string;
};

export type MatrixItemAnswer = {
  value: string;
  /** Nested fields that are active for this row (e.g. condition text). */
  fields?: Record<string, unknown>;
};

export type RepeatableItemAnswer = {
  id: string;
  fields: Record<string, unknown>;
};

/**
 * Per-question answer payload. Shape depends on answerKind.
 * Always stores option/item IDs — never customer-facing labels as the value.
 */
export type QuestionAnswer = {
  question_id: string;
  answer_kind: AnswerKind;
  value: unknown;
};

export type QuestionnaireAnswersV1 = {
  schema: {
    name: typeof QUESTIONNAIRE_ANSWERS_SCHEMA_NAME;
    version: typeof QUESTIONNAIRE_ANSWERS_SCHEMA_VERSION;
  };
  questionnaire: {
    spec_version: typeof QUESTIONNAIRE_SPEC_VERSION;
    raw_schema_version: typeof QUESTIONNAIRE_RAW_SCHEMA_VERSION;
    freeze_commit: typeof QUESTIONNAIRE_FREEZE_COMMIT;
  };
  sections: Record<
    SectionId,
    {
      answers: Record<string, QuestionAnswer>;
    }
  >;
  submission: {
    answers: Record<string, QuestionAnswer>;
  };
  entities: {
    contacts: Record<string, Record<string, unknown>>;
    fees: Record<string, Record<string, unknown>>;
    systems: Record<string, Record<string, unknown>>;
  };
  /**
   * Known identity limitations for this pass (not persistence metadata).
   * Documented in docs/questionnaire-answers-v1.md.
   */
  identity_limitations: string[];
};
