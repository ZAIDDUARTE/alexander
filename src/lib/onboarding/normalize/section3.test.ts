import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeSection3 } from "./section3";
import { createDefaultSection3, createEmptyContact, type Contact } from "../types";
import { createDefaultOfficeHours, createEmptyAnsweringSchedule } from "../schedule";
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

describe("normalizeSection3 — emergency classifications", () => {
  it("includes all classified rows (recommended_default counts as Company Truth)", () => {
    const primary = validContact();
    const data = createDefaultSection3(primary.id);
    data.emergencyClassifications[EMERGENCY_SCENARIOS[0].id] = "emergency";
    const normalized = normalizeSection3(data, [primary]);
    assert.equal(normalized.emergencyClassifications.length, EMERGENCY_SCENARIOS.length);
    const first = normalized.emergencyClassifications.find((r) => r.id === EMERGENCY_SCENARIOS[0].id);
    assert.deepEqual(first, {
      id: EMERGENCY_SCENARIOS[0].id,
      name: EMERGENCY_SCENARIOS[0].label,
      classification: "emergency",
    });
    const second = normalized.emergencyClassifications.find((r) => r.id === EMERGENCY_SCENARIOS[1].id);
    assert.equal(second?.classification, "recommended_default");
  });

  it("excludes legacy blank (unanswered) scenario rows", () => {
    const primary = validContact();
    const data = createDefaultSection3(primary.id);
    for (const scenario of EMERGENCY_SCENARIOS) {
      data.emergencyClassifications[scenario.id] = "";
    }
    data.emergencyClassifications[EMERGENCY_SCENARIOS[0].id] = "emergency";
    const normalized = normalizeSection3(data, [primary]);
    assert.equal(normalized.emergencyClassifications.length, 1);
  });

  it("preserves 'recommended_default' as a real classification value (no invented substitution)", () => {
    const primary = validContact();
    const data = createDefaultSection3(primary.id);
    data.emergencyClassifications[EMERGENCY_SCENARIOS[0].id] = "recommended_default";
    const normalized = normalizeSection3(data, [primary]);
    assert.equal(normalized.emergencyClassifications[0].classification, "recommended_default");
  });
});

describe("normalizeSection3 — Q27 dispatch approval", () => {
  it("None excludes scenario ids and other detail even if raw draft has stale values", () => {
    const primary = validContact();
    const data = createDefaultSection3(primary.id);
    data.dispatchApproval = ["none"];
    data.dispatchApprovalOtherDetail = "stale text from before switching to None";
    const normalized = normalizeSection3(data, [primary]);
    assert.deepEqual(normalized.dispatchApproval, {
      scenarioIds: [],
      other: false,
      otherDetail: null,
      none: true,
    });
  });

  it("includes scenario ids and other detail when Other is active", () => {
    const primary = validContact();
    const data = createDefaultSection3(primary.id);
    data.dispatchApproval = [EMERGENCY_SCENARIOS[0].id, "other"];
    data.dispatchApprovalOtherDetail = "Backyard leaks.";
    const normalized = normalizeSection3(data, [primary]);
    assert.deepEqual(normalized.dispatchApproval.scenarioIds, [EMERGENCY_SCENARIOS[0].id]);
    assert.equal(normalized.dispatchApproval.other, true);
    assert.equal(normalized.dispatchApproval.otherDetail, "Backyard leaks.");
  });
});

describe("normalizeSection3 — Q29/Q30 after-hours emergency service", () => {
  it("nulls the schedule when Q29 != certain_hours (null Q30 unless Q29 requires it)", () => {
    const primary = validContact();
    const data = createDefaultSection3(primary.id);
    data.emergencyServiceMode = "24_7";
    data.emergencyServiceSchedule = createDefaultOfficeHours(); // stale, still in raw draft
    const normalized = normalizeSection3(data, [primary]);
    assert.equal(normalized.emergencyService.mode, "24_7");
    assert.equal(normalized.emergencyService.schedule, null);
  });

  it("includes the schedule when Q29 = certain_hours", () => {
    const primary = validContact();
    const data = createDefaultSection3(primary.id);
    data.emergencyServiceMode = "certain_hours";
    data.emergencyServiceSchedule = createDefaultOfficeHours();
    const normalized = normalizeSection3(data, [primary]);
    assert.deepEqual(normalized.emergencyService.schedule, createDefaultOfficeHours());
  });
});

describe("normalizeSection3 — Q32 backup contact (O: stale/inactive exclusion)", () => {
  it("nulls the backup contact when Q32 = No even if a backupContactId still points to a real contact", () => {
    const primary = validContact();
    const backup = validContact({ nameOrRole: "Backup Person" });
    const data = createDefaultSection3(primary.id);
    data.hasBackupContact = "no";
    data.backupContactId = backup.id; // stale reference retained in raw draft
    const normalized = normalizeSection3(data, [primary, backup]);
    assert.equal(normalized.backupContact, null);
  });

  it("includes the backup contact when Q32 = Yes", () => {
    const primary = validContact();
    const backup = validContact({ nameOrRole: "Backup Person" });
    const data = createDefaultSection3(primary.id);
    data.hasBackupContact = "yes";
    data.backupContactId = backup.id;
    const normalized = normalizeSection3(data, [primary, backup]);
    assert.equal(normalized.backupContact?.nameOrRole, "Backup Person");
  });
});

describe("normalizeSection3 — Q33/Q34 custom text exclusion", () => {
  it("nulls Q33 custom fallback text unless 'custom' is selected", () => {
    const primary = validContact();
    const data = createDefaultSection3(primary.id);
    data.nobodyRespondsFallback = "callback";
    data.nobodyRespondsCustomRule = "stale text from a previous 'custom' selection";
    const normalized = normalizeSection3(data, [primary]);
    assert.equal(normalized.nobodyRespondsFallback.option, "callback");
    assert.equal(normalized.nobodyRespondsFallback.customRule, null);
  });

  it("nulls Q34 custom retry text unless 'custom' is selected", () => {
    const primary = validContact();
    const data = createDefaultSection3(primary.id);
    data.retryRule = "move_immediately_to_next";
    data.retryCustomRule = "stale text";
    const normalized = normalizeSection3(data, [primary]);
    assert.equal(normalized.retryRule.customRule, null);
  });
});

describe("normalizeSection3 — Q35/Q36/Q37/Q38 (O: exactly one active branch)", () => {
  it("keeps only the reserved-capacity branch when Q35 = reserved_capacity", () => {
    const primary = validContact();
    const data = createDefaultSection3(primary.id);
    data.capacityMode = "reserved_capacity";
    data.reservedCapacityText = "One same-day slot.";
    data.overrideConditionsText = "stale override text";
    data.approverContactId = "stale-approver-id";
    const normalized = normalizeSection3(data, [primary]);
    assert.equal(normalized.capacity.reservedCapacityText, "One same-day slot.");
    assert.equal(normalized.capacity.overrideConditions, null);
    assert.equal(normalized.capacity.approverContactId, null);
  });

  it("(the exact scenario O example) Q35 override → Q37, then user changes to authorized approval: Q37 becomes null, Q38 becomes active", () => {
    const primary = validContact();
    const approver = validContact({ nameOrRole: "Approver Person" });
    const data = createDefaultSection3(primary.id);
    data.capacityMode = "emergency_override";
    data.overrideConditionsText = "Only for confirmed active leaks.";

    // User changes Q35 -> authorized_approval. Raw Q37 text remains
    // in the draft (stale-hidden-data principle) but is no longer
    // the active branch.
    data.capacityMode = "authorized_approval";
    data.approverContactId = approver.id;

    const normalized = normalizeSection3(data, [primary, approver]);
    assert.equal(normalized.capacity.mode, "authorized_approval");
    assert.equal(normalized.capacity.overrideConditions, null);
    assert.equal(normalized.capacity.reservedCapacityText, null);
    assert.equal(normalized.capacity.approverContactId, approver.id);
  });

  it("nulls approverContactId when it does not reference a real contact (P: never invent/duplicate a reference)", () => {
    const primary = validContact();
    const data = createDefaultSection3(primary.id);
    data.capacityMode = "authorized_approval";
    data.approverContactId = "does-not-exist";
    const normalized = normalizeSection3(data, [primary]);
    assert.equal(normalized.capacity.approverContactId, null);
  });

  it("P: preserves the exact same contact id when the approver is an existing (primary) contact — never a duplicate", () => {
    const primary = validContact();
    const data = createDefaultSection3(primary.id);
    data.capacityMode = "authorized_approval";
    data.approverContactId = primary.id;
    const normalized = normalizeSection3(data, [primary]);
    assert.equal(normalized.capacity.approverContactId, primary.id);
    assert.equal(normalized.primaryContact?.id, primary.id);
  });
});

describe("normalizeSection3 — contact normalization", () => {
  it("nulls otherCategory unless 'other' is an active call category", () => {
    const primary = validContact({ callCategories: ["emergencies"], otherCategory: "stale" });
    const data = createDefaultSection3(primary.id);
    const normalized = normalizeSection3(data, [primary]);
    assert.equal(normalized.primaryContact?.otherCategory, null);
  });

  it("includes otherCategory when 'other' is active", () => {
    const primary = validContact({ callCategories: ["other"], otherCategory: "Vendor issues" });
    const data = createDefaultSection3(primary.id);
    const normalized = normalizeSection3(data, [primary]);
    assert.equal(normalized.primaryContact?.otherCategory, "Vendor issues");
  });

  it("returns null primaryContact if the id somehow does not resolve (defensive)", () => {
    const data = createDefaultSection3("missing-id");
    const normalized = normalizeSection3(data, []);
    assert.equal(normalized.primaryContact, null);
  });

  it("excludes empty primary placeholder from Company Truth", () => {
    const placeholder = createEmptyContact();
    const data = createDefaultSection3(placeholder.id);
    const normalized = normalizeSection3(data, [placeholder]);
    assert.equal(normalized.primaryContact, null);
    assert.equal(normalized.contacts.length, 0);
  });

  it("includes a Q38 core-only approver (name + phone) without inventing escalation metadata", () => {
    const primary = validContact();
    const approver = createEmptyContact();
    approver.nameOrRole = "Owner";
    approver.phone = "+14155552699";
    const data = createDefaultSection3(primary.id);
    data.capacityMode = "authorized_approval";
    data.approverContactId = approver.id;
    const normalized = normalizeSection3(data, [primary, approver]);
    assert.equal(normalized.capacity.approverContactId, approver.id);
    const found = normalized.contacts.find((c) => c.id === approver.id);
    assert.ok(found);
    assert.equal(found!.nameOrRole, "Owner");
    assert.equal(found!.availability, null);
    assert.deepEqual(found!.callCategories, []);
  });

  it("keeps Q38 existing contact ID stable (never a copied name/phone)", () => {
    const primary = validContact();
    const data = createDefaultSection3(primary.id);
    data.capacityMode = "authorized_approval";
    data.approverContactId = primary.id;
    const normalized = normalizeSection3(data, [primary]);
    assert.equal(normalized.capacity.approverContactId, primary.id);
    assert.equal(normalized.primaryContact?.id, primary.id);
  });

  it("nulls approverContactId when it points at an empty placeholder", () => {
    const placeholder = createEmptyContact();
    const data = createDefaultSection3(placeholder.id);
    data.capacityMode = "authorized_approval";
    data.approverContactId = placeholder.id;
    const normalized = normalizeSection3(data, [placeholder]);
    assert.equal(normalized.capacity.approverContactId, null);
  });
});

describe("normalizeSection3 — Q26 recommended_default defaults", () => {
  it("fresh classifications normalize all 15 rows as recommended_default", () => {
    const primary = createEmptyContact();
    const data = createDefaultSection3(primary.id);
    const normalized = normalizeSection3(data, [primary]);
    assert.equal(normalized.emergencyClassifications.length, EMERGENCY_SCENARIOS.length);
    for (const row of normalized.emergencyClassifications) {
      assert.equal(row.classification, "recommended_default");
    }
  });
});

describe("normalizeSection3 — unanswered schedule normalizes safely", () => {
  it("an all-closed emergency schedule normalizes to itself when mode = certain_hours", () => {
    const primary = validContact();
    const data = createDefaultSection3(primary.id);
    data.emergencyServiceMode = "certain_hours";
    data.emergencyServiceSchedule = createEmptyAnsweringSchedule();
    const normalized = normalizeSection3(data, [primary]);
    assert.deepEqual(normalized.emergencyService.schedule, createEmptyAnsweringSchedule());
  });
});
