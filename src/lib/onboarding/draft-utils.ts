import { createDefaultDraft, type Contact, type OnboardingDraft, SCHEMA_VERSION } from "./types";
import { hasAnyOpenOfficeDay } from "./schedule";

export type RedisOnboardingDraft = {
  schemaVersion: number;
  updatedAt: string;
  currentRoute: string;
  currentSection: number;
  completedSections: number[];
  data: {
    navigation: OnboardingDraft["navigation"];
    section1: OnboardingDraft["section1"];
    section2: OnboardingDraft["section2"];
    section3: OnboardingDraft["section3"];
    contacts: OnboardingDraft["contacts"];
  };
};

/**
 * Add a section id to the banked `completedSections` set. Monotonic and
 * idempotent: a section that is already complete never moves or
 * duplicates, and ordering is always ascending regardless of the order
 * sections were completed in (a user may complete Section 2 before
 * ever revisiting an already-completed Section 1).
 */
export function addCompletedSection(completedSections: number[], sectionId: number): number[] {
  if (completedSections.includes(sectionId)) return completedSections;
  return [...completedSections, sectionId].sort((a, b) => a - b);
}

export function draftTimestamp(draft: OnboardingDraft): number {
  if (!hasDraftContent(draft)) return 0;
  const t = Date.parse(draft.updatedAt);
  return Number.isFinite(t) ? t : 0;
}

function servicePolicyMapHasContent(map: Record<string, { policy: string; condition: string }>): boolean {
  return Object.values(map).some((entry) => entry.policy !== "" || entry.condition.trim() !== "");
}

function section2HasContent(s2: OnboardingDraft["section2"]): boolean {
  if (servicePolicyMapHasContent(s2.plumbingServices)) return true;
  if (servicePolicyMapHasContent(s2.diagnosticServices)) return true;
  if (servicePolicyMapHasContent(s2.customerPropertyTypes)) return true;
  if (s2.customerSuppliedMaterialsPolicy) return true;
  if (s2.customerSuppliedMaterialsCondition.trim()) return true;
  if (s2.correctiveWorkPolicy) return true;
  if (s2.correctiveWorkCondition.trim()) return true;
  if (s2.serviceAreaDefinitionMode) return true;
  if (s2.serviceAreaZipCodes.length > 0) return true;
  if (s2.serviceAreaCities.length > 0) return true;
  if (s2.serviceAreaDistance.address.trim() || s2.serviceAreaDistance.radiusMiles.trim()) return true;
  if (s2.excludedTerritory.trim()) return true;
  if (s2.hasConditionalTerritory) return true;
  if (s2.conditionalTerritories.length > 0) return true;
  if (s2.afterHoursAreaMode) return true;
  if (s2.afterHoursServiceArea.trim()) return true;
  return false;
}

function contactHasContent(contact: Contact): boolean {
  if (contact.nameOrRole.trim()) return true;
  if (contact.phone.trim()) return true;
  if (contact.callCategories.length > 0) return true;
  if (contact.otherCategory.trim()) return true;
  if (hasAnyOpenOfficeDay(contact.availability)) return true;
  return false;
}

function section3HasContent(s3: OnboardingDraft["section3"], contacts: Contact[]): boolean {
  if (Object.values(s3.emergencyClassifications).some((c) => c !== "")) return true;
  if (s3.dispatchApproval.length > 0) return true;
  if (s3.dispatchApprovalOtherDetail.trim()) return true;
  if (Object.values(s3.afterHoursDisposition).some((v) => v !== "")) return true;
  if (s3.emergencyServiceMode) return true;
  if (hasAnyOpenOfficeDay(s3.emergencyServiceSchedule)) return true;
  if (s3.hasBackupContact) return true;
  if (s3.nobodyRespondsFallback) return true;
  if (s3.nobodyRespondsCustomRule.trim()) return true;
  if (s3.retryRule) return true;
  if (s3.retryCustomRule.trim()) return true;
  if (s3.capacityMode) return true;
  if (s3.reservedCapacityText.trim()) return true;
  if (s3.overrideConditionsText.trim()) return true;
  if (s3.approverContactId.trim()) return true;
  if (contacts.some(contactHasContent)) return true;
  return false;
}

export function hasDraftContent(draft: OnboardingDraft): boolean {
  const s = draft.section1;
  if (s.customerFacingName.trim()) return true;
  if (s.legalName.trim()) return true;
  if (s.mainPhone.trim()) return true;
  if (s.website.trim()) return true;
  if (s.approvedClaims.length > 0) return true;
  if (s.otherApprovedClaim.trim()) return true;
  if (s.licensingDetails.trim()) return true;
  if (s.forbiddenClaims.trim()) return true;
  if (s.recurringAvailabilityNotes.trim()) return true;
  if (s.answeringMode) return true;
  if (section2HasContent(draft.section2)) return true;
  if (section3HasContent(draft.section3, draft.contacts)) return true;
  if (draft.navigation.completedSections.length > 0) return true;
  if (draft.navigation.stage !== "welcome") return true;
  return false;
}

export function mergeWithDefaults(partial: Partial<OnboardingDraft>): OnboardingDraft {
  const base = createDefaultDraft();
  return {
    ...base,
    ...partial,
    schemaVersion: SCHEMA_VERSION,
    navigation: { ...base.navigation, ...partial.navigation },
    section1: { ...base.section1, ...partial.section1 },
    section2: { ...base.section2, ...partial.section2 },
    section3: { ...base.section3, ...partial.section3 },
    contacts: partial.contacts ?? base.contacts,
  };
}

export function toRedisDraft(draft: OnboardingDraft, currentRoute: string): RedisOnboardingDraft {
  return {
    schemaVersion: draft.schemaVersion,
    updatedAt: draft.updatedAt,
    currentRoute,
    currentSection: draft.navigation.sectionId,
    completedSections: draft.navigation.completedSections,
    data: {
      navigation: draft.navigation,
      section1: draft.section1,
      section2: draft.section2,
      section3: draft.section3,
      contacts: draft.contacts,
    },
  };
}

export function fromRedisDraft(redis: RedisOnboardingDraft): OnboardingDraft {
  return mergeWithDefaults({
    schemaVersion: redis.schemaVersion,
    updatedAt: redis.updatedAt,
    currentRoute: redis.currentRoute,
    navigation: redis.data.navigation,
    section1: redis.data.section1,
    section2: redis.data.section2,
    section3: redis.data.section3,
    contacts: redis.data.contacts,
  });
}

export type ReconcileResult = {
  draft: OnboardingDraft;
  /** Winner for syncing the other store */
  winner: "local" | "server" | "default";
  needsServerSync: boolean;
  needsLocalSync: boolean;
};

export function reconcileDrafts(
  local: OnboardingDraft,
  server: OnboardingDraft | null,
): ReconcileResult {
  const localTs = draftTimestamp(local);
  const serverTs = server ? draftTimestamp(server) : 0;
  const localHas = hasDraftContent(local);
  const serverHas = server ? hasDraftContent(server) : false;

  if (!localHas && !serverHas) {
    return {
      draft: createDefaultDraft(),
      winner: "default",
      needsServerSync: false,
      needsLocalSync: false,
    };
  }

  if (localHas && !serverHas) {
    return {
      draft: local,
      winner: "local",
      needsServerSync: true,
      needsLocalSync: false,
    };
  }

  if (!localHas && serverHas && server) {
    return {
      draft: server,
      winner: "server",
      needsServerSync: false,
      needsLocalSync: true,
    };
  }

  if (server && localTs >= serverTs) {
    return {
      draft: local,
      winner: "local",
      needsServerSync: localTs > serverTs,
      needsLocalSync: false,
    };
  }

  if (server) {
    return {
      draft: server,
      winner: "server",
      needsServerSync: false,
      needsLocalSync: true,
    };
  }

  return {
    draft: local,
    winner: "local",
    needsServerSync: true,
    needsLocalSync: false,
  };
}

/** Prevent autosave from pushing an empty template over a populated draft. */
