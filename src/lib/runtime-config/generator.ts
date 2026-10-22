import { createHash } from "node:crypto";
import { getRegistryQuestion } from "@/lib/onboarding/questionnaire-v1/registry";
import { importQuestionnaireAnswersToPolicyProfile } from "@/lib/policy-profile/importer";
import type { CustomerPolicyProfileV1 } from "@/lib/policy-profile/types";
import type { QuestionnaireAnswersV1, SectionId } from "@/lib/onboarding/questionnaire-v1/types";
import {
  QUESTIONNAIRE_ANSWERS_SCHEMA_NAME,
  QUESTIONNAIRE_ANSWERS_SCHEMA_VERSION,
  QUESTIONNAIRE_SPEC_VERSION,
  QUESTIONNAIRE_RAW_SCHEMA_VERSION,
  QUESTIONNAIRE_FREEZE_COMMIT,
} from "@/lib/onboarding/questionnaire-v1/types";
import { buildFinalAgentInstructions } from "@/lib/trillet-demo/final-agent-instructions";
import { renderTrilletDemoBundle } from "@/lib/trillet-demo/render";
import {
  RUNTIME_CONFIG_SCHEMA_NAME,
  RUNTIME_CONFIG_SCHEMA_VERSION,
  type RuntimeConfigurationV1,
} from "./types";

function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function fieldValue(fields: Record<string, unknown>, questionId: string): unknown {
  const payload = fields[questionId];
  if (!payload || typeof payload !== "object") return payload;
  if ("value" in (payload as object)) return (payload as { value: unknown }).value;
  return payload;
}

/**
 * Rebuild a QuestionnaireAnswersV1-shaped document from a business profile's
 * flattened fields so the existing policy-profile + trillet-demo pipeline can run.
 */
export function answersFromProfileFields(
  fields: Record<string, unknown>,
  opts?: { questionnaire?: unknown },
): QuestionnaireAnswersV1 {
  const sections: Record<string, { answers: Record<string, unknown> }> = {};
  const entities =
    fields._entities && typeof fields._entities === "object"
      ? (fields._entities as QuestionnaireAnswersV1["entities"])
      : { contacts: {}, fees: {}, systems: {} };

  for (const [questionId, payload] of Object.entries(fields)) {
    if (questionId.startsWith("_")) continue;
    if (!payload || typeof payload !== "object") continue;
    const answer = payload as { question_id?: string; answer_kind?: string; value?: unknown };
    if (!answer.answer_kind) continue;
    const meta = getRegistryQuestion(questionId);
    const sectionId = (meta?.sectionId && meta.sectionId !== "SUBMISSION"
      ? meta.sectionId
      : "S1") as SectionId;
    if (!sections[sectionId]) sections[sectionId] = { answers: {} };
    sections[sectionId].answers[questionId] = payload;
  }

  const questionnaire =
    opts?.questionnaire && typeof opts.questionnaire === "object"
      ? (opts.questionnaire as QuestionnaireAnswersV1["questionnaire"])
      : {
          spec_version: QUESTIONNAIRE_SPEC_VERSION,
          raw_schema_version: QUESTIONNAIRE_RAW_SCHEMA_VERSION,
          freeze_commit: QUESTIONNAIRE_FREEZE_COMMIT,
        };

  return {
    schema: {
      name: QUESTIONNAIRE_ANSWERS_SCHEMA_NAME,
      version: QUESTIONNAIRE_ANSWERS_SCHEMA_VERSION,
    },
    questionnaire,
    sections: sections as QuestionnaireAnswersV1["sections"],
    submission: { answers: {} },
    entities,
    identity_limitations: [
      "contacts_are_references_only",
      "no_resolved_phone_email_in_answers",
    ],
  };
}

export function generateRuntimeConfiguration(input: {
  fields: Record<string, unknown>;
  profileRevision: number;
  customerId?: string | null;
  customerNumber?: string | null;
  questionnaire?: unknown;
  policyProfile?: CustomerPolicyProfileV1;
  assumedTimezone?: string;
}): RuntimeConfigurationV1 {
  const answers = answersFromProfileFields(input.fields, {
    questionnaire: input.questionnaire,
  });
  const policyProfile =
    input.policyProfile ||
    importQuestionnaireAnswersToPolicyProfile(answers, {
      installation: {
        company_id: input.customerNumber || null,
        timezone: input.assumedTimezone || "America/Los_Angeles",
        currency: "USD",
      },
    });

  const bundle = renderTrilletDemoBundle(policyProfile, {
    assumedTimezone: input.assumedTimezone || "America/Los_Angeles",
  });

  const greeting =
    typeof fieldValue(input.fields, "Q_GREETING") === "string"
      ? String(fieldValue(input.fields, "Q_GREETING"))
      : bundle.greetingSuggestion;

  const agentInstructions = buildFinalAgentInstructions(policyProfile, {
    assumedTimezone: input.assumedTimezone || "America/Los_Angeles",
    openingGreeting: greeting,
  });

  const companyDisplayName =
    (typeof fieldValue(input.fields, "Q1") === "string" && String(fieldValue(input.fields, "Q1")).trim()) ||
    bundle.meta.companyDisplayName ||
    "Your business";

  const agentName = bundle.meta.agentName || "Alexander";
  const profileContentSha256 = sha256Text(JSON.stringify(input.fields));

  const config: RuntimeConfigurationV1 = {
    schema: {
      name: RUNTIME_CONFIG_SCHEMA_NAME,
      version: RUNTIME_CONFIG_SCHEMA_VERSION,
    },
    customer: {
      customerId: input.customerId || null,
      customerNumber: input.customerNumber || null,
      companyDisplayName,
      agentName,
    },
    source: {
      profileRevision: input.profileRevision,
      answersContentSha256: policyProfile.source.answers_content_sha256 || null,
      profileContentSha256,
      policyReviewState: policyProfile.review.state,
    },
    artifacts: {
      agentInstructions,
      companyKnowledge: bundle.companyKnowledge,
      greeting,
      policyProfileJson: bundle.sanitizedProfileJson,
      callFlow: {
        promptType: "simple",
        prompt: agentInstructions,
        welcomeMessage: "customMessage",
        customWelcomeMessage: greeting,
        knowledgeBaseName: `${companyDisplayName} — Company Knowledge`,
      },
      integrationHints: {
        requestOnly: true,
        jobberWritesEnabled: false,
        googleCalendarWritesEnabled: false,
        notes: [
          "Jobber writes remain disabled (request_writes_enabled=false).",
          "Google Calendar adapter is freeBusy diagnostic only.",
          "Do not modify Phillip Marina / Lisa production agents from this generator.",
        ],
      },
    },
    meta: {
      generatedAt: new Date().toISOString(),
      generator: "alexander.runtime_config.v1",
      approxInstructionsChars: agentInstructions.length,
      approxKnowledgeChars: bundle.companyKnowledge.length,
    },
  };

  return config;
}

export function runtimeConfigContentSha256(config: RuntimeConfigurationV1): string {
  return sha256Text(
    JSON.stringify({
      instructions: config.artifacts.agentInstructions,
      knowledge: config.artifacts.companyKnowledge,
      greeting: config.artifacts.greeting,
      callFlow: config.artifacts.callFlow,
    }),
  );
}
