import type { Section1Data } from "../types";
import type { WeeklyOfficeSchedule } from "../schedule";

/**
 * The normalized "Company Truth" shape for Section 1: what actually
 * gets exported/submitted, as opposed to what is convenient to keep
 * sitting in the editable draft.
 *
 * Strategy (chosen over clearing on toggle): hidden conditional values
 * are RETAINED in the raw draft so the UX is forgiving — a user who
 * selects "Other", types an answer, then changes their mind and
 * re-selects "Other" a moment later gets their text back instead of
 * having it silently wiped. But those retained values must never leak
 * into the normalized output while their parent condition is false.
 * This function is the single, deterministic boundary that enforces
 * that rule.
 */
export type NormalizedSection1 = Omit<Section1Data, "otherApprovedClaim" | "answeringSchedule"> & {
  /** null when Q5 does not include "Other" — Q6 does not apply. */
  otherApprovedClaim: string | null;
  /** null when Q11 is not "Only during specific hours" — Q12 does not apply. */
  answeringSchedule: WeeklyOfficeSchedule | null;
};

export function normalizeSection1(data: Section1Data): NormalizedSection1 {
  const includesOther = data.approvedClaims.includes("other");
  const isSpecificHours = data.answeringMode === "specific_hours";

  return {
    ...data,
    otherApprovedClaim: includesOther ? data.otherApprovedClaim.trim() : null,
    answeringSchedule: isSpecificHours ? data.answeringSchedule : null,
  };
}
