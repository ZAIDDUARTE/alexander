import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateSection2, section2IsValid } from "./section2";
import { createDefaultSection2 } from "../types";
import { PLUMBING_SERVICES } from "../section2Catalog";

function fullyValidSection2() {
  const data = createDefaultSection2();
  for (const item of Object.keys(data.plumbingServices)) {
    data.plumbingServices[item] = { policy: "offered", condition: "" };
  }
  for (const item of Object.keys(data.diagnosticServices)) {
    data.diagnosticServices[item] = { policy: "offered", condition: "" };
  }
  for (const item of Object.keys(data.customerPropertyTypes)) {
    data.customerPropertyTypes[item] = { policy: "offered", condition: "" };
  }
  data.customerSuppliedMaterialsPolicy = "not_offered";
  data.correctiveWorkPolicy = "not_offered";
  data.serviceAreaDefinitionMode = "cities";
  data.serviceAreaCities = ["Rosamond"];
  data.hasConditionalTerritory = "no";
  data.afterHoursAreaMode = "same";
  return data;
}

describe("validateSection2 — matrices (H: blocks completion when incomplete)", () => {
  it("requires every plumbing service row to have a policy", () => {
    const data = fullyValidSection2();
    data.plumbingServices[PLUMBING_SERVICES[0].id] = { policy: "", condition: "" };
    const errors = validateSection2(data);
    assert.ok(errors.plumbingServices);
    assert.equal(section2IsValid(data), false);
  });

  it("requires condition text for a matrix row set to with_conditions", () => {
    const data = fullyValidSection2();
    data.plumbingServices[PLUMBING_SERVICES[0].id] = { policy: "with_conditions", condition: "" };
    const errors = validateSection2(data);
    assert.equal(errors.plumbingServices, undefined);
    assert.equal(
      errors[`plumbingServices.${PLUMBING_SERVICES[0].id}.condition`],
      "Describe the conditions for this service.",
    );
    assert.equal(section2IsValid(data), false);
  });

  it("rejects whitespace-only matrix conditions", () => {
    const data = fullyValidSection2();
    data.plumbingServices[PLUMBING_SERVICES[0].id] = {
      policy: "with_conditions",
      condition: "   ",
    };
    assert.equal(section2IsValid(data), false);
  });

  it("passes once the matrix with_conditions rule is filled", () => {
    const data = fullyValidSection2();
    data.plumbingServices[PLUMBING_SERVICES[0].id] = {
      policy: "with_conditions",
      condition: "Only for existing customers.",
    };
    assert.equal(section2IsValid(data), true);
  });
});

describe("validateSection2 — Q17/Q18 required condition (B: with conditions)", () => {
  it("requires condition text when Q17 = with_conditions", () => {
    const data = fullyValidSection2();
    data.customerSuppliedMaterialsPolicy = "with_conditions";
    data.customerSuppliedMaterialsCondition = "";
    const errors = validateSection2(data);
    assert.ok(errors.customerSuppliedMaterialsCondition);
    assert.equal(section2IsValid(data), false);
  });

  it("rejects whitespace-only Q17 conditions", () => {
    const data = fullyValidSection2();
    data.customerSuppliedMaterialsPolicy = "with_conditions";
    data.customerSuppliedMaterialsCondition = " \n\t ";
    assert.equal(section2IsValid(data), false);
  });

  it("passes once the required Q17 condition is filled", () => {
    const data = fullyValidSection2();
    data.customerSuppliedMaterialsPolicy = "with_conditions";
    data.customerSuppliedMaterialsCondition = "Only customer-supplied faucets.";
    assert.equal(section2IsValid(data), true);
  });

  it("requires condition text when Q18 = with_conditions", () => {
    const data = fullyValidSection2();
    data.correctiveWorkPolicy = "with_conditions";
    data.correctiveWorkCondition = "";
    const errors = validateSection2(data);
    assert.ok(errors.correctiveWorkCondition);
  });
});

describe("validateSection2 — Q19/Q20 service area", () => {
  it("requires at least one ZIP code when mode = zip_codes", () => {
    const data = fullyValidSection2();
    data.serviceAreaDefinitionMode = "zip_codes";
    data.serviceAreaCities = [];
    data.serviceAreaZipCodes = [];
    const errors = validateSection2(data);
    assert.ok(errors.serviceAreaZipCodes);
  });

  it("requires a positive radius when mode = distance", () => {
    const data = fullyValidSection2();
    data.serviceAreaDefinitionMode = "distance";
    data.serviceAreaCities = [];
    data.serviceAreaDistance = { address: "123 Main St", radiusMiles: "-5" };
    const errors = validateSection2(data);
    assert.ok(errors.serviceAreaDistanceRadius);
  });

  it("passes with a valid positive radius", () => {
    const data = fullyValidSection2();
    data.serviceAreaDefinitionMode = "distance";
    data.serviceAreaCities = [];
    data.serviceAreaDistance = { address: "123 Main St", radiusMiles: "25" };
    assert.equal(section2IsValid(data), true);
  });
});

describe("validateSection2 — Q22/Q23 conditional territory (F: Other/applicability)", () => {
  it("requires at least one complete area+condition entry when Q22 = yes", () => {
    const data = fullyValidSection2();
    data.hasConditionalTerritory = "yes";
    data.conditionalTerritories = [];
    const errors = validateSection2(data);
    assert.ok(errors.conditionalTerritories);
  });

  it("ignores Q23 entirely when Q22 = no", () => {
    const data = fullyValidSection2();
    data.hasConditionalTerritory = "no";
    data.conditionalTerritories = [];
    assert.equal(section2IsValid(data), true);
  });

  it("an incomplete card (area filled, condition blank) does not satisfy Q23", () => {
    const data = fullyValidSection2();
    data.hasConditionalTerritory = "yes";
    data.conditionalTerritories = [{ id: "t1", area: "Rosamond", condition: "" }];
    const errors = validateSection2(data);
    assert.ok(errors.conditionalTerritories);
  });
});

describe("validateSection2 — Q24/Q25 after-hours area", () => {
  it("requires after-hours area text when Q24 = smaller", () => {
    const data = fullyValidSection2();
    data.afterHoursAreaMode = "smaller";
    data.afterHoursServiceArea = "";
    const errors = validateSection2(data);
    assert.ok(errors.afterHoursServiceArea);
  });

  it("does not require after-hours area text for same/none", () => {
    const data = fullyValidSection2();
    data.afterHoursAreaMode = "none";
    assert.equal(section2IsValid(data), true);
  });
});

describe("validateSection2 — a fully answered section passes (H)", () => {
  it("is valid end to end", () => {
    const data = fullyValidSection2();
    assert.deepEqual(validateSection2(data), {});
    assert.equal(section2IsValid(data), true);
  });

  it("a brand-new Section 2 is not valid", () => {
    assert.equal(section2IsValid(createDefaultSection2()), false);
  });
});
