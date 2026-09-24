import { createDefaultDraft, type OnboardingDraft, SCHEMA_VERSION } from "./types";

export type RedisOnboardingDraft = {
  schemaVersion: number;
  updatedAt: string;
  currentRoute: string;
  currentSection: number;
  completedSections: number[];
  data: {
    navigation: OnboardingDraft["navigation"];
    section1: OnboardingDraft["section1"];
  };
};

export function draftTimestamp(draft: OnboardingDraft): number {
  if (!hasDraftContent(draft)) return 0;
  const t = Date.parse(draft.updatedAt);
  return Number.isFinite(t) ? t : 0;
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
