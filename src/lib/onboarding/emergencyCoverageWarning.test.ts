import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EMERGENCY_COVERAGE_WARNING,
  emergencyCoverageGapWarning,
} from "./emergencyCoverageWarning";
import { DAYS, createDefaultOfficeHours, type WeeklyOfficeSchedule } from "./schedule";
import { buildSubmittableDraft } from "./submission-test-helpers";
import { createEmptyContact } from "./types";

function fullDayCoverage(): WeeklyOfficeSchedule {
  const day = { closed: false, start: "00:00", end: "23:30" };
  return Object.fromEntries(DAYS.map((name) => [name, { ...day }])) as WeeklyOfficeSchedule;
}

describe("emergency coverage warning", () => {
  it("warns when emergency service is 24/7 but contact hours are incomplete", () => {
    const draft = buildSubmittableDraft();
    assert.equal(draft.section3.emergencyServiceMode, "24_7");
    assert.deepEqual(draft.contacts[0]?.availability, createDefaultOfficeHours());
    assert.equal(emergencyCoverageGapWarning(draft), EMERGENCY_COVERAGE_WARNING);
  });

  it("does not warn when 24/7 emergency contacts cover all hours", () => {
    const draft = buildSubmittableDraft();
    draft.contacts[0] = {
      ...draft.contacts[0]!,
      availability: fullDayCoverage(),
    };
    assert.equal(emergencyCoverageGapWarning(draft), null);
  });

  it("does not warn when emergency service is not 24/7", () => {
    const draft = buildSubmittableDraft();
    draft.section3.emergencyServiceMode = "certain_hours";
    assert.equal(emergencyCoverageGapWarning(draft), null);
  });

  it("uses primary plus backup coverage together", () => {
    const draft = buildSubmittableDraft();
    const backup = {
      ...createEmptyContact(),
      nameOrRole: "Night On-Call",
      phone: "+14155552672",
      availability: fullDayCoverage(),
      callCategories: ["emergencies" as const],
    };
    draft.contacts.push(backup);
    draft.section3.hasBackupContact = "yes";
    draft.section3.backupContactId = backup.id;
    // Primary stays weekday-only; backup covers all hours.
    assert.equal(emergencyCoverageGapWarning(draft), null);
  });
});
