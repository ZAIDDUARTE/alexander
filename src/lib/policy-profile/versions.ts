import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  QUESTIONNAIRE_ANSWERS_SCHEMA_NAME,
  QUESTIONNAIRE_ANSWERS_SCHEMA_VERSION,
  QUESTIONNAIRE_FREEZE_COMMIT,
  QUESTIONNAIRE_RAW_SCHEMA_VERSION,
  QUESTIONNAIRE_SPEC_VERSION,
  type QuestionnaireAnswersV1,
} from "../onboarding/questionnaire-v1/types";
import { hashQuestionnaireAnswersContentV1 } from "../onboarding/questionnaire-v1/content-hash";
import {
  QUESTION_REGISTRY_CHILD_COUNT,
  QUESTION_REGISTRY_FREEZE_COMMIT,
  QUESTION_REGISTRY_ROOT_COUNT,
  QUESTION_REGISTRY_V1,
} from "../onboarding/questionnaire-v1/registry";

import mappingDocument from "./questionnaire_to_policy_mapping_v1.json";
import {
  POLICY_MAPPING_SCHEMA_NAME,
  POLICY_MAPPING_VERSION,
  POLICY_PROFILE_SCHEMA_NAME,
  POLICY_PROFILE_SCHEMA_VERSION,
  type PolicyMappingEntry,
} from "./types";

export const PHILLIP_GOLDEN_ANSWERS_SHA256 =
  "ecf066c36f6498ee047e79b52f8deaeeaec332e5b9930cfe3a3af801db320f7b" as const;

export const PHILLIP_GOLDEN_ANSWERS_PATH =
  "output/phillip-final/native/questionnaire-answers.json" as const;

export const POLICY_MAPPING_ENTRIES = mappingDocument.entries as PolicyMappingEntry[];

export type SourceContractError = { code: string; message: string };

export function sha256FileHex(relativePath: string): string {
  const bytes = readFileSync(resolve(relativePath));
  return createHash("sha256").update(bytes).digest("hex");
}

export function validateRegistryContract(): SourceContractError[] {
  const errors: SourceContractError[] = [];
  if (QUESTION_REGISTRY_ROOT_COUNT !== 93) {
    errors.push({ code: "registry_root_count", message: "Expected 93 root questions" });
  }
  if (QUESTION_REGISTRY_CHILD_COUNT !== 44) {
    errors.push({ code: "registry_child_count", message: "Expected 44 conditional questions" });
  }
  if (QUESTION_REGISTRY_V1.length !== 137) {
    errors.push({ code: "registry_slot_count", message: "Expected 137 registry slots" });
  }
  if (QUESTION_REGISTRY_FREEZE_COMMIT !== QUESTIONNAIRE_FREEZE_COMMIT) {
    errors.push({ code: "registry_freeze_mismatch", message: "Registry freeze commit mismatch" });
  }
  if (POLICY_MAPPING_ENTRIES.length !== 137) {
    errors.push({ code: "mapping_slot_count", message: "Expected 137 mapping entries" });
  }
  if (mappingDocument.schema !== POLICY_MAPPING_SCHEMA_NAME) {
    errors.push({ code: "mapping_schema", message: "Unexpected mapping schema name" });
  }
  if (mappingDocument.version !== POLICY_MAPPING_VERSION) {
    errors.push({ code: "mapping_version", message: "Unexpected mapping version" });
  }
  return errors;
}

export function validateQuestionnaireAnswersContract(
  answers: QuestionnaireAnswersV1,
): SourceContractError[] {
  const errors: SourceContractError[] = [];

  if (answers.schema.name !== QUESTIONNAIRE_ANSWERS_SCHEMA_NAME) {
    errors.push({ code: "answers_schema_name", message: "Unsupported answers schema name" });
  }
  if (answers.schema.version !== QUESTIONNAIRE_ANSWERS_SCHEMA_VERSION) {
    errors.push({ code: "answers_schema_version", message: "Unsupported answers schema version" });
  }
  if (answers.questionnaire.spec_version !== QUESTIONNAIRE_SPEC_VERSION) {
    errors.push({ code: "spec_version", message: "Unsupported questionnaire spec version" });
  }
  if (answers.questionnaire.raw_schema_version !== QUESTIONNAIRE_RAW_SCHEMA_VERSION) {
    errors.push({ code: "raw_schema_version", message: "Unsupported raw schema version" });
  }
  if (answers.questionnaire.freeze_commit !== QUESTIONNAIRE_FREEZE_COMMIT) {
    errors.push({ code: "freeze_commit", message: "Unsupported questionnaire freeze commit" });
  }

  for (const sectionId of ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"] as const) {
    const section = answers.sections[sectionId];
    if (!section?.answers) {
      errors.push({ code: "missing_section", message: `Missing section ${sectionId}` });
      continue;
    }
    for (const [key, payload] of Object.entries(section.answers)) {
      if (payload.question_id !== key) {
        errors.push({
          code: "question_id_key_mismatch",
          message: `Section ${sectionId} key ${key} does not match question_id ${payload.question_id}`,
        });
      }
    }
  }

  for (const [key, payload] of Object.entries(answers.submission.answers)) {
    if (payload.question_id !== key) {
      errors.push({
        code: "submission_question_id_mismatch",
        message: `Submission key ${key} does not match question_id ${payload.question_id}`,
      });
    }
  }

  return errors;
}

export function assertCompatibleSourceContracts(answers: QuestionnaireAnswersV1): void {
  const errors = [...validateRegistryContract(), ...validateQuestionnaireAnswersContract(answers)];
  if (errors.length) {
    const summary = errors.map((e) => e.code).join(", ");
    throw new Error(`incompatible_source_contract: ${summary}`);
  }
}

export function answersContentSha256(answers: QuestionnaireAnswersV1): string {
  return hashQuestionnaireAnswersContentV1(answers);
}

export function profileContractMeta() {
  return {
    profile_schema: { name: POLICY_PROFILE_SCHEMA_NAME, version: POLICY_PROFILE_SCHEMA_VERSION },
    mapping: {
      schema: POLICY_MAPPING_SCHEMA_NAME,
      version: POLICY_MAPPING_VERSION,
      derivation: mappingDocument.derived_from as string,
    },
  };
}
