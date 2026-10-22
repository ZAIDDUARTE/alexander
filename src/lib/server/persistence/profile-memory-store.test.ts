import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  FICTIONAL_PROFILE_CUSTOMER_ID,
  memoryApplyEdit,
  memoryGetBusinessProfile,
  memoryListRevisions,
  memoryOriginalQuestionnaireUntouched,
  memoryPublish,
  memoryResetForTests,
  memoryRollback,
  memoryUpdatePublication,
} from "./profile-memory-store";

describe("profile-memory-store isolation", () => {
  beforeEach(() => memoryResetForTests());

  it("seeds fictional customer and keeps original questionnaire snapshot stable", () => {
    const profile = memoryGetBusinessProfile(FICTIONAL_PROFILE_CUSTOMER_ID);
    assert.ok(profile);
    assert.equal(profile?.currentRevision, 1);
    assert.equal(memoryOriginalQuestionnaireUntouched(FICTIONAL_PROFILE_CUSTOMER_ID), true);
  });

  it("rejects other customer ids and conflicting revisions", () => {
    assert.equal(memoryGetBusinessProfile("00000000-0000-4000-8000-000000000001"), null);
    const conflict = memoryApplyEdit({
      customerId: FICTIONAL_PROFILE_CUSTOMER_ID,
      expectedRevision: 99,
      patch: { Q1: "x" },
    });
    assert.equal(conflict.ok, false);
  });

  it("classifies sensitive edits, publishes, and rolls back without mutating seed", () => {
    const routine = memoryApplyEdit({
      customerId: FICTIONAL_PROFILE_CUSTOMER_ID,
      expectedRevision: 1,
      patch: {
        Q1: { question_id: "Q1", answer_kind: "scalar_text", value: "Fictional Plumbing Isolated" },
      },
    });
    assert.equal(routine.ok, true);
    if (!routine.ok) return;
    assert.equal(routine.diff.revisionImpact, "low");

    // Mark generated + QA + publish on rev 2
    const profile = memoryGetBusinessProfile(FICTIONAL_PROFILE_CUSTOMER_ID);
    assert.equal(profile?.currentRevision, 2);
    // Force config hash via publish helper path: mark_qa then publish after setting hash through memoryPublish internals
    // Simulate generate by applying publication via mark after setting config on state through a second edit path:
    // Use publish after manually satisfying via memoryPublish mark_qa — first set config through a temporary edit publish flow.
    // Direct: apply sensitive edit then rollback requires approved revision.
    // Set approved by calling memoryPublish after injecting configContentSha256 through mark_failed/publish cycle.
    // Simpler: use memoryApplyEdit for Q8 then check high impact; then use rollback only after publish.

    // Inject config + publish by using memoryPublish after we patch publication via a helper sequence:
    // Re-read and use memoryPublish mark_qa for all requirements after we set config through another apply+manual:
    memoryUpdatePublication(FICTIONAL_PROFILE_CUSTOMER_ID, (publication, data) => {
      (data as { _runtime_config?: unknown })._runtime_config = { contentSha256: "cfg" };
      return { ...publication, configContentSha256: "cfg", status: "config_generated" };
    });
    const reqs = memoryGetBusinessProfile(FICTIONAL_PROFILE_CUSTOMER_ID)?.publication.qaRequirements || [];
    for (const req of reqs) {
      memoryPublish({
        customerId: FICTIONAL_PROFILE_CUSTOMER_ID,
        action: "mark_qa",
        requirementId: req.id,
        satisfied: true,
      });
    }
    const published = memoryPublish({
      customerId: FICTIONAL_PROFILE_CUSTOMER_ID,
      action: "publish",
    });
    assert.equal(published?.status, "published");
    assert.equal(published?.approvedProfileRevision, 2);

    const sensitive = memoryApplyEdit({
      customerId: FICTIONAL_PROFILE_CUSTOMER_ID,
      expectedRevision: 2,
      patch: {
        Q8: {
          question_id: "Q8",
          answer_kind: "weekly_schedule",
          value: { monday: { closed: true, start: null, end: null } },
        },
      },
    });
    assert.equal(sensitive.ok, true);
    if (!sensitive.ok) return;
    assert.equal(sensitive.diff.revisionImpact, "high");
    assert.equal(sensitive.trilletSyncRequired, true);

    const rolled = memoryRollback({
      customerId: FICTIONAL_PROFILE_CUSTOMER_ID,
      expectedRevision: 3,
      actorRef: "test",
    });
    assert.equal(rolled.ok, true);
    assert.equal(memoryOriginalQuestionnaireUntouched(FICTIONAL_PROFILE_CUSTOMER_ID), true);
    assert.ok(memoryListRevisions(FICTIONAL_PROFILE_CUSTOMER_ID).length >= 4);
  });
});
