import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { resolve } from "node:path";

import { hasAdditionalApprovedVoices } from "../approvedVoiceCatalog";
import type { OnboardingDraft } from "../types";
import {
  QUESTION_REGISTRY_CONDITIONAL_IDS,
  isQuestionActive,
  serializeQuestionnaireAnswersV1,
} from "./index";

const EVIDENCE = resolve("docs/evidence/questionnaire-v1");

function loadDraft(name: string): OnboardingDraft {
  return JSON.parse(readFileSync(resolve(EVIDENCE, name), "utf8")) as OnboardingDraft;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function findAnswer(draft: OnboardingDraft, questionId: string) {
  const answers = serializeQuestionnaireAnswersV1(draft);
  for (const section of Object.values(answers.sections)) {
    if (section.answers[questionId]) return section.answers[questionId];
  }
  return answers.submission.answers[questionId];
}

/** Activate every conditional child that can be live at once on one draft. */
function activateCompatibleBranches(draft: OnboardingDraft): string[] {
  const contactId = draft.contacts[0]?.id ?? draft.section3.primaryContactId;
  assert.ok(contactId, "fixture needs a contact");

  draft.section1.approvedClaims = ["other"];
  draft.section1.otherApprovedClaim = "ACTIVE other claim";
  draft.section1.answeringMode = "specific_hours";
  draft.section1.answeringSchedule.monday = { closed: false, start: "09:00", end: "17:00" };

  draft.section2.customerSuppliedMaterialsPolicy = "with_conditions";
  draft.section2.customerSuppliedMaterialsCondition = "ACTIVE customer-supplied conditions";
  draft.section2.correctiveWorkPolicy = "with_conditions";
  draft.section2.correctiveWorkCondition = "ACTIVE corrective conditions";
  draft.section2.hasConditionalTerritory = "yes";
  draft.section2.conditionalTerritories = [
    { id: "territory-1", area: "Tehachapi", condition: "ACTIVE territory rule" },
  ];

  draft.section3.hasBackupContact = "yes";
  draft.section3.backupContactId = contactId;
  draft.section3.nobodyRespondsFallback = "custom";
  draft.section3.nobodyRespondsCustomRule = "ACTIVE nobody-responds rule";
  draft.section3.retryRule = "custom";
  draft.section3.retryCustomRule = "ACTIVE retry rule";
  draft.section3.capacityMode = "reserved_capacity";
  draft.section3.reservedCapacityText = "ACTIVE reserved capacity";
  draft.section3.overrideConditionsText = "STALE override conditions";
  draft.section3.approverContactId = contactId;

  draft.section4.humanRequestPolicy = "custom";
  draft.section4.humanRequestCustomRule = "ACTIVE human-request rule";
  draft.section4.aiRefusalPolicy = "custom";
  draft.section4.aiRefusalCustomRule = "ACTIVE AI-refusal rule";
  draft.section4.approverUnavailablePolicy = "other";
  draft.section4.approverUnavailableCustomRule = "ACTIVE approver-unavailable rule";
  draft.section4.hasSpendingLimits = "yes";
  draft.section4.spendingLimits = [
    { id: "limit-1", callerTypeId: "tenant", maxAmount: "500" },
  ];
  draft.section4.emergencyAuthMode = "special_rules";
  draft.section4.emergencyAuthSpecialRules = "ACTIVE emergency auth rules";
  draft.section4.hasServiceBookingRules = "yes";
  draft.section4.serviceBookingRules = [
    { id: "sbr-1", serviceId: "toilet-repair-replacement", rule: "ACTIVE booking rule" },
  ];
  draft.section4.rescheduleAuthority = "conditional";
  draft.section4.rescheduleCondition = "ACTIVE reschedule conditions";
  draft.section4.cancellationAuthority = "conditional";
  draft.section4.cancellationCondition = "ACTIVE cancellation conditions";
  draft.section4.lateCancellationFeeMode = "conditional";
  draft.section4.noShowFeeMode = "yes";
  draft.section4.mayArrangeCallback = "yes";
  draft.section4.callbackNumberPolicy = "ask_preferred";
  draft.section4.callbackOwnerContactId = contactId;
  draft.section4.hasTechnicianAssignments = "yes";
  draft.section4.technicianAssignments = [
    {
      id: "tech-1",
      serviceId: "toilet-repair-replacement",
      otherJobName: "",
      technicianSource: "name",
      technicianContactId: "",
      technicianName: "Pat",
    },
  ];
  draft.section4.multiIssueMode = "separate_issues";
  draft.section4.separateIssueServiceIds = ["toilet-repair-replacement"];
  draft.section4.separateIssueOther = false;
  draft.section4.separateIssueOtherDetail = "";

  draft.section5.pricingModels = ["flat_rate", "other"];
  draft.section5.pricingModelOther = "ACTIVE other pricing method";
  draft.section5.mayQuoteServicePrices = "allowed";
  draft.section5.servicePrices = [
    {
      serviceId: "toilet-repair-replacement",
      mode: "exact",
      exactAmount: "149",
      startingAmount: "",
      rangeMin: "",
      rangeMax: "",
      hourlyAmount: "",
      conditions: "ACTIVE price conditions",
    },
  ];
  draft.section5.hasAreaTravelOrMinimum = "yes";
  draft.section5.areaPricingRows = [
    {
      id: "area-1",
      area: "Tehachapi",
      travelFee: "",
      minimumCharge: "",
      feeOrMinimum: "$100 travel",
    },
  ];
  draft.section5.materialMarkupPolicy = "sometimes";
  draft.section5.materialMarkupCustomerExplanation = "ACTIVE markup disclosure";
  draft.section5.paymentMethods = ["credit_card", "other"];
  draft.section5.paymentMethodOther = "ACTIVE other payment method";
  draft.section5.paymentCollectionScope = [
    "booking_or_service_fees",
    "deposits",
    "completed_invoices",
    "outstanding_balances",
    "other",
  ];
  draft.section5.paymentCollectionOther = "ACTIVE other collection scope";
  draft.section5.financialRemedies = ["refund"];
  draft.section5.remedyRules = {
    refund: "ACTIVE refund rule",
    account_credit: "",
    fee_waiver: "STALE fee waiver rule",
    discount_goodwill: "",
    return_visit: "",
  };

  draft.section6.previousWorkInitialAction = "schedule_return_visit";
  draft.section6.returnVisitEligibilityRule = "ACTIVE return-visit rule";
  draft.section6.previousWorkCustomRule = "STALE previous-work custom";
  draft.section6.escalationTriggers = ["asks_manager", "other"];
  draft.section6.escalationTriggerOther = "ACTIVE escalation other";
  draft.section6.forbiddenUnhappyPromises = ["no_admit_fault", "other"];
  draft.section6.forbiddenUnhappyPromiseOther = "ACTIVE forbidden other";
  draft.section6.restrictedInformation = ["payment_information", "other"];
  draft.section6.restrictedInformationOther = "ACTIVE restricted other";
  draft.section6.customerHistoryPolicy = "custom";
  draft.section6.customerHistoryCustomRule = "ACTIVE history rule";
  draft.section6.additionalServicePolicy = "custom";
  draft.section6.additionalServiceCustomRule = "ACTIVE additional-service rule";
  draft.section6.nonServiceCallPolicies = {
    ...draft.section6.nonServiceCallPolicies,
    vendor_supplier: { disposition: "send_specific", contactId },
  };

  draft.section7.englishOnly = false;
  draft.section7.callerLanguages = ["english", "other"];
  draft.section7.otherSupportedLanguage = "ACTIVE other language";
  draft.section7.spokenNameMode = "company_specific";
  draft.section7.spokenDisplayName = "ACTIVE spoken name";
  draft.section7.aiDisclosureStyle = "custom";
  draft.section7.aiDisclosureCustom = "ACTIVE AI disclosure";
  draft.section7.pronunciationMode = "yes";
  draft.section7.pronunciationEntries = [
    {
      id: "pron-1",
      term: "Tehachapi",
      pronunciation: "tuh-HATCH-uh-pee",
      audioSampleReference: "",
    },
  ];
  draft.section7.languageSwitchingPolicy = "custom";
  draft.section7.languageSwitchingCustomRule = "ACTIVE language-switching rule";
  draft.section7.accentPreference = "other_approved";
  draft.section7.accentOtherApproved = "ACTIVE accent";

  draft.section8.crmFsmProvider = "custom";
  draft.section8.crmFsmCustomName = "ACTIVE custom CRM";
  draft.section8.schedulingProvider = "custom";
  draft.section8.schedulingCustomName = "ACTIVE custom scheduling";
  draft.section8.phoneProvider = "custom";
  draft.section8.phoneCustomName = "ACTIVE custom phone";
  draft.section8.connectionOwnerMode = "someone_else";
  draft.section8.connectionOwnerName = "Integration Owner";
  draft.section8.connectionOwnerEmail = "owner@example.com";
  draft.section8.connectionOwnerPhone = "";
  draft.section8.failureFallback = "custom";
  draft.section8.failureFallbackCustom = "ACTIVE failure fallback";

  draft.submission.confirmations = {
    answersAccurate: true,
    capabilitiesDependOnIntegrations: true,
    actionsRequireSupportAuthorizationConfirmation: true,
  };

  return QUESTION_REGISTRY_CONDITIONAL_IDS.filter(
    (id) => id !== "Q74A" && isQuestionActive(id, draft),
  );
}

describe("exhaustive conditional branch coverage", () => {
  it("activates every reachable conditional child on one compatible fixture", () => {
    const draft = loadDraft("raw-complete.json");
    const activeChildren = activateCompatibleBranches(draft);
    const answers = serializeQuestionnaireAnswersV1(draft);

    const expected = QUESTION_REGISTRY_CONDITIONAL_IDS.filter((id) => id !== "Q74A");
    assert.deepEqual([...activeChildren].sort(), [...expected].sort());

    for (const questionId of expected) {
      assert.equal(isQuestionActive(questionId, draft), true, `${questionId} should be active`);
      assert.ok(findAnswer(draft, questionId), `${questionId} missing from clean answers`);
    }

    const q19 = answers.sections.S2.answers.Q19A.value as { id: string }[];
    assert.equal(q19[0]?.id, "territory-1");
    const q54 = answers.sections.S5.answers.Q54A.value as { id: string }[];
    assert.equal(q54[0]?.id, "toilet-repair-replacement");
    const q78 = answers.sections.S7.answers.Q78A.value as { id: string }[];
    assert.equal(q78[0]?.id, "pron-1");

    const q26 = answers.sections.S3.answers.Q26A.value as { contact_id: string | null };
    assert.ok(q26.contact_id);
    assert.ok(answers.entities.contacts[q26.contact_id!]);

    assert.equal(answers.sections.S1.answers.Q5A.value, "ACTIVE other claim");
    assert.equal(answers.sections.S5.answers.Q53A.value, "ACTIVE other pricing method");
    assert.equal(answers.sections.S8.answers.Q91A.value, "ACTIVE failure fallback");

    assert.ok(answers.submission.answers.Q93);
    assert.deepEqual(answers.submission.answers.Q93.value, {
      answersAccurate: true,
      capabilitiesDependOnIntegrations: true,
      actionsRequireSupportAuthorizationConfirmation: true,
    });
  });

  it("covers Q29A alternate capacity branches and excludes inactive sibling fields", () => {
    const overrideDraft = loadDraft("raw-complete.json");
    activateCompatibleBranches(overrideDraft);
    overrideDraft.section3.capacityMode = "emergency_override";
    overrideDraft.section3.overrideConditionsText = "ACTIVE override conditions";
    overrideDraft.section3.reservedCapacityText = "STALE reserved capacity";
    const overrideAnswer = findAnswer(overrideDraft, "Q29A")!.value as Record<string, unknown>;
    assert.equal(overrideAnswer.overrideConditionsText, "ACTIVE override conditions");
    assert.equal(overrideAnswer.reservedCapacityText, undefined);

    const approverDraft = loadDraft("raw-complete.json");
    activateCompatibleBranches(approverDraft);
    approverDraft.section3.capacityMode = "authorized_approval";
    const approverAnswer = findAnswer(approverDraft, "Q29A")!.value as Record<string, unknown>;
    assert.equal(typeof approverAnswer.approverContactId, "string");
    assert.equal(approverAnswer.reservedCapacityText, undefined);
    assert.equal(approverAnswer.overrideConditionsText, undefined);
  });

  it("covers Q45A / Q46A fee-mode branches and Q76A alternate name modes", () => {
    const draft = loadDraft("raw-complete.json");
    activateCompatibleBranches(draft);
    draft.section4.lateCancellationFeeMode = "yes";
    draft.section4.noShowFeeMode = "conditional";
    assert.equal(isQuestionActive("Q45A", draft), true);
    assert.equal(isQuestionActive("Q46A", draft), true);
    assert.ok(findAnswer(draft, "Q45A"));
    assert.ok(findAnswer(draft, "Q46A"));

    draft.section7.spokenNameMode = "another_approved";
    draft.section7.spokenDisplayName = "ACTIVE another approved name";
    assert.equal(isQuestionActive("Q76A", draft), true);
    assert.equal(findAnswer(draft, "Q76A")!.value, "ACTIVE another approved name");
  });

  it("excludes inactive children while retaining stale raw values", () => {
    const draft = loadDraft("raw-complete.json");
    activateCompatibleBranches(draft);

    draft.section1.approvedClaims = ["licensed"];
    draft.section1.answeringMode = "24_7";
    draft.section2.customerSuppliedMaterialsPolicy = "offered";
    draft.section2.correctiveWorkPolicy = "not_offered";
    draft.section2.hasConditionalTerritory = "no";
    draft.section3.hasBackupContact = "no";
    draft.section3.nobodyRespondsFallback = "callback";
    draft.section3.retryRule = "try_once_then_next";
    draft.section3.capacityMode = "arrange_callback";
    draft.section4.humanRequestPolicy = "connect_right_away";
    draft.section4.aiRefusalPolicy = "connect_to_person";
    draft.section4.approverUnavailablePolicy = "callback";
    draft.section4.hasSpendingLimits = "no";
    draft.section4.emergencyAuthMode = "same_rules";
    draft.section4.hasServiceBookingRules = "no";
    draft.section4.rescheduleAuthority = "direct";
    draft.section4.cancellationAuthority = "direct";
    draft.section4.lateCancellationFeeMode = "no";
    draft.section4.noShowFeeMode = "no";
    draft.section4.mayArrangeCallback = "no";
    draft.section4.hasTechnicianAssignments = "no";
    draft.section4.multiIssueMode = "one_appointment";
    draft.section5.pricingModels = ["flat_rate"];
    draft.section5.mayQuoteServicePrices = "not_allowed";
    draft.section5.hasAreaTravelOrMinimum = "no";
    draft.section5.materialMarkupPolicy = "no";
    draft.section5.paymentMethods = ["credit_card"];
    draft.section5.paymentCollectionScope = [
      "booking_or_service_fees",
      "deposits",
      "completed_invoices",
      "outstanding_balances",
    ];
    draft.section5.financialRemedies = ["none"];
    draft.section6.previousWorkInitialAction = "arrange_callback";
    draft.section6.escalationTriggers = ["asks_manager"];
    draft.section6.forbiddenUnhappyPromises = ["no_admit_fault"];
    draft.section6.restrictedInformation = ["payment_information"];
    draft.section6.customerHistoryPolicy = "use_available_history";
    draft.section6.additionalServicePolicy = "only_when_asked";
    draft.section7.callerLanguages = ["english"];
    draft.section7.spokenNameMode = "alexander";
    draft.section7.aiDisclosureStyle = "opening_ai_receptionist";
    draft.section7.pronunciationMode = "none";
    draft.section7.languageSwitchingPolicy = "continue_caller_language";
    draft.section7.accentPreference = "no_preference";
    draft.section8.crmFsmProvider = "servicetitan";
    draft.section8.schedulingProvider = "google_calendar";
    draft.section8.phoneProvider = "ringcentral";
    draft.section8.connectionOwnerMode = "self_authorized";
    draft.section8.failureFallback = "collect_and_send";

    const answers = serializeQuestionnaireAnswersV1(draft);
    for (const questionId of QUESTION_REGISTRY_CONDITIONAL_IDS) {
      assert.equal(isQuestionActive(questionId, draft), false, `${questionId} should be inactive`);
      assert.equal(
        findAnswer(draft, questionId),
        undefined,
        `${questionId} leaked into clean answers`,
      );
    }

    const raw = JSON.stringify(draft);
    assert.ok(raw.includes("ACTIVE other claim"));
    assert.ok(raw.includes("ACTIVE failure fallback"));
    assert.ok(raw.includes("STALE fee waiver rule"));

    const q63 = answers.sections.S5.answers.Q63.value as {
      remedies: string[];
      rules: Record<string, string>;
    };
    assert.deepEqual(q63.remedies, ["none"]);
    assert.deepEqual(q63.rules, {});
    const q69 = answers.sections.S6.answers.Q69.value as Record<string, unknown>;
    assert.equal(q69.customRule, undefined);
  });

  it("keeps Q74A gated until an additional approved voice catalog exists", () => {
    const draft = loadDraft("raw-complete.json");
    activateCompatibleBranches(draft);
    draft.section7.voiceSelection = "another_approved";
    draft.section7.anotherApprovedVoiceId = "voice-extra";
    assert.equal(hasAdditionalApprovedVoices(), false);
    assert.equal(isQuestionActive("Q74A", draft), false);
    assert.equal(findAnswer(draft, "Q74A"), undefined);
  });

  it("collectively covers every registry conditional ID via activation or documented gate", () => {
    const covered = new Set<string>();
    const draftA = loadDraft("raw-complete.json");
    for (const id of activateCompatibleBranches(draftA)) covered.add(id);

    const draftB = clone(draftA);
    draftB.section3.capacityMode = "emergency_override";
    assert.equal(isQuestionActive("Q29A", draftB), true);
    covered.add("Q29A");

    const draftC = clone(draftA);
    draftC.section3.capacityMode = "authorized_approval";
    assert.equal(isQuestionActive("Q29A", draftC), true);
    covered.add("Q29A");

    assert.equal(QUESTION_REGISTRY_CONDITIONAL_IDS.includes("Q74A"), true);
    assert.equal(hasAdditionalApprovedVoices(), false);

    const reachable = QUESTION_REGISTRY_CONDITIONAL_IDS.filter((id) => id !== "Q74A");
    assert.deepEqual([...covered].sort(), [...reachable].sort());
  });
});
