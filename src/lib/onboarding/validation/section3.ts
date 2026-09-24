import { EMERGENCY_SCENARIOS } from "../section3Catalog";
import { DAYS, isOfficeDayValid, hasAnyOpenOfficeDay, type OfficeDaySchedule } from "../schedule";
import { isValidE164, PHONE_INVALID_MESSAGE } from "../phone";
import type { AfterHoursCallClass, Contact, Section3Data } from "../types";

export type FieldErrors = Partial<Record<string, string>>;

function officeDayError(label: string, day: OfficeDaySchedule): string | null {
  if (isOfficeDayValid(day)) return null;
  if (!day.start || !day.end) {
    return `${label}: start and end times are required when available.`;
  }
  return `${label}: end time must be after start time.`;
}

export type ContactErrors = {
  nameOrRole?: string;
  phone?: string;
  callCategories?: string;
  otherCategory?: string;
  scheduleDay?: Partial<Record<string, string>>;
  schedule?: string;
};

/**
 * Validates one composite contact card (Q31/Q32/Q38-new-person share
 * the exact same required fields — MD: "backup contact card using the
 * exact same fields as Q31").
 */
export function validateContact(contact: Contact): ContactErrors {
  const errors: ContactErrors = {};

  if (!contact.nameOrRole.trim()) {
    errors.nameOrRole = "Enter a person or role.";
  }

  if (!contact.phone.trim()) {
    errors.phone = "Enter a phone number.";
  } else if (!isValidE164(contact.phone.trim())) {
    errors.phone = PHONE_INVALID_MESSAGE;
  }

  const scheduleDayErrors: Partial<Record<string, string>> = {};
  for (const day of DAYS) {
    const err = officeDayError(day, contact.availability[day]);
    if (err) scheduleDayErrors[day] = err;
  }
  if (Object.keys(scheduleDayErrors).length > 0) {
    errors.scheduleDay = scheduleDayErrors;
  } else if (!hasAnyOpenOfficeDay(contact.availability)) {
    errors.schedule = "Specify at least one day this contact is available.";
  }

  if (contact.callCategories.length === 0) {
    errors.callCategories = "Select at least one call category.";
  } else if (contact.callCategories.includes("other") && !contact.otherCategory.trim()) {
    errors.otherCategory = "Describe what else should route to this contact.";
  }

  return errors;
}

export function contactIsValid(contact: Contact): boolean {
  return Object.keys(validateContact(contact)).length === 0;
}

/**
 * Q38 new-approver core validation — person/role + E.164 phone only.
 * Does NOT require weekly availability or call categories (those are
 * Q31/Q32 escalation-profile fields; the MD does not require them for
 * a scheduling-exception approver).
 */
export function validateApproverContact(contact: Contact): ContactErrors {
  const errors: ContactErrors = {};

  if (!contact.nameOrRole.trim()) {
    errors.nameOrRole = "Enter a person or role.";
  }

  if (!contact.phone.trim()) {
    errors.phone = "Enter a phone number.";
  } else if (!isValidE164(contact.phone.trim())) {
    errors.phone = PHONE_INVALID_MESSAGE;
  }

  return errors;
}

export function approverContactIsValid(contact: Contact): boolean {
  return Object.keys(validateApproverContact(contact)).length === 0;
}

/**
 * Section 3 ("Emergencies") validation.
 *
 * Applicability rules:
 *  - Q26: every scenario needs an explicit classification.
 *  - Q27: at least one selection required; "Other" requires text;
 *    "None" is defensively re-checked for mutual exclusivity even
 *    though the UI (CheckboxGroup) already enforces it.
 *  - Q28: all three rows need a disposition.
 *  - Q30 only validated when Q29 = certain_hours.
 *  - Q31 (primary contact) always required.
 *  - Q32 backup contact only validated when hasBackupContact = yes.
 *  - Q33/Q34 custom text only required when their "custom" option is chosen.
 *  - Q36/Q37/Q38 only required for their matching Q35 branch.
 */
export function validateSection3(data: Section3Data, contacts: Contact[]): FieldErrors {
  const errors: FieldErrors = {};

  const missingClassification = EMERGENCY_SCENARIOS.some(
    (s) => (data.emergencyClassifications[s.id] ?? "") === "",
  );
  if (missingClassification) {
    errors.emergencyClassifications = "Classify every situation listed above.";
  }

  const hasNone = data.dispatchApproval.includes("none");
  const hasOther = data.dispatchApproval.includes("other");
  const hasScenario = data.dispatchApproval.some((v) => v !== "none" && v !== "other");
  if (data.dispatchApproval.length === 0) {
    errors.dispatchApproval = "Select at least one option, or None.";
  } else if (hasNone && (hasOther || hasScenario)) {
    errors.dispatchApproval = "None cannot be combined with other selections.";
  } else if (hasOther && !data.dispatchApprovalOtherDetail.trim()) {
    errors.dispatchApprovalOtherDetail = "Describe which situations.";
  }

  const dispositionRows: AfterHoursCallClass[] = ["emergency", "urgent_contained", "routine"];
  const missingDisposition = dispositionRows.some((row) => data.afterHoursDisposition[row] === "");
  if (missingDisposition) {
    errors.afterHoursDisposition = "Select an option for every row.";
  }

  if (!data.emergencyServiceMode) {
    errors.emergencyServiceMode = "Select an option.";
  } else if (data.emergencyServiceMode === "certain_hours") {
    const scheduleDayErrors: Partial<Record<string, string>> = {};
    for (const day of DAYS) {
      const err = officeDayError(day, data.emergencyServiceSchedule[day]);
      if (err) scheduleDayErrors[`emergencyServiceSchedule.${day}`] = err;
    }
    Object.assign(errors, scheduleDayErrors);
    if (
      Object.keys(scheduleDayErrors).length === 0 &&
      !hasAnyOpenOfficeDay(data.emergencyServiceSchedule)
    ) {
      errors.emergencyServiceSchedule = "Specify at least one day emergency service is available.";
    }
  }

  const primaryContact = contacts.find((c) => c.id === data.primaryContactId);
  const primaryErrors = primaryContact ? validateContact(primaryContact) : { nameOrRole: "Required." };
  for (const [key, msg] of Object.entries(primaryErrors)) {
    if (msg && typeof msg === "string") errors[`primaryContact.${key}`] = msg;
  }
  if (primaryErrors.scheduleDay) {
    for (const [day, msg] of Object.entries(primaryErrors.scheduleDay)) {
      if (msg) errors[`primaryContact.scheduleDay.${day}`] = msg;
    }
  }

  if (!data.hasBackupContact) {
    errors.hasBackupContact = "Select yes or no.";
  } else if (data.hasBackupContact === "yes") {
    const backupContact = contacts.find((c) => c.id === data.backupContactId);
    const backupErrors = backupContact ? validateContact(backupContact) : { nameOrRole: "Required." };
    for (const [key, msg] of Object.entries(backupErrors)) {
      if (msg && typeof msg === "string") errors[`backupContact.${key}`] = msg;
    }
    if (backupErrors.scheduleDay) {
      for (const [day, msg] of Object.entries(backupErrors.scheduleDay)) {
        if (msg) errors[`backupContact.scheduleDay.${day}`] = msg;
      }
    }
  }

  if (!data.nobodyRespondsFallback) {
    errors.nobodyRespondsFallback = "Select an option.";
  } else if (data.nobodyRespondsFallback === "custom" && !data.nobodyRespondsCustomRule.trim()) {
    errors.nobodyRespondsCustomRule = "Describe the rule Alexander should follow.";
  }

  if (!data.retryRule) {
    errors.retryRule = "Select an option.";
  } else if (data.retryRule === "custom" && !data.retryCustomRule.trim()) {
    errors.retryCustomRule = "Describe the retry rule.";
  }

  if (!data.capacityMode) {
    errors.capacityMode = "Select an option.";
  } else if (data.capacityMode === "reserved_capacity" && !data.reservedCapacityText.trim()) {
    errors.reservedCapacityText = "Describe the capacity you protect for emergencies.";
  } else if (data.capacityMode === "emergency_override" && !data.overrideConditionsText.trim()) {
    errors.overrideConditionsText = "Describe when Alexander may use an emergency override.";
  } else if (data.capacityMode === "authorized_approval") {
    if (!data.approverContactId.trim()) {
      errors.approverContactId = "Select or add an approver.";
    } else {
      const approver = contacts.find((c) => c.id === data.approverContactId);
      if (!approver) {
        errors.approverContactId = "Select a valid contact.";
      } else if (
        approver.id === data.primaryContactId ||
        (data.hasBackupContact === "yes" && approver.id === data.backupContactId)
      ) {
        // Existing escalation contact — Q31/Q32 already enforce the
        // full profile; Q38 only needs a stable reference.
      } else {
        // New Q38 approver: core identity only (name/role + E.164).
        const approverErrors = validateApproverContact(approver);
        for (const [key, msg] of Object.entries(approverErrors)) {
          if (msg && typeof msg === "string") errors[`approverContact.${key}`] = msg;
        }
      }
    }
  }

  return errors;
}

export function section3IsValid(data: Section3Data, contacts: Contact[]): boolean {
  return Object.keys(validateSection3(data, contacts)).length === 0;
}

export const NOBODY_RESPONDS_OPTIONS = [
  { value: "callback" as const, label: "Take the customer's information and arrange a callback" },
  {
    value: "schedule_next_available" as const,
    label: "Schedule the next available appointment, if appropriate",
  },
  {
    value: "team_notification_fallback" as const,
    label: "Send the appropriate team notification and use the approved fallback",
  },
  { value: "custom" as const, label: "Follow another rule" },
];

export const RETRY_RULE_OPTIONS = [
  { value: "try_once_then_next" as const, label: "Try once, then move to the next person" },
  {
    value: "try_same_again_then_next" as const,
    label: "Try the same person one more time, then move to the next person",
  },
  { value: "move_immediately_to_next" as const, label: "Move immediately to the next person" },
  { value: "custom" as const, label: "Use another rule" },
];

export const CAPACITY_MODE_OPTIONS = [
  { value: "reserved_capacity" as const, label: "Use capacity we reserve for emergencies" },
  {
    value: "emergency_override" as const,
    label: "Allow an emergency override under certain conditions",
  },
  { value: "authorized_approval" as const, label: "Ask an authorized person to approve an exception" },
  {
    value: "no_override" as const,
    label: "Do not override the schedule - take the customer's information and arrange follow-up",
  },
];

export const EMERGENCY_SERVICE_MODE_OPTIONS = [
  { value: "24_7" as const, label: "24 hours a day, 7 days a week" },
  { value: "certain_hours" as const, label: "Only during certain hours" },
  { value: "none" as const, label: "We do not provide after-hours emergency field service" },
];

export const HAS_BACKUP_CONTACT_OPTIONS = [
  { value: "yes" as const, label: "Yes" },
  { value: "no" as const, label: "No" },
];
