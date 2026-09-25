"use client";

import { useMemo, useState } from "react";
import {
  FEE_AMOUNT_KIND_OPTIONS,
  FEE_CATEGORY_TEMPLATES,
  FEE_CREDIT_OPTIONS,
  FEE_QUOTE_AUTHORITY_OPTIONS,
  FEE_WAIVER_OPTIONS,
} from "@/lib/onboarding/section5Catalog";
import { activeMeaningfulFees, feeCardStarted } from "@/lib/onboarding/validation/feeRecord";
import { hasActiveSection4LinkedFeePolicies, isSection4LinkedFeeProtected } from "@/lib/onboarding/section4FeeLinks";
import type { FeeAmountKind, FeeRecord, Section4Data } from "@/lib/onboarding/types";
import { ConditionalPanel } from "./ui/Card";
import { TextField, TextareaField } from "./ui/Fields";
import { RadioGroup } from "./ui/RadioGroup";
import { PrimaryButton, SecondaryButton } from "./ui/Buttons";

const FEE_HELP =
  "Add only the fees your company actually charges. For each fee, tell us when it applies and whether Alexander may quote it to customers.";

const NO_FEES_LABEL =
  "My company does not charge separate service, diagnostic, travel, or similar fees.";

export type FeeCardFieldErrors = Partial<Record<string, string>>;

function feeError(errors: FeeCardFieldErrors, feeId: string, field: string): string | undefined {
  return errors[`fees.${feeId}.${field}`] ?? errors[`fees.${feeId}`];
}

function AmountKindSegmented({
  name,
  value,
  onChange,
  ariaLabel,
  error,
}: {
  name: string;
  value: FeeAmountKind | "";
  onChange: (kind: FeeAmountKind) => void;
  ariaLabel: string;
  error?: string;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-[var(--color-alexander-navy)]">
        Amount
        <span className="ml-1 text-[var(--color-alexander-required)]" aria-hidden>*</span>
      </p>
      <div
        role="radiogroup"
        aria-label={ariaLabel}
        className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2"
      >
        {FEE_AMOUNT_KIND_OPTIONS.map((opt) => {
          const checked = value === opt.id;
          return (
            <label
              key={opt.id}
              className={`flex min-w-0 cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-center text-sm font-medium transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--color-alexander-blue)] ${
                checked
                  ? "border-[var(--color-alexander-blue)] bg-[var(--color-alexander-blue)] text-white"
                  : "border-[var(--color-alexander-border)] bg-white text-[var(--color-alexander-navy)] hover:border-[var(--color-alexander-blue)]/40"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={opt.id}
                checked={checked}
                onChange={() => onChange(opt.id as FeeAmountKind)}
                className="sr-only"
              />
              {opt.label}
            </label>
          );
        })}
      </div>
      {error && (
        <p className="mt-2 text-sm text-[var(--color-alexander-required)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function FeeCard({
  fee,
  index,
  collapsed,
  onToggleCollapse,
  onUpdate,
  onRemove,
  onDuplicate,
  removeProtected,
  showErrors,
  errors,
}: {
  fee: FeeRecord;
  index: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onUpdate: (patch: Partial<FeeRecord>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  removeProtected: boolean;
  showErrors: boolean;
  errors: FeeCardFieldErrors;
}) {
  const title = fee.name.trim() || `Fee ${index + 1}`;
  const requireNotice = fee.feeKey === "late_cancellation";

  const quoteOptions = FEE_QUOTE_AUTHORITY_OPTIONS.map((o) => ({
    value: o.id as FeeRecord["quoteAuthority"],
    label: o.label,
  }));
  const creditOptions = FEE_CREDIT_OPTIONS.map((o) => ({
    value: o.id as FeeRecord["creditTowardWork"],
    label: o.label,
  }));
  const waiverOptions = FEE_WAIVER_OPTIONS.map((o) => ({
    value: o.id as FeeRecord["waiverPolicy"],
    label: o.label,
  }));

  return (
    <li className="min-w-0 rounded-xl border border-[var(--color-alexander-border)] bg-white p-4 sm:p-5">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--color-alexander-navy)]">{title}</p>
          {removeProtected && (
            <p className="mt-0.5 text-xs text-[var(--color-alexander-muted)]">
              Whether this fee is charged is controlled in Scheduling (Section 4). You can edit
              details here; change Section 4 to stop charging it.
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <SecondaryButton fullWidth={false} className="px-3 py-2 text-sm" onClick={onToggleCollapse}>
            {collapsed ? "Expand" : "Collapse"}
          </SecondaryButton>
          <SecondaryButton fullWidth={false} className="px-3 py-2 text-sm" onClick={onDuplicate}>
            Duplicate
          </SecondaryButton>
          {!removeProtected && (
            <SecondaryButton fullWidth={false} className="px-3 py-2 text-sm" onClick={onRemove}>
              Remove
            </SecondaryButton>
          )}
        </div>
      </div>

      {!collapsed && (
        <div className="mt-4 min-w-0 space-y-4">
          <TextField
            id={`fee-name-${fee.id}`}
            label="Fee name or type"
            required
            value={fee.name}
            onChange={(v) => onUpdate({ name: v })}
            error={showErrors ? feeError(errors, fee.id, "name") : undefined}
          />

          <AmountKindSegmented
            name={`fee-amount-kind-${fee.id}`}
            value={fee.amountKind}
            ariaLabel={`Amount type for ${title}`}
            onChange={(kind) =>
              onUpdate({
                amountKind: kind,
                ...(kind === "varies"
                  ? {
                      amountFixed: "",
                      amountMin: "",
                      amountMax: "",
                      amountPercentage: "",
                    }
                  : {}),
              })
            }
            error={showErrors ? feeError(errors, fee.id, "amountKind") : undefined}
          />

          {fee.amountKind === "fixed" && (
            <TextField
              id={`fee-fixed-${fee.id}`}
              label="Fixed amount ($)"
              required
              value={fee.amountFixed}
              onChange={(v) => onUpdate({ amountFixed: v })}
              error={showErrors ? feeError(errors, fee.id, "amountFixed") : undefined}
            />
          )}
          {fee.amountKind === "range" && (
            <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                id={`fee-min-${fee.id}`}
                label="Minimum ($)"
                required
                value={fee.amountMin}
                onChange={(v) => onUpdate({ amountMin: v })}
                error={showErrors ? feeError(errors, fee.id, "amountMin") : undefined}
              />
              <TextField
                id={`fee-max-${fee.id}`}
                label="Maximum ($)"
                required
                value={fee.amountMax}
                onChange={(v) => onUpdate({ amountMax: v })}
                error={showErrors ? feeError(errors, fee.id, "amountMax") : undefined}
              />
              {showErrors && feeError(errors, fee.id, "amountRange") && (
                <p className="sm:col-span-2 text-sm text-[var(--color-alexander-required)]" role="alert">
                  {feeError(errors, fee.id, "amountRange")}
                </p>
              )}
            </div>
          )}
          {fee.amountKind === "percentage" && (
            <TextField
              id={`fee-pct-${fee.id}`}
              label="Percentage (%)"
              required
              value={fee.amountPercentage}
              onChange={(v) => onUpdate({ amountPercentage: v })}
              error={showErrors ? feeError(errors, fee.id, "amountPercentage") : undefined}
            />
          )}

          <TextareaField
            id={`fee-rule-${fee.id}`}
            label="When does this fee apply?"
            required
            rows={2}
            value={fee.applicationRule}
            onChange={(v) => onUpdate({ applicationRule: v })}
            error={showErrors ? feeError(errors, fee.id, "applicationRule") : undefined}
          />

          {requireNotice && (
            <TextField
              id={`fee-notice-${fee.id}`}
              label="Notice required before cancellation"
              required
              value={fee.noticeRequired}
              onChange={(v) => onUpdate({ noticeRequired: v })}
              placeholder="e.g. 24 hours"
              error={showErrors ? feeError(errors, fee.id, "noticeRequired") : undefined}
            />
          )}

          <RadioGroup
            name={`fee-quote-${fee.id}`}
            options={quoteOptions}
            value={fee.quoteAuthority}
            onChange={(v) => onUpdate({ quoteAuthority: v })}
            error={showErrors ? feeError(errors, fee.id, "quoteAuthority") : undefined}
          />

          <div>
            <p className="mb-2 text-sm font-medium text-[var(--color-alexander-navy)]">
              May this fee be credited toward approved work?
              <span className="ml-1 text-[var(--color-alexander-required)]" aria-hidden>*</span>
            </p>
            <RadioGroup
              name={`fee-credit-${fee.id}`}
              options={creditOptions}
              value={fee.creditTowardWork}
              onChange={(v) => onUpdate({ creditTowardWork: v })}
              error={showErrors ? feeError(errors, fee.id, "creditTowardWork") : undefined}
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-[var(--color-alexander-navy)]">
              Can this fee be waived?
              <span className="ml-1 text-[var(--color-alexander-required)]" aria-hidden>*</span>
            </p>
            <RadioGroup
              name={`fee-waiver-${fee.id}`}
              options={waiverOptions}
              value={fee.waiverPolicy}
              onChange={(v) =>
                onUpdate({
                  waiverPolicy: v,
                  ...(v === "no" ? { waiverRule: "" } : {}),
                })
              }
              error={showErrors ? feeError(errors, fee.id, "waiverPolicy") : undefined}
            />
            {(fee.waiverPolicy === "yes" || fee.waiverPolicy === "sometimes") && (
              <ConditionalPanel>
                <TextareaField
                  id={`fee-waiver-rule-${fee.id}`}
                  label="When may this fee be waived?"
                  required
                  rows={2}
                  value={fee.waiverRule}
                  onChange={(v) => onUpdate({ waiverRule: v })}
                  error={showErrors ? feeError(errors, fee.id, "waiverRule") : undefined}
                />
              </ConditionalPanel>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

export function FeeCardEditor({
  fees,
  section4,
  noSeparateFees,
  onNoSeparateFeesChange,
  onAddFee,
  onRemoveFee,
  onDuplicateFee,
  onUpdateFee,
  showErrors = false,
  errors = {},
  groupError,
  noSeparateFeesError,
}: {
  fees: FeeRecord[];
  section4: Section4Data;
  noSeparateFees: boolean;
  onNoSeparateFeesChange: (value: boolean) => void;
  onAddFee: () => string;
  onRemoveFee: (id: string) => void;
  onDuplicateFee: (id: string) => void;
  onUpdateFee: (id: string, patch: Partial<FeeRecord>) => void;
  showErrors?: boolean;
  errors?: FeeCardFieldErrors;
  groupError?: string;
  noSeparateFeesError?: string;
}) {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());

  const visibleFees = useMemo(
    () => fees.filter((f) => f.active || feeCardStarted(f)),
    [fees],
  );

  const hasActiveMeaningful = activeMeaningfulFees(fees).length > 0;
  const section4BlocksNoFees = hasActiveSection4LinkedFeePolicies(section4, fees);

  const handleAddFromTemplate = (templateId: string) => {
    const template = FEE_CATEGORY_TEMPLATES.find((t) => t.id === templateId);
    const id = onAddFee();
    onUpdateFee(id, {
      active: true,
      categoryTemplate: templateId,
      name: template?.label ?? "",
      sourceSection: 5,
    });
  };

  const handleAddBlank = () => {
    const id = onAddFee();
    onUpdateFee(id, { active: true, sourceSection: 5 });
  };

  const toggleCollapse = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="min-w-0 space-y-4">
      <p className="text-sm leading-relaxed text-[var(--color-alexander-muted)]">{FEE_HELP}</p>

      <label
        className={`flex items-start gap-3 rounded-lg border border-[var(--color-alexander-border)] bg-white px-4 py-3 ${
          section4BlocksNoFees ? "cursor-not-allowed opacity-70" : "cursor-pointer"
        }`}
      >
        <input
          type="checkbox"
          checked={noSeparateFees}
          disabled={section4BlocksNoFees}
          onChange={(e) => onNoSeparateFeesChange(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-alexander-blue)]"
        />
        <span className="text-sm text-[var(--color-alexander-navy)]">{NO_FEES_LABEL}</span>
      </label>
      {section4BlocksNoFees && (
        <p className="text-sm text-[var(--color-alexander-muted)]">
          Cancellation and no-show fees are active from Scheduling (Section 4). Update those
          policies there before selecting no separate fees.
        </p>
      )}
      {showErrors && noSeparateFeesError && (
        <p className="text-sm text-[var(--color-alexander-required)]" role="alert">
          {noSeparateFeesError}
        </p>
      )}
      {noSeparateFees && hasActiveMeaningful && (
        <p className="text-sm text-[var(--color-alexander-required)]" role="alert">
          Remove active fee records or turn off “no separate fees” — these choices cannot both apply.
        </p>
      )}

      {!noSeparateFees && (
        <>
          <div className="min-w-0">
            <p className="mb-2 text-sm font-medium text-[var(--color-alexander-navy)]">
              Add from template (optional)
            </p>
            <div className="flex min-w-0 flex-wrap gap-2">
              {FEE_CATEGORY_TEMPLATES.map((t) => (
                <SecondaryButton
                  key={t.id}
                  fullWidth={false}
                  className="px-3 py-2 text-sm"
                  onClick={() => handleAddFromTemplate(t.id)}
                >
                  + {t.label}
                </SecondaryButton>
              ))}
            </div>
          </div>

          {visibleFees.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--color-alexander-border)] bg-[var(--color-alexander-info-bg)]/40 px-4 py-8 text-center">
              <p className="text-sm text-[var(--color-alexander-muted)]">No fees added yet</p>
              <PrimaryButton className="mx-auto mt-4 max-w-xs" onClick={handleAddBlank}>
                Add a fee
              </PrimaryButton>
            </div>
          ) : (
            <>
              <ul className="min-w-0 space-y-4">
                {visibleFees.map((fee, index) => (
                  <FeeCard
                    key={fee.id}
                    fee={fee}
                    index={index}
                    collapsed={collapsedIds.has(fee.id)}
                    onToggleCollapse={() => toggleCollapse(fee.id)}
                    onUpdate={(patch) => onUpdateFee(fee.id, patch)}
                    onRemove={() => onRemoveFee(fee.id)}
                    onDuplicate={() => onDuplicateFee(fee.id)}
                    removeProtected={isSection4LinkedFeeProtected(fee.id, section4)}
                    showErrors={showErrors}
                    errors={errors}
                  />
                ))}
              </ul>
              <SecondaryButton onClick={handleAddBlank}>+ Add a fee</SecondaryButton>
            </>
          )}

          {showErrors && groupError && (
            <p className="text-sm text-[var(--color-alexander-required)]" role="alert">
              {groupError}
            </p>
          )}
        </>
      )}
    </div>
  );
}
