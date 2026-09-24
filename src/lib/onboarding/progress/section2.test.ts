import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getSection2Progress, getSection2ProgressUnits } from "./section2";
import { createDefaultSection2 } from "../types";

describe("getSection2Progress — fresh section", () => {
  it("starts at 0 with no defaults authorized by the MD for Q14–Q25", () => {
    const data = createDefaultSection2();
    assert.equal(getSection2Progress(data), 0);
  });
});

describe("getSection2Progress — G: conditional units affect the denominator", () => {
  it("Q17 condition unit is NOT in the denominator until Q17 = with_conditions", () => {
    const withoutConditions = createDefaultSection2();
    withoutConditions.customerSuppliedMaterialsPolicy = "not_offered";
    const unitsWithout = getSection2ProgressUnits(withoutConditions).filter((u) => u.applicable);

    const withConditions = createDefaultSection2();
    withConditions.customerSuppliedMaterialsPolicy = "with_conditions";
    const unitsWith = getSection2ProgressUnits(withConditions).filter((u) => u.applicable);

    // Selecting "with_conditions" adds exactly one more applicable unit
    // (the required condition field) to the denominator.
    assert.equal(unitsWith.length, unitsWithout.length + 1);
  });

  it("selecting with_conditions without filling it in does not score higher than an answered non-conditional choice", () => {
    const notOffered = createDefaultSection2();
    notOffered.customerSuppliedMaterialsPolicy = "not_offered";

    const withConditionsUnfilled = createDefaultSection2();
    withConditionsUnfilled.customerSuppliedMaterialsPolicy = "with_conditions";

    assert.ok(getSection2Progress(withConditionsUnfilled) <= getSection2Progress(notOffered));
  });

  it("Q23 unit only enters the denominator when Q22 = yes", () => {
    const no = createDefaultSection2();
    no.hasConditionalTerritory = "no";
    const unitsNo = getSection2ProgressUnits(no).filter((u) => u.applicable);

    const yes = createDefaultSection2();
    yes.hasConditionalTerritory = "yes";
    const unitsYes = getSection2ProgressUnits(yes).filter((u) => u.applicable);

    assert.equal(unitsYes.length, unitsNo.length + 1);
  });

  it("Q25 unit only enters the denominator when Q24 = smaller", () => {
    const same = createDefaultSection2();
    same.afterHoursAreaMode = "same";
    const unitsSame = getSection2ProgressUnits(same).filter((u) => u.applicable);

    const smaller = createDefaultSection2();
    smaller.afterHoursAreaMode = "smaller";
    const unitsSmaller = getSection2ProgressUnits(smaller).filter((u) => u.applicable);

    assert.equal(unitsSmaller.length, unitsSame.length + 1);
  });
});

describe("getSection2Progress — matrix completion", () => {
  it("a matrix counts as complete only once every row has a policy", () => {
    const data = createDefaultSection2();
    const ids = Object.keys(data.plumbingServices);
    for (const id of ids.slice(0, -1)) {
      data.plumbingServices[id] = { policy: "offered", condition: "" };
    }
    const units = getSection2ProgressUnits(data);
    const plumbingUnit = units[0];
    assert.equal(plumbingUnit.complete, false);

    data.plumbingServices[ids[ids.length - 1]] = { policy: "offered", condition: "" };
    const unitsComplete = getSection2ProgressUnits(data);
    assert.equal(unitsComplete[0].complete, true);
  });

  it("a with_conditions row without a rule keeps the matrix incomplete", () => {
    const data = createDefaultSection2();
    for (const id of Object.keys(data.plumbingServices)) {
      data.plumbingServices[id] = { policy: "offered", condition: "" };
    }
    const firstId = Object.keys(data.plumbingServices)[0];
    data.plumbingServices[firstId] = { policy: "with_conditions", condition: "" };
    assert.equal(getSection2ProgressUnits(data)[0].complete, false);

    data.plumbingServices[firstId] = {
      policy: "with_conditions",
      condition: "Only weekdays.",
    };
    assert.equal(getSection2ProgressUnits(data)[0].complete, true);
  });
});

describe("getSection2Progress — reaches 1 when fully answered", () => {
  it("progress is 1 once every applicable unit is complete", () => {
    const data = createDefaultSection2();
    for (const map of [data.plumbingServices, data.diagnosticServices, data.customerPropertyTypes]) {
      for (const id of Object.keys(map)) {
        map[id] = { policy: "offered", condition: "" };
      }
    }
    data.customerSuppliedMaterialsPolicy = "not_offered";
    data.correctiveWorkPolicy = "not_offered";
    data.serviceAreaDefinitionMode = "cities";
    data.serviceAreaCities = ["Rosamond"];
    data.hasConditionalTerritory = "no";
    data.afterHoursAreaMode = "same";

    assert.equal(getSection2Progress(data), 1);
  });
});
