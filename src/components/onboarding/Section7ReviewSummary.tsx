"use client";

import type { ReactNode } from "react";
import { getApprovedVoiceLabel } from "@/lib/onboarding/approvedVoiceCatalog";
import { labelAccentPreference, normalizeSection7 } from "@/lib/onboarding/normalize/section7";
import {
  labelAiDisclosure,
  labelCommunicationStyle,
  labelFormality,
  labelLanguageSwitching,
  labelPerceivedVoice,
  labelSpokenNameMode,
} from "@/lib/onboarding/section7Catalog";
import { resolveEffectiveVoiceId } from "@/lib/onboarding/voiceSelection";
import type { OnboardingDraft } from "@/lib/onboarding/types";

function ReviewBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--color-alexander-border)] bg-white p-4">
      <h3 className="text-sm font-semibold text-[var(--color-alexander-navy)]">{title}</h3>
      <div className="mt-2 text-sm text-[var(--color-alexander-muted)]">{children}</div>
    </div>
  );
}

export function Section7ReviewSummary({ draft }: { draft: OnboardingDraft }) {
  const s7 = draft.section7;
  const profile = normalizeSection7(s7);
  const voiceId = resolveEffectiveVoiceId(s7);

  const languageSummary =
    profile.supported_languages.length === 0
      ? "—"
      : profile.supported_languages
          .map((code) => {
            if (code === "english") return "English";
            if (code === "spanish") return "Spanish";
            if (code.startsWith("other:")) return code.slice("other:".length);
            return code;
          })
          .join(", ");

  const spokenName =
    s7.spokenNameMode === "alexander"
      ? "Alexander"
      : s7.spokenDisplayName.trim() || labelSpokenNameMode(s7.spokenNameMode);

  return (
    <div className="mb-8 grid gap-4 md:grid-cols-2">
      <ReviewBlock title="Supported languages">{languageSummary}</ReviewBlock>
      <ReviewBlock title="Selected voice">
        {voiceId ? getApprovedVoiceLabel(voiceId) : "—"}
      </ReviewBlock>
      <ReviewBlock title="Communication style">
        {s7.communicationStyle ? labelCommunicationStyle(s7.communicationStyle) : "—"}
      </ReviewBlock>
      <ReviewBlock title="Spoken receptionist name">{spokenName}</ReviewBlock>
      <ReviewBlock title="AI disclosure">
        {s7.aiDisclosureStyle === "custom" && s7.aiDisclosureCustom.trim()
          ? s7.aiDisclosureCustom
          : s7.aiDisclosureStyle
            ? labelAiDisclosure(s7.aiDisclosureStyle)
            : "—"}
      </ReviewBlock>
      <ReviewBlock title="Pronunciation">
        {s7.pronunciationMode === "none"
          ? "None"
          : profile.pronunciation_dictionary.length > 0
            ? (
                <ul className="list-disc space-y-1 pl-5">
                  {profile.pronunciation_dictionary.map((e) => (
                    <li key={e.id}>
                      {e.term} — {e.pronunciation}
                      {e.audioSampleReference ? ` (audio: ${e.audioSampleReference})` : ""}
                    </li>
                  ))}
                </ul>
              )
            : "—"}
      </ReviewBlock>
      <ReviewBlock title="Second-language behavior">
        {s7.languageSwitchingPolicy === "custom" && s7.languageSwitchingCustomRule.trim()
          ? s7.languageSwitchingCustomRule
          : s7.languageSwitchingPolicy
            ? labelLanguageSwitching(s7.languageSwitchingPolicy)
            : "—"}
      </ReviewBlock>
      {s7.perceivedVoicePreference && (
        <ReviewBlock title="Perceived presentation">
          {labelPerceivedVoice(s7.perceivedVoicePreference)}
        </ReviewBlock>
      )}
      {s7.accentPreference && (
        <ReviewBlock title="Accent preference">
          {labelAccentPreference(s7.accentPreference, s7.accentOtherApproved)}
        </ReviewBlock>
      )}
      {s7.formalityPreference && (
        <ReviewBlock title="Formality">
          {labelFormality(s7.formalityPreference)}
        </ReviewBlock>
      )}
      {s7.brandPhrasesAndAvoidances.trim() && (
        <ReviewBlock title="Brand phrases">
          <p className="whitespace-pre-wrap">{s7.brandPhrasesAndAvoidances}</p>
        </ReviewBlock>
      )}
      {s7.additionalReviewNotes.trim() && (
        <ReviewBlock title="Review notes">
          <p className="whitespace-pre-wrap">{s7.additionalReviewNotes}</p>
        </ReviewBlock>
      )}
    </div>
  );
}
