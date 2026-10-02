import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hasDraftContent, mergeWithDefaults } from "./draft-utils";
import { normalizeSection8 } from "./normalize/section8";
import { draftAutosaveFingerprint } from "./autosave";
import {
  CONNECTION_OWNER_OPTIONS,
  CRM_FSM_OPTIONS,
  FAILURE_FALLBACK_OPTIONS,
  PHONE_OPTIONS,
  Q111_NOTICE_PARAGRAPHS,
  SCHEDULING_OPTIONS,
  ADDITIONAL_SOFTWARE_CATEGORIES,
} from "./section8Catalog";
import { fullyValidSection8 } from "./section8-test-helpers";
import {
  createDefaultDraft,
  createDefaultSection8,
  type Section8Data,
} from "./types";
import { section8IsValid, validateSection8 } from "./validation/section8";

describe("Stage 6 current software questions", () => {
  it("keeps the CRM, scheduling, and phone choices", () => {
    assert.deepEqual(
      CRM_FSM_OPTIONS.map((option) => option.label),
      [
        "ServiceTitan",
        "Housecall Pro",
        "Jobber",
        "GoHighLevel",
        "HubSpot",
        "Salesforce",
        "Another system",
        "We don’t use one",
      ],
    );
    assert.deepEqual(
      SCHEDULING_OPTIONS.map((option) => option.label),
      [
        "Same system selected above",
        "Google Calendar",
        "Microsoft Outlook / Microsoft 365",
        "Cal.com",
        "Another scheduling system",
        "We don’t use scheduling software",
      ],
    );
    assert.deepEqual(
      PHONE_OPTIONS.map((option) => option.label),
      [
        "RingCentral",
        "Dialpad",
        "Zoom Phone",
        "GoHighLevel",
        "Traditional landline / carrier",
        "Mobile phones",
        "Another phone system",
        "Not sure",
      ],
    );
    assert.deepEqual(
      ADDITIONAL_SOFTWARE_CATEGORIES.map((option) => option.label),
      [
        "Separate customer database",
        "Separate price book / estimating software",
        "Membership / service-plan software",
        "Financing system",
        "Payment system",
        "SMS / texting platform",
        "Email / shared inbox",
        "Other",
        "None",
      ],
    );
    assert.deepEqual(
      CONNECTION_OWNER_OPTIONS.map((option) => option.label),
      ["I can", "Someone else on our team"],
    );
    assert.deepEqual(
      FAILURE_FALLBACK_OPTIONS.map((option) => option.id),
      ["collect_and_send", "connect_team", "custom"],
    );
    const form = readFileSync("src/components/onboarding/Section8Form.tsx", "utf8");
    assert.equal(form.includes("What system do you use for dispatching technicians?"), false);
    assert.equal(form.includes("Which of these should Alexander be able to do"), false);
    assert.equal(form.includes("Arrange a callback"), false);
    assert.match(Q111_NOTICE_PARAGRAPHS[1], /Do not enter passwords/);
  });

  it("requires another-system names, optional authorizer phone, and the failure rule", () => {
    const crm = fullyValidSection8();
    crm.section8.crmFsmProvider = "custom";
    crm.section8.crmFsmCustomName = "";
    assert.ok(validateSection8(crm.section8, crm.systems).crmFsmCustomName);

    const scheduling = fullyValidSection8();
    scheduling.section8.schedulingProvider = "custom";
    scheduling.section8.schedulingCustomName = "";
    assert.ok(validateSection8(scheduling.section8, scheduling.systems).schedulingCustomName);

    const phone = fullyValidSection8();
    phone.section8.phoneProvider = "custom";
    phone.section8.phoneCustomName = "";
    assert.ok(validateSection8(phone.section8, phone.systems).phoneCustomName);
    phone.section8.phoneProvider = "not_sure";
    assert.equal(section8IsValid(phone.section8, phone.systems), true);

    const owner = fullyValidSection8();
    owner.section8.connectionOwnerMode = "someone_else";
    owner.section8.connectionOwnerName = "";
    owner.section8.connectionOwnerEmail = "";
    owner.section8.connectionOwnerPhone = "";
    assert.ok(validateSection8(owner.section8, owner.systems).connectionOwnerName);
    assert.ok(validateSection8(owner.section8, owner.systems).connectionOwnerEmail);
    owner.section8.connectionOwnerName = "Alex Rivera";
    owner.section8.connectionOwnerEmail = "alex@example.com";
    assert.equal(validateSection8(owner.section8, owner.systems).connectionOwnerPhone, undefined);
    assert.equal(section8IsValid(owner.section8, owner.systems), true);

    const failure = fullyValidSection8();
    failure.section8.failureFallback = "custom";
    failure.section8.failureFallbackCustom = "";
    assert.ok(validateSection8(failure.section8, failure.systems).failureFallbackCustom);
    failure.section8.failureFallbackCustom = "Email the office manager.";
    failure.section8.finalOperatingNotes = "";
    assert.equal(section8IsValid(failure.section8, failure.systems), true);
  });

  it("defaults a fresh failure answer to collect and send and does not treat that as draft content", () => {
    assert.equal(createDefaultSection8().failureFallback, "collect_and_send");
    assert.equal(hasDraftContent(createDefaultDraft()), false);
  });
});

describe("Stage 6 legacy integration migration", () => {
  it("drops dispatch and capabilities, keeps compatible answers, and does not guess authorization", () => {
    const draft = createDefaultDraft();
    draft.section1.customerFacingName = "Harbor Plumbing";
    draft.section7.brandPhrasesAndAvoidances = "We show up in a marked van.";
    const section8 = {
      ...draft.section8,
      crmFsmProvider: "jobber",
      crmFsmCustomName: "",
      schedulingProvider: "google_calendar",
      schedulingCustomName: "",
      dispatchProvider: "custom",
      dispatchCustomName: "Old dispatch board",
      phoneProvider: "zoom_phone",
      phoneCustomName: "",
      additionalSoftwareCategories: ["payment", "sms_texting"],
      additionalSoftwareCards: [
        {
          categoryId: "payment" as const,
          softwareId: "",
          systemName: "Stripe",
          desiredAccess: "",
          otherCategoryLabel: "",
          otherDetails: "One generic note that must not be copied",
        },
        {
          categoryId: "sms_texting" as const,
          softwareId: "",
          systemName: "",
          desiredAccess: "",
          otherCategoryLabel: "",
          otherDetails: "",
        },
      ],
      authorizedCapabilities: ["find_customer", "create_appointments"],
      authorizedCapabilityOther: "Post invoices",
      connectionOwnerMode: "not_authorized",
      connectionOwnerName: "Kept Name",
      connectionOwnerEmail: "kept@example.com",
      connectionOwnerPhone: "+14155550100",
      connectionNoticeAcknowledged: true,
      failureFallback: "callback",
      failureFallbackCustom: "",
      finalOperatingNotes: "We close on Sundays.",
    };
    draft.section8 = section8 as unknown as Section8Data;
    const migrated = mergeWithDefaults(draft);
    assert.equal(migrated.section8.crmFsmProvider, "jobber");
    assert.equal(migrated.section8.schedulingProvider, "google_calendar");
    assert.equal(migrated.section8.phoneProvider, "zoom_phone");
    assert.equal(migrated.section8.dispatchProvider, "");
    assert.equal(migrated.section8.dispatchCustomName, "");
    assert.deepEqual(migrated.section8.authorizedCapabilities, []);
    assert.equal(migrated.section8.additionalSoftwareCards[0]?.systemName, "Stripe");
    assert.equal(migrated.section8.additionalSoftwareCards[1]?.systemName, "");
    assert.equal(migrated.section8.connectionOwnerMode, "");
    assert.equal(migrated.section8.connectionOwnerName, "Kept Name");
    assert.equal(migrated.section8.connectionOwnerEmail, "kept@example.com");
    assert.equal(migrated.section8.connectionNoticeAcknowledged, true);
    assert.equal(migrated.section8.failureFallback, "collect_and_send");
    assert.equal(migrated.section8.finalOperatingNotes, "We close on Sundays.");
    assert.equal(migrated.section1.customerFacingName, "Harbor Plumbing");
    assert.equal(migrated.section7.brandPhrasesAndAvoidances, "We show up in a marked van.");
    assert.equal(
      migrated.stage2Migration?.some(
        (note) => note.path === "section8.dispatchProvider" && note.status === "DROPPED_OBSOLETE",
      ),
      true,
    );
    assert.equal(
      migrated.stage2Migration?.some(
        (note) => note.path === "section8.authorizedCapabilities" && note.status === "DROPPED_OBSOLETE",
      ),
      true,
    );
    assert.equal(
      migrated.stage2Migration?.some(
        (note) => note.path === "section8.connectionOwnerMode" && note.from === "not_authorized",
      ),
      true,
    );
    assert.equal(
      migrated.stage2Migration?.some(
        (note) => note.path === "section8.failureFallback" && note.from === "callback",
      ),
      true,
    );
    const normalized = normalizeSection8(migrated.section8, migrated.systems);
    assert.equal(normalized.dispatch_system, null);
    assert.deepEqual(normalized.authorized_capabilities, []);
    assert.equal(normalized.failure_fallback.mode, "collect_and_send");
    assert.equal(normalized.connection_notice_acknowledged, true);
  });

  it("preserves a current section 8 answer, including someone else and a custom rule", () => {
    const draft = createDefaultDraft();
    const { section8, systems } = fullyValidSection8();
    section8.phoneProvider = "custom";
    section8.phoneCustomName = "OpenPhone";
    section8.additionalSoftwareCategories = ["membership", "payment"];
    section8.additionalSoftwareCards = [
      {
        categoryId: "membership",
        softwareId: "",
        systemName: "Service Fusion",
        desiredAccess: "",
        otherCategoryLabel: "",
        otherDetails: "",
      },
      {
        categoryId: "payment",
        softwareId: "",
        systemName: "Square",
        desiredAccess: "",
        otherCategoryLabel: "",
        otherDetails: "",
      },
    ];
    section8.connectionOwnerMode = "someone_else";
    section8.connectionOwnerName = "Jordan Lee";
    section8.connectionOwnerEmail = "jordan@example.com";
    section8.connectionOwnerPhone = "";
    section8.connectionNoticeAcknowledged = true;
    section8.failureFallback = "connect_team";
    section8.finalOperatingNotes = "Call the shop before 7.";
    draft.section8 = section8;
    draft.systems = systems;
    const migrated = mergeWithDefaults(draft);
    const again = mergeWithDefaults(migrated);
    assert.equal(again.section8.phoneCustomName, "OpenPhone");
    assert.equal(again.section8.additionalSoftwareCards[0]?.systemName, "Service Fusion");
    assert.equal(again.section8.additionalSoftwareCards[1]?.systemName, "Square");
    assert.equal(again.section8.connectionOwnerMode, "someone_else");
    assert.equal(again.section8.connectionOwnerPhone, "");
    assert.equal(again.section8.failureFallback, "connect_team");
    assert.equal(again.section8.finalOperatingNotes, "Call the shop before 7.");
    assert.equal(again.section8.connectionNoticeAcknowledged, true);
    assert.equal(section8IsValid(again.section8, again.systems), true);
    const stamped = { ...again, updatedAt: "2026-10-02T12:00:00.000Z" };
    assert.equal(draftAutosaveFingerprint(again), draftAutosaveFingerprint(stamped));
  });

  it("does not map an unknown authorizer or unknown failure onto a guessed person", () => {
    const draft = createDefaultDraft();
    draft.section8 = {
      ...draft.section8,
      connectionOwnerMode: "not_sure",
      failureFallback: "fax_the_office",
    } as unknown as Section8Data;
    const migrated = mergeWithDefaults(draft);
    assert.equal(migrated.section8.connectionOwnerMode, "");
    assert.equal(migrated.section8.failureFallback, "collect_and_send");
    assert.equal(
      migrated.stage2Migration?.some(
        (note) => note.path === "section8.failureFallback" && note.status === "DEFAULTED_FROM_UNKNOWN",
      ),
      true,
    );
  });
});
