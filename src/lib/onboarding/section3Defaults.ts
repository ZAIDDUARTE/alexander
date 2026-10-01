import { EMERGENCY_SCENARIOS } from "./section3Catalog";
import type { EmergencyClassification, EmergencyClassificationState } from "./types";

/** October 1 preselected classification for each emergency scenario. */
export const EMERGENCY_ROW_DEFAULTS: Record<string, EmergencyClassification> = {
  "uncontrolled-water-leak-inside-property": "emergency",
  "water-leak-near-electrical-equipment": "emergency",
  "suspected-gas-leak-or-odor": "emergency",
  "sewage-entering-property": "emergency",
  "multiple-fixtures-backing-up": "urgent",
  "toilet-overflowing-uncontrolled": "emergency",
  "only-usable-toilet-not-working": "urgent",
  "major-water-heater-leak-or-rupture": "emergency",
  "dangerous-water-heater-symptoms": "emergency",
  "sump-pump-failure-flooding": "emergency",
  "frozen-pipe-confirmed-leak": "emergency",
  "complete-loss-of-water": "urgent",
  "major-water-service-line-leak": "emergency",
  "serious-standing-water-unknown-source": "emergency",
  "unclear-situation-may-be-dangerous": "human_review",
};

export function createDefaultEmergencyClassifications(): Record<
  string,
  EmergencyClassificationState
> {
  const map: Record<string, EmergencyClassificationState> = {};
  for (const scenario of EMERGENCY_SCENARIOS) {
    map[scenario.id] = EMERGENCY_ROW_DEFAULTS[scenario.id];
  }
  return map;
}

/** Fill unanswered rows with that scenario's default. Explicit answers stay. */
export function fillBlankEmergencyClassifications(
  map: Record<string, EmergencyClassificationState>,
): Record<string, EmergencyClassificationState> {
  const out = { ...map };
  for (const scenario of EMERGENCY_SCENARIOS) {
    if ((out[scenario.id] ?? "") === "") {
      out[scenario.id] = EMERGENCY_ROW_DEFAULTS[scenario.id];
    }
  }
  return out;
}

export function emergencyClassificationsMatchDefaults(
  map: Record<string, EmergencyClassificationState>,
): boolean {
  return EMERGENCY_SCENARIOS.every(
    (scenario) => (map[scenario.id] ?? "") === EMERGENCY_ROW_DEFAULTS[scenario.id],
  );
}
