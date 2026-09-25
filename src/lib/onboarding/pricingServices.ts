import { DIAGNOSTIC_SERVICES, PLUMBING_SERVICES, type ServiceCatalogItem } from "./section2Catalog";
import type { Section2Data, ServicePolicy } from "./types";

const PRICING_DISCUSS_POLICIES = new Set<ServicePolicy>(["offered", "with_conditions", "ask_team"]);

const JOB_CATALOG: readonly ServiceCatalogItem[] = [...PLUMBING_SERVICES, ...DIAGNOSTIC_SERVICES];

/**
 * Q73 — services whose prices Alexander may discuss.
 * Eligible: offered | with_conditions | ask_team
 * Excluded: not_offered | unanswered
 */
export function getPricingDiscussEligibleServices(section2: Section2Data): ServiceCatalogItem[] {
  const out: ServiceCatalogItem[] = [];
  for (const item of JOB_CATALOG) {
    const entry =
      section2.plumbingServices[item.id] ?? section2.diagnosticServices[item.id];
    if (!entry) continue;
    if (!PRICING_DISCUSS_POLICIES.has(entry.policy as ServicePolicy)) continue;
    out.push(item);
  }
  return out;
}

export function getPricingDiscussEligibleServiceIds(section2: Section2Data): Set<string> {
  return new Set(getPricingDiscussEligibleServices(section2).map((s) => s.id));
}
