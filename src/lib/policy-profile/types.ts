import type { AnswerKind } from "../onboarding/questionnaire-v1/types";

export const POLICY_PROFILE_SCHEMA_NAME = "alexander.customer_policy_profile" as const;
export const POLICY_PROFILE_SCHEMA_VERSION = "1.0" as const;

export const POLICY_MAPPING_SCHEMA_NAME = "alexander.questionnaire_to_policy_mapping" as const;
export const POLICY_MAPPING_VERSION = 1 as const;

export const POLICY_GROUPS = [
  "company",
  "services",
  "emergencies",
  "scheduling",
  "pricing",
  "customer_care",
  "conversation",
  "system_preferences",
  "submission",
] as const;

export type PolicyGroupId = (typeof POLICY_GROUPS)[number];

export type AnswerState = "PRESENT" | "EMPTY" | "INACTIVE" | "MISSING" | "INVALID";

export type ProfileReviewState = "READY" | "REVIEW_REQUIRED" | "REJECTED";

export type PolicyAnswerSlot = {
  question_id: string;
  source_pointer: string | null;
  state: AnswerState;
  answer_kind: AnswerKind | null;
  value: unknown;
};

export type PolicyProfilePolicies = Record<PolicyGroupId, Record<string, PolicyAnswerSlot>>;

export type InstallationContext = {
  company_id: string | null;
  timezone: string | null;
  currency: string | null;
};

export type ReviewIssueScope = {
  policy_group?: PolicyGroupId;
  profile_field?: string;
  question_id?: string;
  action_scopes?: string[];
};

export type ReviewIssue = {
  code: string;
  severity: "error" | "warning" | "info";
  message: string;
  scope: ReviewIssueScope;
  resolution_hint?: string;
};

export type PolicyProfileReview = {
  state: ProfileReviewState;
  full_specification_validation_completed: boolean;
  issues: ReviewIssue[];
};

export type PolicyProfileSource = {
  questionnaire_answers_schema: { name: string; version: number };
  questionnaire: {
    spec_version: string;
    raw_schema_version: number;
    freeze_commit: string;
  };
  answers_content_sha256: string;
  mapping_schema: typeof POLICY_MAPPING_SCHEMA_NAME;
  mapping_version: typeof POLICY_MAPPING_VERSION;
  mapping_derivation: string;
  specification_document_sha256?: string;
};

export type CustomerPolicyProfileV1 = {
  schema: {
    name: typeof POLICY_PROFILE_SCHEMA_NAME;
    version: typeof POLICY_PROFILE_SCHEMA_VERSION;
  };
  source: PolicyProfileSource;
  installation: InstallationContext;
  policies: PolicyProfilePolicies;
  entities: {
    contacts: Record<string, Record<string, unknown>>;
    fees: Record<string, Record<string, unknown>>;
    systems: Record<string, Record<string, unknown>>;
  };
  review: PolicyProfileReview;
};

export type PolicyMappingEntry = {
  question_id: string;
  profile_field: string;
  policy_group: PolicyGroupId;
  source_pointer: string;
  source_input: string;
  answer_kind: AnswerKind;
  required: string;
  kind: "root" | "conditional";
  parent_question_id?: string;
};
