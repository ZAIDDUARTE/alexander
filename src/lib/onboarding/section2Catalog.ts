/**
 * Section 2 ("Your Services") service/entity catalogs.
 *
 * Transcribed verbatim from the final MD (Q14, Q15, Q16 row lists).
 * These are the shared "service registry" the MD's §1.2 Shared
 * Registries section describes as being reused later by scheduling,
 * technician assignment, visit type, and pricing — so every row gets a
 * stable, hand-assigned `id` that never depends on array position.
 *
 * Do not add, remove, or reorder rows without re-checking the MD.
 */

export type ServiceCatalogItem = {
  id: string;
  label: string;
};

/** Q14 — "Which plumbing services does your company provide?" */
export const PLUMBING_SERVICES: readonly ServiceCatalogItem[] = [
  { id: "general-plumbing-repair", label: "General plumbing repair" },
  { id: "toilet-repair-replacement", label: "Toilet repair or replacement" },
  { id: "faucet-sink-repair", label: "Faucet or sink repair" },
  { id: "garbage-disposal", label: "Garbage disposal" },
  { id: "shower-tub-repair", label: "Shower or tub repair" },
  { id: "water-heater-repair", label: "Water heater repair" },
  { id: "water-heater-replacement", label: "Water heater replacement" },
  { id: "tankless-water-heaters", label: "Tankless water heaters" },
  { id: "shutoff-main-valves", label: "Shutoff or main valves" },
  { id: "pressure-regulators", label: "Pressure regulators" },
  { id: "water-service-lines", label: "Water service lines" },
  { id: "frozen-pipes", label: "Frozen pipes" },
  { id: "slab-leaks", label: "Slab leaks" },
  { id: "repiping", label: "Repiping" },
  { id: "fixture-installation", label: "Fixture installation" },
  { id: "appliance-plumbing-connections", label: "Appliance plumbing connections" },
  { id: "gas-line-plumbing-non-emergency", label: "Gas-line plumbing (non-emergency)" },
  { id: "excavation", label: "Excavation" },
  { id: "trenchless-sewer-service-line-work", label: "Trenchless sewer/service-line work" },
  { id: "water-filtration-softening-ro", label: "Water filtration, softening or RO" },
  { id: "remodel-project-work", label: "Remodel or project work" },
  { id: "other-specialty-plumbing", label: "Other specialty plumbing" },
] as const;

/** Q15 — "Which diagnostic, drain, and inspection services does your company provide?" */
export const DIAGNOSTIC_SERVICES: readonly ServiceCatalogItem[] = [
  { id: "general-diagnostic-service-visits", label: "General diagnostic/service visits" },
  { id: "plumbing-inspections", label: "Plumbing inspections" },
  { id: "leak-detection", label: "Leak detection" },
  { id: "drain-cleaning", label: "Drain cleaning" },
  { id: "sewer-drain-camera-inspections", label: "Sewer/drain camera inspections" },
  { id: "hydro-jetting-advanced-drain-cleaning", label: "Hydro-jetting / advanced drain cleaning" },
] as const;

/** Q16 — "Who does your company serve?" */
export const CUSTOMER_PROPERTY_TYPES: readonly ServiceCatalogItem[] = [
  { id: "homeowners", label: "Homeowners" },
  { id: "tenants", label: "Tenants" },
  { id: "landlords-property-managers", label: "Landlords / property managers" },
  { id: "single-family-homes", label: "Single-family homes" },
  { id: "condos-hoas", label: "Condos / HOAs" },
  { id: "multifamily-properties", label: "Multifamily properties" },
  { id: "commercial-properties", label: "Commercial properties" },
  {
    id: "real-estate-inspection-transaction-work",
    label: "Real-estate inspection / transaction work",
  },
  { id: "insurance-related-work", label: "Insurance-related work" },
] as const;
