import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { toggleExclusiveNone } from "../../components/onboarding/ui/CheckboxGroup";
import { hasDraftContent, mergeWithDefaults } from "./draft-utils";
import { normalizeSection5 } from "./normalize/section5";
import {
  FINANCIAL_REMEDY_OPTIONS,
  PAYMENT_ASSISTANCE_OPTIONS,
  PAYMENT_COLLECTION_OPTIONS,
  PAYMENT_DUE_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  REMEDY_RULE_PLACEHOLDERS,
} from "./section5Catalog";
import { fullyValidSection5 } from "./section5-test-helpers";
import {
  createDefaultDraft,
  createDefaultRemedyAuthority,
  createDefaultSection5,
  type FinancialRemedySelection,
  type Section5Data,
} from "./types";
import { section5IsValid, validateSection5 } from "./validation/section5";

function legacySection5(
  patch: Partial<Section5Data> = {},
): { draft: ReturnType<typeof createDefaultDraft>; raw: Partial<Section5Data> } {
  const draft = createDefaultDraft();
  const section5 = { ...draft.section5, ...patch } as Partial<Section5Data>;
  delete section5.paymentAssistance;
  delete section5.paymentCollectionScope;
  delete section5.paymentCollectionOther;
  delete section5.financialRemedies;
  draft.section5 = { ...createDefaultSection5(), ...section5 } as Section5Data;
  return { draft, raw: section5 };
}

describe("Stage 4B payment methods and timing", () => {
  it("keeps the payment-method choices, including Financing, without a detail flow", () => {
    assert.deepEqual(
      PAYMENT_METHOD_OPTIONS.map((option) => option.label),
      [
        "Credit card",
        "Debit card",
        "Cash",
        "Check",
        "ACH / bank transfer",
        "Financing",
        "Invoice / account billing",
        "Other",
      ],
    );
    const source = readFileSync("src/components/onboarding/Section5Form.tsx", "utf8");
    assert.equal(source.includes("Do you offer financing?"), false);
    assert.equal(source.includes("Financing provider"), false);
    assert.equal(source.includes("FinancialRemedyMatrix"), false);
  });

  it("preserves saved payment methods and timing and drops old due-detail text", () => {
    const { draft, raw } = legacySection5({
      paymentMethods: ["financing", "credit_card"],
      paymentDuePolicies: ["deposit_required", "other"],
      depositRule: "50 percent before install",
      paymentDueOtherRule: "Net 15 for commercial accounts",
    });
    const migrated = mergeWithDefaults({ ...draft, section5: raw as Section5Data });
    assert.deepEqual(migrated.section5.paymentMethods, ["financing", "credit_card"]);
    assert.deepEqual(migrated.section5.paymentDuePolicies, ["deposit_required", "other"]);
    assert.equal(migrated.section5.depositRule, "");
    assert.equal(migrated.section5.paymentDueOtherRule, "");
    assert.equal(
      migrated.stage2Migration?.some(
        (note) => note.path === "section5.depositRule" && note.status === "DROPPED_OBSOLETE",
      ),
      true,
    );
    assert.equal(migrated.section5.offersFinancing, "");
  });
});

describe("Stage 4B payment assistance and collection", () => {
  it("defaults a fresh form to a secure payment link and the four collection scopes", () => {
    const fresh = createDefaultSection5();
    assert.equal(fresh.paymentAssistance, "secure_link");
    assert.deepEqual(fresh.paymentCollectionScope, [
      "booking_or_service_fees",
      "deposits",
      "completed_invoices",
      "outstanding_balances",
    ]);
    assert.equal(fresh.paymentCollectionScope.includes("progress_payments"), false);
    assert.equal(fresh.paymentCollectionScope.includes("other"), false);
    assert.equal(hasDraftContent(createDefaultDraft()), false);
    assert.deepEqual(
      PAYMENT_ASSISTANCE_OPTIONS.map((option) => option.id),
      ["secure_link", "secure_link_and_authorized_method", "send_to_team"],
    );
    assert.deepEqual(
      PAYMENT_COLLECTION_OPTIONS.map((option) => option.label),
      [
        "Booking or service fees",
        "Deposits",
        "Completed service invoices",
        "Outstanding balances",
        "Progress payments",
        "Other",
      ],
    );
  });

  it("preserves a saved assistance answer and collection edits", () => {
    const draft = createDefaultDraft();
    draft.section5.paymentAssistance = "send_to_team";
    draft.section5.paymentCollectionScope = ["progress_payments"];
    const migrated = mergeWithDefaults(draft);
    assert.equal(migrated.section5.paymentAssistance, "send_to_team");
    assert.deepEqual(migrated.section5.paymentCollectionScope, ["progress_payments"]);
    migrated.section5.paymentAssistance = "secure_link_and_authorized_method";
    const reloaded = mergeWithDefaults(migrated);
    assert.equal(reloaded.section5.paymentAssistance, "secure_link_and_authorized_method");
    assert.deepEqual(reloaded.section5.paymentCollectionScope, ["progress_payments"]);
  });

  it("defaults a legacy questionnaire and records migration metadata", () => {
    const { draft, raw } = legacySection5();
    const migrated = mergeWithDefaults({ ...draft, section5: raw as Section5Data });
    assert.equal(migrated.section5.paymentAssistance, "secure_link");
    assert.deepEqual(migrated.section5.paymentCollectionScope, [
      "booking_or_service_fees",
      "deposits",
      "completed_invoices",
      "outstanding_balances",
    ]);
    assert.equal(
      migrated.stage2Migration?.some(
        (note) => note.path === "section5.paymentAssistance" && note.status === "DEFAULTED_NEW_FIELD",
      ),
      true,
    );
    assert.equal(
      migrated.stage2Migration?.some(
        (note) =>
          note.path === "section5.paymentCollectionScope" && note.status === "DEFAULTED_NEW_FIELD",
      ),
      true,
    );
  });
});

describe("Stage 4B financing cleanup", () => {
  it("keeps Financing selected and drops old financing detail", () => {
    const { draft, raw } = legacySection5({
      paymentMethods: ["financing"],
      offersFinancing: "yes",
      financingProviderTerms: "Wisetack 12 months",
      financingPermissions: ["send_application_link", "transfer_to_team"],
      financingEligibilityStatement: "Subject to credit approval",
    });
    const migrated = mergeWithDefaults({ ...draft, section5: raw as Section5Data });
    assert.deepEqual(migrated.section5.paymentMethods, ["financing"]);
    assert.equal(migrated.section5.offersFinancing, "");
    assert.equal(migrated.section5.financingProviderTerms, "");
    assert.deepEqual(migrated.section5.financingPermissions, []);
    assert.equal(migrated.section5.financingEligibilityStatement, "");
    assert.equal(migrated.section5.paymentAssistance, "secure_link");
    assert.equal(
      migrated.stage2Migration?.some(
        (note) => note.path === "section5.financingDetail" && note.status === "DROPPED_OBSOLETE",
      ),
      true,
    );
  });
});

describe("Stage 4B financial remedies", () => {
  it("defaults to None and does not require remedy rules", () => {
    const fresh = createDefaultSection5();
    assert.deepEqual(fresh.financialRemedies, ["none"]);
    assert.equal(validateSection5(fresh).financialRemedies, undefined);
    assert.equal(Object.keys(validateSection5(fresh)).some((key) => key.startsWith("remedyRules.")), false);
    assert.deepEqual(
      FINANCIAL_REMEDY_OPTIONS.map((option) => option.label),
      [
        "Refund",
        "Account credit",
        "Fee waiver",
        "Discount / goodwill adjustment",
        "Free or reduced-price return visit",
        "None — human approval is required",
      ],
    );
    assert.match(REMEDY_RULE_PLACEHOLDERS.refund, /duplicate charges/);
  });

  it("keeps None exclusive with actual remedies", () => {
    let selected: FinancialRemedySelection[] = ["none"];
    selected = toggleExclusiveNone(selected, "fee_waiver");
    selected = toggleExclusiveNone(selected, "account_credit");
    assert.deepEqual(selected, ["fee_waiver", "account_credit"]);
    selected = toggleExclusiveNone(selected, "none");
    assert.deepEqual(selected, ["none"]);
    selected = toggleExclusiveNone(selected, "refund");
    assert.deepEqual(selected, ["refund"]);
  });

  it("requires a rule only for a selected remedy", () => {
    const data = fullyValidSection5();
    data.financialRemedies = ["refund"];
    data.remedyRules.refund = "";
    data.remedyRules.account_credit = "stale credit rule";
    assert.equal(section5IsValid(data), false);
    data.remedyRules.refund = "Up to $50 for duplicate charges.";
    assert.equal(section5IsValid(data), true);
    data.financialRemedies = ["none"];
    assert.equal(section5IsValid(data), true);
  });

  it("maps only remedies Alexander could approve and does not copy other rule text", () => {
    const authority = createDefaultRemedyAuthority();
    authority.refund = "human_approval";
    authority.account_credit = "within_rules";
    authority.fee_waiver = "within_rules";
    authority.discount_goodwill = "never";
    authority.return_visit = "human_approval";
    const { draft, raw } = legacySection5({
      remedyAuthority: authority,
      remedyRules: {
        refund: "One global paragraph that must not be copied.",
        account_credit: "",
        fee_waiver: "",
        discount_goodwill: "One global paragraph that must not be copied.",
        return_visit: "",
      },
    });
    const migrated = mergeWithDefaults({ ...draft, section5: raw as Section5Data });
    assert.deepEqual(migrated.section5.financialRemedies, ["account_credit", "fee_waiver"]);
    assert.equal(migrated.section5.remedyRules.account_credit, "");
    assert.equal(migrated.section5.remedyRules.fee_waiver, "");
    assert.equal(
      migrated.stage2Migration?.some(
        (note) => note.path === "section5.remedyRules.refund" && note.status === "NEEDS_QA",
      ),
      true,
    );
    assert.equal(
      migrated.stage2Migration?.some(
        (note) => note.path === "section5.remedyRules.discount_goodwill" && note.status === "NEEDS_QA",
      ),
      true,
    );
  });
});

describe("Stage 4B approver cleanup and full section", () => {
  it("removes the pricing approver question without changing other contacts", () => {
    const source = readFileSync("src/components/onboarding/Section5Form.tsx", "utf8");
    assert.equal(
      source.includes("Who should Alexander contact when human approval is required?"),
      false,
    );
    assert.equal(source.includes("Explain the rule"), false);
    const { draft, raw } = legacySection5({ financialApproverContactId: "finance-lead" });
    draft.section1.customerFacingName = "Harbor Plumbing";
    draft.contacts[0].nameOrRole = "On-call lead";
    draft.section4.bookingHorizonDays = "21";
    const migrated = mergeWithDefaults({
      ...draft,
      section5: { ...(raw as Section5Data), financialApproverContactId: "finance-lead" },
    });
    assert.equal(migrated.section5.financialApproverContactId, "");
    assert.equal(migrated.section1.customerFacingName, "Harbor Plumbing");
    assert.equal(migrated.contacts[0].nameOrRole, "On-call lead");
    assert.equal(migrated.section4.bookingHorizonDays, "21");
    assert.equal(
      migrated.stage2Migration?.some(
        (note) =>
          note.path === "section5.financialApproverContactId" && note.status === "DROPPED_OBSOLETE",
      ),
      true,
    );
  });

  it("hydrates a full legacy section 5 without crashing or resetting Stage 4A", () => {
    const authority = createDefaultRemedyAuthority();
    authority.account_credit = "within_rules";
    authority.refund = "never";
    const { draft, raw } = legacySection5({
      pricingModels: ["flat_rate"],
      mayQuoteServicePrices: "allowed",
      pricingModelOther: "",
      unknownPriceBehavior: "team_provides_pricing",
      additionalFeeSelection: ["none"],
      hasAreaTravelOrMinimum: "no",
      materialMarkupPolicy: "no",
      paymentMethods: ["check", "financing"],
      paymentDuePolicies: ["invoice_after_service"],
      invoiceTerms: "Net 30",
      offersFinancing: "yes",
      financingProviderTerms: "GreenSky",
      remedyAuthority: authority,
      remedyRules: {
        refund: "",
        account_credit: "Up to $40.",
        fee_waiver: "",
        discount_goodwill: "Shared old limit text.",
        return_visit: "",
      },
      financialApproverContactId: "approver-1",
    });
    draft.section2.serviceAreaCities = ["Austin"];
    const migrated = mergeWithDefaults({ ...draft, section5: raw as Section5Data });
    assert.deepEqual(migrated.section5.pricingModels, ["flat_rate"]);
    assert.equal(migrated.section5.mayQuoteServicePrices, "allowed");
    assert.equal(migrated.section5.unknownPriceBehavior, "team_provides_pricing");
    assert.deepEqual(migrated.section5.paymentMethods, ["check", "financing"]);
    assert.deepEqual(migrated.section5.paymentDuePolicies, ["invoice_after_service"]);
    assert.equal(migrated.section5.invoiceTerms, "");
    assert.equal(migrated.section5.financingProviderTerms, "");
    assert.equal(migrated.section5.financialApproverContactId, "");
    assert.deepEqual(migrated.section5.financialRemedies, ["account_credit"]);
    assert.equal(migrated.section5.remedyRules.account_credit, "Up to $40.");
    assert.equal(migrated.section5.remedyRules.discount_goodwill, "Shared old limit text.");
    assert.equal(migrated.section2.serviceAreaCities[0], "Austin");
    assert.equal(migrated.section5.paymentAssistance, "secure_link");
  });

  it("round-trips a complete current section 5 without reapplying defaults", () => {
    const draft = createDefaultDraft();
    const current = fullyValidSection5();
    current.paymentMethods = ["ach", "other"];
    current.paymentMethodOther = "Money order";
    current.paymentDuePolicies = ["when_work_completed"];
    current.paymentAssistance = "send_to_team";
    current.paymentCollectionScope = ["outstanding_balances", "other"];
    current.paymentCollectionOther = "Membership dues";
    current.financialRemedies = ["fee_waiver", "return_visit"];
    current.remedyRules.fee_waiver = "Missed window up to $89.";
    current.remedyRules.return_visit = "Same problem within 7 days.";
    draft.section5 = current;
    const migrated = mergeWithDefaults(draft);
    assert.equal(migrated.section5.paymentAssistance, "send_to_team");
    assert.deepEqual(migrated.section5.paymentCollectionScope, ["outstanding_balances", "other"]);
    assert.equal(migrated.section5.paymentCollectionOther, "Membership dues");
    assert.deepEqual(migrated.section5.financialRemedies, ["fee_waiver", "return_visit"]);
    assert.equal(migrated.section5.remedyRules.fee_waiver, "Missed window up to $89.");
    assert.deepEqual(migrated.section5.pricingModels, current.pricingModels);
    const again = mergeWithDefaults(migrated);
    assert.deepEqual(again.section5.financialRemedies, migrated.section5.financialRemedies);
    assert.equal(again.section5.paymentAssistance, "send_to_team");
    const normalized = normalizeSection5(again.section5);
    assert.equal(normalized.paymentAssistance, "send_to_team");
    assert.deepEqual(normalized.financialRemedies, ["fee_waiver", "return_visit"]);
    assert.equal(normalized.financing.offersFinancing, null);
    assert.equal(normalized.financialApproverContactId, null);
    assert.equal(normalized.paymentDue.invoiceTerms, null);
    assert.equal(section5IsValid(again.section5), true);
  });
});

describe("Stage 4B payment due choices", () => {
  it("keeps the six timing choices", () => {
    assert.deepEqual(
      PAYMENT_DUE_OPTIONS.map((option) => option.label),
      [
        "At time of service",
        "When work is completed",
        "Deposit required before certain work",
        "Progress payments for larger projects",
        "Invoice after service for approved customers",
        "Other",
      ],
    );
  });
});
