import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { resolve } from "node:path";

import { fromRedisDraft, toRedisDraft } from "./draft-utils";
import { isValidE164 } from "./phone";
import { createDefaultDraft } from "./types";
import { canSubmitQuestionnaire, validateAllSections } from "./validateOnboarding";
import { validateSection1 } from "./validation/section1";
import { validateContact } from "./validation/section3";
import { createEmptyContact } from "./types";

const EVIDENCE = resolve("docs/evidence/questionnaire-v1");

function loadDraft(name: string) {
  return JSON.parse(readFileSync(resolve(EVIDENCE, name), "utf8"));
}

describe("final hardening — Section 1 refresh/resume", () => {
  it("restores identity fields after redis round-trip", () => {
    const draft = createDefaultDraft();
    draft.section1.customerFacingName = "Hardening Resume Co";
    draft.section1.legalName = "Hardening Resume Co LLC";
    draft.section1.mainPhone = "+14155552671";
    draft.section1.website = "https://hardening.example";
    draft.section1.licensingDetails = "CA-123";
    draft.section1.forbiddenClaims = "No guarantees";
    draft.section1.approvedClaims = ["licensed", "insured"];

    const restored = fromRedisDraft(toRedisDraft(draft, "/onboarding/sections/1/form"));
    assert.equal(restored.section1.customerFacingName, "Hardening Resume Co");
    assert.equal(restored.section1.legalName, "Hardening Resume Co LLC");
    assert.equal(restored.section1.mainPhone, "+14155552671");
    assert.equal(restored.section1.website, "https://hardening.example");
    assert.equal(restored.section1.licensingDetails, "CA-123");
    assert.equal(restored.section1.forbiddenClaims, "No guarantees");
    assert.deepEqual(restored.section1.approvedClaims, ["licensed", "insured"]);
  });
});

describe("final hardening — phone / validation consistency", () => {
  it("required phone cannot validate when authoritative value is empty", () => {
    const s1 = createDefaultDraft().section1;
    s1.mainPhone = "";
    assert.ok(validateSection1(s1).mainPhone);

    const contact = createEmptyContact();
    contact.nameOrRole = "Jamie";
    contact.phone = "";
    assert.ok(validateContact(contact).phone);
  });

  it("authoritative E.164 phone satisfies shared phone validation", () => {
    const s1 = createDefaultDraft().section1;
    s1.mainPhone = "+14155552671";
    assert.ok(isValidE164(s1.mainPhone));
    assert.equal(validateSection1(s1).mainPhone, undefined);
  });
});

describe("final hardening — Final Review section markers", () => {
  it("marks incomplete sections when required answers are missing", () => {
    const draft = createDefaultDraft();
    const results = validateAllSections(draft);
    assert.equal(results.length, 8);
    assert.ok(results.some((r) => !r.valid));
    assert.equal(canSubmitQuestionnaire(draft), false);
  });

  it("shows no incomplete markers when all eight sections are valid", () => {
    const draft = loadDraft("raw-complete.json");
    const results = validateAllSections(draft);
    assert.equal(results.length, 8);
    assert.deepEqual(
      results.filter((r) => !r.valid).map((r) => r.sectionId),
      [],
    );
  });
});

describe("final hardening — scroll helper is wired for silent-error recovery", () => {
  it("is imported by every section complete handler", () => {
    for (const section of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const source = readFileSync(
        resolve(`src/components/onboarding/Section${section}Form.tsx`),
        "utf8",
      );
      assert.ok(source.includes("scrollToFirstAlert"), `section ${section}`);
    }
    const editor = readFileSync(
      resolve("src/components/onboarding/AppointmentWindowEditor.tsx"),
      "utf8",
    );
    assert.ok(editor.includes("appointmentWindows.${window.id}.times"));
    assert.ok(editor.includes("t > window.start"));
  });
});
