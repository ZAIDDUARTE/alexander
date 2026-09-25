import { NON_SERVICE_CALL_TYPE_ROWS } from "../section6Catalog";
import { returnVisitPolicyApplies } from "../returnVisitPolicy";
import type { Contact, Section6Data } from "../types";
import { contactHasIdentity } from "../types";

export type NormalizedNonServiceCallPolicy = {
  callTypeId: string;
  callTypeLabel: string;
  disposition: string | null;
  contactId: string | null;
};

/**
 * Customer-care policy output for downstream configuration.
 * Q89 restrictions apply even when Q88 permits using available history.
 */
export type NormalizedSection6 = {
  previousWorkInitialAction: string | null;
  returnVisitEligibilityRule: string | null;
  previousWorkCustomRule: string | null;
  repeatCallbackAction: string | null;
  /** Reuses Q83 return-visit eligibility when Q84 schedules another return visit. */
  repeatCallbackUsesReturnVisitRule: boolean;
  escalationTriggers: string[];
  escalationTriggerOther: string | null;
  forbiddenUnhappyPromises: string[];
  forbiddenUnhappyPromiseOther: string | null;
  nonServiceCallPolicies: NormalizedNonServiceCallPolicy[];
  customerHistoryPolicy: string | null;
  customerHistoryCustomRule: string | null;
  restrictedInformation: string[];
  restrictedInformationOther: string | null;
  additionalServicePolicy: string | null;
  additionalServiceCustomRule: string | null;
  unusualCallNotes: string | null;
};

function resolveActiveContactId(contactId: string, contacts: Contact[]): string | null {
  const trimmed = contactId.trim();
  if (!trimmed) return null;
  const contact = contacts.find((c) => c.id === trimmed);
  if (!contact || !contactHasIdentity(contact)) return null;
  return trimmed;
}

export function normalizeSection6(data: Section6Data, contacts: Contact[]): NormalizedSection6 {
  const action = data.previousWorkInitialAction || null;
  const repeatAction = data.repeatCallbackAction || null;
  const returnVisitRule = returnVisitPolicyApplies(data)
    ? data.returnVisitEligibilityRule.trim() || null
    : null;
  const previousWorkCustom =
    action === "custom" ? data.previousWorkCustomRule.trim() || null : null;

  const repeatUsesReturn =
    repeatAction === "schedule_another_return" && returnVisitRule !== null;

  const escalationOther =
    data.escalationTriggers.includes("other")
      ? data.escalationTriggerOther.trim() || null
      : null;

  const forbiddenOther =
    data.forbiddenUnhappyPromises.includes("other")
      ? data.forbiddenUnhappyPromiseOther.trim() || null
      : null;

  const nonServiceCallPolicies = NON_SERVICE_CALL_TYPE_ROWS.map((row) => {
    const policy = data.nonServiceCallPolicies[row.id];
    const disposition = policy?.disposition ?? "";
    const contactId =
      disposition === "send_specific"
        ? resolveActiveContactId(policy?.contactId ?? "", contacts)
        : null;
    return {
      callTypeId: row.id,
      callTypeLabel: row.label,
      disposition: disposition || null,
      contactId,
    };
  });

  const historyPolicy = data.customerHistoryPolicy || null;
  const historyCustom =
    historyPolicy === "custom" ? data.customerHistoryCustomRule.trim() || null : null;

  const restrictedOther =
    data.restrictedInformation.includes("other")
      ? data.restrictedInformationOther.trim() || null
      : null;

  const salesPolicy = data.additionalServicePolicy || null;
  const salesCustom =
    salesPolicy === "custom" ? data.additionalServiceCustomRule.trim() || null : null;

  const notes = data.unusualCallNotes.trim() || null;

  return {
    previousWorkInitialAction: action,
    returnVisitEligibilityRule: returnVisitRule,
    previousWorkCustomRule: previousWorkCustom,
    repeatCallbackAction: repeatAction,
    repeatCallbackUsesReturnVisitRule: repeatUsesReturn,
    escalationTriggers: [...data.escalationTriggers],
    escalationTriggerOther: escalationOther,
    forbiddenUnhappyPromises: [...data.forbiddenUnhappyPromises],
    forbiddenUnhappyPromiseOther: forbiddenOther,
    nonServiceCallPolicies,
    customerHistoryPolicy: historyPolicy,
    customerHistoryCustomRule: historyCustom,
    restrictedInformation: [...data.restrictedInformation],
    restrictedInformationOther: restrictedOther,
    additionalServicePolicy: salesPolicy,
    additionalServiceCustomRule: salesCustom,
    unusualCallNotes: notes,
  };
}
