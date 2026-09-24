import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isReadableStoredDraft,
  isValidRedisDraft,
  migrateStoredRedisDraft,
} from "./draft-store";
import { SCHEMA_VERSION, createDefaultSection1, createDefaultSection2 } from "@/lib/onboarding/types";

describe("isValidRedisDraft — current schema only", () => {
  it("rejects a v3 Redis envelope that lacks section2", () => {
    const v3 = {
      schemaVersion: 3,
      updatedAt: "2026-06-01T00:00:00.000Z",
      currentRoute: "/onboarding/sections/1/form",
      currentSection: 1,
      completedSections: [1],
      data: {
        navigation: { stage: "section-complete", sectionId: 1, completedSections: [1] },
        section1: { ...createDefaultSection1(), customerFacingName: "Acme" },
      },
    };
    assert.equal(isValidRedisDraft(v3), false);
    assert.equal(isReadableStoredDraft(v3), true);
  });
});

describe("migrateStoredRedisDraft — Redis v3 → v4 without losing Section 1", () => {
  it("upgrades a representative v3 stored draft into the current Redis envelope", () => {
    const v3Stored = {
      schemaVersion: 3,
      updatedAt: "2026-06-01T12:00:00.000Z",
      currentRoute: "/onboarding/sections/1/review",
      currentSection: 1,
      completedSections: [1],
      data: {
        navigation: {
          stage: "section-complete" as const,
          sectionId: 1,
          completedSections: [1],
        },
        section1: {
          ...createDefaultSection1(),
          customerFacingName: "Acme Plumbing",
          legalName: "Acme Plumbing LLC",
          mainPhone: "+14155552671",
          website: "https://acme.example",
          approvedClaims: ["licensed" as const],
          otherApprovedClaim: "",
          licensingDetails: "C-36 #123",
          forbiddenClaims: "Do not claim BBB.",
          answeringMode: "always" as const,
          recurringAvailabilityNotes: "Fridays close early.",
        },
        // no section2 — this is exactly a pre-Section-2 Redis draft
      },
    };

    const migrated = migrateStoredRedisDraft(v3Stored);
    assert.ok(migrated);
    assert.equal(migrated!.schemaVersion, SCHEMA_VERSION);
    assert.equal(migrated!.data.section1.customerFacingName, "Acme Plumbing");
    assert.equal(migrated!.data.section1.legalName, "Acme Plumbing LLC");
    assert.equal(migrated!.data.section1.mainPhone, "+14155552671");
    assert.equal(migrated!.data.section1.website, "https://acme.example");
    assert.deepEqual(migrated!.data.section1.approvedClaims, ["licensed"]);
    assert.equal(migrated!.data.section1.licensingDetails, "C-36 #123");
    assert.equal(migrated!.data.section1.forbiddenClaims, "Do not claim BBB.");
    assert.equal(migrated!.data.section1.answeringMode, "always");
    assert.equal(migrated!.data.section1.recurringAvailabilityNotes, "Fridays close early.");
    assert.deepEqual(migrated!.data.navigation.completedSections, [1]);
    assert.equal(migrated!.completedSections.length, 1);
    // Section 2 is initialized, not omitted
    assert.ok(migrated!.data.section2);
    assert.equal(migrated!.data.section2.serviceAreaDefinitionMode, "");
    assert.equal(isValidRedisDraft(migrated), true);
  });

  it("returns null for garbage that is not a draft envelope", () => {
    assert.equal(migrateStoredRedisDraft(null), null);
    assert.equal(migrateStoredRedisDraft("nope"), null);
    assert.equal(migrateStoredRedisDraft({ foo: 1 }), null);
  });
});

describe("migrateStoredRedisDraft — (S) Redis v4 → v5 without losing Sections 1–2", () => {
  it("upgrades a representative v4 stored draft (Sections 1–2, pre-Section-3) into the current Redis envelope", () => {
    const v4Stored = {
      schemaVersion: 4,
      updatedAt: "2026-09-01T12:00:00.000Z",
      currentRoute: "/onboarding/sections/2/review",
      currentSection: 2,
      completedSections: [1, 2],
      data: {
        navigation: {
          stage: "section-complete" as const,
          sectionId: 2,
          completedSections: [1, 2],
        },
        section1: {
          ...createDefaultSection1(),
          customerFacingName: "Acme Plumbing",
          mainPhone: "+14155552671",
        },
        section2: {
          ...createDefaultSection2(),
          serviceAreaDefinitionMode: "distance" as const,
          serviceAreaDistance: { address: "123 Main St", radiusMiles: "25" },
        },
        // no section3/contacts — this is exactly a pre-Section-3 v4
        // Redis draft, for either localStorage or Redis backends.
      },
    };

    const migrated = migrateStoredRedisDraft(v4Stored);
    assert.ok(migrated);
    assert.equal(migrated!.schemaVersion, SCHEMA_VERSION);
    assert.equal(migrated!.data.section1.customerFacingName, "Acme Plumbing");
    assert.equal(migrated!.data.section1.mainPhone, "+14155552671");
    assert.equal(migrated!.data.section2.serviceAreaDefinitionMode, "distance");
    assert.equal(migrated!.data.section2.serviceAreaDistance.radiusMiles, "25");
    assert.deepEqual(migrated!.data.navigation.completedSections, [1, 2]);
    assert.equal(migrated!.completedSections.length, 2);
    // Section 3 + shared contact registry are initialized, not omitted.
    assert.ok(migrated!.data.section3);
    assert.equal(Array.isArray(migrated!.data.contacts), true);
    assert.equal(migrated!.data.contacts.length, 1);
    assert.equal(migrated!.data.section3.primaryContactId, migrated!.data.contacts[0].id);
    assert.equal(isValidRedisDraft(migrated), true);
  });
});
