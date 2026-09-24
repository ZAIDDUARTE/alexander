import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getConnectorFill,
  getOverallCompletionProgress,
  getSectionNodeState,
} from "./overall";

const TOTAL = 8;

describe("getOverallCompletionProgress", () => {
  it("Section 1 current, 0 completed — reflects only live progress on the frontier section", () => {
    const progress = getOverallCompletionProgress({
      totalSections: TOTAL,
      currentSection: 1,
      completedSections: [],
      currentSectionProgress: 0.5,
    });
    assert.equal(progress, 0.5 / TOTAL);
  });

  it("Section 3 current, Sections 1–2 complete — banked + live frontier contribution", () => {
    const progress = getOverallCompletionProgress({
      totalSections: TOTAL,
      currentSection: 3,
      completedSections: [1, 2],
      currentSectionProgress: 0.25,
    });
    assert.equal(progress, (2 + 0.25) / TOTAL);
  });

  it("Section 1 re-edited while Sections 1–4 already complete — no double count, no regression", () => {
    // Even if the user momentarily clears a required field while
    // re-editing Section 1, the already-banked 4/8 must not move.
    const stillEditing = getOverallCompletionProgress({
      totalSections: TOTAL,
      currentSection: 1,
      completedSections: [1, 2, 3, 4],
      currentSectionProgress: 0.1, // e.g. field temporarily cleared mid-edit
    });
    const freshlyOpened = getOverallCompletionProgress({
      totalSections: TOTAL,
      currentSection: 1,
      completedSections: [1, 2, 3, 4],
      currentSectionProgress: 1,
    });

    assert.equal(stillEditing, 4 / TOTAL);
    assert.equal(freshlyOpened, 4 / TOTAL);
    assert.equal(stillEditing, freshlyOpened);
  });
});

describe("getSectionNodeState", () => {
  it("keeps a re-opened completed section marked completed, not current", () => {
    const state = getSectionNodeState(1, [1, 2, 3, 4], 1);
    assert.equal(state, "completed");
  });

  it("marks a genuine frontier section as current", () => {
    const state = getSectionNodeState(3, [1, 2], 3);
    assert.equal(state, "current");
  });

  it("marks an untouched future section as future", () => {
    const state = getSectionNodeState(5, [1, 2], 3);
    assert.equal(state, "future");
  });
});

describe("getConnectorFill", () => {
  it("fills completed connectors fully regardless of live re-edit progress", () => {
    const fill = getConnectorFill(1, [1, 2, 3, 4], 1, 0.1);
    assert.equal(fill, 1);
  });

  it("fills the current frontier connector with live progress", () => {
    const fill = getConnectorFill(3, [1, 2], 3, 0.6);
    assert.equal(fill, 0.6);
  });

  it("leaves future connectors empty", () => {
    const fill = getConnectorFill(5, [1, 2], 3, 0.6);
    assert.equal(fill, 0);
  });
});
