import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  reconcileDrafts,
  hasDraftContent,
  draftTimestamp,
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
