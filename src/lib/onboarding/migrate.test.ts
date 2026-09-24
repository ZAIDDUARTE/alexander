import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { migrateDraft, migrateNavigationV2ToV3 } from "./migrate";
import { SCHEMA_VERSION, createDefaultSection1 } from "./types";

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
  it("is a no-op passthrough for the current schema version (v3)", () => {
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
