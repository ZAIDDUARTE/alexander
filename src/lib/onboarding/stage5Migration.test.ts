import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hasDraftContent, mergeWithDefaults } from "./draft-utils";
import { normalizeSection6 } from "./normalize/section6";
import { fullyValidSection6 } from "./section6-test-helpers";
import {
  DEFAULT_NON_SERVICE_DISPOSITIONS,
  formatNonServiceRoutingSummary,
  NON_SERVICE_CALL_HELP,
  NON_SERVICE_CALL_TYPE_ROWS,
  NON_SERVICE_DISPOSITION_OPTIONS,
} from "./section6Catalog";
import {
  createDefaultDraft,
  createDefaultSection6,
  createEmptyContact,
  type Section6Data,
} from "./types";
import { section6IsValid, validateSection6 } from "./validation/section6";

const EXPECTED_ROWS = [
  "Vendor or supplier",
  "Sales solicitation",
  "Job applicant",
  "Current employee",
  "Media inquiry",
  "Attorney / legal inquiry",
  "Government / regulator",
  "Wrong number / spam",
];

const EXPECTED_ACTIONS = [
  "Transfer the call",
  "Take a message",
  "Politely decline",
  "Human review",
];

function namedContact(id: string, name: string) {
  return { ...createEmptyContact(), id, nameOrRole: name, phone: "+14155550100" };
}

describe("Stage 5 routing matrix", () => {
  it("has exactly eight rows and four actions", () => {
    assert.deepEqual(
      NON_SERVICE_CALL_TYPE_ROWS.map((row) => row.label),
      EXPECTED_ROWS,
    );
    const rowIds = NON_SERVICE_CALL_TYPE_ROWS.map((row) => row.id as string);
    assert.equal(rowIds.includes("service_not_offered"), false);
    assert.equal(rowIds.includes("outside_service_area"), false);
    assert.deepEqual(
      NON_SERVICE_DISPOSITION_OPTIONS.map((option) => option.label),
      EXPECTED_ACTIONS,
    );
    const actionIds = NON_SERVICE_DISPOSITION_OPTIONS.map((option) => option.id as string);
    assert.equal(actionIds.includes("approved_referral"), false);
    const form = readFileSync("src/components/onboarding/Section6Form.tsx", "utf8");
    const matrix = readFileSync("src/components/onboarding/NonServiceCallMatrix.tsx", "utf8");
    assert.match(form, /How should Alexander handle other types of calls/);
    assert.match(form, /helpText=\{NON_SERVICE_CALL_HELP\}/);
    assert.match(NON_SERVICE_CALL_HELP, /We've preselected the recommended handling/);
    assert.match(matrix, /type="radio"/);
    assert.match(matrix, /Who should Alexander transfer these calls to\?/);
    assert.equal(matrix.includes("Approved referral"), false);
    assert.equal(matrix.includes("Send to someone specific"), false);
  });

  it("defaults all eight rows and does not guess an employee recipient", () => {
    const fresh = createDefaultSection6();
    assert.equal(fresh.nonServiceCallPolicies.vendor_supplier.disposition, "take_message");
    assert.equal(fresh.nonServiceCallPolicies.sales_solicitation.disposition, "politely_decline");
    assert.equal(fresh.nonServiceCallPolicies.job_applicant.disposition, "take_message");
    assert.equal(fresh.nonServiceCallPolicies.current_employee.disposition, "send_specific");
    assert.equal(fresh.nonServiceCallPolicies.current_employee.contactId, "");
    assert.equal(fresh.nonServiceCallPolicies.media_inquiry.disposition, "human_review");
    assert.equal(fresh.nonServiceCallPolicies.attorney_legal.disposition, "human_review");
    assert.equal(fresh.nonServiceCallPolicies.government_regulator.disposition, "human_review");
    assert.equal(fresh.nonServiceCallPolicies.wrong_number_spam.disposition, "politely_decline");
    assert.deepEqual(fresh.nonServiceCallPolicies.vendor_supplier.disposition, DEFAULT_NON_SERVICE_DISPOSITIONS.vendor_supplier);
    const errors = validateSection6(
      {
        ...fresh,
        previousWorkInitialAction: "arrange_callback",
        repeatCallbackAction: "connect_manager",
        customerHistoryPolicy: "use_available_history",
        additionalServicePolicy: "only_when_asked",
      },
      [],
    );
    assert.ok(errors["nonServiceCallPolicies.current_employee.contact"]);
    assert.equal(errors["nonServiceCallPolicies.vendor_supplier.contact"], undefined);
    assert.equal(hasDraftContent(createDefaultDraft()), false);
  });
});

describe("Stage 5 answer preservation and legacy mapping", () => {
  it("keeps a saved current matrix on reload", () => {
    const contact = namedContact("ops-1", "Operations Manager");
    const draft = createDefaultDraft();
    draft.contacts = [contact];
    const current = fullyValidSection6([contact]);
    current.nonServiceCallPolicies.vendor_supplier = { disposition: "human_review", contactId: "" };
    current.nonServiceCallPolicies.sales_solicitation = { disposition: "take_message", contactId: contact.id };
    current.nonServiceCallPolicies.current_employee = { disposition: "politely_decline", contactId: "" };
    current.nonServiceCallPolicies.wrong_number_spam = { disposition: "send_specific", contactId: contact.id };
    draft.section6 = current;
    const migrated = mergeWithDefaults(draft);
    const again = mergeWithDefaults(migrated);
    assert.equal(again.section6.nonServiceCallPolicies.vendor_supplier.disposition, "human_review");
    assert.equal(again.section6.nonServiceCallPolicies.sales_solicitation.disposition, "take_message");
    assert.equal(again.section6.nonServiceCallPolicies.current_employee.disposition, "politely_decline");
    assert.equal(again.section6.nonServiceCallPolicies.wrong_number_spam.disposition, "send_specific");
    assert.equal(again.section6.nonServiceCallPolicies.wrong_number_spam.contactId, "ops-1");
    assert.equal(again.contacts.length, 1);
    assert.equal(section6IsValid(again.section6, again.contacts), true);
  });

  it("maps legacy actions and does not turn approved referral into a transfer", () => {
    const contact = namedContact("vendor-desk", "Parts desk");
    const draft = createDefaultDraft();
    draft.contacts = [contact];
    const policies = {
      ...draft.section6.nonServiceCallPolicies,
      vendor_supplier: { disposition: "send_specific", contactId: contact.id },
      sales_solicitation: { disposition: "approved_referral", contactId: "referral-person" },
      job_applicant: { disposition: "message_callback", contactId: "" },
      current_employee: { disposition: "send_specific", contactId: "missing-person" },
      media_inquiry: { disposition: "human_review", contactId: "" },
      attorney_legal: { disposition: "politely_decline", contactId: "dormant" },
      government_regulator: { disposition: "fax_them", contactId: "" },
      wrong_number_spam: { disposition: "politely_decline", contactId: "" },
      service_not_offered: { disposition: "take_message", contactId: "" },
      outside_service_area: { disposition: "human_review", contactId: "" },
    };
    draft.section6.nonServiceCallPolicies = policies as Section6Data["nonServiceCallPolicies"];
    draft.section2.serviceAreaCities = ["Austin"];
    draft.section2.plumbingServices["general-plumbing-repair"] = {
      ...draft.section2.plumbingServices["general-plumbing-repair"],
      policy: "not_offered",
    };
    draft.section6.unusualCallNotes = "Ask for the account number.";
    draft.section6.additionalServicePolicy = "mention_approved_only";
    draft.section6.restrictedInformation = ["payment_information", "sensitive_account"];
    draft.section7.brandPhrasesAndAvoidances = "Say we will take a look.";
    const migrated = mergeWithDefaults(draft);
    const rows = migrated.section6.nonServiceCallPolicies;
    assert.equal(rows.vendor_supplier.disposition, "send_specific");
    assert.equal(rows.vendor_supplier.contactId, "vendor-desk");
    assert.equal(rows.sales_solicitation.disposition, "politely_decline");
    assert.equal(rows.sales_solicitation.contactId, "");
    assert.equal(rows.job_applicant.disposition, "take_message");
    assert.equal(rows.current_employee.disposition, "send_specific");
    assert.equal(rows.current_employee.contactId, "");
    assert.equal(rows.media_inquiry.disposition, "human_review");
    assert.equal(rows.attorney_legal.disposition, "politely_decline");
    assert.equal(rows.government_regulator.disposition, "human_review");
    assert.equal("service_not_offered" in rows, false);
    assert.equal("outside_service_area" in rows, false);
    assert.equal(
      migrated.stage2Migration?.some(
        (note) =>
          note.path === "section6.nonServiceCallPolicies.sales_solicitation.disposition" &&
          note.status === "DEFAULTED_FROM_LEGACY" &&
          note.from === "approved_referral",
      ),
      true,
    );
    assert.equal(
      migrated.stage2Migration?.some(
        (note) =>
          note.path === "section6.nonServiceCallPolicies.sales_solicitation.approvedReferral" &&
          note.status === "NEEDS_QA",
      ),
      true,
    );
    assert.equal(
      migrated.stage2Migration?.some(
        (note) =>
          note.path === "section6.nonServiceCallPolicies.job_applicant.disposition" &&
          note.from === "message_callback" &&
          note.to === "take_message",
      ),
      true,
    );
    assert.equal(
      migrated.stage2Migration?.some(
        (note) =>
          note.path === "section6.nonServiceCallPolicies.current_employee.contactId" &&
          note.status === "RECIPIENT_NEEDS_QA",
      ),
      true,
    );
    assert.equal(
      migrated.stage2Migration?.some(
        (note) =>
          note.path === "section6.nonServiceCallPolicies.government_regulator.disposition" &&
          note.status === "DEFAULTED_FROM_UNKNOWN",
      ),
      true,
    );
    assert.equal(
      migrated.stage2Migration?.some(
        (note) =>
          note.path === "section6.nonServiceCallPolicies.service_not_offered" &&
          note.status === "DROPPED_OBSOLETE",
      ),
      true,
    );
    assert.equal(migrated.section2.serviceAreaCities[0], "Austin");
    assert.equal(migrated.section2.plumbingServices["general-plumbing-repair"].policy, "not_offered");
    assert.equal(migrated.section6.unusualCallNotes, "Ask for the account number.");
    assert.equal(migrated.section6.additionalServicePolicy, "mention_approved_only");
    assert.deepEqual(migrated.section6.restrictedInformation, [
      "payment_information",
      "sensitive_account",
    ]);
    assert.equal(migrated.section7.brandPhrasesAndAvoidances, "Say we will take a look.");
    assert.equal(migrated.contacts.length, 1);
  });
});

describe("Stage 5 transfer recipients", () => {
  it("requires a recipient only while the action is transfer, and keeps a dormant recipient", () => {
    const contact = namedContact("phillip", "Phillip");
    const data = fullyValidSection6([contact]);
    data.nonServiceCallPolicies.current_employee = { disposition: "send_specific", contactId: "" };
    assert.equal(section6IsValid(data, [contact]), false);
    data.nonServiceCallPolicies.current_employee.contactId = contact.id;
    assert.equal(section6IsValid(data, [contact]), true);
    data.nonServiceCallPolicies.current_employee.disposition = "take_message";
    assert.equal(section6IsValid(data, [contact]), true);
    const hidden = normalizeSection6(data, [contact]).nonServiceCallPolicies.find(
      (row) => row.callTypeId === "current_employee",
    );
    assert.equal(hidden?.contactId, null);
    data.nonServiceCallPolicies.current_employee.disposition = "send_specific";
    assert.equal(data.nonServiceCallPolicies.current_employee.contactId, contact.id);
    assert.equal(section6IsValid(data, [contact]), true);
    assert.equal(
      formatNonServiceRoutingSummary("Current employee", "Transfer the call", "Phillip"),
      "Current employee\nTransfer the call — Phillip",
    );
    assert.equal(
      formatNonServiceRoutingSummary("Vendor or supplier", "Take a message"),
      "Vendor or supplier\nTake a message",
    );
  });

  it("reuses one existing contact on two rows and can add a separate contact", () => {
    const operations = namedContact("ops", "Operations Manager");
    const hr = namedContact("hr", "HR lead");
    const draft = createDefaultDraft();
    draft.contacts = [operations];
    draft.section6 = fullyValidSection6([operations]);
    draft.section6.nonServiceCallPolicies.current_employee = {
      disposition: "send_specific",
      contactId: operations.id,
    };
    draft.section6.nonServiceCallPolicies.media_inquiry = {
      disposition: "send_specific",
      contactId: operations.id,
    };
    const reused = mergeWithDefaults(draft);
    assert.equal(reused.contacts.length, 1);
    assert.equal(reused.section6.nonServiceCallPolicies.current_employee.contactId, "ops");
    assert.equal(reused.section6.nonServiceCallPolicies.media_inquiry.contactId, "ops");

    reused.contacts = [...reused.contacts, hr];
    reused.section6.nonServiceCallPolicies.vendor_supplier = {
      disposition: "send_specific",
      contactId: hr.id,
    };
    const added = mergeWithDefaults(reused);
    assert.equal(added.contacts.length, 2);
    assert.equal(added.section6.nonServiceCallPolicies.vendor_supplier.contactId, "hr");
    assert.equal(added.section6.nonServiceCallPolicies.current_employee.contactId, "ops");
    assert.equal(added.section6.nonServiceCallPolicies.media_inquiry.contactId, "ops");
    const normalized = normalizeSection6(added.section6, added.contacts);
    assert.equal(normalized.nonServiceCallPolicies.length, 8);
    assert.equal(
      normalized.nonServiceCallPolicies.some((row) => row.callTypeId === "service_not_offered"),
      false,
    );
    assert.equal(
      normalized.nonServiceCallPolicies.find((row) => row.callTypeId === "vendor_supplier")?.contactId,
      "hr",
    );
  });
});
