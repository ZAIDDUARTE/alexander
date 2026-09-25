import { NON_SERVICE_CALL_TYPE_ROWS } from "../section6Catalog";
import { validateSection6 } from "../validation/section6";
import type { Contact, Section6Data } from "../types";
import { contactHasIdentity } from "../types";

type ProgressUnit = { id: string; applicable: boolean; complete: boolean };

function q83Complete(data: Section6Data): boolean {
  if (!data.previousWorkInitialAction) return false;
  if (
    data.previousWorkInitialAction === "schedule_return_visit" &&
    !data.returnVisitEligibilityRule.trim()
  ) {
    return false;
  }
  return true;
}

function q84Complete(data: Section6Data): boolean {
  if (!data.repeatCallbackAction) return false;
  if (data.repeatCallbackAction === "schedule_another_return" && !data.returnVisitEligibilityRule.trim()) {
    return false;
  }
  return true;
}

function q85Complete(data: Section6Data): boolean {
  if (data.escalationTriggers.length === 0) return false;
  if (data.escalationTriggers.includes("other") && !data.escalationTriggerOther.trim()) {
    return false;
  }
  return true;
}

function q86Complete(data: Section6Data): boolean {
  if (data.forbiddenUnhappyPromises.length === 0) return false;
  if (data.forbiddenUnhappyPromises.includes("other") && !data.forbiddenUnhappyPromiseOther.trim()) {
    return false;
  }
  return true;
}

function q87Complete(data: Section6Data, contacts: Contact[]): boolean {
  for (const row of NON_SERVICE_CALL_TYPE_ROWS) {
    const policy = data.nonServiceCallPolicies[row.id];
    if (!policy?.disposition) return false;
    if (policy.disposition === "send_specific") {
      const contact = contacts.find((c) => c.id === policy.contactId);
      if (!contact || !contactHasIdentity(contact)) return false;
    }
  }
  return true;
}

function q88Complete(data: Section6Data): boolean {
  return Boolean(data.customerHistoryPolicy);
}

function q89Complete(data: Section6Data): boolean {
  if (data.restrictedInformation.length === 0) return false;
  if (data.restrictedInformation.includes("other") && !data.restrictedInformationOther.trim()) {
    return false;
  }
  return true;
}

function q90Complete(data: Section6Data): boolean {
  return Boolean(data.additionalServicePolicy);
}

function q91Complete(): boolean {
  return true;
}

export function getSection6ProgressUnits(
  data: Section6Data,
  contacts: Contact[],
): ProgressUnit[] {
  return [
    { id: "q83", applicable: true, complete: q83Complete(data) },
    { id: "q84", applicable: true, complete: q84Complete(data) },
    { id: "q85", applicable: true, complete: q85Complete(data) },
    { id: "q86", applicable: true, complete: q86Complete(data) },
    { id: "q87", applicable: true, complete: q87Complete(data, contacts) },
    { id: "q88", applicable: true, complete: q88Complete(data) },
    { id: "q89", applicable: true, complete: q89Complete(data) },
    { id: "q90", applicable: true, complete: q90Complete(data) },
    { id: "q91", applicable: true, complete: q91Complete() },
  ];
}

export function getSection6Progress(data: Section6Data, contacts: Contact[]): number {
  const units = getSection6ProgressUnits(data, contacts).filter((u) => u.applicable);
  if (units.length === 0) return 0;
  const done = units.filter((u) => u.complete).length;
  return done / units.length;
}

/** Full validity mirrors form submission (state-derived, not DOM). */
export function section6ProgressIsFullyValid(data: Section6Data, contacts: Contact[]): boolean {
  return Object.keys(validateSection6(data, contacts)).length === 0;
}
