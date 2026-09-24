import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeSection1 } from "./section1";
import { createDefaultSection1 } from "../types";

describe("normalizeSection1 — stale conditional data", () => {
  it("Scenario A: hidden Q6 (other approved claim) cannot reach normalized output", () => {
    const data = {
      ...createDefaultSection1(),
      approvedClaims: ["other" as const],
      otherApprovedClaim: "Serving the Antelope Valley for 25 years.",
    };

    // User later unselects Other, but the draft still holds the stale
    // text for UX convenience (e.g. in case they re-select it).
    const afterUnselect = { ...data, approvedClaims: ["licensed" as const] };

    const normalized = normalizeSection1(afterUnselect);
    assert.equal(normalized.otherApprovedClaim, null);

    // Sanity: while Other IS selected, the value legitimately appears.
    const normalizedWhileApplicable = normalizeSection1(data);
    assert.equal(
      normalizedWhileApplicable.otherApprovedClaim,
      "Serving the Antelope Valley for 25 years.",
    );
  });

  it("Scenario B: hidden Q12 (answering schedule) cannot reach normalized output", () => {
    const base = createDefaultSection1();
    const filledSchedule = {
      ...base.answeringSchedule,
      monday: { closed: false, start: "09:00", end: "17:00" },
    };

    const data = {
      ...base,
      answeringMode: "specific_hours" as const,
      answeringSchedule: filledSchedule,
    };

    // User changes their mind and picks 24/7 instead; the filled
    // schedule remains in the draft (in case they switch back).
    const afterModeChange = { ...data, answeringMode: "24_7" as const };

    const normalized = normalizeSection1(afterModeChange);
    assert.equal(normalized.answeringSchedule, null);

    // Sanity: while specific hours IS the mode, the schedule legitimately appears.
    const normalizedWhileApplicable = normalizeSection1(data);
    assert.deepEqual(normalizedWhileApplicable.answeringSchedule, filledSchedule);
  });

  it("passes through unconditional fields untouched", () => {
    const data = {
      ...createDefaultSection1(),
      customerFacingName: "Acme Plumbing",
      mainPhone: "+14155552671",
    };
    const normalized = normalizeSection1(data);
    assert.equal(normalized.customerFacingName, "Acme Plumbing");
    assert.equal(normalized.mainPhone, "+14155552671");
  });
});
