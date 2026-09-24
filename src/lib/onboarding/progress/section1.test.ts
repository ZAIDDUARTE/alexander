import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getSection1Progress } from "./section1";
import { createDefaultSection1 } from "../types";

describe("getSection1Progress", () => {
  it("starts partially complete because schedules default to valid values", () => {
    const data = createDefaultSection1();
    const progress = getSection1Progress(data);
    // office hours, service hours already valid by default; name/phone/claims/answeringMode not yet set
    assert.ok(progress > 0 && progress < 1);
  });

  it("locks the fresh-Section-1 starting percentage at 2/6 (~33%)", () => {
    // Applicable units on a brand-new, untouched Section 1: Q1 name,
    // Q3 phone, Q5 claims, Q9 office hours, Q10 service hours, Q11
    // answering mode (6 total; Q6/Q12 are inapplicable and excluded).
    // Q9 and Q10 carry approved, valid defaults, so 2 of those 6 start
    // pre-satisfied. This is a deliberate, reviewed outcome — not an
    // accident of default values — so it is pinned here as a
    // regression guard rather than left as a loose ">0 && <1" check.
    const data = createDefaultSection1();
    const progress = getSection1Progress(data);
    assert.equal(progress, 2 / 6);
    assert.equal(Math.round(progress * 100), 33);
  });

  it("Q6 only counts once Q5 = Other is selected (scenario 3 & 4)", () => {
    const base = createDefaultSection1();
    const withoutOther = { ...base, approvedClaims: ["licensed" as const] };
    const withOtherUnanswered = {
      ...base,
      approvedClaims: ["other" as const],
      otherApprovedClaim: "",
    };
    const withOtherAnswered = {
      ...base,
      approvedClaims: ["other" as const],
      otherApprovedClaim: "25 years serving the valley.",
    };

    const pWithout = getSection1Progress(withoutOther);
    const pOtherUnanswered = getSection1Progress(withOtherUnanswered);
    const pOtherAnswered = getSection1Progress(withOtherAnswered);

    // Selecting Other without filling Q6 should not score higher than answering it.
    assert.ok(pOtherAnswered > pOtherUnanswered);
    // Denominator changes: without Other, Q6 doesn't count against progress.
    assert.notEqual(pWithout, pOtherUnanswered);
  });

  it("Q12 only counts once Q11 = specific hours (scenario 5 & 6)", () => {
    const base = createDefaultSection1();
    const away = { ...base, answeringMode: "24_7" as const };
    const specificEmpty = { ...base, answeringMode: "specific_hours" as const };
    const specificFilled = {
      ...base,
      answeringMode: "specific_hours" as const,
      answeringSchedule: {
        ...base.answeringSchedule,
        monday: { closed: false, start: "09:00", end: "17:00" },
      },
    };

    const pAway = getSection1Progress(away);
    const pSpecificEmpty = getSection1Progress(specificEmpty);
    const pSpecificFilled = getSection1Progress(specificFilled);

    assert.ok(pSpecificFilled > pSpecificEmpty);
    assert.notEqual(pAway, pSpecificEmpty);
  });

  it("reaches 1 when every applicable required question is satisfied (scenario 7)", () => {
    const data = {
      ...createDefaultSection1(),
      customerFacingName: "Acme Plumbing",
      mainPhone: "+14155552671",
      approvedClaims: ["licensed" as const],
      answeringMode: "24_7" as const,
    };
    assert.equal(getSection1Progress(data), 1);
  });

  it("Sunday defaults to no_service, not 24-hour service", () => {
    const data = createDefaultSection1();
    assert.equal(data.serviceHours.sunday.mode, "no_service");
    assert.equal(data.serviceHours.saturday.mode, "regular");
  });
});
