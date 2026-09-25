import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { migrateDraft } from "../migrate";
import { hasDraftContent, addCompletedSection, mergeWithDefaults } from "../draft-utils";
import { migrateStoredRedisDraft, isValidRedisDraft } from "@/lib/server/draft-store";
import { normalizeOnboardingDraft } from "../normalizeOnboarding";
import { normalizeSection8 } from "../normalize/section8";
import { prepareSubmission, applyQuestionnaireSubmission } from "../submission";
import { buildGlobalReviewCards } from "../globalReviewSummaries";
import { canSubmitQuestionnaire, q114ConfirmationsComplete } from "../validateOnboarding";
import { ALL_INTEGRATION_CAPABILITY_IDS } from "../section8Catalog";
import {
  createDefaultAuthorizedCapabilities,
  createDefaultDraft,
  createDefaultSection1,
  createDefaultSection8,
  SCHEMA_VERSION,
} from "../types";
import { fullyValidSection4 } from "../section4-test-helpers";
import { fullyValidSection7 } from "../section7-test-helpers";
import { fullyValidSection8, seedCrmSoftware } from "../section8-test-helpers";
import { buildSubmittableDraft } from "../submission-test-helpers";
import { validateSection8, section8IsValid } from "./section8";
import { upsertAdditionalSoftware, upsertRoleSoftware } from "../softwareRegistry";

const CREDENTIAL_PATTERNS = [
  /type=["']password["']/i,
  /name=["'][^"']*password[^"']*["']/i,
  /api[_-]?key/i,
  /client[_-]?secret/i,
  /access[_-]?token/i,
  /refresh[_-]?token/i,
  /private[_-]?key/i,
  /mfa/i,
];

describe("Section 8 validation", () => {
  it("A: Q104 accepts known CRM providers", () => {
    for (const provider of [
      "servicetitan",
      "housecall_pro",
      "jobber",
      "gohighlevel",
      "hubspot",
      "salesforce",
    ] as const) {
      let { section8, systems } = fullyValidSection8();
      ({ section8, systems } = seedCrmSoftware(section8, systems, provider));
      section8.schedulingProvider = "same_as_crm";
      section8.dispatchProvider = "same_as_scheduling";
      assert.equal(section8IsValid(section8, systems), true);
    }
    let { section8, systems } = fullyValidSection8();
    ({ section8, systems } = seedCrmSoftware(section8, systems, "none"));
    section8.schedulingProvider = "google_calendar";
    const up = upsertRoleSoftware(systems, section8.schedulingSoftwareId, "scheduling", "google_calendar");
    systems = up.systems;
    section8.schedulingSoftwareId = up.id;
    section8.dispatchProvider = "same_as_scheduling";
    assert.equal(section8IsValid(section8, systems), true);
  });

  it("B: Q104 custom system requires name", () => {
    let { section8, systems } = fullyValidSection8();
    ({ section8, systems } = seedCrmSoftware(section8, systems, "custom", ""));
    assert.ok(validateSection8(section8, systems).crmFsmCustomName);
  });

  it("C: Q105 same-as-Q104 reuses CRM software id", () => {
    const { section8, systems } = fullyValidSection8();
    assert.equal(section8.schedulingProvider, "same_as_crm");
    const crm = systems.find((s) => s.id === section8.crmFsmSoftwareId);
    assert.ok(crm);
    const norm = normalizeSection8(section8, systems);
    assert.equal(norm.scheduling_system?.software_id, crm!.id);
  });

  it("D: Q105 same-as invalid when Q104 none", () => {
    let { section8, systems } = fullyValidSection8();
    ({ section8, systems } = seedCrmSoftware(section8, systems, "none"));
    section8.schedulingProvider = "same_as_crm";
    assert.ok(validateSection8(section8, systems).schedulingProvider);
  });

  it("E: Q105 custom scheduler", () => {
    const { section8, systems: startSystems } = fullyValidSection8();
    let systems = startSystems;
    section8.schedulingProvider = "custom";
    section8.schedulingCustomName = "Acme Scheduler";
    const up = upsertRoleSoftware(systems, section8.schedulingSoftwareId, "scheduling", "custom", "Acme Scheduler");
    systems = up.systems;
    section8.schedulingSoftwareId = up.id;
    assert.equal(section8IsValid(section8, systems), true);
  });

  it("F: Q106 same-as resolves Q105 chain", () => {
    const { section8, systems } = fullyValidSection8();
    const norm = normalizeSection8(section8, systems);
    assert.equal(norm.dispatch_system?.software_id, norm.scheduling_system?.software_id);
  });

  it("G: Q106 custom dispatch", () => {
    const { section8, systems: startSystems } = fullyValidSection8();
    let systems = startSystems;
    section8.dispatchProvider = "custom";
    section8.dispatchCustomName = "DispatchPro";
    const up = upsertRoleSoftware(systems, "", "dispatch", "custom", "DispatchPro");
    section8.dispatchSoftwareId = up.id;
    systems = up.systems;
    assert.equal(section8IsValid(section8, systems), true);
  });

  it("H: Q107 Not sure remains valid", () => {
    const { section8, systems } = fullyValidSection8();
    section8.phoneProvider = "not_sure";
    section8.phoneSoftwareId = "";
    assert.equal(section8IsValid(section8, systems), true);
    assert.equal(normalizeSection8(section8, systems).phone_system, null);
  });

  it("I: Q107 custom phone system", () => {
    const { section8, systems: startSystems } = fullyValidSection8();
    let systems = startSystems;
    section8.phoneProvider = "custom";
    section8.phoneCustomName = "PBX Nine";
    const up = upsertRoleSoftware(systems, section8.phoneSoftwareId, "phone", "custom", "PBX Nine");
    systems = up.systems;
    section8.phoneSoftwareId = up.id;
    assert.equal(section8IsValid(section8, systems), true);
  });

  it("J: Q108 None exclusivity", () => {
    const { section8, systems } = fullyValidSection8();
    section8.additionalSoftwareCategories = ["none", "payment"];
    assert.ok(validateSection8(section8, systems).additionalSoftwareCategories);
  });

  it("K: Q108 per-category cards required", () => {
    const { section8, systems } = fullyValidSection8();
    section8.additionalSoftwareCategories = ["payment"];
    section8.additionalSoftwareCards = [
      {
        categoryId: "payment",
        softwareId: "",
        systemName: "",
        desiredAccess: "",
        otherCategoryLabel: "",
        otherDetails: "",
      },
    ];
    assert.ok(validateSection8(section8, systems)["additionalSoftware.payment.systemName"]);
  });

  it("L: Q108 Other details", () => {
    const { section8: base8, systems: baseSystems } = fullyValidSection8();
    const up = upsertAdditionalSoftware(baseSystems, "", "other", "Legacy DB", "Read-only");
    const systems = up.systems;
    const section8 = {
      ...base8,
      additionalSoftwareCategories: ["other" as const],
      additionalSoftwareCards: [
      {
        categoryId: "other",
        softwareId: up.id,
        systemName: "Legacy DB",
        desiredAccess: "Read-only customer lookup",
        otherCategoryLabel: "Legacy CRM",
        otherDetails: "Hosted on-prem",
      },
    ],
    };
    assert.equal(section8IsValid(section8 as import("../types").Section8Data, systems), true);
  });

  it("M: software stable IDs on edit", () => {
    const { section8, systems } = fullyValidSection8();
    const id = section8.crmFsmSoftwareId;
    const up = upsertRoleSoftware(systems, id, "crm_fsm", "servicetitan");
    assert.equal(up.id, id);
  });

  it("N: inactive stale systems excluded from additional normalization", () => {
    const { section8, systems } = fullyValidSection8();
    const stale = upsertAdditionalSoftware(systems, "", "payment", "StalePay", "Read");
    assert.equal(normalizeSection8(section8, stale.systems).additional_systems.length, 0);
  });

  it("O: Q109 all approved defaults present (except Other, which needs custom text)", () => {
    const s8 = createDefaultSection8();
    const expected = ALL_INTEGRATION_CAPABILITY_IDS.filter((id) => id !== "other");
    assert.deepEqual(s8.authorizedCapabilities, expected);
    assert.ok(s8.authorizedCapabilities.includes("view_warranty_info"));
  });

  it("P: Q109 defaults do not dirty fresh draft", () => {
    assert.equal(hasDraftContent(createDefaultDraft()), false);
  });

  it("Q: Q109 Other capability", () => {
    const { section8, systems } = fullyValidSection8();
    section8.authorizedCapabilities = ["find_customer", "other"];
    section8.authorizedCapabilityOther = "";
    assert.ok(validateSection8(section8, systems).authorizedCapabilityOther);
  });

  it("R: Q109 does not override Section 4 booking policy", () => {
    const base = createDefaultDraft();
    const section4 = fullyValidSection4(base.contacts);
    const draft = mergeWithDefaults({
      section4,
      section7: fullyValidSection7(),
    });
    const { section8, systems } = fullyValidSection8();
    draft.section8 = section8;
    draft.systems = systems;
    draft.section8.authorizedCapabilities = [...ALL_INTEGRATION_CAPABILITY_IDS];
    const norm = normalizeOnboardingDraft(draft);
    assert.equal(norm.scheduling.defaultBookingMode, section4.defaultBookingMode);
    assert.ok(norm.integration_profile.authorized_capabilities.length > 0);
  });

  it("S: membership/warranty read capabilities exist", () => {
    const s8 = createDefaultSection8();
    assert.ok(s8.authorizedCapabilities.includes("view_membership_status"));
    assert.ok(s8.authorizedCapabilities.includes("view_warranty_info"));
  });

  it("T: Q110 self authorized", () => {
    const { section8, systems } = fullyValidSection8();
    section8.connectionOwnerMode = "self_authorized";
    assert.equal(section8IsValid(section8, systems), true);
  });

  it("U: Q110 someone else requires contact fields", () => {
    const { section8, systems } = fullyValidSection8();
    section8.connectionOwnerMode = "someone_else";
    section8.connectionOwnerName = "Pat";
    section8.connectionOwnerEmail = "bad";
    section8.connectionOwnerPhone = "+14155552671";
    assert.ok(validateSection8(section8, systems).connectionOwnerEmail);
  });

  it("V: Q111 required acknowledgment", () => {
    const { section8, systems } = fullyValidSection8();
    section8.connectionNoticeAcknowledged = false;
    assert.ok(validateSection8(section8, systems).connectionNoticeAcknowledged);
  });

  it("W: no credential input controls in Section 8 form", () => {
    const src = readFileSync(
      join(process.cwd(), "src/components/onboarding/Section8Form.tsx"),
      "utf8",
    );
    for (const pattern of CREDENTIAL_PATTERNS) {
      assert.equal(pattern.test(src), false, `Forbidden credential pattern: ${pattern}`);
    }
  });

  it("X: Q112 each standard fallback", () => {
    for (const mode of ["collect_and_send", "callback", "connect_team"] as const) {
      const { section8, systems } = fullyValidSection8();
      section8.failureFallback = mode;
      assert.equal(section8IsValid(section8, systems), true);
    }
  });

  it("Y: Q112 custom branch normalization", () => {
    const { section8, systems } = fullyValidSection8();
    section8.failureFallback = "custom";
    section8.failureFallbackCustom = "  Escalate to owner  ";
    const norm = normalizeSection8(section8, systems);
    assert.equal(norm.failure_fallback.custom_rule, "Escalate to owner");
  });

  it("Z: Q113 optional whitespace → null", () => {
    const { section8, systems } = fullyValidSection8();
    section8.finalOperatingNotes = "   ";
    assert.equal(normalizeSection8(section8, systems).final_operating_notes, null);
  });

  it("AA: Section 8 completion adds 8 exactly once", () => {
    const once = addCompletedSection([1, 2, 3, 4, 5, 6, 7], 8);
    const twice = addCompletedSection(once, 8);
    assert.deepEqual(once, [1, 2, 3, 4, 5, 6, 7, 8]);
    assert.deepEqual(twice, once);
  });
});

describe("Global review and submission", () => {
  it("AB: global review has exactly 8 section cards", () => {
    const cards = buildGlobalReviewCards(createDefaultDraft());
    assert.equal(cards.length, 8);
  });

  it("AC: Edit actions target correct section forms", () => {
    const cards = buildGlobalReviewCards(createDefaultDraft());
    assert.equal(cards[0].editHref, "/onboarding/sections/1/form");
    assert.equal(cards[7].editHref, "/onboarding/sections/8/form");
  });

  it("AD–AE: invalid sections block submit readiness", () => {
    const draft = createDefaultDraft();
    assert.equal(canSubmitQuestionnaire(draft), false);
  });

  it("AF: completedSections alone cannot bypass revalidation", () => {
    const draft = createDefaultDraft();
    draft.navigation.completedSections = [1, 2, 3, 4, 5, 6, 7, 8];
    assert.equal(canSubmitQuestionnaire(draft), false);
  });

  it("AG–AI: Q114 confirmations required individually", () => {
    const draft = createDefaultDraft();
    draft.submission.confirmations.answersAccurate = true;
    assert.equal(q114ConfirmationsComplete(draft), false);
    draft.submission.confirmations.capabilitiesDependOnIntegrations = true;
    assert.equal(q114ConfirmationsComplete(draft), false);
  });

  it("AJ: all confirmations without valid sections still blocked", () => {
    const draft = createDefaultDraft();
    draft.submission.confirmations = {
      answersAccurate: true,
      capabilitiesDependOnIntegrations: true,
      actionsRequireSupportAuthorizationConfirmation: true,
    };
    assert.equal(canSubmitQuestionnaire(draft), false);
  });

  it("AL–AN: submission state transitions", () => {
    const draft = createDefaultDraft();
    const fail = prepareSubmission(draft);
    assert.equal(fail.ok, false);
    assert.equal(draft.submission.status, "draft");
    assert.equal(draft.submission.submittedAt, null);
  });

  it("AO: repeated submit is idempotent when content unchanged", () => {
    const draft = buildSubmittableDraft();
    const first = applyQuestionnaireSubmission(draft);
    assert.equal(first.ok, true);
    if (!first.ok) return;
    const at = first.draft.submission.submittedAt!;
    const again = applyQuestionnaireSubmission(first.draft);
    assert.equal(again.ok, true);
    if (again.ok) {
      assert.equal(again.duplicate, true);
      assert.equal(again.draft.submission.submittedAt, at);
    }
  });

  it("AQ: v9→v10 preserves Sections 1–7", () => {
    const rawV9 = {
      schemaVersion: 9 as const,
      updatedAt: "2026-01-01T00:00:00.000Z",
      navigation: { stage: "section-form", sectionId: 7, completedSections: [1, 2, 3, 4, 5, 6, 7] },
      section1: { ...createDefaultSection1(), customerFacingName: "Keep Me" },
      section7: fullyValidSection7(),
    };
    const migrated = migrateDraft(rawV9);
    assert.equal(migrated.schemaVersion, SCHEMA_VERSION);
    assert.equal(migrated.section1.customerFacingName, "Keep Me");
    assert.equal(migrated.section7.voiceSelection, "voice_a");
    assert.ok(migrated.section8);
    assert.ok(migrated.submission);
  });

  it("AR: Redis stored v9 migration", () => {
    const redisV9 = {
      schemaVersion: 9,
      updatedAt: "2026-01-01T00:00:00.000Z",
      currentRoute: "/onboarding",
      currentSection: 1,
      completedSections: [],
      data: {
        navigation: { stage: "welcome", sectionId: 1, completedSections: [] },
        section1: createDefaultSection1(),
        section2: createDefaultDraft().section2,
        section3: createDefaultDraft().section3,
        section4: createDefaultDraft().section4,
        section5: createDefaultDraft().section5,
        section6: createDefaultDraft().section6,
        section7: createDefaultDraft().section7,
        contacts: createDefaultDraft().contacts,
        fees: [],
      },
    };
    const migrated = migrateStoredRedisDraft(redisV9);
    assert.ok(migrated);
    assert.equal(migrated!.schemaVersion, SCHEMA_VERSION);
    assert.ok(isValidRedisDraft(migrated));
  });

  it("AS: fresh draft hasDraftContent false", () => {
    assert.equal(hasDraftContent(createDefaultDraft()), false);
    const caps = createDefaultAuthorizedCapabilities();
    assert.equal(caps.length, ALL_INTEGRATION_CAPABILITY_IDS.length - 1);
  });

  it("AT: full normalizer contains integration profile", () => {
    const { section8, systems } = fullyValidSection8();
    const norm = normalizeOnboardingDraft(
      mergeWithDefaults({ section8, systems }),
    );
    assert.ok(norm.integration_profile.crm_fsm);
  });

  it("AU: Q109 view warranty does not create warranty operational policy", () => {
    const { section8, systems } = fullyValidSection8();
    const norm = normalizeOnboardingDraft(mergeWithDefaults({ section8, systems }));
    assert.ok(
      norm.integration_profile.authorized_capabilities.some((c) =>
        c.includes("warranty"),
      ),
    );
    assert.equal((norm as { warranty_policy?: unknown }).warranty_policy, undefined);
  });
});
