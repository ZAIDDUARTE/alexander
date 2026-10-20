import { isValidE164, PHONE_INVALID_MESSAGE } from "../phone";
import {
  ADDITIONAL_SOFTWARE_CATEGORIES,
  CONNECTION_OWNER_OPTIONS,
  FAILURE_FALLBACK_OPTIONS,
} from "../section8Catalog";
import {
  crmAllowsSchedulingSameAs,
  resolveCrmSoftware,
  resolveSchedulingSoftware,
} from "../softwareRegistry";
import type { OnboardingDraft, Section8Data, SoftwareRecord } from "../types";

export type FieldErrors = Partial<Record<string, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OWNER_IDS = new Set<string>(CONNECTION_OWNER_OPTIONS.map((option) => option.id));
const FAILURE_IDS = new Set<string>(FAILURE_FALLBACK_OPTIONS.map((option) => option.id));

function meaningfulText(value: string): boolean {
  return value.trim().length >= 2;
}

export function validateSection8(
  data: Section8Data,
  systems: SoftwareRecord[],
): FieldErrors {
  const errors: FieldErrors = {};

  if (!data.crmFsmProvider) {
    errors.crmFsmProvider = "Select a CRM or field-service system.";
  } else if (data.crmFsmProvider === "custom" && !meaningfulText(data.crmFsmCustomName)) {
    errors.crmFsmCustomName = "Enter the system name.";
  } else if (data.crmFsmProvider !== "none" && data.crmFsmProvider !== "custom") {
    if (!resolveCrmSoftware(data, systems)) {
      errors.crmFsmProvider = "System selection could not be resolved.";
    }
  }

  if (!data.schedulingProvider) {
    errors.schedulingProvider = "Select where appointments are managed.";
  } else if (data.schedulingProvider === "same_as_crm") {
    if (!crmAllowsSchedulingSameAs(data)) {
      errors.schedulingProvider =
        "Same system selected above is not available when you do not use a CRM/field-service system.";
    } else if (!resolveSchedulingSoftware(data, systems)) {
      errors.schedulingProvider = "Could not resolve the CRM/field-service system above.";
    }
  } else if (data.schedulingProvider === "custom") {
    if (!meaningfulText(data.schedulingCustomName)) {
      errors.schedulingCustomName = "Enter the scheduling system name.";
    } else if (!resolveSchedulingSoftware(data, systems)) {
      errors.schedulingProvider = "Scheduling system could not be resolved.";
    }
  } else if (data.schedulingProvider !== "none" && !resolveSchedulingSoftware(data, systems)) {
    errors.schedulingProvider = "Scheduling system could not be resolved.";
  }

  if (!data.phoneProvider) {
    errors.phoneProvider = "Select your business phone system.";
  } else if (data.phoneProvider === "custom") {
    if (!meaningfulText(data.phoneCustomName)) {
      errors.phoneCustomName = "Enter the phone system name.";
    } else if (!data.phoneSoftwareId.trim()) {
      errors.phoneProvider = "Phone system could not be resolved.";
    }
  } else if (data.phoneProvider !== "not_sure" && !data.phoneSoftwareId.trim()) {
    errors.phoneProvider = "Phone system could not be resolved.";
  }

  const categories = data.additionalSoftwareCategories;
  const hasNone = categories.includes("none");
  const positive = categories.filter((c) => c !== "none");
  if (categories.length === 0) {
    errors.additionalSoftwareCategories = "Select at least one option, or None.";
  } else if (hasNone && positive.length > 0) {
    errors.additionalSoftwareCategories = "None cannot be combined with other categories.";
  }

  if (!hasNone && positive.length > 0) {
    for (const cat of positive) {
      const card = data.additionalSoftwareCards.find((c) => c.categoryId === cat);
      const label = ADDITIONAL_SOFTWARE_CATEGORIES.find((c) => c.id === cat)?.label ?? cat;
      if (!card) {
        errors[`additionalSoftware.${cat}`] = `Add details for ${label}.`;
        continue;
      }
      if (!meaningfulText(card.systemName)) {
        errors[`additionalSoftware.${cat}.systemName`] = "Enter the software name.";
      }
    }
  }

  if (!data.connectionOwnerMode || !OWNER_IDS.has(data.connectionOwnerMode)) {
    errors.connectionOwnerMode = "Select who can authorize Alexander to connect to these systems.";
  } else if (data.connectionOwnerMode === "someone_else") {
    if (!meaningfulText(data.connectionOwnerName)) {
      errors.connectionOwnerName = "Enter the connection owner’s name.";
    }
    if (!data.connectionOwnerEmail.trim()) {
      errors.connectionOwnerEmail = "Enter an email address.";
    } else if (!EMAIL_PATTERN.test(data.connectionOwnerEmail.trim())) {
      errors.connectionOwnerEmail = "Enter a valid email address.";
    }
    if (data.connectionOwnerPhone.trim() && !isValidE164(data.connectionOwnerPhone.trim())) {
      errors.connectionOwnerPhone = PHONE_INVALID_MESSAGE;
    }
  }

  if (!data.connectionNoticeAcknowledged) {
    errors.connectionNoticeAcknowledged = "Acknowledge the software connection notice to continue.";
  }

  if (!data.failureFallback || !FAILURE_IDS.has(data.failureFallback)) {
    errors.failureFallback = "Select what Alexander should do when he can’t access a system.";
  } else if (data.failureFallback === "custom" && !data.failureFallbackCustom.trim()) {
    errors.failureFallbackCustom = "Tell us how you’d like Alexander to handle it.";
  }

  return errors;
}

export function section8IsValid(data: Section8Data, systems: SoftwareRecord[]): boolean {
  return Object.keys(validateSection8(data, systems)).length === 0;
}

export function section8IsValidForDraft(draft: OnboardingDraft): boolean {
  return section8IsValid(draft.section8, draft.systems);
}
