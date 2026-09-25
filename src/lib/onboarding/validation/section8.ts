import { isValidE164, PHONE_INVALID_MESSAGE } from "../phone";
import {
  ADDITIONAL_SOFTWARE_CATEGORIES,
  ALL_INTEGRATION_CAPABILITY_IDS,
  type IntegrationCapabilityId,
} from "../section8Catalog";
import {
  crmAllowsSchedulingSameAs,
  resolveCrmSoftware,
  resolveDispatchSoftware,
  resolveSchedulingSoftware,
  schedulingAllowsDispatchSameAs,
} from "../softwareRegistry";
import type { OnboardingDraft, Section8Data, SoftwareRecord } from "../types";

export type FieldErrors = Partial<Record<string, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function meaningfulText(value: string): boolean {
  return value.trim().length >= 2;
}

function capabilitySetValid(caps: IntegrationCapabilityId[]): boolean {
  if (caps.length === 0) return false;
  return caps.every((c) => ALL_INTEGRATION_CAPABILITY_IDS.includes(c));
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

  if (!data.dispatchProvider) {
    errors.dispatchProvider = "Select where technician schedules or dispatch are managed.";
  } else if (data.dispatchProvider === "same_as_scheduling") {
    if (!schedulingAllowsDispatchSameAs(data, systems)) {
      errors.dispatchProvider =
        "Same system selected above is not available without a resolved scheduling system.";
    } else if (!resolveDispatchSoftware(data, systems)) {
      errors.dispatchProvider = "Could not resolve the scheduling system above.";
    }
  } else if (data.dispatchProvider === "custom") {
    if (!meaningfulText(data.dispatchCustomName)) {
      errors.dispatchCustomName = "Enter the dispatch system name.";
    } else if (!resolveDispatchSoftware(data, systems)) {
      errors.dispatchProvider = "Dispatch system could not be resolved.";
    }
  } else if (data.dispatchProvider !== "none" && !resolveDispatchSoftware(data, systems)) {
    errors.dispatchProvider = "Dispatch system could not be resolved.";
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
  if (hasNone && positive.length > 0) {
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
      if (!meaningfulText(card.desiredAccess)) {
        errors[`additionalSoftware.${cat}.desiredAccess`] =
          "Describe what Alexander should be able to access.";
      }
      if (cat === "other") {
        if (!meaningfulText(card.otherCategoryLabel)) {
          errors[`additionalSoftware.${cat}.otherCategoryLabel`] = "Enter a category or name.";
        }
        if (!meaningfulText(card.otherDetails)) {
          errors[`additionalSoftware.${cat}.otherDetails`] = "Enter additional details.";
        }
      }
    }
  }

  if (!capabilitySetValid(data.authorizedCapabilities)) {
    errors.authorizedCapabilities = "Select at least one authorized capability.";
  }
  if (data.authorizedCapabilities.includes("other") && !meaningfulText(data.authorizedCapabilityOther)) {
    errors.authorizedCapabilityOther = "Describe the other capability.";
  }

  if (!data.connectionOwnerMode) {
    errors.connectionOwnerMode = "Select whether you are authorized for these systems.";
  } else if (data.connectionOwnerMode === "someone_else") {
    if (!meaningfulText(data.connectionOwnerName)) {
      errors.connectionOwnerName = "Enter the connection owner’s name.";
    }
    if (!data.connectionOwnerEmail.trim()) {
      errors.connectionOwnerEmail = "Enter an email address.";
    } else if (!EMAIL_PATTERN.test(data.connectionOwnerEmail.trim())) {
      errors.connectionOwnerEmail = "Enter a valid email address.";
    }
    if (!data.connectionOwnerPhone.trim()) {
      errors.connectionOwnerPhone = "Enter a phone number.";
    } else if (!isValidE164(data.connectionOwnerPhone.trim())) {
      errors.connectionOwnerPhone = PHONE_INVALID_MESSAGE;
    }
  }

  if (!data.connectionNoticeAcknowledged) {
    errors.connectionNoticeAcknowledged = "Acknowledge the software connection notice to continue.";
  }

  if (!data.failureFallback) {
    errors.failureFallback = "Select a fallback when software access fails.";
  }

  return errors;
}

export function section8IsValid(data: Section8Data, systems: SoftwareRecord[]): boolean {
  return Object.keys(validateSection8(data, systems)).length === 0;
}

export function section8IsValidForDraft(draft: OnboardingDraft): boolean {
  return section8IsValid(draft.section8, draft.systems);
}
