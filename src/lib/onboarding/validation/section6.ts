import {
  ADDITIONAL_SERVICE_POLICY_OPTIONS,
  CUSTOMER_HISTORY_POLICY_OPTIONS,
  ESCALATION_TRIGGER_OPTIONS,
  FORBIDDEN_UNHAPPY_PROMISE_OPTIONS,
  NON_SERVICE_CALL_TYPE_ROWS,
  NON_SERVICE_DISPOSITION_OPTIONS,
  PREVIOUS_WORK_INITIAL_ACTION_OPTIONS,
  REPEAT_CALLBACK_ACTION_OPTIONS,
  RESTRICTED_INFORMATION_OPTIONS,
} from "../section6Catalog";
import {
  returnVisitEligibilityIsConfigured,
  returnVisitPolicyApplies,
} from "../returnVisitPolicy";
import type { Contact, Section6Data } from "../types";
import { contactHasIdentity } from "../types";

export type FieldErrors = Partial<Record<string, string>>;

export { returnVisitEligibilityIsConfigured, returnVisitPolicyApplies } from "../returnVisitPolicy";

const PREVIOUS_WORK_IDS = new Set(PREVIOUS_WORK_INITIAL_ACTION_OPTIONS.map((o) => o.id));
const REPEAT_CALLBACK_IDS = new Set(REPEAT_CALLBACK_ACTION_OPTIONS.map((o) => o.id));
const ESCALATION_IDS = new Set(ESCALATION_TRIGGER_OPTIONS.map((o) => o.id));
const FORBIDDEN_PROMISE_IDS = new Set(FORBIDDEN_UNHAPPY_PROMISE_OPTIONS.map((o) => o.id));
const DISPOSITION_IDS = new Set(NON_SERVICE_DISPOSITION_OPTIONS.map((o) => o.id));
const HISTORY_POLICY_IDS = new Set(CUSTOMER_HISTORY_POLICY_OPTIONS.map((o) => o.id));
const RESTRICTED_IDS = new Set(RESTRICTED_INFORMATION_OPTIONS.map((o) => o.id));
const ADDITIONAL_SERVICE_IDS = new Set(ADDITIONAL_SERVICE_POLICY_OPTIONS.map((o) => o.id));

export function validateSection6(data: Section6Data, contacts: Contact[]): FieldErrors {
  const errors: FieldErrors = {};

  if (!data.previousWorkInitialAction) {
    errors.previousWorkInitialAction = "Select an option.";
  } else if (!PREVIOUS_WORK_IDS.has(data.previousWorkInitialAction)) {
    errors.previousWorkInitialAction = "Select a valid option.";
  }

  if (!data.repeatCallbackAction) {
    errors.repeatCallbackAction = "Select an option.";
  } else if (!REPEAT_CALLBACK_IDS.has(data.repeatCallbackAction)) {
    errors.repeatCallbackAction = "Select a valid option.";
  }

  if (returnVisitPolicyApplies(data) && !returnVisitEligibilityIsConfigured(data)) {
    errors.returnVisitEligibilityRule = "Describe when a return visit is allowed.";
  }

  const triggers = data.escalationTriggers.filter((id) => ESCALATION_IDS.has(id));
  if (triggers.length === 0) {
    errors.escalationTriggers = "Select at least one escalation trigger.";
  }
  if (triggers.includes("other") && !data.escalationTriggerOther.trim()) {
    errors.escalationTriggerOther = "Describe the other escalation trigger.";
  }

  const promises = data.forbiddenUnhappyPromises.filter((id) => FORBIDDEN_PROMISE_IDS.has(id));
  if (promises.length === 0) {
    errors.forbiddenUnhappyPromises = "Select at least one prohibited promise.";
  }
  if (promises.includes("other") && !data.forbiddenUnhappyPromiseOther.trim()) {
    errors.forbiddenUnhappyPromiseOther = "Describe the other prohibited promise.";
  }

  for (const row of NON_SERVICE_CALL_TYPE_ROWS) {
    const policy = data.nonServiceCallPolicies[row.id];
    const disposition = policy?.disposition ?? "";
    if (!disposition) {
      errors[`nonServiceCallPolicies.${row.id}`] = "Select how Alexander should handle this call type.";
      continue;
    }
    if (!DISPOSITION_IDS.has(disposition)) {
      errors[`nonServiceCallPolicies.${row.id}`] = "Select a valid disposition.";
      continue;
    }
    if (disposition === "send_specific") {
      const contactId = policy?.contactId?.trim() ?? "";
      if (!contactId) {
        errors[`nonServiceCallPolicies.${row.id}.contact`] =
          "Select or add someone to receive this call type.";
        continue;
      }
      const contact = contacts.find((c) => c.id === contactId);
      if (!contact || !contactHasIdentity(contact)) {
        errors[`nonServiceCallPolicies.${row.id}.contact`] = "Select a valid contact.";
      }
    }
  }

  if (!data.customerHistoryPolicy) {
    errors.customerHistoryPolicy = "Select an option.";
  } else if (!HISTORY_POLICY_IDS.has(data.customerHistoryPolicy)) {
    errors.customerHistoryPolicy = "Select a valid option.";
  }

  const restricted = data.restrictedInformation.filter((id) => RESTRICTED_IDS.has(id));
  if (restricted.length === 0) {
    errors.restrictedInformation = "Select at least one restriction.";
  }
  if (restricted.includes("other") && !data.restrictedInformationOther.trim()) {
    errors.restrictedInformationOther = "Describe the other restricted information.";
  }

  if (!data.additionalServicePolicy) {
    errors.additionalServicePolicy = "Select an option.";
  } else if (!ADDITIONAL_SERVICE_IDS.has(data.additionalServicePolicy)) {
    errors.additionalServicePolicy = "Select a valid option.";
  }

  return errors;
}

export function section6IsValid(data: Section6Data, contacts: Contact[]): boolean {
  return Object.keys(validateSection6(data, contacts)).length === 0;
}
