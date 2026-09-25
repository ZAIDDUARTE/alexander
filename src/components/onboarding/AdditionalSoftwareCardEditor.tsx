"use client";

import { TextField, TextareaField } from "./ui/Fields";
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
        label="Exact software name"
        value={card.systemName}
        onChange={(v) => onChange({ systemName: v })}
        error={submitted ? errors[`${prefix}.systemName`] : undefined}
      />
      <TextareaField
        id={`${prefix}.desiredAccess`}
        label="What should Alexander be able to access?"
        rows={3}
        value={card.desiredAccess}
        onChange={(v) => onChange({ desiredAccess: v })}
        error={submitted ? errors[`${prefix}.desiredAccess`] : undefined}
      />
      {card.categoryId === "other" && (
        <>
          <TextField
            id={`${prefix}.otherCategoryLabel`}
            label="Category or name"
            value={card.otherCategoryLabel}
            onChange={(v) => onChange({ otherCategoryLabel: v })}
            error={submitted ? errors[`${prefix}.otherCategoryLabel`] : undefined}
          />
          <TextareaField
            id={`${prefix}.otherDetails`}
            label="Additional details"
            rows={3}
            value={card.otherDetails}
            onChange={(v) => onChange({ otherDetails: v })}
            error={submitted ? errors[`${prefix}.otherDetails`] : undefined}
          />
        </>
      )}
    </div>
  );
}
