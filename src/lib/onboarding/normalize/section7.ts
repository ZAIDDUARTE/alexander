import {
  type ApprovedAccentId,
  getApprovedVoiceLabel,
  isAccentOptionAvailable,
  isApprovedVoiceId,
} from "../approvedVoiceCatalog";
import { labelAccent } from "../section7Catalog";
import { normalizeLanguagePolicy } from "../voiceProfileLanguages";
import { resolveEffectiveVoiceId } from "../voiceSelection";
import { pronunciationEntryComplete } from "../voiceSelection";
import type { PronunciationEntry, Section7Data } from "../types";

export type NormalizedPronunciationEntry = {
  id: string;
  term: string;
  pronunciation: string;
  audioSampleReference: string | null;
};

export type NormalizedVoiceProfile = {
  primary_language: string | null;
  supported_languages: string[];
  voice_id: string | null;
  voice_label: string | null;
  communication_style_preset: string | null;
  display_name: string | null;
  ai_disclosure_style: string | null;
  ai_disclosure_custom: string | null;
  pronunciation_dictionary: NormalizedPronunciationEntry[];
  language_switching_policy: string | null;
  language_switching_custom_rule: string | null;
  perceived_voice_preference: string | null;
  accent_preference: string | null;
  accent_other_approved: string | null;
  formality_preference: string | null;
  approved_phrases_and_avoidances: string | null;
  additional_review_notes: string | null;
};

export function normalizeSection7(data: Section7Data): NormalizedVoiceProfile {
  const { primary_language, supported_languages } = normalizeLanguagePolicy(data);

  const voiceId = resolveEffectiveVoiceId(data);
  const approvedVoiceId = voiceId && isApprovedVoiceId(voiceId) ? voiceId : null;
  const voiceLabel = approvedVoiceId ? getApprovedVoiceLabel(approvedVoiceId) : null;

  let displayName: string | null = null;
  if (data.spokenNameMode === "alexander") {
    displayName = "Alexander";
  } else if (
    data.spokenNameMode === "company_specific" ||
    data.spokenNameMode === "another_approved"
  ) {
    displayName = data.spokenDisplayName.trim() || null;
  }

  const disclosureCustom =
    data.aiDisclosureStyle === "custom" ? data.aiDisclosureCustom.trim() || null : null;

  const pronunciation: NormalizedPronunciationEntry[] =
    data.pronunciationMode === "yes"
      ? data.pronunciationEntries
          .filter(pronunciationEntryComplete)
          .map((e: PronunciationEntry) => ({
            id: e.id,
            term: e.term.trim(),
            pronunciation: e.pronunciation.trim(),
            audioSampleReference: e.audioSampleReference.trim() || null,
          }))
      : [];

  const switchingCustom =
    data.languageSwitchingPolicy === "custom"
      ? data.languageSwitchingCustomRule.trim() || null
      : null;

  let accentPreference: string | null = null;
  let accentOther: string | null = null;
  if (data.accentPreference) {
    const accentId = data.accentPreference as ApprovedAccentId;
    if (isAccentOptionAvailable(accentId, approvedVoiceId)) {
      accentPreference = accentId;
      if (accentId === "other_approved") {
        accentOther = data.accentOtherApproved.trim() || null;
      }
    }
  }

  return {
    primary_language,
    supported_languages,
    voice_id: approvedVoiceId,
    voice_label: voiceLabel,
    communication_style_preset: data.communicationStyle || null,
    display_name: displayName,
    ai_disclosure_style: data.aiDisclosureStyle || null,
    ai_disclosure_custom: disclosureCustom,
    pronunciation_dictionary: pronunciation,
    language_switching_policy: data.languageSwitchingPolicy || null,
    language_switching_custom_rule: switchingCustom,
    perceived_voice_preference: data.perceivedVoicePreference || null,
    accent_preference: accentPreference,
    accent_other_approved: accentOther,
    formality_preference: data.formalityPreference || null,
    approved_phrases_and_avoidances: data.brandPhrasesAndAvoidances.trim() || null,
    additional_review_notes: data.additionalReviewNotes.trim() || null,
  };
}

export function labelAccentPreference(id: string, otherDetail: string): string {
  if (id === "other_approved" && otherDetail.trim()) return otherDetail.trim();
  return labelAccent(id);
}
