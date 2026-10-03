import { DAYS, type WeeklyOfficeSchedule } from "./schedule";
import type { Contact, OnboardingDraft } from "./types";

export const EMERGENCY_COVERAGE_WARNING =
  "Emergency service is set to 24/7, but your current emergency contact coverage does not cover all hours. Alexander will use the configured fallback/callback behavior when no contact is available.";

/** A day covers the full required 24 hours when it is open from 00:00 through the latest selectable end. */
function dayCoversFullDay(schedule: WeeklyOfficeSchedule, day: (typeof DAYS)[number]): boolean {
  const entry = schedule[day];
  return !entry.closed && entry.start === "00:00" && entry.end === "23:30";
}

/** True when primary + optional backup together cover every day end-to-end. */
function contactsCoverAllHours(contacts: Contact[]): boolean {
  if (contacts.length === 0) return false;
  return DAYS.every((day) => contacts.some((contact) => dayCoversFullDay(contact.availability, day)));
}

/**
 * Non-blocking final-review warning only.
 * Shown when emergency service is 24/7 but configured contacts do not cover all hours.
 */
export function emergencyCoverageGapWarning(draft: OnboardingDraft): string | null {
  if (draft.section3.emergencyServiceMode !== "24_7") return null;

  const contacts: Contact[] = [];
  const primary = draft.contacts.find((c) => c.id === draft.section3.primaryContactId);
  if (primary) contacts.push(primary);
  if (draft.section3.hasBackupContact === "yes") {
    const backup = draft.contacts.find((c) => c.id === draft.section3.backupContactId);
    if (backup && backup.id !== primary?.id) contacts.push(backup);
  }

  if (contactsCoverAllHours(contacts)) return null;
  return EMERGENCY_COVERAGE_WARNING;
}
