import {
  type ApprovedAccentId,
  hasAdditionalApprovedVoices,
  isAccentOptionAvailable,
  isApprovedVoiceId,
  isOtherSupportedLanguageOptionAvailable,
} from "../approvedVoiceCatalog";
import {
  ACCENT_HELP,
  AI_DISCLOSURE_OPTIONS,
  COMMUNICATION_STYLE_OPTIONS,
  FORMALITY_OPTIONS,
  LANGUAGE_SWITCHING_OPTIONS,
  PERCEIVED_VOICE_OPTIONS,
  PRONUNCIATION_MODE_OPTIONS,
  SPOKEN_NAME_OPTIONS,
} from "../section7Catalog";
import { VOICE_CHOICE_ANOTHER } from "../section7Catalog";
import {
  pronunciationEntryComplete,
  pronunciationEntryStarted,
  resolveEffectiveVoiceId,
} from "../voiceSelection";
import type { Section7Data } from "../types";

export type FieldErrors = Partial<Record<string, string>>;

const STYLE_IDS = new Set(COMMUNICATION_STYLE_OPTIONS.map((o) => o.id));
const NAME_MODE_IDS = new Set(SPOKEN_NAME_OPTIONS.map((o) => o.id));
const DISCLOSURE_IDS = new Set(AI_DISCLOSURE_OPTIONS.map((o) => o.id));
const PRONUNCIATION_MODE_IDS = new Set(PRONUNCIATION_MODE_OPTIONS.map((o) => o.id));
const SWITCHING_IDS = new Set(LANGUAGE_SWITCHING_OPTIONS.map((o) => o.id));

export function validateSection7(data: Section7Data): FieldErrors {
  const errors: FieldErrors = {};
  const voiceId = resolveEffectiveVoiceId(data);

  if (!data.englishOnly && data.callerLanguages.length === 0) {
    errors.callerLanguages = "Select at least one language option.";
  }
  if (data.englishOnly && data.callerLanguages.length > 0) {
    errors.callerLanguages = "English only cannot be combined with other language selections.";
  }
  for (const lang of data.callerLanguages) {
    if (lang !== "english" && lang !== "spanish" && lang !== "other") {
      errors.callerLanguages = "Select valid language options.";
      break;
    }
  }
  if (data.callerLanguages.includes("other")) {
    if (!isOtherSupportedLanguageOptionAvailable(voiceId)) {
      errors.callerLanguages =
        "Additional languages can be enabled when verified for the selected voice.";
    } else if (!data.otherSupportedLanguage.trim()) {
      errors.otherSupportedLanguage = "Enter the other supported language.";
    }
  }

  if (!data.voiceSelection) {
    errors.voiceSelection = "Select a voice.";
  } else if (data.voiceSelection === VOICE_CHOICE_ANOTHER) {
    if (!hasAdditionalApprovedVoices()) {
      errors.voiceSelection =
        "No additional approved voices are currently available. Choose Voice A, B, or C.";
    } else if (!voiceId || !isApprovedVoiceId(voiceId)) {
      errors.anotherApprovedVoiceId = "Select an approved library voice.";
    }
  } else if (!isApprovedVoiceId(data.voiceSelection)) {
    errors.voiceSelection = "Select an approved voice.";
  }

  if (!data.communicationStyle) {
    errors.communicationStyle = "Select a communication style.";
  } else if (!STYLE_IDS.has(data.communicationStyle)) {
    errors.communicationStyle = "Select a valid communication style.";
  }

  if (!data.spokenNameMode) {
    errors.spokenNameMode = "Select how Alexander should introduce himself.";
  } else if (!NAME_MODE_IDS.has(data.spokenNameMode)) {
    errors.spokenNameMode = "Select a valid option.";
  } else if (
    (data.spokenNameMode === "company_specific" || data.spokenNameMode === "another_approved") &&
    !data.spokenDisplayName.trim()
  ) {
    errors.spokenDisplayName = "Enter the spoken receptionist name.";
  }

  if (!data.aiDisclosureStyle) {
    errors.aiDisclosureStyle = "Select how Alexander should identify himself as an AI.";
  } else if (!DISCLOSURE_IDS.has(data.aiDisclosureStyle)) {
    errors.aiDisclosureStyle = "Select a valid option.";
  }

  if (!data.pronunciationMode) {
    errors.pronunciationMode = "Select whether pronunciation details are needed.";
  } else if (!PRONUNCIATION_MODE_IDS.has(data.pronunciationMode)) {
    errors.pronunciationMode = "Select a valid option.";
  } else if (data.pronunciationMode === "yes") {
    const complete = data.pronunciationEntries.filter(pronunciationEntryComplete);
    if (complete.length === 0) {
      errors.pronunciationEntries = "Add at least one complete pronunciation entry.";
    }
    for (const entry of data.pronunciationEntries) {
      if (!pronunciationEntryStarted(entry)) continue;
      if (!pronunciationEntryComplete(entry)) {
        errors[`pronunciationEntries.${entry.id}`] =
          "Enter both the name/spelling and preferred pronunciation.";
      }
    }
  }

  if (!data.languageSwitchingPolicy) {
    errors.languageSwitchingPolicy = "Select second-language behavior.";
  } else if (!SWITCHING_IDS.has(data.languageSwitchingPolicy)) {
    errors.languageSwitchingPolicy = "Select a valid option.";
  }

  if (data.accentPreference) {
    const accentId = data.accentPreference as ApprovedAccentId;
    if (!isAccentOptionAvailable(accentId, voiceId)) {
      errors.accentPreference = "This accent is not available for the selected voice.";
    } else if (accentId === "other_approved" && !data.accentOtherApproved.trim()) {
      errors.accentOtherApproved = "Enter the other approved accent option.";
    }
  }

  void ACCENT_HELP;
  void PERCEIVED_VOICE_OPTIONS;
  void FORMALITY_OPTIONS;

  return errors;
}

export function section7IsValid(data: Section7Data): boolean {
  return Object.keys(validateSection7(data)).length === 0;
}
