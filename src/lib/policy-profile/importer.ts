import mappingDocument from "./questionnaire_to_policy_mapping_v1.json";
import {
  isQuestionActiveInAnswers,
  isActivationUnknown,
} from "./answers-conditions";
import { getQuestionAnswerRecord, sourcePointerForQuestion } from "./answers-access";
import { validateCrossQuestionConstraints } from "./cross-question";
import {
  detectInstallationIssues,
  detectSubstantiveProfileIssues,
  computeReviewState,
} from "./review-issues";
import { validateQuestionConstraints } from "./slot-validation";
import {
  classifyActiveAnswerState,
  inactiveSlot,
  isExplicitBlankValue,
  isRequiredWhenActive,
  missingSlot,
} from "./value-state";
import {
  assertCompatibleSourceContracts,
  answersContentSha256,
  validateQuestionnaireAnswersContract,
  validateRegistryContract,
} from "./versions";
import type {
  CustomerPolicyProfileV1,
  InstallationContext,
  PolicyAnswerSlot,
  PolicyGroupId,
  PolicyMappingEntry,
  ReviewIssue,
} from "./types";
import {
  POLICY_GROUPS,
  POLICY_MAPPING_SCHEMA_NAME,
  POLICY_MAPPING_VERSION,
  POLICY_PROFILE_SCHEMA_NAME,
  POLICY_PROFILE_SCHEMA_VERSION,
} from "./types";
import type { QuestionnaireAnswersV1 } from "../onboarding/questionnaire-v1/types";
import type { AnswerKind } from "../onboarding/questionnaire-v1/types";

export type ImportPolicyProfileOptions = {
  installation?: InstallationContext;
  /** When true, throws if source contracts fail instead of returning REJECTED profile. */
  strictSource?: boolean;
};

const MAPPING_ENTRIES = mappingDocument.entries as PolicyMappingEntry[];

function emptyPolicies(): CustomerPolicyProfileV1["policies"] {
  return {
    company: {},
    services: {},
    emergencies: {},
    scheduling: {},
    pricing: {},
    customer_care: {},
    conversation: {},
    system_preferences: {},
    submission: {},
  };
}

function buildSlotForMappingEntry(
  answers: QuestionnaireAnswersV1,
  entry: PolicyMappingEntry,
  issues: ReviewIssue[],
): PolicyAnswerSlot {
  const base: PolicyAnswerSlot = {
    question_id: entry.question_id,
    source_pointer: null,
    state: "MISSING",
    answer_kind: null,
    value: null,
  };

  if (isActivationUnknown(entry.question_id)) {
    const record = getQuestionAnswerRecord(answers, entry.question_id);
    if (record) {
      issues.push({
        code: "ACTIVATION_UNKNOWN",
        severity: "warning",
        message: `Activation could not be determined for ${entry.question_id}; supplied evidence preserved.`,
        scope: {
          question_id: entry.question_id,
          profile_field: entry.profile_field,
          policy_group: entry.policy_group,
        },
      });
    }
  }

  const active = isQuestionActiveInAnswers(answers, entry.question_id);
  const record = getQuestionAnswerRecord(answers, entry.question_id);
  const pointer = sourcePointerForQuestion(entry.question_id);

  if (!active) {
    if (record) {
      issues.push({
        code: "STALE_INACTIVE_ANSWER",
        severity: "error",
        message: `${entry.question_id} is present while its display condition is inactive.`,
        scope: {
          question_id: entry.question_id,
          profile_field: entry.profile_field,
          policy_group: entry.policy_group,
        },
      });
      return {
        ...base,
        question_id: entry.question_id,
        source_pointer: pointer,
        state: "INVALID",
        answer_kind: record.answer_kind,
        value: record.value,
      };
    }
    return { ...base, question_id: entry.question_id, ...inactiveSlot() };
  }

  if (!record) {
    if (isRequiredWhenActive(entry.required)) {
      issues.push({
        code: "MISSING_REQUIRED_ANSWER",
        severity: "error",
        message: `Required active answer missing for ${entry.question_id}.`,
        scope: {
          question_id: entry.question_id,
          profile_field: entry.profile_field,
          policy_group: entry.policy_group,
        },
      });
      return { ...base, question_id: entry.question_id, ...missingSlot() };
    }
    return { ...base, question_id: entry.question_id, state: "EMPTY", source_pointer: null, answer_kind: null, value: null };
  }

  if (record.question_id !== entry.question_id) {
    issues.push({
      code: "QUESTION_ID_MISMATCH",
      severity: "error",
      message: `Answer record question_id mismatch for ${entry.question_id}.`,
      scope: { question_id: entry.question_id, policy_group: entry.policy_group },
    });
  }

  if (record.answer_kind !== entry.answer_kind) {
    issues.push({
      code: "ANSWER_KIND_MISMATCH",
      severity: "warning",
      message: `Answer kind for ${entry.question_id} differs from registry (${record.answer_kind} vs ${entry.answer_kind}).`,
      scope: { question_id: entry.question_id, policy_group: entry.policy_group },
    });
  }

  const answerKind = (record.answer_kind ?? entry.answer_kind) as AnswerKind;
  const state = classifyActiveAnswerState(record.value, answerKind, entry.required);

  if (state === "EMPTY") {
    return {
      question_id: entry.question_id,
      source_pointer: pointer,
      state: "EMPTY",
      answer_kind: answerKind,
      value: null,
    };
  }

  issues.push(...validateQuestionConstraints(entry.question_id, answerKind, record.value));

  if (state === "INVALID") {
    issues.push({
      code: "INVALID_REQUIRED_BLANK",
      severity: "error",
      message: `${entry.question_id} is required but blank.`,
      scope: {
        question_id: entry.question_id,
        profile_field: entry.profile_field,
        policy_group: entry.policy_group,
      },
    });
  }

  const value =
    state === "PRESENT" ? structuredClonePreserve(record.value) : isExplicitBlankValue(record.value, answerKind) ? null : record.value;

  return {
    question_id: entry.question_id,
    source_pointer: pointer,
    state,
    answer_kind: answerKind,
    value,
  };
}

function structuredClonePreserve<T>(value: T): T {
  if (value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

export function importQuestionnaireAnswersToPolicyProfile(
  answers: QuestionnaireAnswersV1,
  options: ImportPolicyProfileOptions = {},
): CustomerPolicyProfileV1 {
  const installation: InstallationContext = {
    company_id: options.installation?.company_id ?? null,
    timezone: options.installation?.timezone ?? null,
    currency: options.installation?.currency ?? null,
  };

  const issues: ReviewIssue[] = [];

  const registryErrors = validateRegistryContract();
  const answersErrors = validateQuestionnaireAnswersContract(answers);
  for (const err of [...registryErrors, ...answersErrors]) {
    issues.push({
      code: `SOURCE_${err.code}`,
      severity: "error",
      message: err.message,
      scope: {},
    });
  }

  if (issues.some((i) => i.code.startsWith("SOURCE_"))) {
    if (options.strictSource) {
      assertCompatibleSourceContracts(answers);
    }
    return {
      schema: { name: POLICY_PROFILE_SCHEMA_NAME, version: POLICY_PROFILE_SCHEMA_VERSION },
      source: {
        questionnaire_answers_schema: answers.schema,
        questionnaire: answers.questionnaire,
        answers_content_sha256: answersContentSha256(answers),
        mapping_schema: POLICY_MAPPING_SCHEMA_NAME,
        mapping_version: POLICY_MAPPING_VERSION,
        mapping_derivation: mappingDocument.derived_from as string,
      },
      installation,
      policies: emptyPolicies(),
      entities: { contacts: {}, fees: {}, systems: {} },
      review: {
        state: "REJECTED",
        full_specification_validation_completed: false,
        issues,
      },
    };
  }

  assertCompatibleSourceContracts(answers);

  const policies = emptyPolicies();

  for (const entry of MAPPING_ENTRIES) {
    const slot = buildSlotForMappingEntry(answers, entry, issues);
    policies[entry.policy_group][entry.profile_field] = slot;
  }

  issues.push(...validateCrossQuestionConstraints(answers));
  issues.push(...detectInstallationIssues(installation));
  issues.push(...detectSubstantiveProfileIssues(answers));

  const reviewState = computeReviewState(issues);

  return {
    schema: { name: POLICY_PROFILE_SCHEMA_NAME, version: POLICY_PROFILE_SCHEMA_VERSION },
    source: {
      questionnaire_answers_schema: answers.schema,
      questionnaire: answers.questionnaire,
      answers_content_sha256: answersContentSha256(answers),
      mapping_schema: POLICY_MAPPING_SCHEMA_NAME,
      mapping_version: POLICY_MAPPING_VERSION,
      mapping_derivation: mappingDocument.derived_from as string,
    },
    installation,
    policies,
    entities: structuredClonePreserve(answers.entities),
    review: {
      state: reviewState,
      full_specification_validation_completed: true,
      issues,
    },
  };
}

export function listProfileSlots(profile: CustomerPolicyProfileV1): PolicyAnswerSlot[] {
  const slots: PolicyAnswerSlot[] = [];
  for (const group of POLICY_GROUPS) {
    for (const slot of Object.values(profile.policies[group])) {
      slots.push(slot);
    }
  }
  return slots;
}

export function countSlotsByState(profile: CustomerPolicyProfileV1): Record<string, number> {
  const counts: Record<string, number> = {
    PRESENT: 0,
    EMPTY: 0,
    INACTIVE: 0,
    MISSING: 0,
    INVALID: 0,
  };
  for (const slot of listProfileSlots(profile)) {
    counts[slot.state] = (counts[slot.state] ?? 0) + 1;
  }
  return counts;
}
