import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  reconcileDrafts,
  hasDraftContent,
  draftTimestamp,
  addCompletedSection,
} from "./draft-utils";
import { createDefaultDraft, EMPTY_DRAFT_UPDATED_AT } from "./types";
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
