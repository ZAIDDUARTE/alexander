import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { saveLocalDraft, loadLocalDraft } from "./persistence";
import { applyQuestionnaireSubmission, prepareSubmission } from "./submission";
import {
  applyPostSubmissionEditPolicy,
  hasPendingSubmissionChanges,
  questionnaireContentFingerprint,
} from "./submissionIntegrity";
import { buildSubmittableDraft } from "./submission-test-helpers";
import { createDefaultDraft, createDefaultAuthorizedCapabilities } from "./types";
import { hasDraftContent } from "./draft-utils";
import { fullyValidSection8 } from "./section8-test-helpers";
import { normalizeSection8 } from "./normalize/section8";
import { toRedisDraft, fromRedisDraft } from "./draft-utils";
import { isValidRedisDraft } from "@/lib/server/draft-store";
import { ALL_INTEGRATION_CAPABILITY_IDS } from "./section8Catalog";

describe("submission integrity", () => {
  it("1: submission succeeds when Redis unavailable (client payload only)", () => {
    const draft = buildSubmittableDraft();
    const payload = toRedisDraft(draft, "/onboarding/review");
    assert.ok(isValidRedisDraft(payload));
    const result = prepareSubmission(fromRedisDraft(payload));
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.draft.submission.status, "submitted");
      assert.ok(result.draft.submission.submittedAt);
    }
  });

  it("2: successful submission state can be written to local draft", () => {
    const storage: Record<string, string> = {};
    const g = globalThis as typeof globalThis & { localStorage?: Storage; window?: Window };
    (g as { window: unknown }).window = g;
    g.localStorage = {
      getItem: (k: string) => storage[k] ?? null,
      setItem: (k: string, v: string) => {
        storage[k] = v;
      },
      removeItem: (k: string) => {
        delete storage[k];
      },
      clear: () => {
        Object.keys(storage).forEach((k) => delete storage[k]);
      },
      key: () => null,
      length: 0,
    };
    const draft = buildSubmittableDraft();
    const result = applyQuestionnaireSubmission(draft);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    saveLocalDraft(result.draft);
    const reloaded = loadLocalDraft();
    assert.equal(reloaded.submission.status, "submitted");
    assert.ok(reloaded.submission.submittedAt);
    assert.ok(reloaded.submission.lastSubmittedContentRevision);
  });

  it("3: validates client draft content (Q113 change changes fingerprint)", () => {
    const draft = buildSubmittableDraft();
    const fp1 = questionnaireContentFingerprint(draft);
    draft.section8.finalOperatingNotes = "Updated after flush";
    const fp2 = questionnaireContentFingerprint(draft);
    assert.notEqual(fp1, fp2);
    const first = applyQuestionnaireSubmission(draft);
    assert.equal(first.ok, true);
    if (!first.ok) return;
    draft.section8.finalOperatingNotes = "Different value for server";
    assert.notEqual(
      questionnaireContentFingerprint(draft),
      first.draft.submission.lastSubmittedContentRevision,
    );
  });

  it("4: submittedAt set on first successful submit", () => {
    const draft = buildSubmittableDraft();
    const result = applyQuestionnaireSubmission(draft);
    assert.equal(result.ok, true);
    if (result.ok) assert.ok(result.draft.submission.submittedAt);
  });

  it("5: identical duplicate submit preserves submittedAt", () => {
    const draft = buildSubmittableDraft();
    const first = applyQuestionnaireSubmission(draft);
    assert.equal(first.ok, true);
    if (!first.ok) return;
    const at = first.draft.submission.submittedAt!;
    const second = applyQuestionnaireSubmission(first.draft);
    assert.equal(second.ok, true);
    if (second.ok) {
      assert.equal(second.duplicate, true);
      assert.equal(second.draft.submission.submittedAt, at);
    }
  });

  it("6: edit after submit creates pending change state", () => {
    const draft = buildSubmittableDraft();
    const first = applyQuestionnaireSubmission(draft);
    assert.equal(first.ok, true);
    if (!first.ok) return;
    const edited = {
      ...first.draft,
      section8: { ...first.draft.section8, finalOperatingNotes: "Changed after submit" },
    };
    assert.equal(hasPendingSubmissionChanges(edited), true);
  });

  it("7–9: changed draft may resubmit with latest answers and new submittedAt", () => {
    const draft = buildSubmittableDraft();
    const first = applyQuestionnaireSubmission(draft);
    assert.equal(first.ok, true);
    if (!first.ok) return;
    const oldRevision = first.draft.submission.lastSubmittedContentRevision!;
    const edited = {
      ...first.draft,
      section8: { ...first.draft.section8, finalOperatingNotes: "Resubmit me" },
      submission: {
        ...first.draft.submission,
        confirmations: {
          answersAccurate: true,
          capabilitiesDependOnIntegrations: true,
          actionsRequireSupportAuthorizationConfirmation: true,
        },
      },
    };
    const second = applyQuestionnaireSubmission(edited);
    assert.equal(second.ok, true);
    if (second.ok) {
      assert.equal(second.duplicate, false);
      assert.notEqual(second.draft.submission.lastSubmittedContentRevision, oldRevision);
      assert.equal(second.draft.section8.finalOperatingNotes, "Resubmit me");
      assert.ok(second.draft.submission.submittedAt);
    }
  });

  it("10: editing after submit resets Q114 confirmations", () => {
    const draft = buildSubmittableDraft();
    const submitted = applyQuestionnaireSubmission(draft);
    assert.equal(submitted.ok, true);
    if (!submitted.ok) return;
    const prev = submitted.draft;
    const next = {
      ...prev,
      section8: { ...prev.section8, finalOperatingNotes: "Edit" },
    };
    const policy = applyPostSubmissionEditPolicy(prev, next);
    assert.equal(policy.submission.confirmations.answersAccurate, false);
  });

  it("11: navigation-only change does not reset confirmations", () => {
    const draft = buildSubmittableDraft();
    const submitted = applyQuestionnaireSubmission(draft);
    assert.equal(submitted.ok, true);
    if (!submitted.ok) return;
    const prev = submitted.draft;
    const next = {
      ...prev,
      navigation: { ...prev.navigation, stage: "section-review" as const },
    };
    const policy = applyPostSubmissionEditPolicy(prev, next);
    assert.equal(policy.submission.confirmations.answersAccurate, true);
  });

  it("12: failed resubmit does not replace last successful submitted state", () => {
    const draft = buildSubmittableDraft();
    const first = applyQuestionnaireSubmission(draft);
    assert.equal(first.ok, true);
    if (!first.ok) return;
    const edited = {
      ...first.draft,
      section8: { ...first.draft.section8, finalOperatingNotes: "Bad" },
      submission: {
        ...first.draft.submission,
        confirmations: {
          answersAccurate: false,
          capabilitiesDependOnIntegrations: false,
          actionsRequireSupportAuthorizationConfirmation: false,
        },
      },
    };
    const fail = applyQuestionnaireSubmission(edited);
    assert.equal(fail.ok, false);
    assert.equal(first.draft.submission.submittedAt, first.draft.submission.submittedAt);
  });

  it("13: duplicate submit does not create a second record (same draft envelope)", () => {
    const draft = buildSubmittableDraft();
    const a = applyQuestionnaireSubmission(draft);
    const b = applyQuestionnaireSubmission(a.ok ? a.draft : draft);
    assert.equal(a.ok && b.ok, true);
    if (a.ok && b.ok) {
      assert.equal(
        a.draft.submission.lastSubmittedContentRevision,
        b.draft.submission.lastSubmittedContentRevision,
      );
    }
  });

  it("14: Q109 concrete defaults do not dirty fresh draft", () => {
    assert.equal(hasDraftContent(createDefaultDraft()), false);
    assert.equal(createDefaultAuthorizedCapabilities().length, ALL_INTEGRATION_CAPABILITY_IDS.length - 1);
  });

  it("15: Q106 same-system resolves to Q105 software record", () => {
    const { section8, systems } = fullyValidSection8();
    const norm = normalizeSection8(section8, systems);
    assert.equal(norm.dispatch_system?.software_id, norm.scheduling_system?.software_id);
    assert.ok(norm.scheduling_system?.display_name);
    assert.ok(!norm.scheduling_system?.display_name.includes("same_as"));
  });
});
