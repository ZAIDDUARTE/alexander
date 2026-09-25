"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboarding } from "@/lib/onboarding/OnboardingContext";
import { QuestionCard, ConditionalPanel } from "./ui/Card";
import { TextField, TextareaField } from "./ui/Fields";
import { RadioGroup } from "./ui/RadioGroup";
import { PrimaryButton, SecondaryButton } from "./ui/Buttons";
import { VoicePreviewCard } from "./VoicePreviewCard";
import { PronunciationCardEditor } from "./PronunciationCardEditor";
import { addCompletedSection } from "@/lib/onboarding/draft-utils";
import {
  ADDITIONAL_APPROVED_VOICES,
  APPROVED_ACCENT_OPTIONS,
  APPROVED_PRIMARY_VOICES,
  hasAdditionalApprovedVoices,
  isAccentOptionAvailable,
  isOtherSupportedLanguageOptionAvailable,
} from "@/lib/onboarding/approvedVoiceCatalog";
import {
  ACCENT_HELP,
  AI_DISCLOSURE_HELP,
  AI_DISCLOSURE_OPTIONS,
  BRAND_PHRASES_HELP,
  COMMUNICATION_STYLE_HELP,
  COMMUNICATION_STYLE_OPTIONS,
  FORMALITY_HELP,
  FORMALITY_OPTIONS,
  LANGUAGE_HELP,
  LANGUAGE_SWITCHING_OPTIONS,
  PERCEIVED_VOICE_HELP,
  PERCEIVED_VOICE_OPTIONS,
  PRONUNCIATION_MODE_OPTIONS,
  REVIEW_NOTES_HELP,
  SPOKEN_NAME_HELP,
  SPOKEN_NAME_OPTIONS,
  VOICE_CHOICE_ANOTHER,
} from "@/lib/onboarding/section7Catalog";
import { resolveEffectiveVoiceId } from "@/lib/onboarding/voiceSelection";
import type { AccentPreference, CallerLanguageId, Section7Data, VoiceSelectionId } from "@/lib/onboarding/types";
import { createPronunciationEntryId } from "@/lib/onboarding/types";
import { validateSection7, type FieldErrors } from "@/lib/onboarding/validation/section7";

function LanguageCheckboxes({
  data,
  onChange,
  error,
  submitted,
}: {
  data: Section7Data;
  onChange: (patch: Partial<Section7Data>) => void;
  error?: string;
  submitted: boolean;
}) {
  const toggleEnglishOnly = () => {
    onChange({ englishOnly: true, callerLanguages: [] });
  };

  const otherLanguageAvailable = isOtherSupportedLanguageOptionAvailable(null);

  const toggleLang = (lang: CallerLanguageId) => {
    if (lang === "other" && !otherLanguageAvailable) return;
    const has = data.callerLanguages.includes(lang);
    const next = has
      ? data.callerLanguages.filter((l) => l !== lang)
      : [...data.callerLanguages, lang];
    onChange({ englishOnly: false, callerLanguages: next });
  };

  return (
    <div>
      <div role="group" aria-label="Supported languages" className="space-y-2">
        <label
          className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 ${
            data.englishOnly
              ? "border-[var(--color-alexander-blue)] bg-[var(--color-alexander-info-bg)]"
              : "border-[var(--color-alexander-border)] bg-white"
          }`}
        >
          <input
            type="checkbox"
            checked={data.englishOnly}
            onChange={() => toggleEnglishOnly()}
            className="h-4 w-4 accent-[var(--color-alexander-blue)]"
          />
          <span className="text-sm text-[var(--color-alexander-navy)]">English only</span>
        </label>
        {(["english", "spanish", "other"] as CallerLanguageId[]).map((lang) => {
          const label =
            lang === "english" ? "English" : lang === "spanish" ? "Spanish" : "Other supported language";
          const checked = !data.englishOnly && data.callerLanguages.includes(lang);
          const disabled =
            data.englishOnly || (lang === "other" && !otherLanguageAvailable);
          return (
            <div key={lang}>
              <label
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
                  disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                } ${
                  checked
                    ? "border-[var(--color-alexander-blue)] bg-[var(--color-alexander-info-bg)]"
                    : "border-[var(--color-alexander-border)] bg-white"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggleLang(lang)}
                  className="h-4 w-4 accent-[var(--color-alexander-blue)]"
                />
                <span className="text-sm text-[var(--color-alexander-navy)]">{label}</span>
              </label>
              {lang === "other" && !otherLanguageAvailable && (
                <p className="mt-1 px-1 text-xs text-[var(--color-alexander-muted)]">
                  Additional languages can be enabled when verified for the selected voice.
                </p>
              )}
            </div>
          );
        })}
      </div>
      {submitted && error && (
        <p className="mt-3 text-sm text-[var(--color-alexander-required)]" role="alert">{error}</p>
      )}
    </div>
  );
}

export function Section7Form({ mode = "form" }: { mode?: "form" | "review" }) {
  const { draft, updateSection7, saveDraftNow } = useOnboarding();
  const router = useRouter();
  const data = draft.section7;
  const readOnly = mode === "review";
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const handleContinue = async () => {
    const nextErrors = validateSection7(data);
    setErrors(nextErrors);
    setSubmitted(true);
    if (Object.keys(nextErrors).length > 0) {
      document.querySelector("[role='alert']")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const finalDraft = {
      ...draft,
      updatedAt: new Date().toISOString(),
      navigation: {
        ...draft.navigation,
        stage: "section-complete" as const,
        sectionId: 7,
        completedSections: addCompletedSection(draft.navigation.completedSections, 7),
      },
    };
    await saveDraftNow(finalDraft);
    router.push("/onboarding/sections/7/complete");
  };

  const effectiveVoiceId = resolveEffectiveVoiceId(data);

  return (
    <div className="space-y-6">
      <QuestionCard
        title="Which language or languages should Alexander support with callers?"
        required
        helpText={LANGUAGE_HELP}
      >
        <LanguageCheckboxes
          data={data}
          submitted={submitted}
          error={errors.callerLanguages}
          onChange={(patch) => updateSection7(patch, { immediate: true })}
        />
        {data.callerLanguages.includes("other") &&
          !data.englishOnly &&
          isOtherSupportedLanguageOptionAvailable(resolveEffectiveVoiceId(data)) && (
          <ConditionalPanel>
            <TextField
              id="otherSupportedLanguage"
              label="Other supported language"
              value={data.otherSupportedLanguage}
              onChange={(v) => updateSection7({ otherSupportedLanguage: v })}
              error={submitted ? errors.otherSupportedLanguage : undefined}
            />
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard
        title="Which voice should Alexander use?"
        required
        helpText="Choose from the approved Alexander voice library. The preview is more reliable than asking you to describe a voice abstractly."
      >
        <ul className="space-y-3" role="radiogroup" aria-label="Approved voice">
          {APPROVED_PRIMARY_VOICES.map((voice) => (
            <VoicePreviewCard
              key={voice.id}
              voice={voice}
              name="voiceSelection"
              selected={data.voiceSelection === voice.id}
              onSelect={() =>
                updateSection7(
                  { voiceSelection: voice.id as VoiceSelectionId, anotherApprovedVoiceId: "" },
                  { immediate: true },
                )
              }
            />
          ))}
          <li
            className={`rounded-lg border border-[var(--color-alexander-border)] bg-white p-4 ${
              !hasAdditionalApprovedVoices() ? "opacity-70" : ""
            }`}
          >
            <label
              className={`flex items-start gap-3 ${
                hasAdditionalApprovedVoices() ? "cursor-pointer" : "cursor-not-allowed"
              }`}
            >
              <input
                type="radio"
                name="voiceSelection"
                checked={data.voiceSelection === VOICE_CHOICE_ANOTHER}
                disabled={!hasAdditionalApprovedVoices()}
                onChange={() =>
                  updateSection7({ voiceSelection: VOICE_CHOICE_ANOTHER }, { immediate: true })
                }
                className="mt-1 h-4 w-4 accent-[var(--color-alexander-blue)]"
              />
              <span className="text-sm font-medium text-[var(--color-alexander-navy)]">
                Another approved voice
              </span>
            </label>
            {!hasAdditionalApprovedVoices() && (
              <p className="mt-2 text-xs text-[var(--color-alexander-muted)]">
                No additional approved voices are currently available.
              </p>
            )}
            {hasAdditionalApprovedVoices() && data.voiceSelection === VOICE_CHOICE_ANOTHER && (
              <ConditionalPanel>
                <RadioGroup
                  name="anotherApprovedVoiceId"
                  options={ADDITIONAL_APPROVED_VOICES.map((v) => ({
                    value: v.id,
                    label: `${v.label} — ${v.description}`,
                  }))}
                  value={data.anotherApprovedVoiceId}
                  onChange={(v) => updateSection7({ anotherApprovedVoiceId: v }, { immediate: true })}
                  error={submitted ? errors.anotherApprovedVoiceId : undefined}
                />
              </ConditionalPanel>
            )}
          </li>
        </ul>
        {submitted && errors.voiceSelection && (
          <p className="mt-3 text-sm text-[var(--color-alexander-required)]" role="alert">
            {errors.voiceSelection}
          </p>
        )}
      </QuestionCard>

      <QuestionCard
        title="How should Alexander’s communication style feel?"
        required
        helpText={COMMUNICATION_STYLE_HELP}
      >
        <RadioGroup
          name="communicationStyle"
          options={COMMUNICATION_STYLE_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
          value={data.communicationStyle}
          onChange={(v) => updateSection7({ communicationStyle: v }, { immediate: true })}
          error={submitted ? errors.communicationStyle : undefined}
        />
      </QuestionCard>

      <QuestionCard
        title="What name should Alexander use when introducing himself?"
        required
        helpText={SPOKEN_NAME_HELP}
      >
        <RadioGroup
          name="spokenNameMode"
          options={SPOKEN_NAME_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
          value={data.spokenNameMode}
          onChange={(v) => {
            const patch: Partial<Section7Data> = { spokenNameMode: v };
            if (v === "alexander") patch.spokenDisplayName = "";
            updateSection7(patch, { immediate: true });
          }}
          error={submitted ? errors.spokenNameMode : undefined}
        />
        {(data.spokenNameMode === "company_specific" ||
          data.spokenNameMode === "another_approved") && (
          <ConditionalPanel>
            <TextField
              id="spokenDisplayName"
              label="Spoken receptionist name"
              value={data.spokenDisplayName}
              onChange={(v) => updateSection7({ spokenDisplayName: v })}
              error={submitted ? errors.spokenDisplayName : undefined}
            />
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard
        title="How should Alexander identify himself as an AI?"
        required
        helpText={AI_DISCLOSURE_HELP}
      >
        <RadioGroup
          name="aiDisclosureStyle"
          options={AI_DISCLOSURE_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
          value={data.aiDisclosureStyle}
          onChange={(v) => updateSection7({ aiDisclosureStyle: v }, { immediate: true })}
          error={submitted ? errors.aiDisclosureStyle : undefined}
        />
        {data.aiDisclosureStyle === "custom" && (
          <ConditionalPanel>
            <TextareaField
              id="aiDisclosureCustom"
              label="Approved disclosure wording"
              rows={3}
              value={data.aiDisclosureCustom}
              onChange={(v) => updateSection7({ aiDisclosureCustom: v })}
            />
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard
        title="Are there any company, people, city, neighborhood, or brand names that Alexander must pronounce correctly?"
        required
      >
        <RadioGroup
          name="pronunciationMode"
          options={PRONUNCIATION_MODE_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
          value={data.pronunciationMode}
          onChange={(v) => {
            const patch: Partial<Section7Data> = { pronunciationMode: v };
            if (v === "none") patch.pronunciationEntries = [];
            if (v === "yes" && data.pronunciationEntries.length === 0) {
              patch.pronunciationEntries = [
                {
                  id: createPronunciationEntryId(),
                  term: "",
                  pronunciation: "",
                  audioSampleReference: "",
                },
              ];
            }
            updateSection7(patch, { immediate: true });
          }}
          error={submitted ? errors.pronunciationMode : undefined}
        />
        {data.pronunciationMode === "yes" && (
          <ConditionalPanel>
            <ul className="space-y-4">
              {data.pronunciationEntries.map((entry) => (
                <PronunciationCardEditor
                  key={entry.id}
                  entry={entry}
                  showErrors={submitted}
                  errors={errors}
                  onChange={(patch) =>
                    updateSection7({
                      pronunciationEntries: data.pronunciationEntries.map((e) =>
                        e.id === entry.id ? { ...e, ...patch } : e,
                      ),
                    })
                  }
                  onRemove={() =>
                    updateSection7({
                      pronunciationEntries: data.pronunciationEntries.filter(
                        (e) => e.id !== entry.id,
                      ),
                    })
                  }
                />
              ))}
            </ul>
            {submitted && errors.pronunciationEntries && (
              <p className="mt-3 text-sm text-[var(--color-alexander-required)]" role="alert">
                {errors.pronunciationEntries}
              </p>
            )}
            <div className="mt-4">
              <SecondaryButton
                fullWidth={false}
                onClick={() =>
                  updateSection7({
                    pronunciationEntries: [
                      ...data.pronunciationEntries,
                      {
                        id: createPronunciationEntryId(),
                        term: "",
                        pronunciation: "",
                        audioSampleReference: "",
                      },
                    ],
                  })
                }
              >
                + Add pronunciation
              </SecondaryButton>
            </div>
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard
        title="If a caller speaks a supported second language, what should Alexander normally do?"
        required
      >
        <RadioGroup
          name="languageSwitchingPolicy"
          options={LANGUAGE_SWITCHING_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
          value={data.languageSwitchingPolicy}
          onChange={(v) => updateSection7({ languageSwitchingPolicy: v }, { immediate: true })}
          error={submitted ? errors.languageSwitchingPolicy : undefined}
        />
        {data.languageSwitchingPolicy === "custom" && (
          <ConditionalPanel>
            <TextareaField
              id="languageSwitchingCustomRule"
              label="Language-switching rule"
              rows={3}
              value={data.languageSwitchingCustomRule}
              onChange={(v) => updateSection7({ languageSwitchingCustomRule: v })}
            />
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard
        title="Do you have a preference for the perceived voice presentation?"
        optional
        helpText={PERCEIVED_VOICE_HELP}
      >
        <RadioGroup
          name="perceivedVoicePreference"
          options={PERCEIVED_VOICE_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
          value={data.perceivedVoicePreference}
          onChange={(v) => updateSection7({ perceivedVoicePreference: v }, { immediate: true })}
        />
      </QuestionCard>

      <QuestionCard
        title="Do you have a preferred accent or regional character?"
        optional
        helpText={ACCENT_HELP}
      >
        <div role="radiogroup" aria-label="Accent preference">
          <ul className="mt-3 space-y-2">
            {APPROVED_ACCENT_OPTIONS.map((opt) => {
              const available = isAccentOptionAvailable(opt.id, effectiveVoiceId);
              const checked = data.accentPreference === opt.id;
              return (
                <li key={opt.id}>
                  <label
                    className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${
                      !available ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                    } ${
                      checked
                        ? "border-[var(--color-alexander-blue)] bg-[var(--color-alexander-info-bg)]"
                        : "border-[var(--color-alexander-border)] bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="accentPreference"
                      value={opt.id}
                      checked={checked}
                      disabled={!available}
                      onChange={() =>
                        updateSection7(
                          { accentPreference: opt.id as AccentPreference },
                          { immediate: true },
                        )
                      }
                      className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-alexander-blue)]"
                    />
                    <span className="text-sm text-[var(--color-alexander-navy)]">{opt.label}</span>
                  </label>
                </li>
              );
            })}
          </ul>
          {submitted && errors.accentPreference && (
            <p className="mt-3 text-sm text-[var(--color-alexander-required)]" role="alert">
              {errors.accentPreference}
            </p>
          )}
        </div>
        {data.accentPreference === "other_approved" && (
          <ConditionalPanel>
            <TextField
              id="accentOtherApproved"
              label="Other approved accent"
              value={data.accentOtherApproved}
              onChange={(v) => updateSection7({ accentOtherApproved: v })}
              error={submitted ? errors.accentOtherApproved : undefined}
            />
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard title="How formal should Alexander sound?" optional helpText={FORMALITY_HELP}>
        <RadioGroup
          name="formalityPreference"
          options={FORMALITY_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
          value={data.formalityPreference}
          onChange={(v) => updateSection7({ formalityPreference: v }, { immediate: true })}
        />
      </QuestionCard>

      <QuestionCard
        title="Are there any phrases Alexander should use or avoid because of your company’s brand?"
        optional
        helpText={BRAND_PHRASES_HELP}
      >
        <TextareaField
          id="brandPhrasesAndAvoidances"
          label=""
          rows={4}
          value={data.brandPhrasesAndAvoidances}
          onChange={(v) => updateSection7({ brandPhrasesAndAvoidances: v })}
        />
      </QuestionCard>

      <QuestionCard
        title="Is there anything else about Alexander’s voice or identity that we should review with you?"
        optional
        helpText={REVIEW_NOTES_HELP}
      >
        <TextareaField
          id="additionalReviewNotes"
          label=""
          rows={4}
          value={data.additionalReviewNotes}
          onChange={(v) => updateSection7({ additionalReviewNotes: v })}
        />
      </QuestionCard>

      {!readOnly && (
        <div className="flex flex-col gap-3 pt-4 sm:flex-row">
          <SecondaryButton
            className="sm:flex-1"
            onClick={() => router.push("/onboarding/sections/7/intro")}
          >
            Back
          </SecondaryButton>
          <PrimaryButton className="sm:flex-1" onClick={handleContinue}>
            Complete Section 7 →
          </PrimaryButton>
        </div>
      )}
    </div>
  );
}
