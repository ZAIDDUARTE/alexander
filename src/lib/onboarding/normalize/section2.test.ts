import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeSection2 } from "./section2";
import { createDefaultSection2 } from "../types";
import { PLUMBING_SERVICES } from "../section2Catalog";

const ROW_ID = PLUMBING_SERVICES[0].id; // "general-plumbing-repair"

describe("normalizeSection2 — A: standard service policy", () => {
  it("a row set to 'We offer this' normalizes to policy = offered with no condition", () => {
    const data = createDefaultSection2();
    data.plumbingServices[ROW_ID] = { policy: "offered", condition: "" };
    const normalized = normalizeSection2(data);
    const row = normalized.plumbingServices.find((r) => r.id === ROW_ID);
    assert.ok(row);
    assert.equal(row!.policy, "offered");
    assert.equal(row!.condition, null);
  });
});

describe("normalizeSection2 — B: with conditions", () => {
  it("condition becomes applicable and appears in normalized output", () => {
    const data = createDefaultSection2();
    data.plumbingServices[ROW_ID] = {
      policy: "with_conditions",
      condition: "Only for existing customers.",
    };
    const normalized = normalizeSection2(data);
    const row = normalized.plumbingServices.find((r) => r.id === ROW_ID);
    assert.equal(row!.policy, "with_conditions");
    assert.equal(row!.condition, "Only for existing customers.");
  });
});

describe("normalizeSection2 — C: With conditions → We offer (stale data exclusion)", () => {
  it("stale raw condition remains in draft but MUST NOT reach normalized output", () => {
    const data = createDefaultSection2();
    data.plumbingServices[ROW_ID] = {
      policy: "with_conditions",
      condition: "Only for existing customers.",
    };
    // User changes their mind back to "We offer this"; draft retains
    // the stale text for UX convenience (never cleared on toggle).
    const afterChange = {
      ...data,
      plumbingServices: {
        ...data.plumbingServices,
        [ROW_ID]: { policy: "offered" as const, condition: data.plumbingServices[ROW_ID].condition },
      },
    };
    // Sanity: stale text really is still sitting in the raw draft.
    assert.equal(afterChange.plumbingServices[ROW_ID].condition, "Only for existing customers.");

    const normalized = normalizeSection2(afterChange);
    const row = normalized.plumbingServices.find((r) => r.id === ROW_ID);
    assert.equal(row!.policy, "offered");
    assert.equal(row!.condition, null);
  });
});

describe("normalizeSection2 — D: Ask our team first", () => {
  it("never includes an autonomous condition in normalized output", () => {
    const data = createDefaultSection2();
    data.plumbingServices[ROW_ID] = { policy: "ask_team", condition: "" };
    const normalized = normalizeSection2(data);
    const row = normalized.plumbingServices.find((r) => r.id === ROW_ID);
    assert.equal(row!.policy, "ask_team");
    assert.equal(row!.condition, null);
  });

  it("Q17 ask_team never includes a condition even if stale text exists in draft", () => {
    const data = createDefaultSection2();
    data.customerSuppliedMaterialsPolicy = "ask_team";
    data.customerSuppliedMaterialsCondition = "stale leftover text";
    const normalized = normalizeSection2(data);
    assert.equal(normalized.customerSuppliedMaterials.policy, "ask_team");
    assert.equal(normalized.customerSuppliedMaterials.condition, null);
  });
});

describe("normalizeSection2 — E: We don't offer", () => {
  it("never includes an autonomous condition in normalized output", () => {
    const data = createDefaultSection2();
    data.plumbingServices[ROW_ID] = { policy: "not_offered", condition: "" };
    const normalized = normalizeSection2(data);
    const row = normalized.plumbingServices.find((r) => r.id === ROW_ID);
    assert.equal(row!.policy, "not_offered");
    assert.equal(row!.condition, null);
  });
});

describe("normalizeSection2 — unanswered rows excluded", () => {
  it("a row that was never answered does not appear in normalized output at all", () => {
    const data = createDefaultSection2();
    const normalized = normalizeSection2(data);
    assert.equal(normalized.plumbingServices.length, 0);
  });
});

describe("normalizeSection2 — service area (F: applicability by mode)", () => {
  it("only the zip_codes branch is populated when that mode is selected", () => {
    const data = createDefaultSection2();
    data.serviceAreaDefinitionMode = "zip_codes";
    data.serviceAreaZipCodes = ["93560", "93560", "  ", "93561"];
    data.serviceAreaCities = ["Should not appear"];
    data.serviceAreaDistance = { address: "Should not appear", radiusMiles: "10" };

    const normalized = normalizeSection2(data);
    assert.deepEqual(normalized.serviceArea.zipCodes, ["93560", "93561"]);
    assert.equal(normalized.serviceArea.cities, null);
    assert.equal(normalized.serviceArea.distance, null);
  });

  it("only the distance branch is populated when that mode is selected", () => {
    const data = createDefaultSection2();
    data.serviceAreaDefinitionMode = "distance";
    data.serviceAreaDistance = { address: "123 Main St", radiusMiles: "25" };
    data.serviceAreaZipCodes = ["93560"];

    const normalized = normalizeSection2(data);
    assert.deepEqual(normalized.serviceArea.distance, { address: "123 Main St", radiusMiles: 25 });
    assert.equal(normalized.serviceArea.zipCodes, null);
  });

  it("excludes conditionalTerritories and incomplete cards when Q22 = no or entries incomplete", () => {
    const data = createDefaultSection2();
    data.hasConditionalTerritory = "no";
    data.conditionalTerritories = [{ id: "t1", area: "Rosamond", condition: "$75 fee" }];
    const normalized = normalizeSection2(data);
    assert.equal(normalized.serviceArea.hasConditionalTerritory, false);
    assert.equal(normalized.serviceArea.conditionalTerritories, null);
  });

  it("includes only complete conditionalTerritory cards when Q22 = yes", () => {
    const data = createDefaultSection2();
    data.hasConditionalTerritory = "yes";
    data.conditionalTerritories = [
      { id: "t1", area: "Rosamond", condition: "$75 travel fee" },
      { id: "t2", area: "Incomplete", condition: "" },
    ];
    const normalized = normalizeSection2(data);
    assert.deepEqual(normalized.serviceArea.conditionalTerritories, [
      { area: "Rosamond", condition: "$75 travel fee" },
    ]);
  });

  it("after-hours territory only appears when mode = smaller", () => {
    const data = createDefaultSection2();
    data.afterHoursAreaMode = "same";
    data.afterHoursServiceArea = "stale text from a previous 'smaller' selection";
    const normalized = normalizeSection2(data);
    assert.equal(normalized.serviceArea.afterHours.mode, "same");
    assert.equal(normalized.serviceArea.afterHours.territory, null);
  });
});
