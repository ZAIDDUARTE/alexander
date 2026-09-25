import { isOtherLanguageApprovedForNormalization } from "./approvedVoiceCatalog";
import { resolveEffectiveVoiceId } from "./voiceSelection";
import type { Section7Data } from "./types";

export type NormalizedLanguagePolicy = {
  primary_language: string | null;
  supported_languages: string[];
};

/**
 * Source-faithful primary + supported languages (Q92).
 * Does not invent English as primary when multiple languages are selected.
 */
export function normalizeLanguagePolicy(data: Section7Data): NormalizedLanguagePolicy {
  if (data.englishOnly) {
    return { primary_language: "english", supported_languages: ["english"] };
  }

  const supported: string[] = [];
  if (data.callerLanguages.includes("english")) supported.push("english");
  if (data.callerLanguages.includes("spanish")) supported.push("spanish");

  const voiceId = resolveEffectiveVoiceId(data);
  if (isOtherLanguageApprovedForNormalization(data, voiceId)) {
    supported.push(`other:${data.otherSupportedLanguage.trim()}`);
  }

  if (supported.length === 1) {
    return { primary_language: supported[0], supported_languages: supported };
  }
  if (supported.length > 1) {
    return { primary_language: null, supported_languages: supported };
  }

  return { primary_language: null, supported_languages: [] };
}
