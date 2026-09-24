/**
 * Section 3 ("Emergencies") shared emergency-scenario registry.
 *
 * Transcribed verbatim from the final MD's Q26 row list. Q27 (dispatch
 * approval) reuses this exact same registry rather than duplicating
 * the 15 scenario strings in a second array — per the MD's explicit
 * instruction that Q27 options are "the same 15 emergency situations
 * from Q26."
 *
 * Every row gets a stable, hand-assigned `id` that never depends on
 * array position, matching the Section 2 service-catalog precedent.
 *
 * Do not add, remove, or reorder rows without re-checking the MD.
 */

export type EmergencyScenario = {
  id: string;
  label: string;
};

/** Q26/Q27 — the 15 emergency scenarios. */
export const EMERGENCY_SCENARIOS: readonly EmergencyScenario[] = [
  { id: "uncontrolled-water-leak-inside-property", label: "Uncontrolled water leaking inside the property" },
  { id: "water-leak-near-electrical-equipment", label: "Water leaking near electrical equipment" },
  { id: "suspected-gas-leak-or-odor", label: "Suspected gas leak or gas odor" },
  { id: "sewage-entering-property", label: "Sewage actively entering the property" },
  { id: "multiple-fixtures-backing-up", label: "Multiple fixtures backing up at the same time" },
  { id: "toilet-overflowing-uncontrolled", label: "Toilet overflowing and the customer cannot stop it" },
  { id: "only-usable-toilet-not-working", label: "The property's only usable toilet is not working" },
  { id: "major-water-heater-leak-or-rupture", label: "Major water-heater leak or rupture" },
  { id: "dangerous-water-heater-symptoms", label: "Potentially dangerous water-heater symptoms" },
  { id: "sump-pump-failure-flooding", label: "Sump-pump failure with active or imminent flooding" },
  { id: "frozen-pipe-confirmed-leak", label: "Frozen pipe with a confirmed leak" },
  { id: "complete-loss-of-water", label: "Complete loss of water to the property" },
  { id: "major-water-service-line-leak", label: "Major water-service-line leak" },
  { id: "serious-standing-water-unknown-source", label: "Serious standing water from an unknown source" },
  { id: "unclear-situation-may-be-dangerous", label: "An unclear situation that may be dangerous" },
] as const;
