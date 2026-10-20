import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CUSTOMER_PROPERTY_TYPES,
  DIAGNOSTIC_SERVICES,
  PLUMBING_SERVICES,
} from "./section2Catalog";
import {
  CORRECTIVE_WORK_CONDITION_PLACEHOLDER,
  CUSTOMER_PROPERTY_CONDITION_PLACEHOLDERS,
  CUSTOMER_SUPPLIED_CONDITION_PLACEHOLDER,
  DIAGNOSTIC_CONDITION_PLACEHOLDERS,
  PLUMBING_CONDITION_PLACEHOLDERS,
} from "./section2Placeholders";
import { CAPACITY_CONDITION_PLACEHOLDERS } from "./section4Placeholders";
import { createDefaultSection2, createDefaultSection4, createDefaultSection5 } from "./types";

function assertPlaceholdersStayOutOfDefaults(
  items: readonly { id: string }[],
  placeholders: Readonly<Record<string, string>>,
  stored: Record<string, { condition: string }>,
) {
  for (const item of items) {
    const placeholder = placeholders[item.id];
    assert.equal(typeof placeholder, "string");
    assert.ok(placeholder.length > 0);
    assert.equal(stored[item.id]?.condition, "");
    assert.notEqual(stored[item.id]?.condition, placeholder);
  }
}

describe("October 1 service placeholders", () => {
  it("does not write plumbing, diagnostic, or customer placeholders into default answers", () => {
    const section2 = createDefaultSection2();
    assertPlaceholdersStayOutOfDefaults(
      PLUMBING_SERVICES,
      PLUMBING_CONDITION_PLACEHOLDERS,
      section2.plumbingServices,
    );
    assertPlaceholdersStayOutOfDefaults(
      DIAGNOSTIC_SERVICES,
      DIAGNOSTIC_CONDITION_PLACEHOLDERS,
      section2.diagnosticServices,
    );
    assertPlaceholdersStayOutOfDefaults(
      CUSTOMER_PROPERTY_TYPES,
      CUSTOMER_PROPERTY_CONDITION_PLACEHOLDERS,
      section2.customerPropertyTypes,
    );
    assert.equal(section2.customerSuppliedMaterialsCondition, "");
    assert.equal(section2.correctiveWorkCondition, "");
    assert.notEqual(section2.customerSuppliedMaterialsCondition, CUSTOMER_SUPPLIED_CONDITION_PLACEHOLDER);
    assert.notEqual(section2.correctiveWorkCondition, CORRECTIVE_WORK_CONDITION_PLACEHOLDER);
    const serialized = JSON.stringify(section2);
    assert.equal(serialized.includes(CUSTOMER_SUPPLIED_CONDITION_PLACEHOLDER), false);
    assert.equal(serialized.includes(CORRECTIVE_WORK_CONDITION_PLACEHOLDER), false);
    assert.equal(serialized.includes(PLUMBING_CONDITION_PLACEHOLDERS["general-plumbing-repair"]), false);
  });

  it("does not write same-day or holiday placeholders into default capacity answers", () => {
    const section4 = createDefaultSection4();
    assert.equal(section4.capacityPolicies.same_day?.condition, "");
    assert.equal(section4.capacityPolicies.holiday?.condition, "");
    const serialized = JSON.stringify(section4);
    assert.equal(serialized.includes(CAPACITY_CONDITION_PLACEHOLDERS.same_day), false);
    assert.equal(serialized.includes(CAPACITY_CONDITION_PLACEHOLDERS.holiday), false);
  });

  it("does not prefill the material-pricing sentence on a new draft", () => {
    const section5 = createDefaultSection5();
    assert.equal(section5.materialMarkupPolicy, "");
    assert.equal(section5.materialMarkupCustomerExplanation, "");
  });
});
