import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createDraftAutosaveController,
  draftAutosaveFingerprint,
  type DraftSaveResult,
} from "./autosave";
import { fromRedisDraft, toRedisDraft } from "./draft-utils";
import {
  isValidE164,
  normalizeToE164,
  sanitizePhoneInput,
} from "./phone";
import { serializeQuestionnaireAnswersV1 } from "./questionnaire-v1";
import { createDefaultDraft, createEmptyContact } from "./types";
import { validateSection1 } from "./validation/section1";
import { validateContact } from "./validation/section3";

type PhoneFieldState = {
  focused: boolean;
  local: string;
  draft: string;
  visible: string;
};

/**
 * Pure stand-in for PhoneField's focus-local buffer + sanitize/normalize path.
 * Keeps UI-visible text stable across stale parent props while focused.
 */
function reducePhoneField(
  state: Omit<PhoneFieldState, "visible">,
  event:
    | { type: "focus" }
    | { type: "change"; raw: string }
    | { type: "paste"; raw: string }
    | { type: "blur" }
    | { type: "props"; value: string },
): PhoneFieldState {
  let { focused, local, draft } = state;
  if (event.type === "focus") {
    focused = true;
    local = draft;
  } else if (event.type === "change" || event.type === "paste") {
    local = sanitizePhoneInput(event.raw);
    draft = local;
  } else if (event.type === "blur") {
    focused = false;
    const trimmed = local.trim();
    draft = trimmed ? normalizeToE164(local) : "";
    local = draft;
  } else if (event.type === "props") {
    draft = event.value;
    if (!focused) local = event.value;
  }
  return {
    focused,
    local,
    draft,
    visible: focused ? local : draft,
  };
}

describe("shared phone input persistence", () => {
  it("A: typing into the shared phone buffer persists the visible value", () => {
    let state = reducePhoneField({ focused: false, local: "", draft: "" }, { type: "focus" });
    state = reducePhoneField(state, { type: "change", raw: "4" });
    state = reducePhoneField(state, { type: "change", raw: "41" });
    state = reducePhoneField(state, { type: "change", raw: "415" });
    assert.equal(state.visible, "415");
    assert.equal(state.draft, "415");
  });

  it("B: paste persists a formatted US number", () => {
    let state = reducePhoneField({ focused: false, local: "", draft: "" }, { type: "focus" });
    state = reducePhoneField(state, { type: "paste", raw: "(415) 555-2671" });
    assert.equal(state.visible, "(415) 555-2671");
    state = reducePhoneField(state, { type: "blur" });
    assert.equal(state.draft, "+4155552671");
    assert.equal(state.visible, "+4155552671");
  });

  it("C: leading + is preserved while typing and after blur", () => {
    let state = reducePhoneField({ focused: false, local: "", draft: "" }, { type: "focus" });
    state = reducePhoneField(state, { type: "change", raw: "+14155552671" });
    assert.equal(state.visible, "+14155552671");
    // Stale empty props while focused must not blank the buffer.
    state = reducePhoneField(state, { type: "props", value: "" });
    assert.equal(state.visible, "+14155552671");
    state = reducePhoneField(state, { type: "blur" });
    assert.equal(state.draft, "+14155552671");
    assert.ok(isValidE164(state.draft));
  });

  it("D: required empty phone fails validation", () => {
    assert.ok(validateSection1(createDefaultDraft().section1).mainPhone);
    assert.ok(validateContact(createEmptyContact()).phone);
  });

  it("E: valid phone passes phone validation", () => {
    const s1 = createDefaultDraft().section1;
    s1.mainPhone = "+14155552671";
    assert.equal(validateSection1(s1).mainPhone, undefined);

    const contact = createEmptyContact();
    contact.nameOrRole = "Jamie";
    contact.phone = "+14155552671";
    contact.callCategories = ["emergencies"];
    contact.availability.monday = { closed: false, start: "08:00", end: "17:00" };
    assert.equal(validateContact(contact).phone, undefined);
  });

  it("F: autosave / redis round-trip stores phone as a string", () => {
    const draft = createDefaultDraft();
    draft.section1.mainPhone = "+14155552671";
    const primary = draft.contacts[0]!;
    primary.phone = "+14155552672";
    const redis = toRedisDraft(draft, "/onboarding/sections/1/form");
    assert.equal(typeof redis.data.section1.mainPhone, "string");
    assert.equal(typeof redis.data.contacts[0]?.phone, "string");
    assert.equal(redis.data.section1.mainPhone, "+14155552671");
    assert.equal(redis.data.contacts[0]?.phone, "+14155552672");
  });

  it("G: refresh/resume restores phone values from redis draft", () => {
    const draft = createDefaultDraft();
    draft.section1.mainPhone = "+14155552671";
    draft.contacts[0]!.phone = "+14155552672";
    const restored = fromRedisDraft(toRedisDraft(draft, "/onboarding"));
    assert.equal(restored.section1.mainPhone, "+14155552671");
    assert.equal(restored.contacts[0]?.phone, "+14155552672");
  });

  it("H: multiple phone fields update independently", () => {
    const draft = createDefaultDraft();
    const backup = createEmptyContact();
    draft.contacts.push(backup);
    draft.section3.backupContactId = backup.id;

    draft.section1.mainPhone = sanitizePhoneInput("+14155550001");
    draft.contacts[0]!.phone = sanitizePhoneInput("+14155550002");
    draft.contacts[1]!.phone = sanitizePhoneInput("+14155550003");
    draft.section8.connectionOwnerPhone = sanitizePhoneInput("+14155550004");

    assert.equal(draft.section1.mainPhone, "+14155550001");
    assert.equal(draft.contacts[0]!.phone, "+14155550002");
    assert.equal(draft.contacts[1]!.phone, "+14155550003");
    assert.equal(draft.section8.connectionOwnerPhone, "+14155550004");
  });

  it("I: Questionnaire Answers v1 emits phone as scalar_text", () => {
    const draft = createDefaultDraft();
    draft.section1.mainPhone = "+14155552671";
    const answers = serializeQuestionnaireAnswersV1(draft);
    const q3 = answers.sections.S1.answers.Q3;
    assert.ok(q3);
    assert.equal(q3!.answer_kind, "scalar_text");
    assert.equal(q3!.value, "+14155552671");
    assert.equal(typeof q3!.value, "string");
  });

  it("invited stale_draft rebase keeps in-flight phone edits", async () => {
    let latest = createDefaultDraft();
    latest.section1.mainPhone = "+14155552671";
    const emptyServer = createDefaultDraft();
    let version: number | null = 3;
    const phones: string[] = [];

    const controller = createDraftAutosaveController({
      getLatest: () => latest,
      getRoute: () => "/onboarding",
      onLocalDraftAdjusted: (d) => {
        latest = d;
      },
      onInvitedConflictVersion: (v) => {
        version = v;
      },
      onAuthoritativeDraft: (d) => {
        latest = d;
      },
      onResult: () => {},
      save: async (draft) => {
        phones.push(draft.section1.mainPhone);
        if (phones.length === 1) {
          const result: DraftSaveResult = {
            ok: false,
            reason: "stale_draft",
            invited: true,
            draftVersion: 4,
            draft: emptyServer,
            redisAvailable: false,
            savedToRedis: false,
            savedDurable: false,
            durableAvailable: true,
            persistence: "durable",
          };
          return result;
        }
        return {
          ok: true,
          invited: true,
          draftVersion: 5,
          draft: { ...draft, updatedAt: "2026-10-03T12:00:00.000Z" },
          redisAvailable: false,
          savedToRedis: false,
          savedDurable: true,
          durableAvailable: true,
          persistence: "durable",
        };
      },
    });

    controller.requestSave();
    await controller.whenIdle();
    assert.deepEqual(phones, ["+14155552671", "+14155552671"]);
    assert.equal(latest.section1.mainPhone, "+14155552671");
    assert.equal(version, 4);
    assert.notEqual(
      draftAutosaveFingerprint(latest),
      draftAutosaveFingerprint(emptyServer),
    );
  });
});
