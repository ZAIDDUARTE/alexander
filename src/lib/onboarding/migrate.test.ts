import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { migrateDraft, migrateNavigationV2ToV3 } from "./migrate";
import { SCHEMA_VERSION, createDefaultSection1, createDefaultSection2 } from "./types";

describe("migrateNavigationV2ToV3", () => {
  it("reconstructs a contiguous completedSections run from the old high-water-mark counter", () => {
    const nav = migrateNavigationV2ToV3({ stage: "section-form", sectionId: 3, sectionsCompleted: 2 });
    assert.deepEqual(nav.completedSections, [1, 2]);
    assert.equal(nav.sectionId, 3);
    assert.equal(nav.stage, "section-form");
  });

  it("handles a v2 draft that never completed anything", () => {
    const nav = migrateNavigationV2ToV3({ stage: "welcome", sectionId: 1, sectionsCompleted: 0 });
    assert.deepEqual(nav.completedSections, []);
  });

  it("defaults safely when the legacy navigation object is missing entirely", () => {
    const nav = migrateNavigationV2ToV3(undefined);
    assert.deepEqual(nav.completedSections, []);
    assert.equal(nav.sectionId, 1);
    assert.equal(nav.stage, "welcome");
  });
});

describe("migrateDraft", () => {
  it("is a no-op passthrough for the current schema version", () => {
    const raw = {
      schemaVersion: SCHEMA_VERSION,
      updatedAt: "2026-01-01T00:00:00.000Z",
      currentRoute: "/onboarding/sections/1/form",
      navigation: { stage: "section-form", sectionId: 1, completedSections: [] },
      section1: { ...createDefaultSection1(), customerFacingName: "Acme Plumbing" },
    };
    const migrated = migrateDraft(raw);
    assert.equal(migrated.schemaVersion, SCHEMA_VERSION);
    assert.equal(migrated.section1.customerFacingName, "Acme Plumbing");
  });

  it("upgrades a v2 draft forward, preserving customer answers (no destructive reset)", () => {
    const rawV2 = {
      schemaVersion: 2 as const,
      updatedAt: "2025-06-01T00:00:00.000Z",
      currentRoute: "/onboarding/sections/1/form",
      navigation: { stage: "section-form", sectionId: 1, sectionsCompleted: 0 },
      section1: {
        ...createDefaultSection1(),
        customerFacingName: "Acme Plumbing",
        mainPhone: "+14155552671",
      },
    };

    const migrated = migrateDraft(rawV2);

    assert.equal(migrated.schemaVersion, SCHEMA_VERSION);
    // The answers a customer already typed must survive the migration.
    assert.equal(migrated.section1.customerFacingName, "Acme Plumbing");
    assert.equal(migrated.section1.mainPhone, "+14155552671");
    assert.deepEqual(migrated.navigation.completedSections, []);
    // section2 did not exist in v2 — it must be safely defaulted, not omitted.
    assert.equal(migrated.section2.serviceAreaDefinitionMode, "");
  });

  it("(I) upgrades a v3 draft (Section 1 only, pre-Section-2) into v4 without losing Section 1 answers", () => {
    const rawV3 = {
      schemaVersion: 3 as const,
      updatedAt: "2026-06-01T00:00:00.000Z",
      currentRoute: "/onboarding/sections/1/review",
      navigation: {
        stage: "section-complete" as const,
        sectionId: 1,
        completedSections: [1],
      },
      section1: {
        ...createDefaultSection1(),
        customerFacingName: "Acme Plumbing",
        mainPhone: "+14155552671",
        approvedClaims: ["licensed" as const],
      },
      // note: no `section2` key at all — this is exactly what a real
      // pre-Section-2 v3 draft looks like.
    };

    const migrated = migrateDraft(rawV3);

    assert.equal(migrated.schemaVersion, SCHEMA_VERSION);
    // Section 1 answers survive untouched.
    assert.equal(migrated.section1.customerFacingName, "Acme Plumbing");
    assert.equal(migrated.section1.mainPhone, "+14155552671");
    assert.deepEqual(migrated.section1.approvedClaims, ["licensed"]);
    // Navigation/progress survives untouched.
    assert.deepEqual(migrated.navigation.completedSections, [1]);
    assert.equal(migrated.navigation.sectionId, 1);
    // Section 2 initializes to safe, unanswered defaults (no MD-approved
    // defaults exist for Q14–Q25).
    assert.equal(migrated.section2.serviceAreaDefinitionMode, "");
    assert.equal(migrated.section2.hasConditionalTerritory, "");
    assert.equal(Object.keys(migrated.section2.plumbingServices).length > 0, true);
    for (const entry of Object.values(migrated.section2.plumbingServices)) {
      assert.equal(entry.policy, "");
    }
  });

  it("(R) upgrades a v4 draft (Sections 1–2, pre-Section-3) into v5 without losing Section 1/2 data", () => {
    const rawV4 = {
      schemaVersion: 4 as const,
      updatedAt: "2026-09-01T00:00:00.000Z",
      currentRoute: "/onboarding/sections/2/review",
      navigation: {
        stage: "section-complete" as const,
        sectionId: 2,
        completedSections: [1, 2],
      },
      section1: {
        ...createDefaultSection1(),
        customerFacingName: "Acme Plumbing",
        mainPhone: "+14155552671",
        approvedClaims: ["licensed" as const],
      },
      section2: {
        ...createDefaultSection2(),
        serviceAreaDefinitionMode: "zip_codes" as const,
        serviceAreaZipCodes: ["90210", "90211"],
      },
      // note: no `section3`/`contacts` keys at all — this is exactly
      // what a real pre-Section-3 v4 draft looks like.
    };

    const migrated = migrateDraft(rawV4);

    assert.equal(migrated.schemaVersion, SCHEMA_VERSION);
    // Section 1 answers survive untouched.
    assert.equal(migrated.section1.customerFacingName, "Acme Plumbing");
    assert.equal(migrated.section1.mainPhone, "+14155552671");
    assert.deepEqual(migrated.section1.approvedClaims, ["licensed"]);
    // Section 2 answers (service catalog selections included) survive untouched.
    assert.equal(migrated.section2.serviceAreaDefinitionMode, "zip_codes");
    assert.deepEqual(migrated.section2.serviceAreaZipCodes, ["90210", "90211"]);
    // Navigation/progress survives untouched.
    assert.deepEqual(migrated.navigation.completedSections, [1, 2]);
    assert.equal(migrated.navigation.sectionId, 2);
    assert.equal(migrated.currentRoute, "/onboarding/sections/2/review");
    // Section 3 initializes safely (no MD-approved defaults exist for
    // Q26–Q38), with exactly one fresh, uniquely identified primary
    // contact placeholder — never left undefined/omitted.
    for (const value of Object.values(migrated.section3.emergencyClassifications)) {
      assert.equal(value, "");
    }
    assert.equal(migrated.contacts.length, 1);
    assert.equal(migrated.section3.primaryContactId, migrated.contacts[0].id);
  });

  it("safely resets unrecognized/legacy (pre-v2) or malformed drafts", () => {
    const malformed = migrateDraft({ schemaVersion: 1, whatever: "garbage" });
    assert.equal(malformed.schemaVersion, SCHEMA_VERSION);
    assert.equal(malformed.section1.customerFacingName, "");

    const notAnObject = migrateDraft("garbage-string");
    assert.equal(notAnObject.schemaVersion, SCHEMA_VERSION);

    const nullish = migrateDraft(null);
    assert.equal(nullish.schemaVersion, SCHEMA_VERSION);
  });
});
