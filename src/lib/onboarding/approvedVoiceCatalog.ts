/**
 * Approved Alexander voice library — single source for UI, validation, and normalization.
 * Preview assets and extended language/accent metadata are added here when product supplies them.
 */

export type ApprovedPrimaryVoiceId = "voice_a" | "voice_b" | "voice_c";

export type ApprovedVoiceId = ApprovedPrimaryVoiceId | string;

export type ApprovedVoiceEntry = {
  id: ApprovedVoiceId;
  label: string;
  description: string;
  /** Public URL/path to preview audio; null when no approved asset exists in repo. */
  previewSrc: string | null;
  /**
   * ISO-style language codes this voice is verified to support, or null when
   * capability metadata has not been supplied by product yet.
   */
  supportedLanguageCodes: string[] | null;
  /**
   * Accent option IDs available for this voice, or null when not yet cataloged.
   */
  availableAccentIds: string[] | null;
};

export const APPROVED_PRIMARY_VOICES: readonly ApprovedVoiceEntry[] = [
  {
    id: "voice_a",
    label: "Voice A",
    description: "Warm, calm, professional",
    previewSrc: null,
    supportedLanguageCodes: null,
    availableAccentIds: null,
  },
  {
    id: "voice_b",
    label: "Voice B",
    description: "Friendly, energetic, approachable",
    previewSrc: null,
    supportedLanguageCodes: null,
    availableAccentIds: null,
  },
  {
    id: "voice_c",
    label: "Voice C",
    description: "Direct, steady, highly efficient",
    previewSrc: null,
    supportedLanguageCodes: null,
    availableAccentIds: null,
  },
];

/** Additional library voices beyond A/B/C — populated when product adds entries. */
export const ADDITIONAL_APPROVED_VOICES: readonly ApprovedVoiceEntry[] = [];

export const VOICE_LANGUAGE_CAPABILITY_CATALOG_AVAILABLE = false;

export const APPROVED_ACCENT_OPTIONS = [
  { id: "neutral_american", label: "Neutral American", catalogAvailable: true },
  { id: "regional_american", label: "Regional American, if available", catalogAvailable: false },
  {
    id: "spanish_influenced_english",
    label: "Spanish-influenced English, if available",
    catalogAvailable: false,
  },
  { id: "other_approved", label: "Other approved option", catalogAvailable: false },
  { id: "no_preference", label: "No preference", catalogAvailable: true },
] as const;

export type ApprovedAccentId = (typeof APPROVED_ACCENT_OPTIONS)[number]["id"];

/** Controls that must never appear in Section 7 (Voice Constitution). */
export const VOICE_CONSTITUTION_EXCLUDED_CONTROLS = [
  "filler frequency",
  "pause duration",
  "pitch",
  "temperature",
  "turn-end detection",
  "interruption threshold",
  "response-length",
  "cadence",
  "speaking speed",
  "interruption sensitivity",
  "uh/um frequency",
  "latency",
  "turn-taking",
] as const;

const ALL_VOICES: ApprovedVoiceEntry[] = [
  ...APPROVED_PRIMARY_VOICES,
  ...ADDITIONAL_APPROVED_VOICES,
];

export function isApprovedVoiceId(id: string): boolean {
  return ALL_VOICES.some((v) => v.id === id);
}

export function getApprovedVoice(id: string): ApprovedVoiceEntry | undefined {
  return ALL_VOICES.find((v) => v.id === id);
}

export function getApprovedVoiceLabel(id: string): string {
  const voice = getApprovedVoice(id);
  if (!voice) return id;
  return `${voice.label} — ${voice.description}`;
}

/**
 * When capability catalog is unavailable, returns null (cannot verify).
 * When available, checks voice.supportedLanguageCodes.
 */
export function isLanguageVerifiedForVoice(
  voiceId: string,
  languageCode: string,
): boolean | null {
  if (!VOICE_LANGUAGE_CAPABILITY_CATALOG_AVAILABLE) return null;
  const voice = getApprovedVoice(voiceId);
  if (!voice?.supportedLanguageCodes) return null;
  return voice.supportedLanguageCodes.includes(languageCode);
}

export function hasAdditionalApprovedVoices(): boolean {
  return ADDITIONAL_APPROVED_VOICES.length > 0;
}

/** UI + new selections: Other language requires a verified capability catalog. */
export function isOtherSupportedLanguageOptionAvailable(voiceId: string | null): boolean {
  void voiceId;
  if (!VOICE_LANGUAGE_CAPABILITY_CATALOG_AVAILABLE) return false;
  return true;
}

/**
 * Whether an accent may be selected and normalized as approved Company Truth.
 * Uses catalog flags and per-voice accent lists when present.
 */
export function isAccentOptionAvailable(
  accentId: ApprovedAccentId,
  voiceId: string | null,
): boolean {
  const opt = APPROVED_ACCENT_OPTIONS.find((o) => o.id === accentId);
  if (!opt) return false;
  if (accentId === "no_preference") return true;
  if (!opt.catalogAvailable) return false;
  if (!voiceId) return opt.catalogAvailable;
  const voice = getApprovedVoice(voiceId);
  if (!voice || voice.availableAccentIds === null) {
    return opt.catalogAvailable;
  }
  return voice.availableAccentIds.includes(accentId);
}

/** Normalized supported list may include Other only when verified for the selected voice. */
export function isOtherLanguageApprovedForNormalization(
  data: {
    callerLanguages: readonly string[];
    otherSupportedLanguage: string;
  },
  voiceId: string | null,
): boolean {
  if (!data.callerLanguages.includes("other")) return false;
  const text = data.otherSupportedLanguage.trim();
  if (!text || !voiceId) return false;
  if (!VOICE_LANGUAGE_CAPABILITY_CATALOG_AVAILABLE) return false;
  return isLanguageVerifiedForVoice(voiceId, text) === true;
}
