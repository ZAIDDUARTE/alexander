import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  QUESTION_REGISTRY_BY_ID,
  QUESTION_REGISTRY_V1,
} from "./registry";
import type { AnswerKind } from "./types";

/**
 * Approved customer-facing control family for every permanent Q-ID.
 * Derived from Final Draft 3 input types + frozen production controls.
 * This is intentionally separate from answer_kind so a future UI swap
 * (for example phone → number) fails even if the serializer kind stays.
 */
export const APPROVED_CONTROL_FAMILY_BY_QID = {
  Q1: "short_text",
  Q2: "short_text",
  Q3: "phone",
  Q4: "url",
  Q5: "multi_select",
  Q5A: "short_text",
  Q6: "short_text",
  Q7: "long_text",
  Q8: "weekly_schedule",
  Q9: "weekly_schedule",
  Q10: "single_select",
  Q10A: "weekly_schedule",
  Q11: "long_text",
  Q12: "matrix",
  Q13: "matrix",
  Q14: "matrix",
  Q15: "single_select",
  Q15A: "long_text",
  Q16: "single_select",
  Q16A: "long_text",
  Q17: "structured_composite",
  Q18: "long_text",
  Q19: "single_select",
  Q19A: "repeater",
  Q20: "structured_composite",
  Q21: "matrix",
  Q22: "multi_select",
  Q23: "matrix",
  Q24: "single_select",
  Q25: "contact_selector",
  Q26: "single_select",
  Q26A: "contact_selector",
  Q27: "single_select",
  Q27A: "long_text",
  Q28: "single_select",
  Q28A: "long_text",
  Q29: "single_select",
  Q29A: "structured_composite",
  Q30: "single_select",
  Q30A: "long_text",
  Q31: "single_select",
  Q31A: "long_text",
  Q32: "matrix",
  Q33: "single_select",
  Q33A: "long_text",
  Q34: "matrix",
  Q35: "single_select",
  Q35A: "repeater",
  Q36: "single_select",
  Q36A: "long_text",
  Q37: "single_select",
  Q38: "structured_composite",
  Q39: "repeater",
  Q40: "multi_select",
  Q41: "single_select",
  Q41A: "repeater",
  Q42: "matrix",
  Q43: "single_select",
  Q43A: "long_text",
  Q44: "single_select",
  Q44A: "long_text",
  Q45: "single_select",
  Q45A: "structured_composite",
  Q46: "single_select",
  Q46A: "structured_composite",
  Q47: "long_text",
  Q48: "ordered_select",
  Q49: "single_select",
  Q49A: "single_select",
  Q49B: "contact_selector",
  Q50: "single_select",
  Q50A: "repeater",
  Q51: "single_select",
  Q52: "single_select",
  Q52A: "structured_composite",
  Q53: "multi_select",
  Q53A: "long_text",
  Q54: "single_select",
  Q54A: "repeater",
  Q55: "single_select",
  Q56: "structured_composite",
  Q57: "single_select",
  Q57A: "repeater",
  Q58: "single_select",
  Q58A: "long_text",
  Q59: "multi_select",
  Q59A: "short_text",
  Q60: "multi_select",
  Q61: "single_select",
  Q62: "multi_select",
  Q62A: "short_text",
  Q63: "multi_select",
  Q64: "single_select",
  Q65: "single_select",
  Q66: "multi_select",
  Q66A: "short_text",
  Q67: "multi_select",
  Q67A: "short_text",
  Q68: "matrix",
  Q69: "single_select",
  Q70: "multi_select",
  Q70A: "short_text",
  Q71: "single_select",
  Q72: "long_text",
  Q73: "multi_select",
  Q73A: "short_text",
  Q74: "single_select",
  Q74A: "single_select",
  Q75: "single_select",
  Q76: "single_select",
  Q76A: "short_text",
  Q77: "single_select",
  Q77A: "long_text",
  Q78: "single_select",
  Q78A: "repeater",
  Q79: "single_select",
  Q79A: "long_text",
  Q80: "single_select",
  Q81: "single_select",
  Q81A: "short_text",
  Q82: "single_select",
  Q83: "long_text",
  Q84: "long_text",
  Q85: "single_select",
  Q85A: "short_text",
  Q86: "single_select",
  Q86A: "short_text",
  Q87: "single_select",
  Q87A: "short_text",
  Q88: "multi_select",
  Q89: "single_select",
  Q89A: "structured_composite",
  Q90: "acknowledgement",
  Q91: "single_select",
  Q91A: "long_text",
  Q92: "long_text",
  Q93: "acknowledgement_group",
} as const;

export type ControlFamily = (typeof APPROVED_CONTROL_FAMILY_BY_QID)[keyof typeof APPROVED_CONTROL_FAMILY_BY_QID];

const ALLOWED_ANSWER_KINDS: Record<ControlFamily, readonly AnswerKind[]> = {
  short_text: ["scalar_text"],
  long_text: ["scalar_text", "composite"],
  phone: ["scalar_text"],
  url: ["scalar_text"],
  single_select: ["single_select", "composite"],
  multi_select: ["multi_select"],
  ordered_select: ["ordered_select"],
  matrix: ["matrix_single_select"],
  weekly_schedule: ["weekly_schedule"],
  repeater: ["repeatable", "composite"],
  contact_selector: ["contact_reference"],
  structured_composite: ["composite", "entity_reference"],
  acknowledgement: ["single_select", "scalar_boolean"],
  acknowledgement_group: ["acknowledgement_group"],
};

describe("approved input control families", () => {
  it("maps every permanent Q-ID exactly once", () => {
    const mapped = Object.keys(APPROVED_CONTROL_FAMILY_BY_QID).sort();
    const registry = QUESTION_REGISTRY_V1.map((q) => q.questionId).sort();
    assert.deepEqual(mapped, registry);
  });

  it("keeps registry answer_kind compatible with the approved control family", () => {
    for (const [questionId, family] of Object.entries(APPROVED_CONTROL_FAMILY_BY_QID)) {
      const meta = QUESTION_REGISTRY_BY_ID.get(questionId);
      assert.ok(meta, questionId);
      assert.ok(
        ALLOWED_ANSWER_KINDS[family].includes(meta!.answerKind),
        `${questionId}: family ${family} incompatible with answerKind ${meta!.answerKind}`,
      );
    }
  });

  it("keeps distinctive UI controls wired in source", () => {
    const section1 = readFileSync("src/components/onboarding/Section1Form.tsx", "utf8");
    assert.ok(section1.includes("PhoneField"));
    assert.ok(section1.includes('type="url"'));
    assert.ok(section1.includes("OfficeWeeklySchedule"));
    assert.ok(section1.includes("ServiceWeeklySchedule"));
    assert.ok(section1.includes("CheckboxGroup"));

    const section2 = readFileSync("src/components/onboarding/Section2Form.tsx", "utf8");
    assert.ok(section2.includes("ServicePolicyGroup"));
    assert.ok(section2.includes("TextareaField"));
    assert.ok(section2.includes('id="excludedTerritory"'));

    const section3 = readFileSync("src/components/onboarding/Section3Form.tsx", "utf8");
    assert.ok(section3.includes("EmergencyClassification"));
    assert.ok(section3.includes("AfterHoursDispositionMatrix"));
    assert.ok(section3.includes("ContactCardEditor"));

    const section4 = readFileSync("src/components/onboarding/Section4Form.tsx", "utf8");
    assert.ok(section4.includes("CallerAuthorizationMatrix"));
    assert.ok(section4.includes("ExceptionAuthorityMatrix"));
    assert.ok(section4.includes("AppointmentWindowEditor"));
    assert.ok(section4.includes("PriorityOrderList"));
    assert.ok(section4.includes("ContactPicker"));

    const pricing = readFileSync("src/components/onboarding/PricingCoreFields.tsx", "utf8");
    assert.ok(pricing.includes("RadioGroup") || pricing.includes("CheckboxGroup"));
    assert.ok(pricing.includes("What service prices may Alexander quote?"));

    const section6 = readFileSync("src/components/onboarding/Section6Form.tsx", "utf8");
    assert.ok(section6.includes("NonServiceCallMatrix") || section6.includes("nonService"));

    const section8 = readFileSync("src/components/onboarding/Section8Form.tsx", "utf8");
    assert.ok(section8.includes('id="connection-notice-acknowledged"'));
    assert.ok(section8.includes("I understand"));

    const review = readFileSync("src/components/onboarding/OnboardingGlobalReview.tsx", "utf8");
    assert.ok(review.includes("Q114_CONFIRMATIONS") || review.includes("confirmations"));
  });

  it("keeps phone as text storage, not a numeric answer kind", () => {
    assert.equal(APPROVED_CONTROL_FAMILY_BY_QID.Q3, "phone");
    assert.equal(QUESTION_REGISTRY_BY_ID.get("Q3")?.answerKind, "scalar_text");
  });
});
