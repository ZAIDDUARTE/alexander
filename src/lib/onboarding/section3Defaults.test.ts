import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { EMERGENCY_SCENARIOS } from "./section3Catalog";
import {
  EMERGENCY_ROW_DEFAULTS,
  createDefaultEmergencyClassifications,
  emergencyClassificationsMatchDefaults,
  fillBlankEmergencyClassifications,
} from "./section3Defaults";
import { createDefaultDraft, createDefaultSection3, createEmptyContact } from "./types";
import { hasDraftContent, mergeWithDefaults } from "./draft-utils";

describe("Q26 scenario defaults", () => {
  it("fresh Q26 preselects the approved classification for every scenario", () => {
    const map = createDefaultEmergencyClassifications();
    assert.equal(Object.keys(map).length, EMERGENCY_SCENARIOS.length);
    assert.equal(EMERGENCY_SCENARIOS.length, 15);
    for (const scenario of EMERGENCY_SCENARIOS) {
      assert.equal(map[scenario.id], EMERGENCY_ROW_DEFAULTS[scenario.id]);
    }
  });

  it("a customer change on one row leaves the other defaults in place", () => {
    const map = createDefaultEmergencyClassifications();
    map[EMERGENCY_SCENARIOS[0].id] = "routine";
    assert.equal(map[EMERGENCY_SCENARIOS[0].id], "routine");
    assert.equal(map[EMERGENCY_SCENARIOS[1].id], EMERGENCY_ROW_DEFAULTS[EMERGENCY_SCENARIOS[1].id]);
    assert.equal(emergencyClassificationsMatchDefaults(map), false);
  });

  it("blank rows receive the scenario default and explicit answers stay", () => {
    const legacy = createDefaultEmergencyClassifications();
    legacy[EMERGENCY_SCENARIOS[0].id] = "urgent";
    legacy[EMERGENCY_SCENARIOS[1].id] = "";
    const migrated = fillBlankEmergencyClassifications(legacy);
    assert.equal(migrated[EMERGENCY_SCENARIOS[0].id], "urgent");
    assert.equal(
      migrated[EMERGENCY_SCENARIOS[1].id],
      EMERGENCY_ROW_DEFAULTS[EMERGENCY_SCENARIOS[1].id],
    );
  });

  it("mergeWithDefaults fills a blank row without overwriting a saved choice", () => {
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
      EMERGENCY_ROW_DEFAULTS[EMERGENCY_SCENARIOS[1].id],
    );
  });

  it("fresh default scaffolding does not mark draft as dirty", () => {
    assert.equal(hasDraftContent(createDefaultDraft()), false);
  });
});
