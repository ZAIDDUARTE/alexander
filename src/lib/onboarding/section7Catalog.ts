/** Section 7 — Voice and Conversation (Q92–Q103). Final MD §7. */

export const LANGUAGE_HELP =
  "If more than one language is selected, Alexander should respond in the caller’s language when it can do so reliably.";

export const LANGUAGE_OPTIONS = [
  { id: "english" as const, label: "English" },
  { id: "spanish" as const, label: "Spanish" },
  { id: "other" as const, label: "Other supported language" },
  { id: "english_only" as const, label: "English only" },
];

export type LanguageOptionId = (typeof LANGUAGE_OPTIONS)[number]["id"];

export const VOICE_CHOICE_ANOTHER = "another_approved" as const;

export const COMMUNICATION_STYLE_OPTIONS = [
  { id: "warm_professional" as const, label: "Warm and professional" },
  { id: "friendly_relaxed" as const, label: "Friendly and relaxed" },
  { id: "direct_efficient" as const, label: "Direct and efficient" },
  { id: "calm_reassuring" as const, label: "Calm and reassuring" },
];

export const COMMUNICATION_STYLE_HELP =
  "This changes the surface tone, not the underlying safety, reasoning, or conversation rules.";

export const SPOKEN_NAME_OPTIONS = [
  { id: "alexander" as const, label: "Alexander" },
  { id: "company_specific" as const, label: "A company-specific name" },
  { id: "another_approved" as const, label: "Another approved name" },
];

export const SPOKEN_NAME_HELP =
  "Alexander remains the product name. This controls the spoken receptionist name.";

export const AI_DISCLOSURE_OPTIONS = [
  {
    id: "opening_ai_receptionist" as const,
    label: "Say he is the company’s AI receptionist in the opening",
  },
  {
    id: "only_if_asked" as const,
    label: "Say he is an AI receptionist only if the caller asks",
  },
  { id: "custom" as const, label: "Use another approved disclosure" },
];

export const AI_DISCLOSURE_HELP =
  "Alexander should be transparent without making the disclosure awkward or repetitive. Mandatory legal/platform disclosure requirements override a company preference where applicable.";

export const PRONUNCIATION_MODE_OPTIONS = [
  { id: "none" as const, label: "None" },
  { id: "yes" as const, label: "Yes — enter pronunciation details" },
];

export const LANGUAGE_SWITCHING_OPTIONS = [
  { id: "continue_caller_language" as const, label: "Continue in the caller’s language" },
  {
    id: "ask_preference" as const,
    label: "Ask whether the caller prefers English or the supported second language",
  },
  {
    id: "english_offer_human" as const,
    label: "Continue in English and offer a human who speaks the other language",
  },
  { id: "custom" as const, label: "Follow another rule" },
];

export const PERCEIVED_VOICE_OPTIONS = [
  { id: "no_preference" as const, label: "No preference" },
  { id: "masculine_presenting" as const, label: "Masculine-presenting" },
  { id: "feminine_presenting" as const, label: "Feminine-presenting" },
  { id: "neutral_androgynous" as const, label: "Neutral or androgynous" },
];

export const PERCEIVED_VOICE_HELP =
  "The voice preview is the source of truth; callers may perceive a voice differently.";

export const ACCENT_HELP =
  "Expose only options available in the approved voice library and clear for the service area.";

export const FORMALITY_OPTIONS = [
  { id: "conversational" as const, label: "Conversational and natural" },
  { id: "balanced_professional" as const, label: "Balanced professional" },
  { id: "formal_traditional" as const, label: "More formal and traditional" },
];

export const FORMALITY_HELP =
  "Alexander remains professional in every configuration; this only changes ordinary phrasing.";

export const BRAND_PHRASES_HELP =
  "Do not use this field to define safety, pricing, or appointment policy. Those belong in the earlier sections.";

export const REVIEW_NOTES_HELP =
  "Use this only for a preference not covered above. The Alexander standard may be recommended when a request would reduce clarity, trust, or reliability.";

export function labelCommunicationStyle(id: string): string {
  return COMMUNICATION_STYLE_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

export function labelSpokenNameMode(id: string): string {
  return SPOKEN_NAME_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

export function labelAiDisclosure(id: string): string {
  return AI_DISCLOSURE_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

export function labelLanguageSwitching(id: string): string {
  return LANGUAGE_SWITCHING_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

export function labelPerceivedVoice(id: string): string {
  return PERCEIVED_VOICE_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

export function labelFormality(id: string): string {
  return FORMALITY_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

export function labelAccent(id: string): string {
  const fromCatalog = [
    { id: "neutral_american", label: "Neutral American" },
    { id: "regional_american", label: "Regional American, if available" },
    { id: "spanish_influenced_english", label: "Spanish-influenced English, if available" },
    { id: "other_approved", label: "Other approved option" },
    { id: "no_preference", label: "No preference" },
  ];
  return fromCatalog.find((o) => o.id === id)?.label ?? id;
}
