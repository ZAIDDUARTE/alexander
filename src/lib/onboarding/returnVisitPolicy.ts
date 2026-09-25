import type { Section6Data } from "./types";

/** Canonical return-visit rule applies when Q83 or Q84 schedules a return visit. */
export function returnVisitPolicyApplies(data: Section6Data): boolean {
  return (
    data.previousWorkInitialAction === "schedule_return_visit" ||
    data.repeatCallbackAction === "schedule_another_return"
  );
}

export function returnVisitEligibilityIsConfigured(data: Section6Data): boolean {
  return data.returnVisitEligibilityRule.trim().length > 0;
}
