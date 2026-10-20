import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CALLER_TYPES } from "./section4Catalog";
import { CALLER_AUTHORITY_OPTIONS, migrateStage3CallerAuthorization } from "./stage3Migration";
import { migrateDraft } from "./migrate";
import {
  CALLER_AUTHORITY_DEFAULTS,
  createDefaultDraft,
  type CallerAuthority,
  type OnboardingDraft,
} from "./types";

const EXPECTED_DEFAULTS: Record<string, CallerAuthority> = {
  homeowner: "full_authorization",
  tenant: "schedule_only",
  landlord_property_manager: "full_authorization",
  spouse_family: "full_authorization",
  remote_family: "full_authorization",
  realtor_buyer_seller: "schedule_only",
  other_third_party: "human_approval_required",
};

function withLegacyArrays(
  draft: OnboardingDraft,
  permissions: Record<string, string[]>,
): OnboardingDraft {
  const callerPermissions = { ...draft.section4.callerPermissions } as Record<string, unknown>;
  for (const [id, value] of Object.entries(permissions)) callerPermissions[id] = value;
  draft.section4.callerPermissions = callerPermissions as OnboardingDraft["section4"]["callerPermissions"];
  return draft;
}

describe("Stage 3 caller defaults", () => {
  it("preselects the approved authority for all 7 callers", () => {
    const draft = createDefaultDraft();
    assert.equal(CALLER_TYPES.length, 7);
    assert.deepEqual(
      CALLER_TYPES.map((row) => row.label),
      [
        "Homeowner",
        "Tenant",
        "Landlord / property manager",
        "Spouse / family member",
        "Remote family member",
        "Realtor",
        "Other third party",
      ],
    );
    for (const row of CALLER_TYPES) {
      assert.equal(EXPECTED_DEFAULTS[row.id], CALLER_AUTHORITY_DEFAULTS[row.id]);
      assert.equal(draft.section4.callerPermissions[row.id], EXPECTED_DEFAULTS[row.id]);
    }
    assert.deepEqual(
      CALLER_AUTHORITY_OPTIONS.map((option) => option.label),
      ["Schedule only", "Schedule + diagnostic fee", "Full authorization", "Human approval required"],
    );
  });
});

describe("Stage 3 single authority", () => {
  it("keeps one value per caller and does not change the other rows", () => {
    const draft = createDefaultDraft();
    const next: Record<string, CallerAuthority> = {
      ...draft.section4.callerPermissions,
      tenant: "human_approval_required",
    };
    assert.equal(next.tenant, "human_approval_required");
    assert.equal(typeof next.tenant, "string");
    assert.equal(Array.isArray(next.tenant), false);
    assert.equal(next.homeowner, "full_authorization");
    assert.equal(next.realtor_buyer_seller, "schedule_only");
    const replaced: Record<string, CallerAuthority> = { ...next, tenant: "schedule_diagnostic" };
    assert.equal(replaced.tenant, "schedule_diagnostic");
    assert.equal(replaced.homeowner, next.homeowner);
  });
});

describe("Stage 3 legacy caller migration", () => {
  it("replaces ordinary, contradictory, full-looking, and empty arrays with defaults", () => {
    const cases: Record<string, string[]>[] = [
      { tenant: ["schedule_service"], homeowner: ["agree_to_pay"] },
      { tenant: ["schedule_service", "not_allowed"] },
      {
        tenant: ["schedule_service", "approve_diagnostic_fee", "authorize_repair", "agree_to_pay"],
      },
      { tenant: [], realtor_buyer_seller: ["authorize_repair"] },
    ];
    for (const permissions of cases) {
      const draft = withLegacyArrays(createDefaultDraft(), permissions);
      const result = migrateStage3CallerAuthorization(draft);
      for (const row of CALLER_TYPES) {
        assert.equal(result.draft.section4.callerPermissions[row.id], EXPECTED_DEFAULTS[row.id]);
        assert.equal(
          result.fields.find((field) => field.path.endsWith(row.id))?.status,
          "DEFAULTED_FROM_LEGACY",
        );
      }
      assert.equal(result.draft.section4.callerPermissions.tenant, "schedule_only");
    }
  });

  it("defaults an unknown authority and does not infer a level from an old array", () => {
    const draft = createDefaultDraft();
    (draft.section4.callerPermissions as Record<string, unknown>).tenant = "wizard";
    const result = migrateStage3CallerAuthorization(draft);
    assert.equal(result.draft.section4.callerPermissions.tenant, "schedule_only");
    assert.equal(
      result.fields.find((field) => field.path.endsWith("tenant"))?.status,
      "DEFAULTED_FROM_UNKNOWN",
    );
    assert.equal(
      result.fields.find((field) => field.path.endsWith("homeowner"))?.status,
      "PRESERVED_CURRENT",
    );
  });
});

describe("Stage 3 current answers and spending limits", () => {
  it("keeps a saved current authority across a second migration", () => {
    const draft = createDefaultDraft();
    draft.section4.callerPermissions.tenant = "human_approval_required";
    draft.section4.callerPermissions.realtor_buyer_seller = "full_authorization";
    const once = migrateStage3CallerAuthorization(draft);
    const twice = migrateStage3CallerAuthorization(once.draft);
    assert.equal(twice.draft.section4.callerPermissions.tenant, "human_approval_required");
    assert.equal(twice.draft.section4.callerPermissions.realtor_buyer_seller, "full_authorization");
    assert.equal(twice.draft.section4.callerPermissions.homeowner, "full_authorization");
    assert.equal(
      twice.fields.find((field) => field.path.endsWith("tenant"))?.status,
      "PRESERVED_CURRENT",
    );
    assert.equal(
      twice.fields.find((field) => field.path.endsWith("realtor_buyer_seller"))?.status,
      "PRESERVED_CURRENT",
    );
  });

  it("preserves spending-limit answers and unrelated Section 4 fields", () => {
    const yes = withLegacyArrays(createDefaultDraft(), {
      tenant: ["schedule_service", "not_allowed"],
      realtor_buyer_seller: ["authorize_repair", "agree_to_pay"],
    });
    yes.section4.hasSpendingLimits = "yes";
    yes.section4.spendingLimits = [
      { id: "limit-1", callerTypeId: "realtor_buyer_seller", maxAmount: "150.00" },
    ];
    yes.section1.customerFacingName = "Acme Plumbing";
    yes.section4.humanRequestPolicy = "connect_right_away";
    yes.section4.defaultBookingMode = "send_to_team";
    yes.section4.bookingHorizonDays = "21";
    yes.section4.hasServiceBookingRules = "yes";
    yes.section4.emergencyAuthMode = "same_rules";

    const migrated = migrateDraft(yes);
    assert.equal(migrated.section4.hasSpendingLimits, "yes");
    assert.deepEqual(migrated.section4.spendingLimits, yes.section4.spendingLimits);
    assert.equal(migrated.section1.customerFacingName, "Acme Plumbing");
    assert.equal(migrated.section4.humanRequestPolicy, "connect_right_away");
    assert.equal(migrated.section4.defaultBookingMode, "send_to_team");
    assert.equal(migrated.section4.bookingHorizonDays, "21");
    assert.equal(migrated.section4.hasServiceBookingRules, "yes");
    assert.equal(migrated.section4.emergencyAuthMode, "same_rules");
    assert.equal(migrated.section4.callerPermissions.realtor_buyer_seller, "schedule_only");
    assert.equal(
      migrated.stage2Migration?.some(
        (note) => note.path.endsWith("tenant") && note.status === "DEFAULTED_FROM_LEGACY",
      ),
      true,
    );

    const no = withLegacyArrays(createDefaultDraft(), { homeowner: [] });
    no.section4.hasSpendingLimits = "no";
    no.section4.spendingLimits = [];
    const migratedNo = migrateStage3CallerAuthorization(no);
    assert.equal(migratedNo.draft.section4.hasSpendingLimits, "no");
    assert.deepEqual(migratedNo.draft.section4.spendingLimits, []);
  });
});
