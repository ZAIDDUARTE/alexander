import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AFTER_HOURS_DISPOSITION_OPTIONS } from "../../components/onboarding/AfterHoursDispositionMatrix";
import { EMERGENCY_CLASSIFICATION_LABELS } from "../../components/onboarding/EmergencyClassification";
import { EMERGENCY_SCENARIOS } from "./section3Catalog";
import { EMERGENCY_ROW_DEFAULTS } from "./section3Defaults";
import { DEFAULT_BOOKING_OPTIONS } from "./validation/section4";
import { migrateDraft } from "./migrate";
import { migrateStage2Answers } from "./stage2Migration";
import {
  createDefaultDraft,
  createDefaultSection4,
  type OnboardingDraft,
} from "./types";

const EXPECTED_EMERGENCY_DEFAULTS: Record<string, string> = {
  "uncontrolled-water-leak-inside-property": "emergency",
  "water-leak-near-electrical-equipment": "emergency",
  "suspected-gas-leak-or-odor": "emergency",
  "sewage-entering-property": "emergency",
  "multiple-fixtures-backing-up": "urgent",
  "toilet-overflowing-uncontrolled": "emergency",
  "only-usable-toilet-not-working": "urgent",
  "major-water-heater-leak-or-rupture": "emergency",
  "dangerous-water-heater-symptoms": "emergency",
  "sump-pump-failure-flooding": "emergency",
  "frozen-pipe-confirmed-leak": "emergency",
  "complete-loss-of-water": "urgent",
  "major-water-service-line-leak": "emergency",
  "serious-standing-water-unknown-source": "emergency",
  "unclear-situation-may-be-dangerous": "human_review",
};

function legacyDraft(): OnboardingDraft {
  return createDefaultDraft();
}

function setEmergency(draft: OnboardingDraft, id: string, value: string) {
  (draft.section3.emergencyClassifications as Record<string, string>)[id] = value;
}

function setAfterHours(draft: OnboardingDraft, row: string, value: string) {
  (draft.section3.afterHoursDisposition as Record<string, string>)[row] = value;
}

function setBooking(draft: OnboardingDraft, value: string) {
  (draft.section4 as { defaultBookingMode: string }).defaultBookingMode = value;
}

describe("Stage 2 emergency migration", () => {
  it("preselects the approved default for all 15 scenarios", () => {
    const draft = legacyDraft();
    assert.equal(EMERGENCY_SCENARIOS.length, 15);
    for (const scenario of EMERGENCY_SCENARIOS) {
      assert.equal(EXPECTED_EMERGENCY_DEFAULTS[scenario.id], EMERGENCY_ROW_DEFAULTS[scenario.id]);
      assert.equal(draft.section3.emergencyClassifications[scenario.id], EXPECTED_EMERGENCY_DEFAULTS[scenario.id]);
    }
    assert.deepEqual(Object.keys(EMERGENCY_CLASSIFICATION_LABELS).sort(), [
      "emergency",
      "human_review",
      "routine",
      "urgent",
    ]);
    assert.equal(EMERGENCY_CLASSIFICATION_LABELS.human_review, "Human review required");
    assert.equal("recommended_default" in EMERGENCY_CLASSIFICATION_LABELS, false);
  });

  it("preserves an explicit current classification", () => {
    const draft = legacyDraft();
    setEmergency(draft, "uncontrolled-water-leak-inside-property", "routine");
    const result = migrateStage2Answers(draft);
    assert.equal(
      result.draft.section3.emergencyClassifications["uncontrolled-water-leak-inside-property"],
      "routine",
    );
    const field = result.fields.find(
      (item) => item.path === "section3.emergencyClassifications.uncontrolled-water-leak-inside-property",
    );
    assert.equal(field?.status, "PRESERVED");
  });

  it("maps recommended_default to that scenario's default and records the fallback", () => {
    const draft = legacyDraft();
    setEmergency(draft, "multiple-fixtures-backing-up", "recommended_default");
    setEmergency(draft, "unclear-situation-may-be-dangerous", "recommended_default");
    const result = migrateStage2Answers(draft);
    assert.equal(
      result.draft.section3.emergencyClassifications["multiple-fixtures-backing-up"],
      "urgent",
    );
    assert.equal(
      result.draft.section3.emergencyClassifications["unclear-situation-may-be-dangerous"],
      "human_review",
    );
    assert.equal(
      result.fields.find((item) => item.path.endsWith("multiple-fixtures-backing-up"))?.status,
      "DEFAULTED_FROM_LEGACY",
    );
    assert.equal(result.draft.stage2Migration?.some((item) => item.from === "recommended_default"), true);
    const again = migrateStage2Answers(result.draft);
    assert.equal(again.draft.section3.emergencyClassifications["multiple-fixtures-backing-up"], "urgent");
    assert.equal(
      again.fields.find((item) => item.path.endsWith("multiple-fixtures-backing-up"))?.status,
      "PRESERVED",
    );
  });

  it("defaults an unknown emergency value and records that fallback", () => {
    const draft = legacyDraft();
    setEmergency(draft, "frozen-pipe-confirmed-leak", "not-a-classification");
    const result = migrateStage2Answers(draft);
    assert.equal(
      result.draft.section3.emergencyClassifications["frozen-pipe-confirmed-leak"],
      "emergency",
    );
    assert.equal(
      result.fields.find((item) => item.path.endsWith("frozen-pipe-confirmed-leak"))?.status,
      "DEFAULTED_FROM_UNKNOWN",
    );
  });
});

describe("Stage 2 after-hours migration", () => {
  it("preselects the three row defaults and offers only three choices", () => {
    const draft = legacyDraft();
    assert.equal(draft.section3.afterHoursDisposition.emergency, "contact_on_call");
    assert.equal(draft.section3.afterHoursDisposition.urgent_contained, "schedule_service");
    assert.equal(draft.section3.afterHoursDisposition.routine, "schedule_service");
    assert.deepEqual(
      AFTER_HOURS_DISPOSITION_OPTIONS.map((option) => option.label),
      ["Contact our on-call team", "Schedule service", "Take a message for follow-up"],
    );
  });

  it("maps the three approved legacy actions and preserves a current choice", () => {
    const draft = legacyDraft();
    setAfterHours(draft, "emergency", "attempt_contact");
    setAfterHours(draft, "urgent_contained", "confirm_or_book");
    setAfterHours(draft, "routine", "schedule_next_available");
    const mapped = migrateStage2Answers(draft);
    assert.equal(mapped.draft.section3.afterHoursDisposition.emergency, "contact_on_call");
    assert.equal(mapped.draft.section3.afterHoursDisposition.urgent_contained, "schedule_service");
    assert.equal(mapped.draft.section3.afterHoursDisposition.routine, "schedule_service");
    assert.equal(
      mapped.fields.find((item) => item.path.endsWith("emergency"))?.status,
      "MAPPED",
    );
    assert.equal(
      mapped.fields.find((item) => item.path.endsWith("urgent_contained"))?.status,
      "MAPPED",
    );
    assert.equal(
      mapped.fields.find((item) => item.path.endsWith("routine"))?.status,
      "MAPPED",
    );

    setAfterHours(mapped.draft, "routine", "take_message");
    const kept = migrateStage2Answers(mapped.draft);
    assert.equal(kept.draft.section3.afterHoursDisposition.routine, "take_message");
    assert.equal(kept.fields.find((item) => item.path.endsWith("routine"))?.status, "PRESERVED");
  });

  it("defaults every unmapped obsolete action to that row's new default", () => {
    const obsolete = ["submit_for_review", "arrange_callback", "info_only", "no_service"];
    for (const value of obsolete) {
      const draft = legacyDraft();
      setAfterHours(draft, "emergency", value);
      setAfterHours(draft, "routine", value);
      const result = migrateStage2Answers(draft);
      assert.equal(result.draft.section3.afterHoursDisposition.emergency, "contact_on_call");
      assert.equal(result.draft.section3.afterHoursDisposition.routine, "schedule_service");
      assert.equal(
        result.fields.find((item) => item.path.endsWith("emergency"))?.status,
        "DEFAULTED_FROM_LEGACY",
      );
      assert.equal(
        result.fields.find((item) => item.path.endsWith("routine"))?.status,
        "DEFAULTED_FROM_LEGACY",
      );
    }
  });
});

describe("Stage 2 booking migration", () => {
  it("starts a fresh draft on Book an available appointment and offers two choices", () => {
    const draft = legacyDraft();
    assert.equal(draft.section4.defaultBookingMode, "book_appointment");
    assert.equal(createDefaultSection4().defaultBookingMode, "book_appointment");
    assert.deepEqual(
      DEFAULT_BOOKING_OPTIONS.map((option) => option.label),
      ["Book an available appointment", "Send the request to our team"],
    );
  });

  it("maps immediate confirm and team approval, and preserves a current choice", () => {
    const confirm = legacyDraft();
    setBooking(confirm, "confirm_immediately");
    const confirmResult = migrateStage2Answers(confirm);
    assert.equal(confirmResult.draft.section4.defaultBookingMode, "book_appointment");
    assert.equal(confirmResult.fields.find((item) => item.path === "section4.defaultBookingMode")?.status, "MAPPED");

    const approval = legacyDraft();
    setBooking(approval, "submit_for_approval");
    const approvalResult = migrateStage2Answers(approval);
    assert.equal(approvalResult.draft.section4.defaultBookingMode, "send_to_team");
    assert.equal(
      approvalResult.fields.find((item) => item.path === "section4.defaultBookingMode")?.status,
      "MAPPED",
    );

    const again = migrateStage2Answers(approvalResult.draft);
    assert.equal(again.draft.section4.defaultBookingMode, "send_to_team");
    assert.equal(again.fields.find((item) => item.path === "section4.defaultBookingMode")?.status, "PRESERVED");
  });

  it("defaults arrange-a-callback and unknown booking values, and leaves the separate rules question alone", () => {
    const callback = legacyDraft();
    setBooking(callback, "arrange_callback");
    callback.section4.hasServiceBookingRules = "yes";
    callback.section4.serviceBookingRules = [
      { id: "rule-1", serviceId: "drain-cleaning", rule: "Keep me" },
    ];
    const callbackResult = migrateStage2Answers(callback);
    assert.equal(callbackResult.draft.section4.defaultBookingMode, "book_appointment");
    assert.equal(
      callbackResult.fields.find((item) => item.path === "section4.defaultBookingMode")?.status,
      "DEFAULTED_FROM_LEGACY",
    );
    assert.equal(callbackResult.draft.section4.hasServiceBookingRules, "yes");
    assert.equal(callbackResult.draft.section4.serviceBookingRules[0]?.rule, "Keep me");

    const unknown = legacyDraft();
    setBooking(unknown, "different_rules");
    const unknownResult = migrateStage2Answers(unknown);
    assert.equal(unknownResult.draft.section4.defaultBookingMode, "book_appointment");
    assert.equal(
      unknownResult.fields.find((item) => item.path === "section4.defaultBookingMode")?.status,
      "DEFAULTED_FROM_UNKNOWN",
    );
  });
});

describe("Stage 2 draft hydration", () => {
  it("migrates a legacy draft without throwing or changing unrelated answers", () => {
    const draft = legacyDraft();
    draft.section1.customerFacingName = "Acme Plumbing";
    draft.section2.plumbingServices["general-plumbing-repair"] = { policy: "offered", condition: "Saved" };
    (draft.section4.callerPermissions as Record<string, unknown>).homeowner = [
      "schedule_service",
      "agree_to_pay",
    ];
    draft.section4.bookingHorizonDays = "14";
    for (const scenario of EMERGENCY_SCENARIOS) {
      setEmergency(draft, scenario.id, "recommended_default");
    }
    setEmergency(draft, "only-usable-toilet-not-working", "routine");
    setAfterHours(draft, "emergency", "attempt_contact");
    setAfterHours(draft, "urgent_contained", "arrange_callback");
    setAfterHours(draft, "routine", "info_only");
    setBooking(draft, "submit_for_approval");

    const hydrated = migrateDraft(draft);
    assert.equal(hydrated.section1.customerFacingName, "Acme Plumbing");
    assert.equal(hydrated.section2.plumbingServices["general-plumbing-repair"].condition, "Saved");
    assert.equal(hydrated.section4.callerPermissions.homeowner, "full_authorization");
    assert.equal(hydrated.section4.bookingHorizonDays, "14");
    assert.equal(hydrated.section3.emergencyClassifications["only-usable-toilet-not-working"], "routine");
    assert.equal(hydrated.section3.emergencyClassifications["complete-loss-of-water"], "urgent");
    assert.equal(hydrated.section3.afterHoursDisposition.emergency, "contact_on_call");
    assert.equal(hydrated.section3.afterHoursDisposition.urgent_contained, "schedule_service");
    assert.equal(hydrated.section3.afterHoursDisposition.routine, "schedule_service");
    assert.equal(hydrated.section4.defaultBookingMode, "send_to_team");
    assert.equal(
      hydrated.stage2Migration?.some((item) => item.status === "DEFAULTED_FROM_LEGACY"),
      true,
    );
    assert.equal(hydrated.stage2Migration?.some((item) => item.status === "MAPPED"), true);
  });

  it("defaults unknown legacy values and does not throw", () => {
    const draft = legacyDraft();
    setEmergency(draft, "sewage-entering-property", "???");
    setAfterHours(draft, "emergency", "teleport");
    setBooking(draft, "not-a-mode");
    const hydrated = migrateDraft(draft);
    assert.equal(hydrated.section3.emergencyClassifications["sewage-entering-property"], "emergency");
    assert.equal(hydrated.section3.afterHoursDisposition.emergency, "contact_on_call");
    assert.equal(hydrated.section4.defaultBookingMode, "book_appointment");
    assert.equal(
      hydrated.stage2Migration?.filter((item) => item.status === "DEFAULTED_FROM_UNKNOWN").length,
      3,
    );
  });
});
