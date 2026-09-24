import { createDefaultDraft, type OnboardingDraft, SCHEMA_VERSION } from "./types";
import { migrateDraft } from "./migrate";

const STORAGE_KEY = "alexander_onboarding_draft_v1";

export type SaveStatus =
  | "idle"
  | "saving"
  | "saved"
  | "error"
  | "server-pending";

export function loadLocalDraft(): OnboardingDraft {
  if (typeof window === "undefined") {
    return createDefaultDraft();
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultDraft();
    const parsed = JSON.parse(raw) as unknown;
    // Route every load through the migration pipeline so an older
    // schema version upgrades customer answers forward instead of
    // being silently discarded.
    return migrateDraft(parsed);
  } catch {
    return createDefaultDraft();
  }
}

export function saveLocalDraft(draft: OnboardingDraft): void {
  if (typeof window === "undefined") return;
  const toSave: OnboardingDraft = {
    ...draft,
    schemaVersion: SCHEMA_VERSION,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
}

/** @deprecated use loadLocalDraft */
export function loadDraft(): OnboardingDraft {
  return loadLocalDraft();
}

/** @deprecated use saveLocalDraft */
export function saveDraft(draft: OnboardingDraft): void {
  saveLocalDraft(draft);
}

export const localPersistence = {
  load: loadLocalDraft,
  save: saveLocalDraft,
};
