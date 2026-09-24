import type { Section2Data, ServicePolicyEntry } from "../types";

type ProgressUnit = {
  applicable: boolean;
  complete: boolean;
};

function servicePolicyMapComplete(map: Record<string, ServicePolicyEntry>): boolean {
  const entries = Object.values(map);
  return (
    entries.length > 0 &&
    entries.every((entry) => {
      if (entry.policy === "") return false;
      if (entry.policy === "with_conditions" && !entry.condition.trim()) return false;
      return true;
    })
  );
}

/**
 * Deterministic Section 2 completion units.
 *
 * One unit per top-level MD question (Q14–Q25), matching the Section 1
 * progress-unit convention. Matrix questions (Q14/Q15/Q16) count as a
 * single unit each, complete only once every row has an explicit
 * policy AND every `with_conditions` row has a non-empty rule.
 * Q17/Q18 also require their condition field when "with conditions"
 * is selected, so each gets its own conditional unit. Optional
 * questions (Q21) never enter this calculation.
 */
export function getSection2ProgressUnits(data: Section2Data): ProgressUnit[] {
  const showCustomerSuppliedCondition = data.customerSuppliedMaterialsPolicy === "with_conditions";
  const showCorrectiveWorkCondition = data.correctiveWorkPolicy === "with_conditions";
  const showConditionalTerritories = data.hasConditionalTerritory === "yes";
  const showAfterHoursTerritory = data.afterHoursAreaMode === "smaller";

  return [
    // Q14 — plumbing services matrix (required)
    { applicable: true, complete: servicePolicyMapComplete(data.plumbingServices) },
    // Q15 — diagnostic/drain/inspection services matrix (required)
    { applicable: true, complete: servicePolicyMapComplete(data.diagnosticServices) },
    // Q16 — customer/property types matrix (required)
    { applicable: true, complete: servicePolicyMapComplete(data.customerPropertyTypes) },
    // Q17 — customer-supplied materials policy (required)
    { applicable: true, complete: data.customerSuppliedMaterialsPolicy !== "" },
    // Q17 condition (conditional on Q17 = with_conditions; MD requires it)
    {
      applicable: showCustomerSuppliedCondition,
      complete: showCustomerSuppliedCondition && Boolean(data.customerSuppliedMaterialsCondition.trim()),
    },
    // Q18 — corrective work policy (required)
    { applicable: true, complete: data.correctiveWorkPolicy !== "" },
    // Q18 condition (conditional on Q18 = with_conditions; MD requires it)
    {
      applicable: showCorrectiveWorkCondition,
      complete: showCorrectiveWorkCondition && Boolean(data.correctiveWorkCondition.trim()),
    },
    // Q19 — service area definition mode (required)
    { applicable: true, complete: data.serviceAreaDefinitionMode !== "" },
    // Q20 — structured service-area definition (required; branches on Q19)
    { applicable: true, complete: isServiceAreaDetailComplete(data) },
    // Q22 — has conditional territory? (required)
    { applicable: true, complete: data.hasConditionalTerritory !== "" },
    // Q23 — conditional-territory cards (conditional on Q22 = yes)
    {
      applicable: showConditionalTerritories,
      complete:
        showConditionalTerritories &&
        data.conditionalTerritories.some((t) => t.area.trim() && t.condition.trim()),
    },
    // Q24 — after-hours area mode (required)
    { applicable: true, complete: data.afterHoursAreaMode !== "" },
    // Q25 — after-hours service area (conditional on Q24 = "smaller")
    {
      applicable: showAfterHoursTerritory,
      complete: showAfterHoursTerritory && Boolean(data.afterHoursServiceArea.trim()),
    },
  ];
}

function isServiceAreaDetailComplete(data: Section2Data): boolean {
  if (data.serviceAreaDefinitionMode === "zip_codes") {
    return data.serviceAreaZipCodes.some((z) => z.trim());
  }
  if (data.serviceAreaDefinitionMode === "cities") {
    return data.serviceAreaCities.some((c) => c.trim());
  }
  if (data.serviceAreaDefinitionMode === "distance") {
    const radius = Number(data.serviceAreaDistance.radiusMiles);
    return Boolean(data.serviceAreaDistance.address.trim()) && Number.isFinite(radius) && radius > 0;
  }
  return false;
}

/**
 * Fraction (0–1) of applicable Section 2 questions that are currently
 * complete. Derived purely from onboarding state, never from the DOM.
 */
export function getSection2Progress(data: Section2Data): number {
  const units = getSection2ProgressUnits(data).filter((u) => u.applicable);
  if (units.length === 0) return 0;
  const completed = units.filter((u) => u.complete).length;
  return completed / units.length;
}
