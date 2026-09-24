import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateSection3, section3IsValid, contactIsValid } from "./section3";
import { createDefaultSection3, createEmptyContact, type Contact, type Section3Data } from "../types";
import { createDefaultOfficeHours } from "../schedule";
import { EMERGENCY_SCENARIOS } from "../section3Catalog";

function validContact(overrides: Partial<Contact> = {}): Contact {
  return {
    ...createEmptyContact(),
    nameOrRole: "Jamie Rivera, Dispatch Manager",
    phone: "+14155552671",
    availability: createDefaultOfficeHours(),
    callCategories: ["emergencies"],
    otherCategory: "",
    ...overrides,
  };
}

function fullyValidSection3(primaryId: string): Section3Data {
  const data = createDefaultSection3(primaryId);
  for (const s of EMERGENCY_SCENARIOS) {
    data.emergencyClassifications[s.id] = "emergency";
  }
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
  return data;
}

describe("validateSection3 — A: Q26 every scenario classified", () => {
  it("blocks completion when any scenario is unclassified", () => {
    const primary = validContact();
    const data = fullyValidSection3(primary.id);
    data.emergencyClassifications[EMERGENCY_SCENARIOS[0].id] = "";
    const errors = validateSection3(data, [primary]);
    assert.ok(errors.emergencyClassifications);
    assert.equal(section3IsValid(data, [primary]), false);
  });

  it("passes once every scenario has a classification", () => {
    const primary = validContact();
    const data = fullyValidSection3(primary.id);
    assert.equal(section3IsValid(data, [primary]), true);
  });
});

describe("validateSection3 — B: recommended-default state accepted", () => {
  it("accepts 'recommended_default' as a fully valid classification, not an error", () => {
    const primary = validContact();
    const data = fullyValidSection3(primary.id);
    data.emergencyClassifications[EMERGENCY_SCENARIOS[0].id] = "recommended_default";
    const errors = validateSection3(data, [primary]);
    assert.equal(errors.emergencyClassifications, undefined);
    assert.equal(section3IsValid(data, [primary]), true);
  });
});

describe("validateSection3 — C: Q27 None exclusivity", () => {
  it("rejects None combined with a scenario selection", () => {
    const primary = validContact();
    const data = fullyValidSection3(primary.id);
    data.dispatchApproval = ["none", EMERGENCY_SCENARIOS[0].id];
    const errors = validateSection3(data, [primary]);
    assert.ok(errors.dispatchApproval);
  });

  it("accepts None alone", () => {
    const primary = validContact();
    const data = fullyValidSection3(primary.id);
    data.dispatchApproval = ["none"];
    assert.equal(section3IsValid(data, [primary]), true);
  });

  it("requires at least one selection", () => {
    const primary = validContact();
    const data = fullyValidSection3(primary.id);
    data.dispatchApproval = [];
    const errors = validateSection3(data, [primary]);
    assert.ok(errors.dispatchApproval);
  });
});

describe("validateSection3 — D: Q27 Other requires text", () => {
  it("requires 'Which situations?' text when Other is selected", () => {
    const primary = validContact();
    const data = fullyValidSection3(primary.id);
    data.dispatchApproval = [EMERGENCY_SCENARIOS[0].id, "other"];
    data.dispatchApprovalOtherDetail = "";
    const errors = validateSection3(data, [primary]);
    assert.ok(errors.dispatchApprovalOtherDetail);
  });

  it("passes once the Other detail is filled", () => {
    const primary = validContact();
    const data = fullyValidSection3(primary.id);
    data.dispatchApproval = [EMERGENCY_SCENARIOS[0].id, "other"];
    data.dispatchApprovalOtherDetail = "Backyard leak detection situations.";
    assert.equal(section3IsValid(data, [primary]), true);
  });
});

describe("validateSection3 — E: Q28 all 3 dropdowns required", () => {
  it("blocks completion when any of the three rows is blank", () => {
    const primary = validContact();
    const data = fullyValidSection3(primary.id);
    data.afterHoursDisposition.routine = "";
    const errors = validateSection3(data, [primary]);
    assert.ok(errors.afterHoursDisposition);
  });
});

describe("validateSection3 — F: Q29 → Q30 applicability", () => {
  it("does not require a schedule when Q29 = 24_7", () => {
    const primary = validContact();
    const data = fullyValidSection3(primary.id);
    data.emergencyServiceMode = "24_7";
    assert.equal(section3IsValid(data, [primary]), true);
  });

  it("does not require a schedule when Q29 = none", () => {
    const primary = validContact();
    const data = fullyValidSection3(primary.id);
    data.emergencyServiceMode = "none";
    assert.equal(section3IsValid(data, [primary]), true);
  });

  it("requires a valid schedule with at least one open day when Q29 = certain_hours", () => {
    const primary = validContact();
    const data = fullyValidSection3(primary.id);
    data.emergencyServiceMode = "certain_hours";
    // emergencyServiceSchedule defaults to all-closed (createEmptyAnsweringSchedule)
    const errors = validateSection3(data, [primary]);
    assert.ok(errors.emergencyServiceSchedule);
    assert.equal(section3IsValid(data, [primary]), false);

    data.emergencyServiceSchedule = createDefaultOfficeHours();
    assert.equal(section3IsValid(data, [primary]), true);
  });
});

describe("validateSection3 — G: Q31 contact E.164 + schedule validation", () => {
  it("rejects an invalid phone number", () => {
    const primary = validContact({ phone: "not-a-phone" });
    const data = fullyValidSection3(primary.id);
    const errors = validateSection3(data, [primary]);
    assert.ok(errors["primaryContact.phone"]);
  });

  it("rejects a contact with no available days", () => {
    const primary = validContact({ availability: createEmptyContact().availability });
    const data = fullyValidSection3(primary.id);
    const errors = validateSection3(data, [primary]);
    assert.ok(errors["primaryContact.schedule"]);
  });

  it("rejects a missing name/role", () => {
    const primary = validContact({ nameOrRole: "" });
    const data = fullyValidSection3(primary.id);
    const errors = validateSection3(data, [primary]);
    assert.ok(errors["primaryContact.nameOrRole"]);
  });

  it("passes a fully valid contact", () => {
    const primary = validContact();
    assert.equal(contactIsValid(primary), true);
  });
});

describe("validateSection3 — H: Q31 Other call category", () => {
  it("requires custom category text when Other is selected", () => {
    const primary = validContact({ callCategories: ["other"], otherCategory: "" });
    const data = fullyValidSection3(primary.id);
    const errors = validateSection3(data, [primary]);
    assert.ok(errors["primaryContact.otherCategory"]);
  });

  it("passes once the Other detail is filled", () => {
    const primary = validContact({ callCategories: ["other"], otherCategory: "Vendor escalations" });
    const data = fullyValidSection3(primary.id);
    assert.equal(section3IsValid(data, [primary]), true);
  });
});

describe("validateSection3 — I: Q32 backup conditional behavior", () => {
  it("does not validate a backup contact when Q32 = no", () => {
    const primary = validContact();
    const data = fullyValidSection3(primary.id);
    data.hasBackupContact = "no";
    data.backupContactId = "some-incomplete-id-that-does-not-exist";
    assert.equal(section3IsValid(data, [primary]), true);
  });

  it("validates the backup contact fully when Q32 = yes", () => {
    const primary = validContact();
    const backup = createEmptyContact(); // incomplete
    const data = fullyValidSection3(primary.id);
    data.hasBackupContact = "yes";
    data.backupContactId = backup.id;
    const errors = validateSection3(data, [primary, backup]);
    assert.ok(errors["backupContact.nameOrRole"]);
    assert.equal(section3IsValid(data, [primary, backup]), false);
  });

  it("passes once the backup contact is complete", () => {
    const primary = validContact();
    const backup = validContact();
    const data = fullyValidSection3(primary.id);
    data.hasBackupContact = "yes";
    data.backupContactId = backup.id;
    assert.equal(section3IsValid(data, [primary, backup]), true);
  });
});

describe("validateSection3 — J: Q33 custom fallback", () => {
  it("requires custom rule text when 'Follow another rule' is selected", () => {
    const primary = validContact();
    const data = fullyValidSection3(primary.id);
    data.nobodyRespondsFallback = "custom";
    data.nobodyRespondsCustomRule = "";
    const errors = validateSection3(data, [primary]);
    assert.ok(errors.nobodyRespondsCustomRule);
  });

  it("passes once the custom rule is filled", () => {
    const primary = validContact();
    const data = fullyValidSection3(primary.id);
    data.nobodyRespondsFallback = "custom";
    data.nobodyRespondsCustomRule = "Escalate to the owner's cell phone.";
    assert.equal(section3IsValid(data, [primary]), true);
  });
});

describe("validateSection3 — K: Q34 custom retry", () => {
  it("requires custom retry text when 'Use another rule' is selected", () => {
    const primary = validContact();
    const data = fullyValidSection3(primary.id);
    data.retryRule = "custom";
    data.retryCustomRule = "";
    const errors = validateSection3(data, [primary]);
    assert.ok(errors.retryCustomRule);
  });

  it("passes once the custom retry rule is filled", () => {
    const primary = validContact();
    const data = fullyValidSection3(primary.id);
    data.retryRule = "custom";
    data.retryCustomRule = "Try both people simultaneously.";
    assert.equal(section3IsValid(data, [primary]), true);
  });
});

describe("validateSection3 — L: Q35 reserved → Q36", () => {
  it("requires reserved-capacity text when Q35 = reserved_capacity", () => {
    const primary = validContact();
    const data = fullyValidSection3(primary.id);
    data.capacityMode = "reserved_capacity";
    data.reservedCapacityText = "";
    const errors = validateSection3(data, [primary]);
    assert.ok(errors.reservedCapacityText);
    assert.equal(errors.overrideConditionsText, undefined);
    assert.equal(errors.approverContactId, undefined);
  });

  it("passes once the reserved-capacity text is filled", () => {
    const primary = validContact();
    const data = fullyValidSection3(primary.id);
    data.capacityMode = "reserved_capacity";
    data.reservedCapacityText = "Keep one same-day appointment available whenever possible.";
    assert.equal(section3IsValid(data, [primary]), true);
  });
});

describe("validateSection3 — M: Q35 override → Q37", () => {
  it("requires override conditions when Q35 = emergency_override", () => {
    const primary = validContact();
    const data = fullyValidSection3(primary.id);
    data.capacityMode = "emergency_override";
    data.overrideConditionsText = "";
    const errors = validateSection3(data, [primary]);
    assert.ok(errors.overrideConditionsText);
  });

  it("passes once override conditions are filled", () => {
    const primary = validContact();
    const data = fullyValidSection3(primary.id);
    data.capacityMode = "emergency_override";
    data.overrideConditionsText = "Only for confirmed active water leaks.";
    assert.equal(section3IsValid(data, [primary]), true);
  });
});

describe("validateSection3 — N: Q35 approval → Q38", () => {
  it("requires an approver contact id when Q35 = authorized_approval", () => {
    const primary = validContact();
    const data = fullyValidSection3(primary.id);
    data.capacityMode = "authorized_approval";
    data.approverContactId = "";
    const errors = validateSection3(data, [primary]);
    assert.ok(errors.approverContactId);
  });

  it("rejects an approver id that does not exist in the registry", () => {
    const primary = validContact();
    const data = fullyValidSection3(primary.id);
    data.capacityMode = "authorized_approval";
    data.approverContactId = "not-a-real-id";
    const errors = validateSection3(data, [primary]);
    assert.ok(errors.approverContactId);
  });

  it("passes when the approver is the already-valid primary contact", () => {
    const primary = validContact();
    const data = fullyValidSection3(primary.id);
    data.capacityMode = "authorized_approval";
    data.approverContactId = primary.id;
    assert.equal(section3IsValid(data, [primary]), true);
  });

  it("Q38 new approver requires name/role + valid E.164 phone only", () => {
    const primary = validContact();
    const newApprover = createEmptyContact();
    newApprover.nameOrRole = "Owner";
    newApprover.phone = "+14155552699";
    // No schedule / categories — must still be valid for Q38.
    const data = fullyValidSection3(primary.id);
    data.capacityMode = "authorized_approval";
    data.approverContactId = newApprover.id;
    assert.equal(section3IsValid(data, [primary, newApprover]), true);
  });

  it("Q38 new approver does NOT require weekly availability or call categories", () => {
    const primary = validContact();
    const newApprover = createEmptyContact();
    newApprover.nameOrRole = "Owner";
    newApprover.phone = "+14155552699";
    const data = fullyValidSection3(primary.id);
    data.capacityMode = "authorized_approval";
    data.approverContactId = newApprover.id;
    const errors = validateSection3(data, [primary, newApprover]);
    assert.equal(errors["approverContact.schedule"], undefined);
    assert.equal(errors["approverContact.callCategories"], undefined);
    assert.equal(errors["approverContact.nameOrRole"], undefined);
    assert.equal(errors["approverContact.phone"], undefined);
  });

  it("Q38 new approver still requires a valid E.164 phone", () => {
    const primary = validContact();
    const newApprover = createEmptyContact();
    newApprover.nameOrRole = "Owner";
    newApprover.phone = "not-a-phone";
    const data = fullyValidSection3(primary.id);
    data.capacityMode = "authorized_approval";
    data.approverContactId = newApprover.id;
    const errors = validateSection3(data, [primary, newApprover]);
    assert.ok(errors["approverContact.phone"]);
  });

  it("Q31 still requires schedule and categories (not weakened by Q38 change)", () => {
    const primary = validContact({ callCategories: [], availability: createEmptyContact().availability });
    const data = fullyValidSection3(primary.id);
    const errors = validateSection3(data, [primary]);
    assert.ok(errors["primaryContact.callCategories"] || errors["primaryContact.schedule"]);
  });

  it("Q32 still requires schedule and categories when backup is active", () => {
    const primary = validContact();
    const backup = createEmptyContact();
    backup.nameOrRole = "Backup";
    backup.phone = "+14155552671";
    // missing schedule + categories
    const data = fullyValidSection3(primary.id);
    data.hasBackupContact = "yes";
    data.backupContactId = backup.id;
    const errors = validateSection3(data, [primary, backup]);
    assert.ok(errors["backupContact.callCategories"] || errors["backupContact.schedule"]);
  });
});
