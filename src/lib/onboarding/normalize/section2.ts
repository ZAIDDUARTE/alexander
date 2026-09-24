import type {
  AfterHoursAreaMode,
  Section2Data,
  ServiceAreaDefinitionMode,
  ServicePolicy,
  ServicePolicyEntry,
} from "../types";
import { CUSTOMER_PROPERTY_TYPES, DIAGNOSTIC_SERVICES, PLUMBING_SERVICES } from "../section2Catalog";

/**
 * A single normalized service/entity policy row — the reusable,
 * stable-ID "Company Truth" shape later sections (scheduling,
 * technician assignment, pricing) can reference without re-entering
 * service names.
 */
export type NormalizedServicePolicy = {
  id: string;
  name: string;
  policy: ServicePolicy;
  /** null unless policy === "with_conditions". */
  condition: string | null;
};

export type NormalizedServiceArea = {
  definitionMode: ServiceAreaDefinitionMode | null;
  /** non-null only when definitionMode === "zip_codes" */
  zipCodes: string[] | null;
  /** non-null only when definitionMode === "cities" */
  cities: string[] | null;
  /** non-null only when definitionMode === "distance" */
  distance: { address: string; radiusMiles: number } | null;
  excludedTerritory: string | null;
  hasConditionalTerritory: boolean | null;
  /** non-null only when hasConditionalTerritory === true; incomplete cards excluded. */
  conditionalTerritories: { area: string; condition: string }[] | null;
  afterHours: {
    mode: AfterHoursAreaMode | null;
    /** non-null only when mode === "smaller" */
    territory: string | null;
  };
};

export type NormalizedSection2 = {
  plumbingServices: NormalizedServicePolicy[];
  diagnosticServices: NormalizedServicePolicy[];
  customerPropertyTypes: NormalizedServicePolicy[];
  customerSuppliedMaterials: { policy: ServicePolicy | null; condition: string | null };
  correctiveWork: { policy: ServicePolicy | null; condition: string | null };
  serviceArea: NormalizedServiceArea;
};

/**
 * Normalize one service-policy map into the reusable registry shape.
 * Rows that were never answered (policy === "") are excluded entirely —
 * there is no Company Truth fact to state yet. Condition text is only
 * carried through when the row's policy is actually "with_conditions";
 * any stale text left over from a previously-selected policy is
 * dropped, mirroring the Section 1 stale-conditional-data strategy.
 */
function normalizeServicePolicyMap(
  catalog: readonly { id: string; label: string }[],
  map: Record<string, ServicePolicyEntry>,
): NormalizedServicePolicy[] {
  const out: NormalizedServicePolicy[] = [];
  for (const item of catalog) {
    const entry = map[item.id];
    if (!entry || entry.policy === "") continue;
    out.push({
      id: item.id,
      name: item.label,
      policy: entry.policy,
      condition: entry.policy === "with_conditions" ? entry.condition.trim() || null : null,
    });
  }
  return out;
}

function normalizeSingleChoicePolicy(
  policy: Section2Data["customerSuppliedMaterialsPolicy"],
  condition: string,
): { policy: ServicePolicy | null; condition: string | null } {
  if (!policy) return { policy: null, condition: null };
  return {
    policy,
    condition: policy === "with_conditions" ? condition.trim() || null : null,
  };
}

function normalizeServiceArea(data: Section2Data): NormalizedServiceArea {
  const mode = data.serviceAreaDefinitionMode || null;

  const zipCodes =
    mode === "zip_codes"
      ? dedupeNonBlank(data.serviceAreaZipCodes)
      : null;
  const cities = mode === "cities" ? dedupeNonBlank(data.serviceAreaCities) : null;
  const distance =
    mode === "distance" && data.serviceAreaDistance.address.trim()
      ? {
          address: data.serviceAreaDistance.address.trim(),
          radiusMiles: Number(data.serviceAreaDistance.radiusMiles) || 0,
        }
      : null;

  const hasConditionalTerritory =
    data.hasConditionalTerritory === "" ? null : data.hasConditionalTerritory === "yes";

  const conditionalTerritories =
    hasConditionalTerritory === true
      ? data.conditionalTerritories
          .filter((t) => t.area.trim() && t.condition.trim())
          .map((t) => ({ area: t.area.trim(), condition: t.condition.trim() }))
      : null;

  const afterHoursMode = data.afterHoursAreaMode || null;

  return {
    definitionMode: mode,
    zipCodes,
    cities,
    distance,
    excludedTerritory: data.excludedTerritory.trim() || null,
    hasConditionalTerritory,
    conditionalTerritories,
    afterHours: {
      mode: afterHoursMode,
      territory:
        afterHoursMode === "smaller" ? data.afterHoursServiceArea.trim() || null : null,
    },
  };
}

function dedupeNonBlank(values: string[]): string[] | null {
  const cleaned = Array.from(new Set(values.map((v) => v.trim()).filter(Boolean)));
  return cleaned.length > 0 ? cleaned : null;
}

export function normalizeSection2(data: Section2Data): NormalizedSection2 {
  return {
    plumbingServices: normalizeServicePolicyMap(PLUMBING_SERVICES, data.plumbingServices),
    diagnosticServices: normalizeServicePolicyMap(DIAGNOSTIC_SERVICES, data.diagnosticServices),
    customerPropertyTypes: normalizeServicePolicyMap(
      CUSTOMER_PROPERTY_TYPES,
      data.customerPropertyTypes,
    ),
    customerSuppliedMaterials: normalizeSingleChoicePolicy(
      data.customerSuppliedMaterialsPolicy,
      data.customerSuppliedMaterialsCondition,
    ),
    correctiveWork: normalizeSingleChoicePolicy(
      data.correctiveWorkPolicy,
      data.correctiveWorkCondition,
    ),
    serviceArea: normalizeServiceArea(data),
  };
}
