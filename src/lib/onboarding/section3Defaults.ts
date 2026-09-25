import { EMERGENCY_SCENARIOS } from "./section3Catalog";
import type { EmergencyClassificationState } from "./types";

/**
 * MD-approved Q26 initial state: every scenario selects
 * `recommended_default` (not a hidden classification mapping).
 */
export function createDefaultEmergencyClassifications(): Record<
  string,
  EmergencyClassificationState
> {
  const map: Record<string, EmergencyClassificationState> = {};
  for (const scenario of EMERGENCY_SCENARIOS) {
    map[scenario.id] = "recommended_default";
  }
  return map;
}

/**
 * Upgrade legacy blank Q26 rows to recommended_default without
 * overwriting any explicit customer choice.
 */
export function fillBlankQ26WithRecommendedDefault(
  map: Record<string, EmergencyClassificationState>,
): Record<string, EmergencyClassificationState> {
  const out = { ...map };
  for (const scenario of EMERGENCY_SCENARIOS) {
    if ((out[scenario.id] ?? "") === "") {
      out[scenario.id] = "recommended_default";
    }
  }
  return out;
}

/** True when every row is still the source-approved Q26 default. */
export function emergencyClassificationsAreAllRecommendedDefault(
  map: Record<string, EmergencyClassificationState>,
): boolean {
  return EMERGENCY_SCENARIOS.every(
    (s) => (map[s.id] ?? "") === "recommended_default",
  );
}
