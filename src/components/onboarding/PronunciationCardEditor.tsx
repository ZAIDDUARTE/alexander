"use client";

import type { PronunciationEntry } from "@/lib/onboarding/types";
import { TextField } from "./ui/Fields";
import { SecondaryButton } from "./ui/Buttons";

export function PronunciationCardEditor({
  entry,
  errors,
  showErrors,
  onChange,
  onRemove,
}: {
  entry: PronunciationEntry;
  errors?: Record<string, string | undefined>;
  showErrors?: boolean;
  onChange: (patch: Partial<PronunciationEntry>) => void;
  onRemove: () => void;
}) {
  const rowError = showErrors ? errors?.[`pronunciationEntries.${entry.id}`] : undefined;
  const termLabel = entry.term.trim() || "this entry";

  return (
    <li className="min-w-0 rounded-lg border border-[var(--color-alexander-border)] bg-white p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-[var(--color-alexander-navy)]">Pronunciation</p>
        <SecondaryButton
          fullWidth={false}
          className="px-3 py-2 text-sm"
          onClick={onRemove}
          aria-label={`Remove pronunciation for ${termLabel}`}
        >
          Remove
        </SecondaryButton>
      </div>
      <div className="space-y-4">
        <TextField
          id={`pron-term-${entry.id}`}
          label="Name or spelling"
          value={entry.term}
          onChange={(v) => onChange({ term: v })}
          error={showErrors ? errors?.[`pronunciationEntries.${entry.id}.term`] : undefined}
        />
        <TextField
          id={`pronunciation-${entry.id}`}
          label="Preferred pronunciation"
          value={entry.pronunciation}
          onChange={(v) => onChange({ pronunciation: v })}
          error={showErrors ? errors?.[`pronunciationEntries.${entry.id}.pronunciation`] : undefined}
        />
        <TextField
          id={`pron-audio-${entry.id}`}
          label="Optional audio example (URL or reference)"
          value={entry.audioSampleReference}
          onChange={(v) => onChange({ audioSampleReference: v })}
          helpText="Optional link or reference to an approved pronunciation sample. File upload is not configured in this build."
        />
      </div>
      {rowError && (
        <p className="mt-3 text-sm text-[var(--color-alexander-required)]" role="alert">
          {rowError}
        </p>
      )}
    </li>
  );
}
