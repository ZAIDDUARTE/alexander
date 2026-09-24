import type { Section1Data } from "../types";
import { hasAnyOpenOfficeDay, isOfficeScheduleValid, isServiceScheduleValid } from "../schedule";
import { isValidE164 } from "../phone";

type ProgressUnit = {
  applicable: boolean;
  complete: boolean;
};

/**
 * Deterministic Section 1 completion units.
 *
 * Only questions that are currently applicable count toward the
 * denominator — e.g. Q6 only counts while Q5 includes "Other", and Q12
 * only counts while Q11 is "Only during specific hours". Optional
 * questions never affect this calculation.
 */
export function getSection1ProgressUnits(data: Section1Data): ProgressUnit[] {
  const showOtherClaim = data.approvedClaims.includes("other");
  const showAnsweringSchedule = data.answeringMode === "specific_hours";

  return [
    // Q1 — customer-facing name (required)
    { applicable: true, complete: Boolean(data.customerFacingName.trim()) },
    // Q3 — main business phone (required)
    { applicable: true, complete: isValidE164(data.mainPhone.trim()) },
    // Q5 — approved claims (required)
    { applicable: true, complete: data.approvedClaims.length > 0 },
    // Q6 — other approved claim (conditional on Q5 = Other)
    {
      applicable: showOtherClaim,
      complete: showOtherClaim && Boolean(data.otherApprovedClaim.trim()),
    },
    // Q9 — office hours (required weekly schedule)
    { applicable: true, complete: isOfficeScheduleValid(data.officeHours) },
    // Q10 — service hours (required weekly schedule)
    { applicable: true, complete: isServiceScheduleValid(data.serviceHours) },
    // Q11 — answering mode (required)
    { applicable: true, complete: data.answeringMode !== "" },
    // Q12 — answering schedule (conditional on Q11 = specific hours)
    {
      applicable: showAnsweringSchedule,
      complete:
        showAnsweringSchedule &&
        isOfficeScheduleValid(data.answeringSchedule) &&
        hasAnyOpenOfficeDay(data.answeringSchedule),
    },
  ];
}

/**
 * Fraction (0–1) of applicable Section 1 questions that are currently
 * complete. Used to fill the live progress rail for the active section.
 * This is derived purely from onboarding state, never from the DOM.
 */
export function getSection1Progress(data: Section1Data): number {
  const units = getSection1ProgressUnits(data).filter((u) => u.applicable);
  if (units.length === 0) return 0;
  const completed = units.filter((u) => u.complete).length;
  return completed / units.length;
}
