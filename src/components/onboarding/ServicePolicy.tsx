"use client";

import type { ServiceCatalogItem } from "@/lib/onboarding/section2Catalog";
import type { ServicePolicy, ServicePolicyEntry, ServicePolicyState } from "@/lib/onboarding/types";
import { ConditionalPanel } from "./ui/Card";
import { TextareaField } from "./ui/Fields";

export type ServicePolicyLabels = Record<ServicePolicy, string>;

const POLICY_ORDER: ServicePolicy[] = ["offered", "with_conditions", "ask_team", "not_offered"];

/**
 * The single core accessible control for the four-state service-policy
 * model. Backed by real native `<input type="radio">` elements (never
 * checkboxes, never clickable `<div>`s) grouped by `name`, so the
 * browser/screen reader gets correct radiogroup semantics, arrow-key
 * navigation, and focus-visible behavior for free. Rendered as a
 * segmented pill row so large service matrices stay compact and never
 * force horizontal scrolling — reflows from a 2×2 grid on narrow
 * viewports to a single row at `sm` and above.
 */
export function ServicePolicySegmented({
  name,
  value,
  onChange,
  labels,
  ariaLabel,
}: {
  name: string;
  value: ServicePolicyState;
  onChange: (policy: ServicePolicy) => void;
  labels: ServicePolicyLabels;
  ariaLabel: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap"
    >
      {POLICY_ORDER.map((policy) => {
        const checked = value === policy;
        return (
          <label
            key={policy}
            className={`flex min-w-0 cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-center text-sm font-medium transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--color-alexander-blue)] sm:min-w-[7.5rem] sm:flex-1 ${
              checked
                ? "border-[var(--color-alexander-blue)] bg-[var(--color-alexander-blue)] text-white"
                : "border-[var(--color-alexander-border)] bg-white text-[var(--color-alexander-navy)] hover:border-[var(--color-alexander-blue)]/40"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={policy}
              checked={checked}
              onChange={() => onChange(policy)}
              className="sr-only"
            />
            {labels[policy]}
          </label>
        );
      })}
    </div>
  );
}

/**
 * A single service/entity row: name + segmented policy control, with
 * the "with conditions" detail field appearing directly beneath THIS
 * row only (never a shared/global textarea). Condition errors render
 * inside that panel so the user sees exactly which service needs a rule.
 */
function ServicePolicyRow({
  item,
  entry,
  onChange,
  labels,
  conditionLabel,
  conditionPlaceholder,
  highlightIncomplete,
  conditionError,
}: {
  item: ServiceCatalogItem;
  entry: ServicePolicyEntry;
  onChange: (entry: ServicePolicyEntry) => void;
  labels: ServicePolicyLabels;
  conditionLabel: string;
  conditionPlaceholder?: string;
  highlightIncomplete: boolean;
  conditionError?: string;
}) {
  const showCondition = entry.policy === "with_conditions";
  const incomplete = highlightIncomplete && entry.policy === "";

  return (
    <li
      className={`rounded-lg border bg-white p-4 ${
        incomplete ? "border-[var(--color-alexander-required)]/50" : "border-[var(--color-alexander-border)]"
      }`}
    >
      <p className="mb-3 text-sm font-medium text-[var(--color-alexander-navy)]">{item.label}</p>
      <ServicePolicySegmented
        name={`policy-${item.id}`}
        value={entry.policy}
        ariaLabel={item.label}
        labels={labels}
        onChange={(policy) => onChange({ ...entry, policy })}
      />
      {showCondition && (
        <ConditionalPanel>
          <TextareaField
            id={`condition-${item.id}`}
            label={conditionLabel}
            required
            rows={2}
            value={entry.condition}
            onChange={(v) => onChange({ ...entry, condition: v })}
            placeholder={conditionPlaceholder}
            error={conditionError}
          />
        </ConditionalPanel>
      )}
    </li>
  );
}

/**
 * Repeated-row service/entity matrix (Q14, Q15, Q16). Each row is its
 * own card so long catalogs stack cleanly at every viewport with no
 * horizontal scrolling and no cramped desktop table.
 *
 * Owns its own group-level validation message (missing policies) so
 * QuestionCard does not also render the same alert.
 */
export function ServicePolicyGroup({
  items,
  value,
  onChange,
  labels,
  conditionLabel = "Condition",
  conditionPlaceholder,
  highlightIncomplete = false,
  groupError,
  conditionErrors,
}: {
  items: readonly ServiceCatalogItem[];
  value: Record<string, ServicePolicyEntry>;
  onChange: (id: string, entry: ServicePolicyEntry) => void;
  labels: ServicePolicyLabels;
  conditionLabel?: string;
  conditionPlaceholder?: string;
  highlightIncomplete?: boolean;
  groupError?: string;
  conditionErrors?: Record<string, string>;
}) {
  return (
    <div>
      <ul className="space-y-3">
        {items.map((item) => {
          const entry = value[item.id] ?? { policy: "" as const, condition: "" };
          return (
            <ServicePolicyRow
              key={item.id}
              item={item}
              entry={entry}
              onChange={(next) => onChange(item.id, next)}
              labels={labels}
              conditionLabel={conditionLabel}
              conditionPlaceholder={conditionPlaceholder}
              highlightIncomplete={highlightIncomplete}
              conditionError={conditionErrors?.[item.id]}
            />
          );
        })}
      </ul>
      {groupError && (
        <p className="mt-3 text-sm text-[var(--color-alexander-required)]" role="alert">
          {groupError}
        </p>
      )}
    </div>
  );
}

/**
 * Single-choice variant of the same four-state model (Q17, Q18) — same
 * accessible segmented control, with an attached condition field shown
 * directly beneath when "with conditions" is selected.
 *
 * Owns both the policy-selection error and the condition error so the
 * parent QuestionCard does not duplicate either alert.
 */
export function ServicePolicyChoice({
  name,
  value,
  onChange,
  labels,
  ariaLabel,
  conditionLabel,
  conditionValue,
  onConditionChange,
  conditionPlaceholder,
  error,
  conditionError,
}: {
  name: string;
  value: ServicePolicyState;
  onChange: (policy: ServicePolicy) => void;
  labels: ServicePolicyLabels;
  ariaLabel: string;
  conditionLabel: string;
  conditionValue: string;
  onConditionChange: (v: string) => void;
  conditionPlaceholder?: string;
  error?: string;
  conditionError?: string;
}) {
  const showCondition = value === "with_conditions";

  return (
    <div>
      <ServicePolicySegmented
        name={name}
        value={value}
        onChange={onChange}
        labels={labels}
        ariaLabel={ariaLabel}
      />
      {error && (
        <p className="mt-3 text-sm text-[var(--color-alexander-required)]" role="alert">
          {error}
        </p>
      )}
      {showCondition && (
        <ConditionalPanel>
          <TextareaField
            id={`${name}-condition`}
            label={conditionLabel}
            required
            rows={3}
            value={conditionValue}
            onChange={onConditionChange}
            placeholder={conditionPlaceholder}
            error={conditionError}
          />
        </ConditionalPanel>
      )}
    </div>
  );
}
