import type { Section2Data } from "./types";

/**
 * Q69 — suggest territory labels from Section 2 service area without
 * forcing re-entry. Not geocoding; plain strings only.
 */
export function getTerritorySuggestions(section2: Section2Data): string[] {
  const out: string[] = [];
  const push = (s: string) => {
    const t = s.trim();
    if (t && !out.includes(t)) out.push(t);
  };
  for (const z of section2.serviceAreaZipCodes) push(z);
  for (const c of section2.serviceAreaCities) push(c);
  for (const row of section2.conditionalTerritories) {
    push(row.area);
  }
  if (section2.excludedTerritory.trim()) push(`Outside: ${section2.excludedTerritory.trim()}`);
  if (section2.afterHoursServiceArea.trim()) push(section2.afterHoursServiceArea);
  return out;
}
