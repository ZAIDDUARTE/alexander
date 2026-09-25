import { INTEGRATION_CAPABILITY_OPTIONS, providerLabel } from "../section8Catalog";
import {
  activeSoftwareIds,
  resolveCrmSoftware,
  resolveDispatchSoftware,
  resolvePhoneSoftware,
  resolveSchedulingSoftware,
} from "../softwareRegistry";
import type { Section8Data, SoftwareRecord } from "../types";

export type NormalizedSoftwareRef = {
  software_id: string;
  provider_key: string;
  display_name: string;
  custom_name: string | null;
  desired_access: string | null;
};

export type NormalizedIntegrationProfile = {
  crm_fsm: NormalizedSoftwareRef | null;
  scheduling_system: NormalizedSoftwareRef | null;
  dispatch_system: NormalizedSoftwareRef | null;
  phone_system: NormalizedSoftwareRef | null;
  additional_systems: NormalizedSoftwareRef[];
  authorized_capabilities: string[];
  authorized_capability_other: string | null;
  connection_owner: {
    mode: "self_authorized" | "not_authorized" | "someone_else" | null;
    person: { name: string; email: string; phone: string } | null;
  };
  connection_notice_acknowledged: boolean;
  failure_fallback: {
    mode: string | null;
    custom_rule: string | null;
  };
  final_operating_notes: string | null;
};

function toRef(record: SoftwareRecord | null): NormalizedSoftwareRef | null {
  if (!record) return null;
  return {
    software_id: record.id,
    provider_key: record.providerKey,
    display_name: record.displayName,
    custom_name: record.customName,
    desired_access: record.desiredAccess,
  };
}

function normalizeCapabilities(data: Section8Data): { caps: string[]; other: string | null } {
  const caps = data.authorizedCapabilities.filter((c) => c !== "other");
  const other =
    data.authorizedCapabilities.includes("other") && data.authorizedCapabilityOther.trim()
      ? data.authorizedCapabilityOther.trim()
      : null;
  return { caps, other };
}

export function normalizeSection8(
  data: Section8Data,
  systems: SoftwareRecord[],
): NormalizedIntegrationProfile {
  const activeIds = activeSoftwareIds(data);
  const activeSystems = systems.filter((s) => activeIds.has(s.id));

  const additional: NormalizedSoftwareRef[] = [];
  const positiveCategories = data.additionalSoftwareCategories.filter((c) => c !== "none");
  for (const cat of positiveCategories) {
    const card = data.additionalSoftwareCards.find((c) => c.categoryId === cat);
    if (!card?.softwareId.trim()) continue;
    const record = activeSystems.find((s) => s.id === card.softwareId.trim());
    if (record) additional.push(toRef(record)!);
  }

  const { caps, other } = normalizeCapabilities(data);

  let ownerPerson: { name: string; email: string; phone: string } | null = null;
  if (data.connectionOwnerMode === "someone_else") {
    ownerPerson = {
      name: data.connectionOwnerName.trim(),
      email: data.connectionOwnerEmail.trim(),
      phone: data.connectionOwnerPhone.trim(),
    };
  }

  const customFallback =
    data.failureFallback === "custom" && data.failureFallbackCustom.trim()
      ? data.failureFallbackCustom.trim()
      : null;

  return {
    crm_fsm: toRef(resolveCrmSoftware(data, systems)),
    scheduling_system: toRef(resolveSchedulingSoftware(data, systems)),
    dispatch_system: toRef(resolveDispatchSoftware(data, systems)),
    phone_system: toRef(resolvePhoneSoftware(data, systems)),
    additional_systems: additional,
    authorized_capabilities: caps.map(
      (id) => INTEGRATION_CAPABILITY_OPTIONS.find((o) => o.id === id)?.label ?? id,
    ),
    authorized_capability_other: other,
    connection_owner: {
      mode:
        data.connectionOwnerMode === ""
          ? null
          : (data.connectionOwnerMode as NormalizedIntegrationProfile["connection_owner"]["mode"]),
      person: ownerPerson,
    },
    connection_notice_acknowledged: data.connectionNoticeAcknowledged,
    failure_fallback: {
      mode: data.failureFallback || null,
      custom_rule: customFallback,
    },
    final_operating_notes: data.finalOperatingNotes.trim() ? data.finalOperatingNotes.trim() : null,
  };
}

/** Human-readable CRM label for review UI. */
export function formatCrmSelection(data: Section8Data): string {
  if (!data.crmFsmProvider) return "Not answered";
  if (data.crmFsmProvider === "none") return "We do not use one";
  if (data.crmFsmProvider === "custom") return data.crmFsmCustomName.trim() || "Another system";
  return providerLabel(data.crmFsmProvider);
}
