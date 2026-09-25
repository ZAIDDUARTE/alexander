import {
  DEFAULT_ESCALATION_TRIGGER_IDS,
  DEFAULT_FORBIDDEN_UNHAPPY_PROMISE_IDS,
  DEFAULT_RESTRICTED_INFORMATION_IDS,
  NON_SERVICE_CALL_TYPE_ROWS,
} from "./section6Catalog";
import type { Contact, Section6Data } from "./types";
import { createDefaultSection6, createEmptyContact } from "./types";

export function fullyValidSection6(contacts: Contact[] = []): Section6Data {
  const primary = contacts[0] ?? {
    ...createEmptyContact(),
    nameOrRole: "Office manager",
    phone: "+14155550100",
  };
  const data = createDefaultSection6();
  data.previousWorkInitialAction = "schedule_return_visit";
  data.returnVisitEligibilityRule = "Within 30 days of original work when the issue matches the prior service.";
  data.repeatCallbackAction = "human_review_after_first";
  data.escalationTriggers = [...DEFAULT_ESCALATION_TRIGGER_IDS] as Section6Data["escalationTriggers"];
  data.forbiddenUnhappyPromises = [
    ...DEFAULT_FORBIDDEN_UNHAPPY_PROMISE_IDS,
  ] as Section6Data["forbiddenUnhappyPromises"];
  data.restrictedInformation = [
    ...DEFAULT_RESTRICTED_INFORMATION_IDS,
  ] as Section6Data["restrictedInformation"];
  data.customerHistoryPolicy = "use_available_history";
  data.additionalServicePolicy = "only_when_asked";
  for (const row of NON_SERVICE_CALL_TYPE_ROWS) {
    data.nonServiceCallPolicies[row.id] = {
      disposition: row.id === "media_inquiry" ? "send_specific" : "take_message",
      contactId: row.id === "media_inquiry" ? primary.id : "",
    };
  }
  return data;
}
