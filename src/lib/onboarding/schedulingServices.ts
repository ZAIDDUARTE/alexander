import { DIAGNOSTIC_SERVICES, PLUMBING_SERVICES, type ServiceCatalogItem } from "./section2Catalog";
import type { Section2Data, ServicePolicy } from "./types";

/** Policies that may appear in Section 4 scheduling selectors. */
const SCHEDULING_ELIGIBLE_POLICIES = new Set<ServicePolicy>([
  "offered",
  "with_conditions",
  "ask_team",
]);

const JOB_CATALOG: readonly ServiceCatalogItem[] = [...PLUMBING_SERVICES, ...DIAGNOSTIC_SERVICES];

/**
 * Services from Section 2 Company Truth that Scheduling (Q50/Q61/Q64)
 * may reference. Uses stable Section 2 service IDs + catalog labels.
 *
 * Eligible: offered | with_conditions | ask_team
 * Excluded: not_offered | unanswered ("")
 *
 * Does not invent scheduling-specific IDs.
 */
export function getSchedulingEligibleServices(section2: Section2Data): ServiceCatalogItem[] {
  const out: ServiceCatalogItem[] = [];
  for (const item of JOB_CATALOG) {
    const entry =
      section2.plumbingServices[item.id] ?? section2.diagnosticServices[item.id];
    if (!entry) continue;
    if (!SCHEDULING_ELIGIBLE_POLICIES.has(entry.policy as ServicePolicy)) continue;
    out.push(item);
  }
  return out;
}

export function getSchedulingEligibleServiceIds(section2: Section2Data): Set<string> {
  return new Set(getSchedulingEligibleServices(section2).map((s) => s.id));
}

export function isSchedulingEligibleServiceId(
  section2: Section2Data,
  serviceId: string,
): boolean {
  return getSchedulingEligibleServiceIds(section2).has(serviceId);
}
