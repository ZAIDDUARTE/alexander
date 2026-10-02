"use client";

import { TextField } from "./ui/Fields";
import type { AdditionalSoftwareCard } from "@/lib/onboarding/types";

export function AdditionalSoftwareCardEditor({
  categoryLabel,
  card,
  errors,
  submitted,
  onChange,
}: {
  categoryLabel: string;
  card: AdditionalSoftwareCard;
  errors: Partial<Record<string, string>>;
  submitted: boolean;
  onChange: (patch: Partial<AdditionalSoftwareCard>) => void;
}) {
  const prefix = `additionalSoftware.${card.categoryId}`;
  return (
    <div className="space-y-4 rounded-lg border border-[var(--color-alexander-border)] bg-white p-4">
      <p className="text-sm font-medium text-[var(--color-alexander-navy)]">{categoryLabel}</p>
      <TextField
        id={`${prefix}.systemName`}
        label="What software do you use?"
        placeholder="Enter software name"
        value={card.systemName}
        onChange={(v) => onChange({ systemName: v })}
        error={submitted ? errors[`${prefix}.systemName`] : undefined}
      />
    </div>
  );
}
