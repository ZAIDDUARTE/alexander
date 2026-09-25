import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { migrateDraft } from "../migrate";
import { hasDraftContent, mergeWithDefaults, addCompletedSection } from "../draft-utils";
import { normalizeSection6 } from "../normalize/section6";
import { migrateStoredRedisDraft } from "@/lib/server/draft-store";
import { isValidRedisDraft } from "@/lib/server/draft-store";
import {
  createDefaultDraft,
  createDefaultSection1,
  createDefaultSection2,
  createDefaultSection3,
  createDefaultSection6,
  createEmptyContact,
  SCHEMA_VERSION,
} from "../types";
import { fullyValidSection6 } from "../section6-test-helpers";
import { returnVisitPolicyApplies } from "../returnVisitPolicy";
import { validateSection6, section6IsValid } from "./section6";
import { NON_SERVICE_CALL_TYPE_ROWS } from "../section6Catalog";
import { createDefaultEscalationTriggers, createDefaultForbiddenUnhappyPromises } from "../types";

describe("Section 6 validation — Q83", () => {
  it("A: requires previous-work initial action", () => {
    const data = createDefaultSection6();
    const errors = validateSection6(data, []);
    assert.ok(errors.previousWorkInitialAction);
  });

  it("B: return-visit branch requires eligibility rule", () => {
    const data = createDefaultSection6();
    data.previousWorkInitialAction = "schedule_return_visit";
    const errors = validateSection6(data, []);
    assert.ok(errors.returnVisitEligibilityRule);
    data.returnVisitEligibilityRule = "Within 14 days for same issue.";
    assert.equal(validateSection6(data, []).returnVisitEligibilityRule, undefined);
  });

  it("C: custom branch does not require custom text (MD optional like Q39)", () => {
    const data = createDefaultSection6();
    data.previousWorkInitialAction = "custom";
    data.repeatCallbackAction = "connect_manager";
    data.customerHistoryPolicy = "use_available_history";
    data.additionalServicePolicy = "only_when_asked";
    for (const row of NON_SERVICE_CALL_TYPE_ROWS) {
      data.nonServiceCallPolicies[row.id] = { disposition: "take_message", contactId: "" };
    }
    assert.equal(validateSection6(data, []).previousWorkCustomRule, undefined);
  });
});

function withReturnVisitMatrix(data: ReturnType<typeof createDefaultSection6>) {
  data.customerHistoryPolicy = "use_available_history";
  data.additionalServicePolicy = "only_when_asked";
  for (const row of NON_SERVICE_CALL_TYPE_ROWS) {
    data.nonServiceCallPolicies[row.id] = { disposition: "take_message", contactId: "" };
  }
  return data;
}

describe("Section 6 — canonical returnVisitEligibilityRule (Q83/Q84)", () => {
  it("1: Q83 schedule-return + rule = valid", () => {
    const data = withReturnVisitMatrix(createDefaultSection6());
    data.previousWorkInitialAction = "schedule_return_visit";
    data.repeatCallbackAction = "connect_manager";
    data.returnVisitEligibilityRule = "Within 14 days for the same issue.";
    assert.equal(validateSection6(data, []).returnVisitEligibilityRule, undefined);
  });

  it("2: Q84 schedule-another + Q83 schedule-return + rule = valid", () => {
    const data = withReturnVisitMatrix(createDefaultSection6());
    data.previousWorkInitialAction = "schedule_return_visit";
    data.repeatCallbackAction = "schedule_another_return";
    data.returnVisitEligibilityRule = "When prior work failed inspection.";
    assert.equal(validateSection6(data, []).returnVisitEligibilityRule, undefined);
  });

  it("3: Q83 team-review + Q84 schedule-another + shared rule = valid", () => {
    const data = withReturnVisitMatrix(createDefaultSection6());
    data.previousWorkInitialAction = "submit_team_review";
    data.repeatCallbackAction = "schedule_another_return";
    data.returnVisitEligibilityRule = "Manager approves within 7 days.";
    assert.equal(validateSection6(data, []).returnVisitEligibilityRule, undefined);
    assert.equal(validateSection6(data, []).repeatCallbackAction, undefined);
  });

  it("4: Q83 team-review + Q84 schedule-another + blank rule = invalid", () => {
    const data = withReturnVisitMatrix(createDefaultSection6());
    data.previousWorkInitialAction = "submit_team_review";
    data.repeatCallbackAction = "schedule_another_return";
    assert.ok(validateSection6(data, []).returnVisitEligibilityRule);
    assert.equal(validateSection6(data, []).repeatCallbackAction, undefined);
  });

  it("5: neither action uses return visits → rule not required", () => {
    const data = withReturnVisitMatrix(createDefaultSection6());
    data.previousWorkInitialAction = "connect_team";
    data.repeatCallbackAction = "human_review_after_first";
    data.returnVisitEligibilityRule = "";
    assert.equal(returnVisitPolicyApplies(data), false);
    assert.equal(validateSection6(data, []).returnVisitEligibilityRule, undefined);
  });

  it("6: stale rule excluded from normalized truth when neither uses return visit", () => {
    const data = createDefaultSection6();
    data.previousWorkInitialAction = "connect_team";
    data.repeatCallbackAction = "connect_manager";
    data.returnVisitEligibilityRule = "Stale draft text";
    const norm = normalizeSection6(data, []);
    assert.equal(norm.returnVisitEligibilityRule, null);
  });

  it("7: one canonical rule only (single field on Section6Data)", () => {
    const keys = Object.keys(createDefaultSection6()).filter((k) =>
      /return.*visit/i.test(k),
    );
    assert.deepEqual(keys, ["returnVisitEligibilityRule"]);
  });
});

describe("Section 6 validation — Q85/Q86", () => {
  it("F/G: escalation triggers and Other detail", () => {
    const data = createDefaultSection6();
    data.escalationTriggers = [];
    assert.ok(validateSection6(data, []).escalationTriggers);
    data.escalationTriggers = ["other"];
    assert.ok(validateSection6(data, []).escalationTriggerOther);
    data.escalationTriggerOther = "Caller mentions social media.";
    assert.equal(validateSection6(data, []).escalationTriggerOther, undefined);
  });

  it("H/I: forbidden promises and Other detail", () => {
    const data = createDefaultSection6();
    data.forbiddenUnhappyPromises = [];
    assert.ok(validateSection6(data, []).forbiddenUnhappyPromises);
    data.forbiddenUnhappyPromises = ["other"];
    assert.ok(validateSection6(data, []).forbiddenUnhappyPromiseOther);
    data.forbiddenUnhappyPromiseOther = "Never promise same-day resolution.";
    assert.equal(validateSection6(data, []).forbiddenUnhappyPromiseOther, undefined);
  });
});

describe("Section 6 validation — Q87", () => {
  it("J/K: every row required; send-specific needs contact", () => {
    const contact = { ...createEmptyContact(), nameOrRole: "Owner", phone: "+14155550123" };
    const data = createDefaultSection6();
    data.previousWorkInitialAction = "arrange_callback";
    data.repeatCallbackAction = "connect_manager";
    data.customerHistoryPolicy = "human_review_before_details";
    data.additionalServicePolicy = "do_not_proactive";
    const errors = validateSection6(data, [contact]);
    assert.ok(Object.keys(errors).some((k) => k.startsWith("nonServiceCallPolicies.")));
    for (const row of NON_SERVICE_CALL_TYPE_ROWS) {
      data.nonServiceCallPolicies[row.id] = {
        disposition: row.id === "vendor_supplier" ? "send_specific" : "politely_decline",
        contactId: row.id === "vendor_supplier" ? contact.id : "",
      };
    }
    assert.equal(validateSection6(data, [contact])[`nonServiceCallPolicies.vendor_supplier.contact`], undefined);
    data.nonServiceCallPolicies.vendor_supplier.contactId = "";
    assert.ok(validateSection6(data, [contact])[`nonServiceCallPolicies.vendor_supplier.contact`]);
  });
});

describe("Section 6 normalization", () => {
  it("L: non-send disposition nulls active contact", () => {
    const contact = { ...createEmptyContact(), nameOrRole: "HR", phone: "+14155550199" };
    const data = createDefaultSection6();
    data.nonServiceCallPolicies.job_applicant = {
      disposition: "take_message",
      contactId: contact.id,
    };
    const norm = normalizeSection6(data, [contact]);
    const row = norm.nonServiceCallPolicies.find((p) => p.callTypeId === "job_applicant");
    assert.equal(row?.contactId, null);
  });

  it("T: stale hidden fields removed from company truth", () => {
    const data = createDefaultSection6();
    data.previousWorkInitialAction = "connect_team";
    data.returnVisitEligibilityRule = "Should not export";
    data.previousWorkCustomRule = "Also hidden";
    const norm = normalizeSection6(data, []);
    assert.equal(norm.returnVisitEligibilityRule, null);
    assert.equal(norm.previousWorkCustomRule, null);
  });

  it("U: Q89 restrictions preserved separately from Q88", () => {
    const data = fullyValidSection6();
    data.customerHistoryPolicy = "use_available_history";
    data.restrictedInformation = ["payment_information", "sensitive_account"];
    const norm = normalizeSection6(data, []);
    assert.equal(norm.customerHistoryPolicy, "use_available_history");
    assert.deepEqual(norm.restrictedInformation, ["payment_information", "sensitive_account"]);
  });

  it("V: Q90 does not alter service/pricing authority in normalized output", () => {
    const data = fullyValidSection6();
    data.additionalServicePolicy = "mention_relevant";
    const norm = normalizeSection6(data, []);
    assert.equal(norm.additionalServicePolicy, "mention_relevant");
    assert.ok(!("servicePricingRules" in norm));
    assert.ok(!("pricingModels" in norm));
  });
});

describe("Section 6 — Q88–Q91", () => {
  it("M/N: customer history required", () => {
    const data = createDefaultSection6();
    assert.ok(validateSection6(data, []).customerHistoryPolicy);
    data.customerHistoryPolicy = "custom";
    data.previousWorkInitialAction = "arrange_callback";
    data.repeatCallbackAction = "connect_manager";
    data.additionalServicePolicy = "only_when_asked";
    for (const row of NON_SERVICE_CALL_TYPE_ROWS) {
      data.nonServiceCallPolicies[row.id] = { disposition: "human_review", contactId: "" };
    }
    assert.equal(validateSection6(data, []).customerHistoryCustomRule, undefined);
  });

  it("O/P: privacy restrictions and Other", () => {
    const data = createDefaultSection6();
    data.restrictedInformation = [];
    assert.ok(validateSection6(data, []).restrictedInformation);
    data.restrictedInformation = ["other"];
    assert.ok(validateSection6(data, []).restrictedInformationOther);
  });

  it("Q/R: additional services policy", () => {
    const data = createDefaultSection6();
    assert.ok(validateSection6(data, []).additionalServicePolicy);
    data.additionalServicePolicy = "custom";
    data.previousWorkInitialAction = "arrange_callback";
    data.repeatCallbackAction = "connect_manager";
    data.customerHistoryPolicy = "use_available_history";
    for (const row of NON_SERVICE_CALL_TYPE_ROWS) {
      data.nonServiceCallPolicies[row.id] = { disposition: "take_message", contactId: "" };
    }
    assert.equal(validateSection6(data, []).additionalServiceCustomRule, undefined);
  });

  it("S: Q91 optional", () => {
    const contact = { ...createEmptyContact(), nameOrRole: "Owner", phone: "+14155550123" };
    const data = fullyValidSection6([contact]);
    data.unusualCallNotes = "";
    assert.equal(section6IsValid(data, [contact]), true);
  });
});

describe("Section 6 migration and draft safety", () => {
  it("W: v7→v8 preserves Sections 1–5", () => {
    const primary = createEmptyContact();
    primary.nameOrRole = "Dispatch";
    primary.phone = "+14155552671";
    const rawV7 = {
      schemaVersion: 7 as const,
      updatedAt: "2026-12-01T00:00:00.000Z",
      navigation: { stage: "section-complete" as const, sectionId: 5, completedSections: [1, 2, 3, 4, 5] },
      section1: { ...createDefaultSection1(), customerFacingName: "Acme Plumbing" },
      section2: createDefaultSection2(),
      section3: createDefaultSection3(primary.id),
      contacts: [primary],
      fees: [],
    };
    const migrated = migrateDraft(rawV7);
    assert.equal(migrated.schemaVersion, SCHEMA_VERSION);
    assert.equal(migrated.section1.customerFacingName, "Acme Plumbing");
    assert.ok(migrated.section5);
    assert.ok(migrated.section6);
    assert.deepEqual(migrated.section6.escalationTriggers, createDefaultEscalationTriggers());
    assert.deepEqual(
      migrated.section6.forbiddenUnhappyPromises,
      createDefaultForbiddenUnhappyPromises(),
    );
  });

  it("X: Redis v7 stored draft migration", () => {
    const v7Stored = {
      schemaVersion: 7,
      updatedAt: "2026-12-15T00:00:00.000Z",
      currentRoute: "/onboarding/sections/5/complete",
      currentSection: 5,
      completedSections: [1, 2, 3, 4, 5],
      data: {
        navigation: {
          stage: "section-complete" as const,
          sectionId: 5,
          completedSections: [1, 2, 3, 4, 5],
        },
        section1: { ...createDefaultSection1(), customerFacingName: "Redis Co" },
        section2: createDefaultSection2(),
        section3: createDefaultSection3(createEmptyContact().id),
        section4: mergeWithDefaults({}).section4,
        section5: createDefaultDraft().section5,
        contacts: [createEmptyContact()],
        fees: [],
      },
    };
    const migrated = migrateStoredRedisDraft(v7Stored);
    assert.ok(migrated);
    assert.equal(migrated!.schemaVersion, SCHEMA_VERSION);
    assert.equal(migrated!.data.section1.customerFacingName, "Redis Co");
    assert.ok(migrated!.data.section6);
    assert.equal(isValidRedisDraft(migrated), true);
  });

  it("Y: fresh default hasDraftContent false", () => {
    assert.equal(hasDraftContent(createDefaultDraft()), false);
  });

  it("Z: completedSections adds 6 once", () => {
    const once = addCompletedSection([1, 2, 3, 4, 5], 6);
    const twice = addCompletedSection(once, 6);
    assert.deepEqual(once, [1, 2, 3, 4, 5, 6]);
    assert.deepEqual(twice, once);
  });

  it("AA: no warranty/referral in section6 catalog types", () => {
    const data = createDefaultSection6();
    const blob = JSON.stringify(data);
    assert.equal(/warranty/i.test(blob), false);
    assert.equal(/referral/i.test(blob), false);
    assert.equal(/membership/i.test(blob), false);
  });
});
