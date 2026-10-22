export const RUNTIME_CONFIG_SCHEMA_NAME = "alexander.runtime_configuration" as const;
export const RUNTIME_CONFIG_SCHEMA_VERSION = 1 as const;

export type RuntimeConfigurationV1 = {
  schema: {
    name: typeof RUNTIME_CONFIG_SCHEMA_NAME;
    version: typeof RUNTIME_CONFIG_SCHEMA_VERSION;
  };
  customer: {
    customerId: string | null;
    customerNumber: string | null;
    companyDisplayName: string;
    agentName: string;
  };
  source: {
    profileRevision: number;
    answersContentSha256: string | null;
    profileContentSha256: string;
    policyReviewState: string;
  };
  artifacts: {
    agentInstructions: string;
    companyKnowledge: string;
    greeting: string;
    policyProfileJson: string;
    callFlow: {
      promptType: "simple";
      prompt: string;
      welcomeMessage: "customMessage";
      customWelcomeMessage: string;
      knowledgeBaseName: string;
    };
    integrationHints: {
      requestOnly: boolean;
      jobberWritesEnabled: false;
      googleCalendarWritesEnabled: false;
      notes: string[];
    };
  };
  meta: {
    generatedAt: string;
    generator: string;
    approxInstructionsChars: number;
    approxKnowledgeChars: number;
  };
};
