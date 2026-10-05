import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  lateCancellationPolicyActive,
  noShowPolicyActive,
  section4AdditionalFeeConsistencyError,
} from "./section4FeeLinks";
import { createDefaultSection4, type AdditionalFeeSelection, type Section4Data } from "./types";
import { validateSection5, section5IsValid } from "./validation/section5";
import {
  ELIGIBLE_SECTION2_FOR_PRICING,
  fullyValidSection5,
} from "./section5-test-helpers";
import { canSubmitQuestionnaire, validateAllSections } from "./validateOnboarding";
import { buildSubmittableDraft } from "./submission-test-helpers";
import {
  validLateCancellationFee,
  validNoShowFee,
  withLateCancellationFee,
  withNoShowFee,
} from "./section4-test-helpers";

function section4WithModes(
  late: Section4Data["lateCancellationFeeMode"],
  noShow: Section4Data["noShowFeeMode"],
): Section4Data {
  const s4 = createDefaultSection4();
  s4.lateCancellationFeeMode = late;
  s4.noShowFeeMode = noShow;
  return s4;
}

function selectFees(
  ...ids: AdditionalFeeSelection[]
): ReturnType<typeof fullyValidSection5> {
  const data = fullyValidSection5();
  data.additionalFeeSelection = [...ids];
  for (const id of ids) {
    if (id === "none") continue;
    data.additionalFeeDetails[id] = {
      amount: "75",
      applicability: `Applies for ${id}.`,
      credit: "never",
      creditWhen: "",
    };
  }
  return data;
}

describe("section4AdditionalFeeConsistencyError — Q45/Q46 ↔ Q56", () => {
  it("passes when Q45 no + Q56 none", () => {
    assert.equal(
      section4AdditionalFeeConsistencyError(section4WithModes("no", "no"), ["none"]),
      undefined,
    );
  });

  it("passes when Q46 no + Q56 none", () => {
    assert.equal(
      section4AdditionalFeeConsistencyError(section4WithModes("no", "no"), ["none"]),
      undefined,
    );
  });

  it("passes when Q45 yes + Q56 cancellation", () => {
    assert.equal(
      section4AdditionalFeeConsistencyError(section4WithModes("yes", "no"), ["cancellation"]),
      undefined,
    );
  });

  it("passes when Q45 conditional + Q56 cancellation", () => {
    assert.equal(
      section4AdditionalFeeConsistencyError(section4WithModes("conditional", "no"), [
        "cancellation",
      ]),
      undefined,
    );
  });

  it("passes when Q46 yes + Q56 no_show", () => {
    assert.equal(
      section4AdditionalFeeConsistencyError(section4WithModes("no", "yes"), ["no_show"]),
      undefined,
    );
  });

  it("passes when Q46 conditional + Q56 no_show", () => {
    assert.equal(
      section4AdditionalFeeConsistencyError(section4WithModes("no", "conditional"), ["no_show"]),
      undefined,
    );
  });

  it("fails when Q45 yes + Q56 none", () => {
    const message = section4AdditionalFeeConsistencyError(section4WithModes("yes", "no"), ["none"]);
    assert.ok(message);
    assert.match(message, /late-cancellation fee/i);
    assert.match(message, /We don’t charge additional fees/);
  });

  it("fails when Q45 conditional + Q56 none", () => {
    const message = section4AdditionalFeeConsistencyError(
      section4WithModes("conditional", "no"),
      ["none"],
    );
    assert.ok(message);
    assert.match(message, /late-cancellation fee/i);
  });

  it("fails when Q46 yes + Q56 none", () => {
    const message = section4AdditionalFeeConsistencyError(section4WithModes("no", "yes"), ["none"]);
    assert.ok(message);
    assert.match(message, /no-show fee/i);
    assert.match(message, /We don’t charge additional fees/);
  });

  it("fails when Q46 conditional + Q56 none", () => {
    const message = section4AdditionalFeeConsistencyError(
      section4WithModes("no", "conditional"),
      ["none"],
    );
    assert.ok(message);
    assert.match(message, /no-show fee/i);
  });

  it("fails when Q45 yes + Q56 does not include cancellation", () => {
    const message = section4AdditionalFeeConsistencyError(section4WithModes("yes", "no"), [
      "travel",
    ]);
    assert.ok(message);
    assert.match(message, /include Cancellation fee/i);
  });

  it("fails when Q46 yes + Q56 does not include no_show", () => {
    const message = section4AdditionalFeeConsistencyError(section4WithModes("no", "yes"), [
      "travel",
    ]);
    assert.ok(message);
    assert.match(message, /include No-show fee/i);
  });

  it("fails when Q45 no + Q56 includes cancellation", () => {
    const message = section4AdditionalFeeConsistencyError(section4WithModes("no", "no"), [
      "cancellation",
    ]);
    assert.ok(message);
    assert.match(message, /do not charge a late-cancellation fee/i);
  });

  it("fails when Q46 no + Q56 includes no_show", () => {
    const message = section4AdditionalFeeConsistencyError(section4WithModes("no", "no"), [
      "no_show",
    ]);
    assert.ok(message);
    assert.match(message, /do not charge a no-show fee/i);
  });

  it("passes when both fees active + both corresponding Q56 selections", () => {
    assert.equal(
      section4AdditionalFeeConsistencyError(section4WithModes("yes", "conditional"), [
        "cancellation",
        "no_show",
      ]),
      undefined,
    );
  });

  it("fails when both fees active + only one corresponding Q56 selection", () => {
    const missingNoShow = section4AdditionalFeeConsistencyError(
      section4WithModes("yes", "conditional"),
      ["cancellation"],
    );
    assert.ok(missingNoShow);
    assert.match(missingNoShow, /No-show fee/i);

    const missingCancellation = section4AdditionalFeeConsistencyError(
      section4WithModes("yes", "conditional"),
      ["no_show"],
    );
    assert.ok(missingCancellation);
    assert.match(missingCancellation, /Cancellation fee/i);
  });

  it("fails when both fees active + Q56 none", () => {
    const message = section4AdditionalFeeConsistencyError(
      section4WithModes("yes", "yes"),
      ["none"],
    );
    assert.ok(message);
    assert.match(message, /late-cancellation and no-show/i);
  });
});

describe("validateSection5 — cross-section fee consistency gate", () => {
  it("blocks submission-path validation when Q45 yes and Q56 none", () => {
    const s4 = section4WithModes("yes", "no");
    assert.equal(lateCancellationPolicyActive(s4), true);
    const errors = validateSection5(
      fullyValidSection5(),
      ELIGIBLE_SECTION2_FOR_PRICING,
      [],
      [],
      s4,
    );
    assert.ok(errors.additionalFeeSelection);
    assert.equal(section5IsValid(fullyValidSection5(), ELIGIBLE_SECTION2_FOR_PRICING, [], [], s4), false);
  });

  it("accepts Q45 yes + filled Q56 cancellation details", () => {
    const s4 = section4WithModes("yes", "no");
    const data = selectFees("cancellation");
    assert.equal(section5IsValid(data, ELIGIBLE_SECTION2_FOR_PRICING, [], [], s4), true);
  });

  it("accepts Q46 conditional + filled Q56 no_show details", () => {
    const s4 = section4WithModes("no", "conditional");
    assert.equal(noShowPolicyActive(s4), true);
    const data = selectFees("no_show");
    assert.equal(section5IsValid(data, ELIGIBLE_SECTION2_FOR_PRICING, [], [], s4), true);
  });

  it("accepts both active scheduling fees with both Q56 selections filled", () => {
    const s4 = section4WithModes("conditional", "yes");
    const data = selectFees("cancellation", "no_show");
    assert.equal(section5IsValid(data, ELIGIBLE_SECTION2_FOR_PRICING, [], [], s4), true);
  });

  it("rejects both active scheduling fees when only cancellation is selected", () => {
    const s4 = section4WithModes("yes", "yes");
    const data = selectFees("cancellation");
    const errors = validateSection5(data, ELIGIBLE_SECTION2_FOR_PRICING, [], [], s4);
    assert.ok(errors.additionalFeeSelection);
    assert.match(errors.additionalFeeSelection, /No-show fee/i);
  });

  it("does not rewrite answers when conflict is present", () => {
    const s4 = section4WithModes("yes", "no");
    const data = fullyValidSection5();
    data.additionalFeeSelection = ["none"];
    validateSection5(data, ELIGIBLE_SECTION2_FOR_PRICING, [], [], s4);
    assert.deepEqual(data.additionalFeeSelection, ["none"]);
    assert.equal(s4.lateCancellationFeeMode, "yes");
  });

  it("keeps Q45 no + Q56 none valid through full draft submit gate", () => {
    const draft = buildSubmittableDraft();
    draft.section4.lateCancellationFeeMode = "no";
    draft.section4.noShowFeeMode = "no";
    draft.section5.additionalFeeSelection = ["none"];
    assert.equal(canSubmitQuestionnaire(draft), true);
    assert.equal(validateAllSections(draft).find((r) => r.sectionId === 5)?.valid, true);
  });

  it("blocks full draft submit when Q45 conditional and Q56 none", () => {
    const lateFee = validLateCancellationFee();
    const draft = buildSubmittableDraft();
    draft.fees = [...draft.fees, lateFee];
    withLateCancellationFee(draft.section4, lateFee, "conditional");
    draft.section5.additionalFeeSelection = ["none"];
    assert.equal(canSubmitQuestionnaire(draft), false);
    const section5 = validateAllSections(draft).find((r) => r.sectionId === 5);
    assert.ok(section5);
    assert.equal(section5.valid, false);
    assert.ok(section5.errors.additionalFeeSelection);
  });

  it("blocks full draft submit when Q46 yes and Q56 omits no_show", () => {
    const noShowFee = validNoShowFee();
    const draft = buildSubmittableDraft();
    draft.fees = [...draft.fees, noShowFee];
    withNoShowFee(draft.section4, noShowFee, "yes");
    draft.section5 = selectFees("travel");
    assert.equal(canSubmitQuestionnaire(draft), false);
    const section5 = validateAllSections(draft).find((r) => r.sectionId === 5);
    assert.ok(section5?.errors.additionalFeeSelection);
    assert.match(section5!.errors.additionalFeeSelection!, /No-show fee/i);
  });
});
