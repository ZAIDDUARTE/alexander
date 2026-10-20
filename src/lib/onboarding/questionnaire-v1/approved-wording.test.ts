import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { EMERGENCY_CLASSIFICATION_LABELS } from "../../../components/onboarding/EmergencyClassification";
import { ONBOARDING_SECTIONS } from "../sections";
import { CONFIRMATION_INFO_OPTIONS } from "../section4Catalog";
import {
  FINANCIAL_REMEDY_OPTIONS,
  PAYMENT_ASSISTANCE_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  QUOTE_PERMISSION_OPTIONS,
} from "../section5Catalog";
import {
  CANCELLATION_AUTHORITY_OPTIONS,
  DEFAULT_BOOKING_OPTIONS,
  EMERGENCY_AUTH_OPTIONS,
  EXCEPTION_AUTHORITY_OPTIONS,
  RESCHEDULE_AUTHORITY_OPTIONS,
} from "../validation/section4";
import { QUESTION_REGISTRY_BY_ID } from "./registry";

/**
 * Customer-facing wording locked to Final Draft 3 (PDF + Markdown agree).
 * Question IDs stay on the production Q1–Q93 contract.
 */

const APPROVED_TITLES: Record<string, string> = {
  Q5: "Which of these may Alexander tell customers about your company?",
  Q10A: "What hours should Alexander answer your calls?",
  Q13: "Which diagnostic and drain services does your company provide?",
  Q25: "Who should Alexander contact first when a call requires immediate human attention?",
  Q37: "What is Alexander normally allowed to do when a customer wants an appointment?",
  Q42: "When may Alexander offer same-day or holiday appointments?",
  Q53: "How does your company normally price plumbing work?",
  Q85: "What software does your company use to manage customers and jobs?",
  Q86: "Where does your company manage appointment availability?",
};

const SECTION_DESCRIPTIONS: Record<string, string> = {
  "src/app/onboarding/sections/1/intro/page.tsx":
    "Tell Alexander who your company is, when you are available, and what he is authorized to say about your business. This section helps Alexander introduce your company accurately, follow your operating hours, and avoid making claims you have not approved.",
  "src/app/onboarding/sections/2/intro/page.tsx":
    "Tell Alexander which jobs your company accepts, who you serve, and where you work.",
  "src/app/onboarding/sections/3/intro/page.tsx":
    "Tell Alexander which situations require immediate attention and what should happen when your team needs to step in.",
  "src/app/onboarding/sections/4/intro/page.tsx":
    "Tell Alexander when and how your company can accept appointments.",
  "src/app/onboarding/sections/5/intro/page.tsx":
    "Tell Alexander what he may explain about pricing, additional fees, payments, and financial authority.",
  "src/app/onboarding/sections/6/intro/page.tsx":
    "Tell Alexander how to support existing customers, repeat problems, unhappy callers, privacy boundaries, and calls that do not fit normal service booking.",
  "src/app/onboarding/sections/7/intro/page.tsx":
    "Now choose how Alexander should sound and introduce himself to customers.",
  "src/app/onboarding/sections/8/intro/page.tsx":
    "This final section connects Alexander's approved behavior to the systems and people that help the company operate.",
};

const OBSOLETE_CUSTOMER_TITLES = [
  'title="Which of these may Alexander tell customers?"',
  'title="Which of these services does your company provide?"',
  'title="Who should Alexander contact first?"',
  'title="When an eligible customer wants service, what may Alexander normally do?"',
  'title="When may Alexander offer these appointments?"',
  'title="How does your company normally determine what a customer pays?"',
  'title="What system does your team primarily use for customer records and service jobs?"',
  'title="Where does your team look to see when customers can be scheduled?"',
  "What hours should Alexander answer?",
];

describe("approved customer wording", () => {
  it("keeps the eight section titles in order", () => {
    assert.deepEqual(
      ONBOARDING_SECTIONS.map((section) => section.title),
      [
        "Your Company",
        "Your Services",
        "Emergencies",
        "Scheduling",
        "Pricing and Payments",
        "Customer Care",
        "Voice and Conversation",
        "Integration Systems and Final Setup",
      ],
    );
  });

  it("uses Final Draft 3 question titles", () => {
    for (const [questionId, title] of Object.entries(APPROVED_TITLES)) {
      assert.equal(QUESTION_REGISTRY_BY_ID.get(questionId)?.debugLabel, title);
    }
    const sources = [
      "src/components/onboarding/Section1Form.tsx",
      "src/components/onboarding/Section2Form.tsx",
      "src/components/onboarding/Section3Form.tsx",
      "src/components/onboarding/Section4Form.tsx",
      "src/components/onboarding/Section8Form.tsx",
      "src/components/onboarding/PricingCoreFields.tsx",
    ]
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");
    for (const title of Object.values(APPROVED_TITLES)) {
      assert.equal(sources.includes(title), true, title);
    }
    for (const obsolete of OBSOLETE_CUSTOMER_TITLES) {
      assert.equal(sources.includes(obsolete), false, obsolete);
    }
  });

  it("uses Final Draft 3 section descriptions", () => {
    for (const [path, description] of Object.entries(SECTION_DESCRIPTIONS)) {
      assert.equal(readFileSync(path, "utf8").includes(description), true, path);
    }
    const section8 = readFileSync("src/app/onboarding/sections/8/intro/page.tsx", "utf8");
    assert.equal(section8.includes("dispatch and phone"), false);
  });

  it("uses Final Draft 3 option labels for the corrected catalogs", () => {
    assert.equal(EMERGENCY_CLASSIFICATION_LABELS.urgent, "Urgent, but not an emergency");
    assert.equal(EMERGENCY_CLASSIFICATION_LABELS.human_review, "Human review required");
    assert.deepEqual(
      CONFIRMATION_INFO_OPTIONS.map((option) => option.label),
      [
        "Appointment date",
        "Appointment time or arrival window",
        "Requested service",
        "Customer name and service address",
        "Callback phone number",
        "Email address provided",
      ],
    );
    assert.equal(
      EXCEPTION_AUTHORITY_OPTIONS.find((option) => option.value === "another_person")?.label,
      "Another person or role",
    );
    assert.deepEqual(
      EMERGENCY_AUTH_OPTIONS.map((option) => option.label),
      [
        "Yes - use the same rules",
        "No - emergencies have special rules",
        "Human review is always required when the work is classified as an emergency",
      ],
    );
    assert.deepEqual(
      RESCHEDULE_AUTHORITY_OPTIONS.map((option) => option.label),
      [
        "Reschedule directly",
        "Reschedule only under certain conditions",
        "Submit for human approval",
        "Arrange a callback",
      ],
    );
    assert.deepEqual(
      CANCELLATION_AUTHORITY_OPTIONS.map((option) => option.label),
      [
        "Cancel directly",
        "Cancel only under certain conditions",
        "Submit for human approval",
        "Arrange a callback",
      ],
    );
    assert.deepEqual(
      DEFAULT_BOOKING_OPTIONS.map((option) => [option.label, option.description]),
      [
        [
          "Book an available appointment",
          "Alexander may confirm an available appointment that follows the scheduling rules.",
        ],
        [
          "Send the request to our team",
          "Alexander collects the customer's details and sends the request to the team for scheduling.",
        ],
      ],
    );
    assert.deepEqual(
      QUOTE_PERMISSION_OPTIONS.map((option) => option.label),
      [
        "Yes - Alexander may quote the prices we provide below",
        "No - Alexander should not quote service prices",
      ],
    );
    assert.deepEqual(
      PAYMENT_METHOD_OPTIONS.filter((option) => option.id === "ach" || option.id === "invoice").map(
        (option) => option.label,
      ),
      ["ACH or bank transfer", "Invoice or account billing"],
    );
    assert.equal(
      FINANCIAL_REMEDY_OPTIONS.find((option) => option.id === "none")?.label,
      "None - human approval is required",
    );
    assert.deepEqual(
      PAYMENT_ASSISTANCE_OPTIONS.map((option) => option.label),
      [
        "Yes - Alexander may send customers a secure payment link",
        "Yes - Alexander may send a secure payment link and use an approved payment method already on file when authorized",
        "No - Alexander should send payment requests to our team",
      ],
    );
  });
});
