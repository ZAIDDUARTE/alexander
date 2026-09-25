import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { EMERGENCY_SCENARIOS } from "./section3Catalog";
import {
  createDefaultEmergencyClassifications,
  emergencyClassificationsAreAllRecommendedDefault,
  fillBlankQ26WithRecommendedDefault,
} from "./section3Defaults";
import { createDefaultDraft, createDefaultSection3, createEmptyContact } from "./types";
import { hasDraftContent, mergeWithDefaults } from "./draft-utils";

describe("Q26 recommended_default defaults", () => {
  it("fresh Q26 has all 15 rows = recommended_default", () => {
    const map = createDefaultEmergencyClassifications();
    assert.equal(Object.keys(map).length, EMERGENCY_SCENARIOS.length);
    for (const scenario of EMERGENCY_SCENARIOS) {
      assert.equal(map[scenario.id], "recommended_default");
    }
  });

  it("user can override a single row while others stay recommended_default", () => {
    const map = createDefaultEmergencyClassifications();
    map[EMERGENCY_SCENARIOS[0].id] = "emergency";
    assert.equal(map[EMERGENCY_SCENARIOS[0].id], "emergency");
    assert.equal(map[EMERGENCY_SCENARIOS[1].id], "recommended_default");
    assert.equal(emergencyClassificationsAreAllRecommendedDefault(map), false);
  });

  it("migration preserves explicit classifications and only fills blanks", () => {
    const legacy = createDefaultEmergencyClassifications();
    legacy[EMERGENCY_SCENARIOS[0].id] = "urgent";
    legacy[EMERGENCY_SCENARIOS[1].id] = "";
    const migrated = fillBlankQ26WithRecommendedDefault(legacy);
    assert.equal(migrated[EMERGENCY_SCENARIOS[0].id], "urgent");
    assert.equal(migrated[EMERGENCY_SCENARIOS[1].id], "recommended_default");
  });

  it("mergeWithDefaults upgrades blank legacy rows without overwriting choices", () => {
    const primary = createEmptyContact();
    const merged = mergeWithDefaults({
      section3: {
        ...createDefaultSection3(primary.id),
        emergencyClassifications: {
          [EMERGENCY_SCENARIOS[0].id]: "routine",
          [EMERGENCY_SCENARIOS[1].id]: "",
        },
      },
    });
    assert.equal(merged.section3.emergencyClassifications[EMERGENCY_SCENARIOS[0].id], "routine");
    assert.equal(
      merged.section3.emergencyClassifications[EMERGENCY_SCENARIOS[1].id],
      "recommended_default",
    );
  });

  it("fresh default scaffolding does not mark draft as dirty", () => {
    assert.equal(hasDraftContent(createDefaultDraft()), false);
  });
});
