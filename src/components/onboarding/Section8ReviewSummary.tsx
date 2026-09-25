"use client";

import {
  CONNECTION_OWNER_OPTIONS,
  FAILURE_FALLBACK_OPTIONS,
  INTEGRATION_CAPABILITY_OPTIONS,
  providerLabel,
} from "@/lib/onboarding/section8Catalog";
import { normalizeSection8 } from "@/lib/onboarding/normalize/section8";
import { formatCrmSelection } from "@/lib/onboarding/normalize/section8";
import {
  resolveCrmSoftware,
  resolveDispatchSoftware,
  resolvePhoneSoftware,
  resolveSchedulingSoftware,
} from "@/lib/onboarding/softwareRegistry";
import type { OnboardingDraft } from "@/lib/onboarding/types";

function refLabel(draft: OnboardingDraft, ref: ReturnType<typeof resolveCrmSoftware>): string {
  if (!ref) return "—";
  return ref.displayName || providerLabel(ref.providerKey, ref.customName ?? undefined);
}

export function Section8ReviewSummary({ draft }: { draft: OnboardingDraft }) {
  const s8 = draft.section8;
  const norm = normalizeSection8(s8, draft.systems);

  const scheduling =
    s8.schedulingProvider === "same_as_crm"
      ? `Same as CRM (${refLabel(draft, resolveCrmSoftware(s8, draft.systems))})`
      : refLabel(draft, resolveSchedulingSoftware(s8, draft.systems)) ||
        (s8.schedulingProvider === "none" ? "We do not use scheduling software" : "—");

  const dispatch =
    s8.dispatchProvider === "same_as_scheduling"
      ? `Same as scheduling (${refLabel(draft, resolveSchedulingSoftware(s8, draft.systems))})`
      : refLabel(draft, resolveDispatchSoftware(s8, draft.systems)) ||
        (s8.dispatchProvider === "none" ? "We do not use dispatch software" : "—");

  const phone =
    s8.phoneProvider === "not_sure"
      ? "Not sure"
      : refLabel(draft, resolvePhoneSoftware(s8, draft.systems)) || "—";

  const ownerLabel =
    CONNECTION_OWNER_OPTIONS.find((o) => o.id === s8.connectionOwnerMode)?.label ?? "—";

  const fallbackLabel =
    FAILURE_FALLBACK_OPTIONS.find((o) => o.id === s8.failureFallback)?.label ?? "—";

  const caps = s8.authorizedCapabilities
    .filter((id) => id !== "other")
    .map((id) => INTEGRATION_CAPABILITY_OPTIONS.find((o) => o.id === id)?.label ?? id);

  return (
    <dl className="space-y-4 text-sm">
      <div>
        <dt className="font-medium text-[var(--color-alexander-navy)]">CRM / field service</dt>
        <dd className="text-[var(--color-alexander-muted)]">{formatCrmSelection(s8)}</dd>
      </div>
      <div>
        <dt className="font-medium text-[var(--color-alexander-navy)]">Scheduling</dt>
        <dd className="text-[var(--color-alexander-muted)]">{scheduling}</dd>
      </div>
      <div>
        <dt className="font-medium text-[var(--color-alexander-navy)]">Dispatch</dt>
        <dd className="text-[var(--color-alexander-muted)]">{dispatch}</dd>
      </div>
      <div>
        <dt className="font-medium text-[var(--color-alexander-navy)]">Phone system</dt>
        <dd className="text-[var(--color-alexander-muted)]">{phone}</dd>
      </div>
      <div>
        <dt className="font-medium text-[var(--color-alexander-navy)]">Authorized capabilities</dt>
        <dd className="text-[var(--color-alexander-muted)]">
          {caps.length > 0 ? caps.join("; ") : "—"}
          {s8.authorizedCapabilityOther.trim() ? `; Other: ${s8.authorizedCapabilityOther.trim()}` : ""}
        </dd>
      </div>
      <div>
        <dt className="font-medium text-[var(--color-alexander-navy)]">Connection owner</dt>
        <dd className="text-[var(--color-alexander-muted)]">
          {ownerLabel}
          {s8.connectionOwnerMode === "someone_else" && (
            <span>
              {" "}
              — {s8.connectionOwnerName}, {s8.connectionOwnerEmail}, {s8.connectionOwnerPhone}
            </span>
          )}
        </dd>
      </div>
      <div>
        <dt className="font-medium text-[var(--color-alexander-navy)]">Connection notice</dt>
        <dd className="text-[var(--color-alexander-muted)]">
          {norm.connection_notice_acknowledged ? "Acknowledged" : "Not acknowledged"}
        </dd>
      </div>
      <div>
        <dt className="font-medium text-[var(--color-alexander-navy)]">Software failure fallback</dt>
        <dd className="text-[var(--color-alexander-muted)]">
          {fallbackLabel}
          {norm.failure_fallback.custom_rule ? ` — ${norm.failure_fallback.custom_rule}` : ""}
        </dd>
      </div>
      {norm.final_operating_notes && (
        <div>
          <dt className="font-medium text-[var(--color-alexander-navy)]">Final operating notes</dt>
          <dd className="text-[var(--color-alexander-muted)]">{norm.final_operating_notes}</dd>
        </div>
      )}
    </dl>
  );
}
