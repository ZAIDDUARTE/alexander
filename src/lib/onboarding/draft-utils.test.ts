import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  reconcileDrafts,
  hasDraftContent,
  draftTimestamp,
  addCompletedSection,
} from "./draft-utils";
import {
  createDefaultDraft,
  createDefaultEmergencyClassifications,
  EMPTY_DRAFT_UPDATED_AT,
  contactHasIdentity,
} from "./types";
import { migrateDraft } from "./migrate";
import { isValidE164, sanitizePhoneInput } from "./phone";

describe("draft reconciliation", () => {
  it("does not treat empty default as newer than server content", () => {
    const local = createDefaultDraft();
    assert.equal(draftTimestamp(local), 0);

    const server = createDefaultDraft();
    server.updatedAt = "2026-01-01T12:00:00.000Z";
    server.section1.customerFacingName = "Acme Plumbing";

    const result = reconcileDrafts(local, server);
    assert.equal(result.draft.section1.customerFacingName, "Acme Plumbing");
    assert.equal(result.winner, "server");
    assert.equal(result.needsLocalSync, true);
  });

  it("prefers newer local draft and syncs server", () => {
    const server = createDefaultDraft();
    server.updatedAt = "2026-01-01T12:00:00.000Z";
    server.section1.customerFacingName = "Old Name";

    const local = createDefaultDraft();
    local.updatedAt = "2026-01-02T12:00:00.000Z";
    local.section1.customerFacingName = "New Name";

    const result = reconcileDrafts(local, server);
    assert.equal(result.draft.section1.customerFacingName, "New Name");
    assert.equal(result.needsServerSync, true);
  });

  it("empty drafts reconcile to default without sync", () => {
    const local = createDefaultDraft();
    const server = createDefaultDraft();
    const result = reconcileDrafts(local, server);
    assert.equal(hasDraftContent(result.draft), false);
    assert.equal(result.needsServerSync, false);
    assert.equal(result.draft.updatedAt, EMPTY_DRAFT_UPDATED_AT);
  });
});

describe("addCompletedSection (J: section completion)", () => {
  it("becomes [1, 2] when Section 2 completes after Section 1", () => {
    const afterSection1 = addCompletedSection([], 1);
    assert.deepEqual(afterSection1, [1]);

    const afterSection2 = addCompletedSection(afterSection1, 2);
    assert.deepEqual(afterSection2, [1, 2]);
  });

  it("never produces a duplicate section id", () => {
    const result = addCompletedSection([1, 2], 2);
    assert.deepEqual(result, [1, 2]);
  });

  it("keeps completedSections ascending even if completed out of order", () => {
    const result = addCompletedSection([2], 1);
    assert.deepEqual(result, [1, 2]);
  });

  it("re-marking an already-completed section is a no-op (same array identity)", () => {
    const completed = [1, 2];
    const result = addCompletedSection(completed, 1);
    assert.strictEqual(result, completed);
  });

  it("(T) becomes [1, 2, 3] when Section 3 completes after Sections 1–2, preserving prior completions", () => {
    const afterSections1And2 = [1, 2];
    const afterSection3 = addCompletedSection(afterSections1And2, 3);
    assert.deepEqual(afterSection3, [1, 2, 3]);
  });

  it("(T) re-marking Section 3 complete twice never produces a duplicate", () => {
    const once = addCompletedSection([1, 2], 3);
    const twice = addCompletedSection(once, 3);
    assert.deepEqual(twice, [1, 2, 3]);
    assert.strictEqual(twice, once);
  });
});

describe("hasDraftContent — Section 2 fields", () => {
  it("detects an in-progress Section 2 answer even with Section 1 blank", () => {
    const draft = createDefaultDraft();
    draft.section2.plumbingServices["general-plumbing-repair"] = {
      policy: "offered",
      condition: "",
    };
    assert.equal(hasDraftContent(draft), true);
  });

  it("a fully blank draft (Section 1 and Section 2) has no content", () => {
    const draft = createDefaultDraft();
    assert.equal(hasDraftContent(draft), false);
  });
});

describe("hasDraftContent — Section 3 fields", () => {
  it("fresh default draft hasDraftContent === false (empty primary placeholder is not content)", () => {
    assert.equal(hasDraftContent(createDefaultDraft()), false);
  });

  it("detects an in-progress Section 3 answer even with Sections 1–2 blank", () => {
    const draft = createDefaultDraft();
    const firstScenarioId = Object.keys(draft.section3.emergencyClassifications)[0];
    draft.section3.emergencyClassifications[firstScenarioId] = "emergency";
    assert.equal(hasDraftContent(draft), true);
  });

  it("detects an edited placeholder contact even with no Section 3 answers", () => {
    const draft = createDefaultDraft();
    draft.contacts[0].nameOrRole = "Dispatch Manager";
    assert.equal(hasDraftContent(draft), true);
  });

  it("a fully blank draft including the placeholder contact has no content", () => {
    const draft = createDefaultDraft();
    assert.equal(hasDraftContent(draft), false);
  });
});

describe("contactHasIdentity — Q38 picker eligibility", () => {
  it("empty primary placeholder is not eligible for Q38 selection", () => {
    const draft = createDefaultDraft();
    assert.equal(contactHasIdentity(draft.contacts[0]), false);
  });

  it("a contact with name/role is eligible", () => {
    const draft = createDefaultDraft();
    draft.contacts[0].nameOrRole = "Jamie";
    assert.equal(contactHasIdentity(draft.contacts[0]), true);
  });

  it("migration-created placeholder behaves the same (no identity)", () => {
    const migrated = migrateDraft({
      schemaVersion: 4,
      updatedAt: "2026-09-01T00:00:00.000Z",
      currentRoute: "/onboarding",
      navigation: { stage: "welcome", sectionId: 1, completedSections: [] },
      section1: {},
      section2: {},
    });
    assert.equal(migrated.contacts.length, 1);
    assert.equal(contactHasIdentity(migrated.contacts[0]), false);
    assert.equal(hasDraftContent(migrated), false);
  });
});

describe("Q26 defaults — no invented preselection", () => {
  it("createDefaultEmergencyClassifications leaves every row blank", () => {
    const map = createDefaultEmergencyClassifications();
    for (const value of Object.values(map)) {
      assert.equal(value, "");
    }
  });
});

describe("E.164 phone", () => {
  it("rejects alphabetic input", () => {
    assert.equal(sanitizePhoneInput("jjj"), "");
    assert.equal(isValidE164("jjj"), false);
  });

  it("accepts valid international numbers", () => {
    assert.equal(isValidE164("+14155552671"), true);
    assert.equal(isValidE164("+923001234567"), true);
  });
});
