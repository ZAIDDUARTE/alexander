import type { Section2Data, ServicePolicyEntry } from "../types";

export type FieldErrors = Partial<Record<string, string>>;

/**
 * Matrix-map validation.
 *
 * - Every row needs an explicit policy.
 * - Rows set to `with_conditions` MUST include a non-empty (trimmed)
 *   condition. An operational Company Truth of "with conditions: [nothing]"
 *   is not allowed for Q14–Q18.
 *
 * Returns:
 *  - `groupError` when any policy is still blank (rendered once by the
 *    matrix group, not by QuestionCard).
 *  - `conditionErrors` keyed by catalog id for empty with_conditions rules
 *    (rendered inside that exact row's conditional panel).
 */
function validateServicePolicyMap(
  map: Record<string, ServicePolicyEntry>,
  groupMessage: string,
): { groupError: string | null; conditionErrors: Record<string, string> } {
  const conditionErrors: Record<string, string> = {};
  let missingPolicy = false;

  for (const [id, entry] of Object.entries(map)) {
    if (entry.policy === "") {
      missingPolicy = true;
      continue;
    }
    if (entry.policy === "with_conditions" && !entry.condition.trim()) {
      conditionErrors[id] = "Describe the conditions for this service.";
    }
  }

  return {
    groupError: missingPolicy ? groupMessage : null,
    conditionErrors,
  };
}

/**
 * Section 2 ("Your Services") validation.
 *
 * Applicability rules:
 *  - Q14/Q15/Q16 matrices: every row needs an explicit policy; when
 *    policy = with_conditions the attached rule text is required.
 *  - Q17/Q18 single-choice: same — condition required when with_conditions.
 *  - Q20/Q23/Q25 are conditionally required based on Q19/Q22/Q24.
 *  - Q21 is optional and never blocks completion.
 */
export function validateSection2(data: Section2Data): FieldErrors {
  const errors: FieldErrors = {};

  const plumbing = validateServicePolicyMap(
    data.plumbingServices,
    "Select a policy for every plumbing service.",
  );
  if (plumbing.groupError) errors.plumbingServices = plumbing.groupError;
  for (const [id, msg] of Object.entries(plumbing.conditionErrors)) {
    errors[`plumbingServices.${id}.condition`] = msg;
  }

  const diagnostic = validateServicePolicyMap(
    data.diagnosticServices,
    "Select a policy for every diagnostic, drain, and inspection service.",
  );
  if (diagnostic.groupError) errors.diagnosticServices = diagnostic.groupError;
  for (const [id, msg] of Object.entries(diagnostic.conditionErrors)) {
    errors[`diagnosticServices.${id}.condition`] = msg;
  }

  const customer = validateServicePolicyMap(
    data.customerPropertyTypes,
    "Select a policy for every customer or property type.",
  );
  if (customer.groupError) errors.customerPropertyTypes = customer.groupError;
  for (const [id, msg] of Object.entries(customer.conditionErrors)) {
    errors[`customerPropertyTypes.${id}.condition`] = msg;
  }

  if (!data.customerSuppliedMaterialsPolicy) {
    errors.customerSuppliedMaterialsPolicy = "Select an option.";
  } else if (
    data.customerSuppliedMaterialsPolicy === "with_conditions" &&
    !data.customerSuppliedMaterialsCondition.trim()
  ) {
    errors.customerSuppliedMaterialsCondition = "Describe the conditions for this service.";
  }

  if (!data.correctiveWorkPolicy) {
    errors.correctiveWorkPolicy = "Select an option.";
  } else if (
    data.correctiveWorkPolicy === "with_conditions" &&
    !data.correctiveWorkCondition.trim()
  ) {
    errors.correctiveWorkCondition = "Describe the conditions for this service.";
  }

  if (!data.serviceAreaDefinitionMode) {
    errors.serviceAreaDefinitionMode = "Select how you define your service area.";
  } else if (data.serviceAreaDefinitionMode === "zip_codes") {
    if (data.serviceAreaZipCodes.filter((z) => z.trim()).length === 0) {
      errors.serviceAreaZipCodes = "Add at least one ZIP code.";
    }
  } else if (data.serviceAreaDefinitionMode === "cities") {
    if (data.serviceAreaCities.filter((c) => c.trim()).length === 0) {
      errors.serviceAreaCities = "Add at least one city or community.";
    }
  } else if (data.serviceAreaDefinitionMode === "distance") {
    if (!data.serviceAreaDistance.address.trim()) {
      errors.serviceAreaDistanceAddress = "Enter your business address.";
    }
    const radius = Number(data.serviceAreaDistance.radiusMiles);
    if (!data.serviceAreaDistance.radiusMiles.trim() || !Number.isFinite(radius) || radius <= 0) {
      errors.serviceAreaDistanceRadius = "Radius must be a positive number.";
    }
  }

  if (!data.hasConditionalTerritory) {
    errors.hasConditionalTerritory = "Select yes or no.";
  } else if (data.hasConditionalTerritory === "yes") {
    const hasCompleteEntry = data.conditionalTerritories.some(
      (t) => t.area.trim() && t.condition.trim(),
    );
    if (!hasCompleteEntry) {
      errors.conditionalTerritories = "Add at least one area and its condition.";
    }
  }

  if (!data.afterHoursAreaMode) {
    errors.afterHoursAreaMode = "Select an option.";
  } else if (data.afterHoursAreaMode === "smaller" && !data.afterHoursServiceArea.trim()) {
    errors.afterHoursServiceArea = "Describe your after-hours service area.";
  }

  return errors;
}

export function section2IsValid(data: Section2Data): boolean {
  return Object.keys(validateSection2(data)).length === 0;
}

/** Collect per-row condition errors for a matrix field-error prefix. */
export function matrixConditionErrors(
  errors: FieldErrors,
  prefix: "plumbingServices" | "diagnosticServices" | "customerPropertyTypes",
): Record<string, string> {
  const out: Record<string, string> = {};
  const needle = `${prefix}.`;
  for (const [key, message] of Object.entries(errors)) {
    if (!message) continue;
    if (!key.startsWith(needle) || !key.endsWith(".condition")) continue;
    const id = key.slice(needle.length, -".condition".length);
    if (id) out[id] = message;
  }
  return out;
}

export const SERVICE_OFFER_LABELS = {
  offered: "We offer this",
  with_conditions: "Yes, with conditions",
  ask_team: "Ask our team first",
  not_offered: "We do not offer this",
} as const;

export const CUSTOMER_SERVE_LABELS = {
  offered: "We serve these normally",
  with_conditions: "Yes, with conditions",
  ask_team: "Ask our team first",
  not_offered: "We do not serve these",
} as const;

export const YES_NO_POLICY_LABELS = {
  offered: "Yes, normally",
  with_conditions: "Yes, with conditions",
  ask_team: "Ask our team first",
  not_offered: "No",
} as const;

export const SERVICE_AREA_DEFINITION_OPTIONS = [
  { value: "zip_codes" as const, label: "ZIP codes" },
  { value: "cities" as const, label: "Cities / communities" },
  { value: "distance" as const, label: "Distance from our business location" },
];

export const AFTER_HOURS_AREA_OPTIONS = [
  { value: "same" as const, label: "Same service area as normal" },
  { value: "smaller" as const, label: "A smaller service area" },
  { value: "none" as const, label: "We do not provide after-hours field service" },
];

export const YES_NO_OPTIONS = [
  { value: "yes" as const, label: "Yes" },
  { value: "no" as const, label: "No" },
];
