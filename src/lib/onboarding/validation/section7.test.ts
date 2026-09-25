import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { migrateDraft } from "../migrate";
import { hasDraftContent, mergeWithDefaults, addCompletedSection } from "../draft-utils";
import { normalizeSection7 } from "../normalize/section7";
import { migrateStoredRedisDraft, isValidRedisDraft } from "@/lib/server/draft-store";
import {
  APPROVED_PRIMARY_VOICES,
  VOICE_CONSTITUTION_EXCLUDED_CONTROLS,
  VOICE_LANGUAGE_CAPABILITY_CATALOG_AVAILABLE,
  hasAdditionalApprovedVoices,
  isApprovedVoiceId,
  isAccentOptionAvailable,
} from "../approvedVoiceCatalog";
import { normalizeLanguagePolicy } from "../voiceProfileLanguages";
import { VOICE_CHOICE_ANOTHER } from "../section7Catalog";
import {
  createDefaultDraft,
  createDefaultSection1,
  createDefaultSection6,
  createDefaultSection7,
  createPronunciationEntryId,
  SCHEMA_VERSION,
} from "../types";
import { fullyValidSection7, fullyValidSection7WithPronunciation } from "../section7-test-helpers";
import { validateSection7, section7IsValid } from "./section7";

describe("Section 7 validation — Q92", () => {
  it("A: requires language selection", () => {
    const data = createDefaultSection7();
    assert.ok(validateSection7(data).callerLanguages);
  });

  it("B: English-only exclusivity", () => {
    const data = createDefaultSection7();
    data.englishOnly = true;
    data.callerLanguages = ["spanish"];
    assert.ok(validateSection7(data).callerLanguages);
    data.callerLanguages = [];
    assert.equal(validateSection7(data).callerLanguages, undefined);
  });

  it("C: Other supported language unavailable while capability catalog unavailable", () => {
    assert.equal(VOICE_LANGUAGE_CAPABILITY_CATALOG_AVAILABLE, false);
    const data = fullyValidSection7();
    data.callerLanguages = ["other"];
    data.otherSupportedLanguage = "French";
    assert.ok(validateSection7(data).callerLanguages);
  });

  it("D: unverified Other language not normalized as approved support", () => {
    const data = fullyValidSection7();
    data.callerLanguages = ["english", "spanish", "other"];
    data.otherSupportedLanguage = "French";
    const norm = normalizeSection7(data);
    assert.equal(norm.supported_languages.some((l) => l.startsWith("other:")), false);
    assert.deepEqual(norm.supported_languages, ["english", "spanish"]);
  });
});

describe("Section 7 source integrity", () => {
  it("1: another approved voice unavailable when additional catalog empty", () => {
    assert.equal(hasAdditionalApprovedVoices(), false);
    const formSrc = readFileSync(
      join(process.cwd(), "src/components/onboarding/Section7Form.tsx"),
      "utf8",
    );
    assert.ok(formSrc.includes("No additional approved voices are currently available."));
    assert.ok(formSrc.includes("disabled={!hasAdditionalApprovedVoices()}"));
  });

  it("2: arbitrary additional voice ID rejected", () => {
    const data = fullyValidSection7();
    data.voiceSelection = VOICE_CHOICE_ANOTHER;
    data.anotherApprovedVoiceId = "evil_voice";
    assert.ok(validateSection7(data).voiceSelection);
  });

  it("5: multiple supported languages do not invent primary language", () => {
    const data = fullyValidSection7();
    const policy = normalizeLanguagePolicy(data);
    assert.equal(policy.primary_language, null);
    assert.deepEqual(policy.supported_languages, ["english", "spanish"]);
  });

  it("6: exactly one supported language becomes primary", () => {
    const data = fullyValidSection7();
    data.callerLanguages = ["spanish"];
    const policy = normalizeLanguagePolicy(data);
    assert.equal(policy.primary_language, "spanish");
    assert.deepEqual(policy.supported_languages, ["spanish"]);
  });

  it("7: English-only normalizes correctly", () => {
    const data = createDefaultSection7();
    data.englishOnly = true;
    const policy = normalizeLanguagePolicy(data);
    assert.equal(policy.primary_language, "english");
    assert.deepEqual(policy.supported_languages, ["english"]);
  });

  it("8: unavailable accent not normalized as approved", () => {
    const data = fullyValidSection7();
    data.accentPreference = "regional_american";
    assert.equal(isAccentOptionAvailable("regional_american", "voice_a"), false);
    assert.equal(normalizeSection7(data).accent_preference, null);
  });

  it("9: No preference remains valid for Q100", () => {
    const data = fullyValidSection7();
    data.accentPreference = "no_preference";
    assert.equal(section7IsValid(data), true);
    assert.equal(normalizeSection7(data).accent_preference, "no_preference");
  });

  it("10: missing previewSrc does not prevent Voice A/B/C selection", () => {
    assert.equal(APPROVED_PRIMARY_VOICES.every((v) => v.previewSrc === null), true);
    const data = fullyValidSection7();
    data.voiceSelection = "voice_b";
    assert.equal(section7IsValid(data), true);
  });

  it("11: missing previewSrc renders no broken audio player", () => {
    const previewSrc = readFileSync(
      join(process.cwd(), "src/components/onboarding/VoicePreviewCard.tsx"),
      "utf8",
    );
    assert.ok(previewSrc.includes("Preview coming soon"));
    assert.ok(!previewSrc.includes("<audio") || previewSrc.includes("hasPreview ?"));
  });

  it("12: non-null previewSrc activates preview player architecture", () => {
    const withPreview = { ...APPROVED_PRIMARY_VOICES[0], previewSrc: "/voices/voice_a.mp3" };
    assert.equal(Boolean(withPreview.previewSrc), true);
    const cardSrc = readFileSync(
      join(process.cwd(), "src/components/onboarding/VoicePreviewCard.tsx"),
      "utf8",
    );
    assert.ok(cardSrc.includes("hasPreview"));
    assert.ok(cardSrc.includes("Play preview"));
  });
});

describe("Section 7 validation — Q93–Q96", () => {
  it("E: voice required", () => {
    const data = fullyValidSection7();
    data.voiceSelection = "";
    assert.ok(validateSection7(data).voiceSelection);
  });

  it("F: invalid voice rejected", () => {
    const data = fullyValidSection7();
    data.voiceSelection = "voice_not_real" as typeof data.voiceSelection;
    assert.ok(validateSection7(data).voiceSelection);
    assert.equal(isApprovedVoiceId("voice_not_real"), false);
  });

  it("G: communication style required", () => {
    const data = fullyValidSection7();
    data.communicationStyle = "";
    assert.ok(validateSection7(data).communicationStyle);
  });

  it("H: Alexander spoken name mode", () => {
    const data = fullyValidSection7();
    data.spokenNameMode = "alexander";
    data.spokenDisplayName = "Should clear";
    const norm = normalizeSection7({ ...data, spokenDisplayName: "" });
    assert.equal(norm.display_name, "Alexander");
  });

  it("I: custom spoken name required", () => {
    const data = fullyValidSection7();
    data.spokenNameMode = "company_specific";
    data.spokenDisplayName = "";
    assert.ok(validateSection7(data).spokenDisplayName);
    data.spokenDisplayName = "Jamie";
    assert.equal(validateSection7(data).spokenDisplayName, undefined);
  });

  it("J: disclosure mode required", () => {
    const data = fullyValidSection7();
    data.aiDisclosureStyle = "";
    assert.ok(validateSection7(data).aiDisclosureStyle);
  });

  it("K: custom disclosure normalizes to null when blank", () => {
    const data = fullyValidSection7();
    data.aiDisclosureStyle = "custom";
    data.aiDisclosureCustom = "   ";
    assert.equal(normalizeSection7(data).ai_disclosure_custom, null);
    data.aiDisclosureCustom = "Custom wording.";
    assert.equal(normalizeSection7(data).ai_disclosure_custom, "Custom wording.");
  });
});

describe("Section 7 validation — Q97 pronunciation", () => {
  it("L: None mode", () => {
    const data = fullyValidSection7();
    data.pronunciationMode = "none";
    assert.equal(section7IsValid(data), true);
    assert.deepEqual(normalizeSection7(data).pronunciation_dictionary, []);
  });

  it("M: Yes requires entry", () => {
    const data = fullyValidSection7();
    data.pronunciationMode = "yes";
    data.pronunciationEntries = [];
    assert.ok(validateSection7(data).pronunciationEntries);
  });

  it("N: stable pronunciation IDs", () => {
    const a = createPronunciationEntryId();
    const b = createPronunciationEntryId();
    assert.notEqual(a, b);
  });

  it("O: incomplete pronunciation invalid", () => {
    const data = fullyValidSection7WithPronunciation();
    data.pronunciationEntries[0].pronunciation = "";
    assert.ok(validateSection7(data)[`pronunciationEntries.${data.pronunciationEntries[0].id}`]);
  });

  it("P: optional audio reference persists in draft", () => {
    const data = fullyValidSection7WithPronunciation();
    data.pronunciationEntries[0].audioSampleReference = "https://example.com/sample.mp3";
    const norm = normalizeSection7(data);
    assert.equal(norm.pronunciation_dictionary[0].audioSampleReference, "https://example.com/sample.mp3");
  });
});

describe("Section 7 — Q98–Q103", () => {
  it("Q: language switching states", () => {
    const data = fullyValidSection7();
    for (const id of [
      "continue_caller_language",
      "ask_preference",
      "english_offer_human",
    ] as const) {
      data.languageSwitchingPolicy = id;
      assert.equal(validateSection7(data).languageSwitchingPolicy, undefined);
    }
  });

  it("R: custom switching rule branch optional", () => {
    const data = fullyValidSection7();
    data.languageSwitchingPolicy = "custom";
    data.languageSwitchingCustomRule = "";
    assert.equal(validateSection7(data).languageSwitchingCustomRule, undefined);
    assert.equal(normalizeSection7(data).language_switching_custom_rule, null);
  });

  it("S: Q99 optional", () => {
    const data = fullyValidSection7();
    data.perceivedVoicePreference = "";
    assert.equal(section7IsValid(data), true);
  });

  it("T: Q100 unavailable other accent not approved", () => {
    const data = fullyValidSection7();
    data.accentPreference = "other_approved";
    data.accentOtherApproved = "Southern drawl";
    assert.ok(validateSection7(data).accentPreference);
    assert.equal(normalizeSection7(data).accent_preference, null);
  });

  it("U: Q101 optional", () => {
    const data = fullyValidSection7();
    data.formalityPreference = "";
    assert.equal(section7IsValid(data), true);
  });

  it("V/W: Q102/Q103 whitespace → null", () => {
    const data = fullyValidSection7();
    data.brandPhrasesAndAvoidances = "   ";
    data.additionalReviewNotes = "\n";
    const norm = normalizeSection7(data);
    assert.equal(norm.approved_phrases_and_avoidances, null);
    assert.equal(norm.additional_review_notes, null);
  });
});

describe("Section 7 normalization", () => {
  it("X: stale custom branches removed", () => {
    const data = fullyValidSection7();
    data.spokenNameMode = "alexander";
    data.spokenDisplayName = "Stale";
    data.aiDisclosureStyle = "opening_ai_receptionist";
    data.aiDisclosureCustom = "Stale disclosure";
    const norm = normalizeSection7(data);
    assert.equal(norm.display_name, "Alexander");
    assert.equal(norm.ai_disclosure_custom, null);
  });
});

describe("Section 7 catalog and constitution", () => {
  it("Y: approved voice catalog centralized", () => {
    assert.equal(APPROVED_PRIMARY_VOICES.length, 3);
    assert.ok(isApprovedVoiceId("voice_a"));
  });

  it("Z: no low-level voice controls in Section 7 UI sources", () => {
    const root = join(process.cwd(), "src");
    const files = [
      "components/onboarding/Section7Form.tsx",
      "lib/onboarding/section7Catalog.ts",
      "lib/onboarding/types.ts",
    ];
    const blob = files.map((f) => readFileSync(join(root, f), "utf8")).join("\n").toLowerCase();
    for (const term of VOICE_CONSTITUTION_EXCLUDED_CONTROLS) {
      assert.equal(blob.includes(term.toLowerCase()), false, `found forbidden control: ${term}`);
    }
  });
});

describe("Section 7 migration and draft safety", () => {
  it("AA: v8→v9 preserves Sections 1–6", () => {
    const rawV8 = {
      schemaVersion: 8 as const,
      navigation: { stage: "section-form" as const, sectionId: 6, completedSections: [1, 2, 3, 4, 5, 6] },
      section1: { ...createDefaultSection1(), customerFacingName: "Acme" },
      section6: createDefaultSection6(),
    };
    const migrated = migrateDraft(rawV8);
    assert.equal(migrated.schemaVersion, SCHEMA_VERSION);
    assert.equal(migrated.section1.customerFacingName, "Acme");
    assert.ok(migrated.section7);
    assert.equal(migrated.section7.voiceSelection, "");
  });

  it("AB: Redis v8 stored draft migration", () => {
    const v8Stored = {
      schemaVersion: 8,
      updatedAt: "2026-12-20T00:00:00.000Z",
      currentRoute: "/onboarding/sections/6/complete",
      currentSection: 6,
      completedSections: [1, 2, 3, 4, 5, 6],
      data: {
        navigation: {
          stage: "section-complete" as const,
          sectionId: 6,
          completedSections: [1, 2, 3, 4, 5, 6],
        },
        section1: { ...createDefaultSection1(), customerFacingName: "Redis Voice Co" },
        section2: mergeWithDefaults({}).section2,
        section3: mergeWithDefaults({}).section3,
        section4: mergeWithDefaults({}).section4,
        section5: mergeWithDefaults({}).section5,
        section6: createDefaultSection6(),
        contacts: mergeWithDefaults({}).contacts,
        fees: [],
      },
    };
    const migrated = migrateStoredRedisDraft(v8Stored);
    assert.ok(migrated);
    assert.equal(migrated!.schemaVersion, SCHEMA_VERSION);
    assert.ok(migrated!.data.section7);
    assert.equal(isValidRedisDraft(migrated), true);
  });

  it("AC: fresh draft hasDraftContent false", () => {
    assert.equal(hasDraftContent(createDefaultDraft()), false);
  });

  it("AD: completedSections adds 7 once", () => {
    const once = addCompletedSection([1, 2, 3, 4, 5, 6], 7);
    assert.deepEqual(addCompletedSection(once, 7), once);
  });

  it("AE: Section 6 completion links to Section 7 intro", () => {
    const src = readFileSync(
      join(process.cwd(), "src/app/onboarding/sections/6/complete/page.tsx"),
      "utf8",
    );
    assert.ok(src.includes("/onboarding/sections/7/intro"));
    assert.equal(src.includes("not available in this build yet"), false);
  });
});
