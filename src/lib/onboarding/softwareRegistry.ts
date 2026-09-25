import {
  providerLabel,
  type AdditionalSoftwareCategoryId,
  type CrmFsmProvider,
  type DispatchProvider,
  type PhoneProvider,
  type SchedulingProvider,
} from "./section8Catalog";
import type { Section8Data, SoftwareRecord, SoftwareRole } from "./types";

export function createSoftwareId(): string {
  return `sw-${Math.random().toString(36).slice(2, 10)}`;
}

export function getSoftwareById(systems: SoftwareRecord[], id: string): SoftwareRecord | undefined {
  return systems.find((s) => s.id === id);
}

export function upsertRoleSoftware(
  systems: SoftwareRecord[],
  existingId: string,
  role: SoftwareRole,
  providerKey: string,
  customName?: string,
): { systems: SoftwareRecord[]; id: string } {
  const trimmedCustom = customName?.trim() ?? "";
  const displayName =
    providerKey === "custom" ? trimmedCustom : providerLabel(providerKey, trimmedCustom);

  if (existingId) {
    const idx = systems.findIndex((s) => s.id === existingId);
    if (idx >= 0) {
      const next = [...systems];
      next[idx] = {
        ...next[idx],
        role,
        providerKey,
        displayName: displayName || next[idx].displayName,
        customName: providerKey === "custom" ? trimmedCustom || null : null,
      };
      return { systems: next, id: existingId };
    }
  }

  const id = createSoftwareId();
  return {
    systems: [
      ...systems,
      {
        id,
        role,
        providerKey,
        displayName: displayName || providerKey,
        customName: providerKey === "custom" ? trimmedCustom || null : null,
        desiredAccess: null,
      },
    ],
    id,
  };
}

export function upsertAdditionalSoftware(
  systems: SoftwareRecord[],
  existingId: string,
  categoryId: AdditionalSoftwareCategoryId,
  systemName: string,
  desiredAccess: string,
): { systems: SoftwareRecord[]; id: string } {
  const name = systemName.trim();
  if (existingId) {
    const idx = systems.findIndex((s) => s.id === existingId);
    if (idx >= 0) {
      const next = [...systems];
      next[idx] = {
        ...next[idx],
        role: "additional",
        providerKey: categoryId,
        displayName: name || next[idx].displayName,
        customName: categoryId === "other" ? name || null : null,
        desiredAccess: desiredAccess.trim() || null,
      };
      return { systems: next, id: existingId };
    }
  }
  const id = createSoftwareId();
  return {
    systems: [
      ...systems,
      {
        id,
        role: "additional",
        providerKey: categoryId,
        displayName: name || categoryId,
        customName: categoryId === "other" ? name || null : null,
        desiredAccess: desiredAccess.trim() || null,
      },
    ],
    id,
  };
}

/** Resolved CRM/FSM software for Q104 (null when none or unresolved). */
export function resolveCrmSoftware(
  section8: Section8Data,
  systems: SoftwareRecord[],
): SoftwareRecord | null {
  if (!section8.crmFsmProvider || section8.crmFsmProvider === "none") return null;
  if (section8.crmFsmProvider === "custom") {
    if (!section8.crmFsmCustomName.trim()) return null;
  }
  const id = section8.crmFsmSoftwareId.trim();
  if (!id) return null;
  return getSoftwareById(systems, id) ?? null;
}

/**
 * Q105 resolution. `same_as_crm` references the Q104 software record.
 */
export function resolveSchedulingSoftware(
  section8: Section8Data,
  systems: SoftwareRecord[],
): SoftwareRecord | null {
  if (!section8.schedulingProvider || section8.schedulingProvider === "none") return null;
  if (section8.schedulingProvider === "same_as_crm") {
    return resolveCrmSoftware(section8, systems);
  }
  if (section8.schedulingProvider === "custom" && !section8.schedulingCustomName.trim()) {
    return null;
  }
  const id = section8.schedulingSoftwareId.trim();
  if (!id) return null;
  return getSoftwareById(systems, id) ?? null;
}

/**
 * Q106 resolution. `same_as_scheduling` references the software resolved by Q105
 * (which may itself reference Q104).
 */
export function resolveDispatchSoftware(
  section8: Section8Data,
  systems: SoftwareRecord[],
): SoftwareRecord | null {
  if (!section8.dispatchProvider || section8.dispatchProvider === "none") return null;
  if (section8.dispatchProvider === "same_as_scheduling") {
    return resolveSchedulingSoftware(section8, systems);
  }
  if (section8.dispatchProvider === "custom" && !section8.dispatchCustomName.trim()) {
    return null;
  }
  const id = section8.dispatchSoftwareId.trim();
  if (!id) return null;
  return getSoftwareById(systems, id) ?? null;
}

export function resolvePhoneSoftware(
  section8: Section8Data,
  systems: SoftwareRecord[],
): SoftwareRecord | null {
  if (!section8.phoneProvider || section8.phoneProvider === "not_sure") return null;
  if (section8.phoneProvider === "custom" && !section8.phoneCustomName.trim()) return null;
  const id = section8.phoneSoftwareId.trim();
  if (!id) return null;
  return getSoftwareById(systems, id) ?? null;
}

export function crmAllowsSchedulingSameAs(section8: Section8Data): boolean {
  return Boolean(section8.crmFsmProvider && section8.crmFsmProvider !== "none");
}

export function schedulingAllowsDispatchSameAs(section8: Section8Data, systems: SoftwareRecord[]): boolean {
  if (!section8.schedulingProvider || section8.schedulingProvider === "none") return false;
  if (section8.schedulingProvider === "same_as_crm") {
    return crmAllowsSchedulingSameAs(section8);
  }
  return Boolean(resolveSchedulingSoftware(section8, systems));
}

export function activeSoftwareIds(section8: Section8Data): Set<string> {
  const ids = new Set<string>();
  if (section8.crmFsmSoftwareId.trim()) ids.add(section8.crmFsmSoftwareId.trim());
  if (
    section8.schedulingProvider &&
    section8.schedulingProvider !== "same_as_crm" &&
    section8.schedulingProvider !== "none"
  ) {
    if (section8.schedulingSoftwareId.trim()) ids.add(section8.schedulingSoftwareId.trim());
  }
  if (
    section8.dispatchProvider &&
    section8.dispatchProvider !== "same_as_scheduling" &&
    section8.dispatchProvider !== "none"
  ) {
    if (section8.dispatchSoftwareId.trim()) ids.add(section8.dispatchSoftwareId.trim());
  }
  if (section8.phoneProvider && section8.phoneProvider !== "not_sure") {
    if (section8.phoneSoftwareId.trim()) ids.add(section8.phoneSoftwareId.trim());
  }
  for (const card of section8.additionalSoftwareCards) {
    if (card.softwareId.trim()) ids.add(card.softwareId.trim());
  }
  return ids;
}

export type ResolvedSelections = {
  crm: CrmFsmProvider;
  scheduling: SchedulingProvider;
  dispatch: DispatchProvider;
  phone: PhoneProvider;
};
