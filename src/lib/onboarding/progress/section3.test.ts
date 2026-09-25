import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getSection3Progress, getSection3ProgressUnits } from "./section3";
import { createDefaultSection3, createEmptyContact, type Contact } from "../types";
import { createDefaultOfficeHours } from "../schedule";
import { EMERGENCY_SCENARIOS } from "../section3Catalog";

function validContact(overrides: Partial<Contact> = {}): Contact {
  return {
    ...createEmptyContact(),
    nameOrRole: "Jamie Rivera",
    phone: "+14155552671",
    availability: createDefaultOfficeHours(),
    callCategories: ["emergencies"],
    otherCategory: "",
    ...overrides,
  };
}

describe("getSection3Progress — fresh section", () => {
  it("counts Q26 complete when all rows use recommended_default (MD-approved default)", () => {
    const primary = createEmptyContact();
    const data = createDefaultSection3(primary.id);
    const units = getSection3ProgressUnits(data, [primary]);
    assert.equal(units[0].complete, true);
    const progress = getSection3Progress(data, [primary]);
    assert.ok(progress > 0);
    assert.ok(progress < 1);
  });
});

describe("getSection3Progress — Q: conditional units affect the denominator", () => {
  it("Q30 unit is NOT in the denominator until Q29 = certain_hours", () => {
    const primary = validContact();
    const without = createDefaultSection3(primary.id);
    without.emergencyServiceMode = "24_7";
    const unitsWithout = getSection3ProgressUnits(without, [primary]).filter((u) => u.applicable);

    const withCertainHours = createDefaultSection3(primary.id);
    withCertainHours.emergencyServiceMode = "certain_hours";
    const unitsWith = getSection3ProgressUnits(withCertainHours, [primary]).filter((u) => u.applicable);

    assert.equal(unitsWith.length, unitsWithout.length + 1);
  });

  it("Q32 backup-card unit is NOT in the denominator until Q32 = yes", () => {
    const primary = validContact();
    const no = createDefaultSection3(primary.id);
    no.hasBackupContact = "no";
    const unitsNo = getSection3ProgressUnits(no, [primary]).filter((u) => u.applicable);

    const backup = validContact();
    const yes = createDefaultSection3(primary.id);
    yes.hasBackupContact = "yes";
    yes.backupContactId = backup.id;
    const unitsYes = getSection3ProgressUnits(yes, [primary, backup]).filter((u) => u.applicable);

    assert.equal(unitsYes.length, unitsNo.length + 1);
  });

  it("Q36/Q37/Q38 — exactly one of the three enters the denominator per Q35 branch", () => {
    const primary = validContact();

    const reserved = createDefaultSection3(primary.id);
    reserved.capacityMode = "reserved_capacity";
    const reservedApplicable = getSection3ProgressUnits(reserved, [primary]).filter((u) => u.applicable);

    const override = createDefaultSection3(primary.id);
    override.capacityMode = "emergency_override";
    const overrideApplicable = getSection3ProgressUnits(override, [primary]).filter((u) => u.applicable);

    const approval = createDefaultSection3(primary.id);
    approval.capacityMode = "authorized_approval";
    const approvalApplicable = getSection3ProgressUnits(approval, [primary]).filter((u) => u.applicable);

    const none = createDefaultSection3(primary.id);
    none.capacityMode = "no_override";
    const noneApplicable = getSection3ProgressUnits(none, [primary]).filter((u) => u.applicable);

    // Each of reserved/override/approval adds exactly one applicable
    // unit relative to "no_override" (which adds none of the three).
    assert.equal(reservedApplicable.length, noneApplicable.length + 1);
    assert.equal(overrideApplicable.length, noneApplicable.length + 1);
    assert.equal(approvalApplicable.length, noneApplicable.length + 1);
  });

  it("selecting a conditional option without filling it in never scores higher than a non-conditional choice", () => {
    const primary = validContact();
    const noOverride = createDefaultSection3(primary.id);
    noOverride.capacityMode = "no_override";

    const reservedUnfilled = createDefaultSection3(primary.id);
    reservedUnfilled.capacityMode = "reserved_capacity";

    assert.ok(
      getSection3Progress(reservedUnfilled, [primary]) <= getSection3Progress(noOverride, [primary]),
    );
  });
});

describe("getSection3Progress — Q26 matrix completion", () => {
  it("counts as complete only once every scenario has a classification", () => {
    const primary = validContact();
    const data = createDefaultSection3(primary.id);
    const ids = EMERGENCY_SCENARIOS.map((s) => s.id);
    for (const id of ids.slice(0, -1)) {
      data.emergencyClassifications[id] = "routine";
    }
    data.emergencyClassifications[ids[ids.length - 1]] = "";
    assert.equal(getSection3ProgressUnits(data, [primary])[0].complete, false);

    data.emergencyClassifications[ids[ids.length - 1]] = "routine";
    assert.equal(getSection3ProgressUnits(data, [primary])[0].complete, true);
  });
});

describe("getSection3Progress — contact composite unit", () => {
  it("counts the primary contact as one unit, not per-field", () => {
    const incompletePrimary = createEmptyContact();
    const data = createDefaultSection3(incompletePrimary.id);
    const units = getSection3ProgressUnits(data, [incompletePrimary]);
    // Unit index 5 is Q31 (primary contact) per the documented order.
    assert.equal(units[5].complete, false);

    const completePrimary = { ...incompletePrimary, ...validContact() };
    // keep the same id so it still resolves via primaryContactId
    completePrimary.id = incompletePrimary.id;
    const unitsComplete = getSection3ProgressUnits(data, [completePrimary]);
    assert.equal(unitsComplete[5].complete, true);
  });
});

describe("getSection3Progress — reaches 1 when fully answered", () => {
  it("progress is 1 once every applicable unit is complete", () => {
    const primary = validContact();
    const data = createDefaultSection3(primary.id);
    for (const s of EMERGENCY_SCENARIOS) data.emergencyClassifications[s.id] = "emergency";
    data.dispatchApproval = ["none"];
    data.afterHoursDisposition = {
      emergency: "attempt_contact",
      urgent_contained: "arrange_callback",
      routine: "info_only",
    };
    data.emergencyServiceMode = "24_7";
    data.hasBackupContact = "no";
    data.nobodyRespondsFallback = "callback";
    data.retryRule = "move_immediately_to_next";
    data.capacityMode = "no_override";

    assert.equal(getSection3Progress(data, [primary]), 1);
  });
});
