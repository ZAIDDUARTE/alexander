/**
 * Deterministic serializer: frozen raw OnboardingDraft → questionnaire answers v1.
 *
 * Read-only: does not mutate the draft.
 * Omits inactive conditional children from the clean document.
 * Preserves dormant raw values in the draft untouched.
 */

import {
  contactHasIdentity,
  type AdditionalFeeCategory,
  type AdditionalFeeDetail,
  type AdditionalFeeSelection,
  type Contact,
  type FeeRecord,
  type OnboardingDraft,
  type ServicePriceRecord,
  type SoftwareRecord,
} from "../types";
import { PLUMBING_SERVICES, DIAGNOSTIC_SERVICES, CUSTOMER_PROPERTY_TYPES } from "../section2Catalog";
import { EMERGENCY_SCENARIOS } from "../section3Catalog";
import { CAPACITY_POLICY_ROWS } from "../section4Catalog";
import { NON_SERVICE_CALL_TYPE_ROWS } from "../section6Catalog";
import { isQuestionActive } from "./conditions";
import { QUESTION_REGISTRY_BY_ID, SECTION_IDS } from "./registry";
import type {
  AnswerKind,
  MatrixItemAnswer,
  QuestionAnswer,
  QuestionnaireAnswersV1,
  SectionId,
} from "./types";
import {
  QUESTIONNAIRE_ANSWERS_SCHEMA_NAME,
  QUESTIONNAIRE_ANSWERS_SCHEMA_VERSION,
  QUESTIONNAIRE_FREEZE_COMMIT,
  QUESTIONNAIRE_RAW_SCHEMA_VERSION,
  QUESTIONNAIRE_SPEC_VERSION,
} from "./types";

const IDENTITY_LIMITATIONS = [
  "Contact, fee, system, and many repeater row IDs are current generated/time-based identifiers — not durable UUIDs. UUID migration is a later persistence task.",
  "Some composite nested fields share parent Q-IDs; row instances use entity/row IDs, not new Q numbers.",
] as const;

function ans(questionId: string, value: unknown): QuestionAnswer {
  const meta = QUESTION_REGISTRY_BY_ID.get(questionId);
  const answer_kind: AnswerKind = meta?.answerKind ?? "composite";
  return { question_id: questionId, answer_kind, value };
}

function matrixFromPolicyMap(
  catalog: readonly { id: string }[],
  map: Record<string, { policy: string; condition: string }>,
): Record<string, MatrixItemAnswer> {
  const items: Record<string, MatrixItemAnswer> = {};
  for (const row of catalog) {
    const entry = map[row.id] ?? { policy: "", condition: "" };
    const fields: Record<string, unknown> = {};
    if (entry.policy === "with_conditions") {
      fields.condition = entry.condition;
    }
    items[row.id] = {
      value: entry.policy,
      ...(Object.keys(fields).length ? { fields } : {}),
    };
  }
  return items;
}

type EntityBuckets = {
  contacts: Set<string>;
  fees: Set<string>;
  systems: Set<string>;
};

function collectContact(ref: string | null | undefined, buckets: EntityBuckets) {
  if (ref) buckets.contacts.add(ref);
}

function collectFee(ref: string | null | undefined, buckets: EntityBuckets) {
  if (ref) buckets.fees.add(ref);
}

function collectSystem(ref: string | null | undefined, buckets: EntityBuckets) {
  if (ref) buckets.systems.add(ref);
}

/** Active additional-fee branches only. `none` drops every dormant per-fee detail. */
function cleanAdditionalFeeAnswer(
  selection: AdditionalFeeSelection[],
  details: Record<AdditionalFeeCategory, AdditionalFeeDetail>,
): {
  selection: AdditionalFeeSelection[];
  details: Record<string, { amount: string; applicability: string; credit: string; creditWhen?: string }>;
} {
  if (selection.includes("none")) {
    return { selection: ["none"], details: {} };
  }
  const active: Record<
    string,
    { amount: string; applicability: string; credit: string; creditWhen?: string }
  > = {};
  for (const category of selection) {
    if (category === "none") continue;
    const detail = details[category];
    if (!detail) continue;
    active[category] = {
      amount: detail.amount,
      applicability: detail.applicability,
      credit: detail.credit,
      ...(detail.credit === "sometimes" ? { creditWhen: detail.creditWhen } : {}),
    };
  }
  return { selection, details: active };
}

function cleanServicePriceFields(row: ServicePriceRecord): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    mode: row.mode,
    conditions: row.conditions,
  };
  if (row.mode === "exact") fields.exactAmount = row.exactAmount;
  else if (row.mode === "starting_at") fields.startingAmount = row.startingAmount;
  else if (row.mode === "range") {
    fields.rangeMin = row.rangeMin;
    fields.rangeMax = row.rangeMax;
  } else if (row.mode === "hourly") fields.hourlyAmount = row.hourlyAmount;
  return fields;
}

function put(
  target: Record<string, QuestionAnswer>,
  questionId: string,
  draft: OnboardingDraft,
  value: unknown,
) {
  if (!isQuestionActive(questionId, draft)) return;
  target[questionId] = ans(questionId, value);
}

function serializeS1(draft: OnboardingDraft, out: Record<string, QuestionAnswer>) {
  const s = draft.section1;
  put(out, "Q1", draft, s.customerFacingName);
  put(out, "Q2", draft, s.legalName);
  put(out, "Q3", draft, s.mainPhone);
  put(out, "Q4", draft, s.website);
  put(out, "Q5", draft, s.approvedClaims);
  put(out, "Q5A", draft, s.otherApprovedClaim);
  put(out, "Q6", draft, s.licensingDetails);
  put(out, "Q7", draft, s.forbiddenClaims);
  put(out, "Q8", draft, s.officeHours);
  put(out, "Q9", draft, s.serviceHours);
  put(out, "Q10", draft, s.answeringMode);
  put(out, "Q10A", draft, s.answeringSchedule);
  put(out, "Q11", draft, s.recurringAvailabilityNotes);
}

function serializeS2(draft: OnboardingDraft, out: Record<string, QuestionAnswer>) {
  const s = draft.section2;
  put(out, "Q12", draft, matrixFromPolicyMap(PLUMBING_SERVICES, s.plumbingServices));
  put(out, "Q13", draft, matrixFromPolicyMap(DIAGNOSTIC_SERVICES, s.diagnosticServices));
  put(out, "Q14", draft, matrixFromPolicyMap(CUSTOMER_PROPERTY_TYPES, s.customerPropertyTypes));
  put(out, "Q15", draft, s.customerSuppliedMaterialsPolicy);
  put(out, "Q15A", draft, s.customerSuppliedMaterialsCondition);
  put(out, "Q16", draft, s.correctiveWorkPolicy);
  put(out, "Q16A", draft, s.correctiveWorkCondition);
  put(out, "Q17", draft, {
    definitionMode: s.serviceAreaDefinitionMode,
    zipCodes: s.serviceAreaDefinitionMode === "zip_codes" ? s.serviceAreaZipCodes : undefined,
    cities: s.serviceAreaDefinitionMode === "cities" ? s.serviceAreaCities : undefined,
    distance:
      s.serviceAreaDefinitionMode === "distance"
        ? { address: s.serviceAreaDistance.address, radiusMiles: s.serviceAreaDistance.radiusMiles }
        : undefined,
  });
  put(out, "Q18", draft, { excludedTerritory: s.excludedTerritory });
  put(out, "Q19", draft, s.hasConditionalTerritory);
  put(
    out,
    "Q19A",
    draft,
    s.conditionalTerritories.map((row) => ({
      id: row.id,
      fields: { area: row.area, condition: row.condition },
    })),
  );
  put(out, "Q20", draft, {
    mode: s.afterHoursAreaMode,
    geography:
      s.afterHoursAreaMode === "smaller"
        ? {
            definitionMode: s.afterHoursDefinitionMode,
            zipCodes: s.afterHoursDefinitionMode === "zip_codes" ? s.afterHoursZipCodes : undefined,
            cities: s.afterHoursDefinitionMode === "cities" ? s.afterHoursCities : undefined,
            distance:
              s.afterHoursDefinitionMode === "distance"
                ? { address: s.afterHoursDistance.address, radiusMiles: s.afterHoursDistance.radiusMiles }
                : undefined,
          }
        : undefined,
  });
}

function serializeS3(
  draft: OnboardingDraft,
  out: Record<string, QuestionAnswer>,
  buckets: EntityBuckets,
) {
  const s = draft.section3;
  const classificationItems: Record<string, MatrixItemAnswer> = {};
  for (const row of EMERGENCY_SCENARIOS) {
    classificationItems[row.id] = { value: s.emergencyClassifications[row.id] ?? "" };
  }
  put(out, "Q21", draft, classificationItems);
  put(out, "Q22", draft, {
    selections: s.dispatchApproval,
    otherDetail: s.dispatchApproval.includes("other") ? s.dispatchApprovalOtherDetail : undefined,
  });
  put(out, "Q23", draft, s.afterHoursDisposition);
  put(out, "Q24", draft, {
    mode: s.emergencyServiceMode,
    schedule: s.emergencyServiceMode === "certain_hours" ? s.emergencyServiceSchedule : undefined,
  });
  put(out, "Q25", draft, { contact_id: s.primaryContactId || null });
  collectContact(s.primaryContactId, buckets);
  put(out, "Q26", draft, s.hasBackupContact);
  put(out, "Q26A", draft, { contact_id: s.backupContactId || null });
  if (isQuestionActive("Q26A", draft)) collectContact(s.backupContactId, buckets);
  put(out, "Q27", draft, s.nobodyRespondsFallback);
  put(out, "Q27A", draft, s.nobodyRespondsCustomRule);
  put(out, "Q28", draft, s.retryRule);
  put(out, "Q28A", draft, s.retryCustomRule);
  put(out, "Q29", draft, s.capacityMode);
  put(out, "Q29A", draft, {
    reservedCapacityText:
      s.capacityMode === "reserved_capacity" ? s.reservedCapacityText : undefined,
    overrideConditionsText:
      s.capacityMode === "emergency_override" ? s.overrideConditionsText : undefined,
    approverContactId: s.capacityMode === "authorized_approval" ? s.approverContactId : undefined,
  });
  if (isQuestionActive("Q29A", draft) && s.capacityMode === "authorized_approval") {
    collectContact(s.approverContactId, buckets);
  }
}

function serializeS4(
  draft: OnboardingDraft,
  out: Record<string, QuestionAnswer>,
  buckets: EntityBuckets,
) {
  const s = draft.section4;
  put(out, "Q30", draft, s.humanRequestPolicy);
  put(out, "Q30A", draft, s.humanRequestCustomRule);
  put(out, "Q31", draft, s.aiRefusalPolicy);
  put(out, "Q31A", draft, s.aiRefusalCustomRule);
  put(out, "Q32", draft, {
    authority: s.exceptionAuthority,
    approverContactIds: s.exceptionApproverContactIds,
  });
  for (const id of Object.values(s.exceptionApproverContactIds)) collectContact(id, buckets);
  put(out, "Q33", draft, s.approverUnavailablePolicy);
  put(out, "Q33A", draft, s.approverUnavailableCustomRule);
  put(out, "Q34", draft, s.callerPermissions);
  put(out, "Q35", draft, s.hasSpendingLimits);
  put(
    out,
    "Q35A",
    draft,
    s.spendingLimits.map((row) => ({
      id: row.id,
      fields: { callerTypeId: row.callerTypeId, maxAmount: row.maxAmount },
    })),
  );
  put(out, "Q36", draft, s.emergencyAuthMode);
  put(out, "Q36A", draft, s.emergencyAuthSpecialRules);
  put(out, "Q37", draft, s.defaultBookingMode);
  put(out, "Q38", draft, {
    bookingHorizonDays: s.bookingHorizonDays,
    bookingHorizonNoMaximum: s.bookingHorizonNoMaximum,
  });
  put(out, "Q39", draft, s.appointmentWindows);
  put(out, "Q40", draft, s.confirmationInfo);
  put(out, "Q41", draft, s.hasServiceBookingRules);
  put(
    out,
    "Q41A",
    draft,
    s.serviceBookingRules.map((row) => ({
      id: row.id,
      fields: { ...row },
    })),
  );
  const capacityItems: Record<string, MatrixItemAnswer> = {};
  for (const row of CAPACITY_POLICY_ROWS) {
    const entry = s.capacityPolicies[row.id] ?? { policy: "", condition: "" };
    const fields: Record<string, unknown> = {};
    if (entry.policy === "with_conditions") fields.condition = entry.condition;
    capacityItems[row.id] = {
      value: entry.policy,
      ...(Object.keys(fields).length ? { fields } : {}),
    };
  }
  put(out, "Q42", draft, capacityItems);
  put(out, "Q43", draft, s.rescheduleAuthority);
  put(out, "Q43A", draft, s.rescheduleCondition);
  put(out, "Q44", draft, s.cancellationAuthority);
  put(out, "Q44A", draft, s.cancellationCondition);
  put(out, "Q45", draft, s.lateCancellationFeeMode);
  put(out, "Q45A", draft, {
    fee_id: s.lateCancellationFeeId || null,
    mode: s.lateCancellationFeeMode,
  });
  if (isQuestionActive("Q45A", draft)) collectFee(s.lateCancellationFeeId, buckets);
  put(out, "Q46", draft, s.noShowFeeMode);
  put(out, "Q46A", draft, {
    fee_id: s.noShowFeeId || null,
    mode: s.noShowFeeMode,
  });
  if (isQuestionActive("Q46A", draft)) collectFee(s.noShowFeeId, buckets);
  put(out, "Q47", draft, s.cancellationExceptions);
  put(out, "Q48", draft, s.noAvailabilityPriority);
  put(out, "Q49", draft, s.mayArrangeCallback);
  put(out, "Q49A", draft, s.callbackNumberPolicy);
  put(out, "Q49B", draft, { contact_id: s.callbackOwnerContactId || null });
  if (isQuestionActive("Q49B", draft)) collectContact(s.callbackOwnerContactId, buckets);
  put(out, "Q50", draft, s.hasTechnicianAssignments);
  put(
    out,
    "Q50A",
    draft,
    s.technicianAssignments.map((row) => ({
      id: row.id,
      fields: { ...row },
    })),
  );
  put(out, "Q51", draft, s.specificTechnicianRequest);
  put(out, "Q52", draft, s.multiIssueMode);
  put(out, "Q52A", draft, {
    separateIssueServiceIds: s.separateIssueServiceIds,
    separateIssueOther: s.separateIssueOther,
    ...(s.separateIssueOther ? { separateIssueOtherDetail: s.separateIssueOtherDetail } : {}),
  });
}

function serializeS5(draft: OnboardingDraft, out: Record<string, QuestionAnswer>) {
  const s = draft.section5;
  put(out, "Q53", draft, s.pricingModels);
  put(out, "Q53A", draft, s.pricingModelOther);
  put(out, "Q54", draft, s.mayQuoteServicePrices);
  put(
    out,
    "Q54A",
    draft,
    s.servicePrices.map((row) => ({
      id: row.serviceId,
      fields: cleanServicePriceFields(row),
    })),
  );
  put(out, "Q55", draft, s.unknownPriceBehavior);
  put(out, "Q56", draft, cleanAdditionalFeeAnswer(s.additionalFeeSelection, s.additionalFeeDetails));
  put(out, "Q57", draft, s.hasAreaTravelOrMinimum);
  put(
    out,
    "Q57A",
    draft,
    s.areaPricingRows.map((row) => ({
      id: row.id,
      fields: {
        area: row.area,
        feeOrMinimum: row.feeOrMinimum,
      },
    })),
  );
  put(out, "Q58", draft, s.materialMarkupPolicy);
  put(out, "Q58A", draft, s.materialMarkupCustomerExplanation);
  put(out, "Q59", draft, s.paymentMethods);
  put(out, "Q59A", draft, s.paymentMethodOther);
  put(out, "Q60", draft, s.paymentDuePolicies);
  put(out, "Q61", draft, s.paymentAssistance);
  put(out, "Q62", draft, s.paymentCollectionScope);
  put(out, "Q62A", draft, s.paymentCollectionOther);
  const selectedRemedies = new Set<string>(s.financialRemedies);
  selectedRemedies.delete("none");
  put(out, "Q63", draft, {
    remedies: s.financialRemedies,
    rules: Object.fromEntries(
      Object.entries(s.remedyRules).filter(([id]) => selectedRemedies.has(id)),
    ),
  });
}

function serializeS6(
  draft: OnboardingDraft,
  out: Record<string, QuestionAnswer>,
  buckets: EntityBuckets,
) {
  const s = draft.section6;
  put(out, "Q64", draft, {
    action: s.previousWorkInitialAction,
    ...(s.previousWorkInitialAction === "schedule_return_visit"
      ? { returnVisitEligibilityRule: s.returnVisitEligibilityRule }
      : {}),
    ...(s.previousWorkInitialAction === "custom"
      ? { previousWorkCustomRule: s.previousWorkCustomRule }
      : {}),
  });
  put(out, "Q65", draft, s.repeatCallbackAction);
  put(out, "Q66", draft, s.escalationTriggers);
  put(out, "Q66A", draft, s.escalationTriggerOther);
  put(out, "Q67", draft, s.forbiddenUnhappyPromises);
  put(out, "Q67A", draft, s.forbiddenUnhappyPromiseOther);
  const nonServiceItems: Record<string, MatrixItemAnswer> = {};
  for (const row of NON_SERVICE_CALL_TYPE_ROWS) {
    const policy = s.nonServiceCallPolicies[row.id];
    const fields: Record<string, unknown> = {};
    if (policy?.disposition === "send_specific" && policy.contactId) {
      fields.contact_id = policy.contactId;
      collectContact(policy.contactId, buckets);
    }
    nonServiceItems[row.id] = {
      value: policy?.disposition ?? "",
      ...(Object.keys(fields).length ? { fields } : {}),
    };
  }
  put(out, "Q68", draft, nonServiceItems);
  put(out, "Q69", draft, {
    policy: s.customerHistoryPolicy,
    ...(s.customerHistoryPolicy === "custom" ? { customRule: s.customerHistoryCustomRule } : {}),
  });
  put(out, "Q70", draft, s.restrictedInformation);
  put(out, "Q70A", draft, s.restrictedInformationOther);
  put(out, "Q71", draft, {
    policy: s.additionalServicePolicy,
    ...(s.additionalServicePolicy === "custom" ? { customRule: s.additionalServiceCustomRule } : {}),
  });
  put(out, "Q72", draft, s.unusualCallNotes);
}

function serializeS7(draft: OnboardingDraft, out: Record<string, QuestionAnswer>) {
  const s = draft.section7;
  put(out, "Q73", draft, {
    englishOnly: s.englishOnly,
    callerLanguages: s.callerLanguages,
  });
  put(out, "Q73A", draft, s.otherSupportedLanguage);
  put(out, "Q74", draft, s.voiceSelection);
  put(out, "Q74A", draft, s.anotherApprovedVoiceId);
  put(out, "Q75", draft, s.communicationStyle);
  put(out, "Q76", draft, s.spokenNameMode);
  put(out, "Q76A", draft, s.spokenDisplayName);
  put(out, "Q77", draft, s.aiDisclosureStyle);
  put(out, "Q77A", draft, s.aiDisclosureCustom);
  put(out, "Q78", draft, s.pronunciationMode);
  put(
    out,
    "Q78A",
    draft,
    s.pronunciationEntries.map((row) => ({
      id: row.id,
      fields: {
        term: row.term,
        pronunciation: row.pronunciation,
        audioSampleReference: row.audioSampleReference,
      },
    })),
  );
  put(out, "Q79", draft, s.languageSwitchingPolicy);
  put(out, "Q79A", draft, s.languageSwitchingCustomRule);
  put(out, "Q80", draft, s.perceivedVoicePreference);
  put(out, "Q81", draft, s.accentPreference);
  put(out, "Q81A", draft, s.accentOtherApproved);
  put(out, "Q82", draft, s.formalityPreference);
  put(out, "Q83", draft, s.brandPhrasesAndAvoidances);
  put(out, "Q84", draft, s.additionalReviewNotes);
}

function serializeS8(
  draft: OnboardingDraft,
  out: Record<string, QuestionAnswer>,
  buckets: EntityBuckets,
) {
  const s = draft.section8;
  put(out, "Q85", draft, s.crmFsmProvider);
  put(out, "Q85A", draft, s.crmFsmCustomName);
  collectSystem(s.crmFsmSoftwareId, buckets);
  put(out, "Q86", draft, s.schedulingProvider);
  put(out, "Q86A", draft, s.schedulingCustomName);
  collectSystem(s.schedulingSoftwareId, buckets);
  put(out, "Q87", draft, s.phoneProvider);
  put(out, "Q87A", draft, s.phoneCustomName);
  collectSystem(s.phoneSoftwareId, buckets);
  const categories = s.additionalSoftwareCategories;
  const cards =
    categories.includes("none")
      ? []
      : s.additionalSoftwareCards
          .filter((c) => categories.includes(c.categoryId))
          .map((c) => {
            collectSystem(c.softwareId, buckets);
            return {
              id: c.categoryId,
              fields: {
                categoryId: c.categoryId,
                softwareId: c.softwareId,
                systemName: c.systemName,
                desiredAccess: c.desiredAccess,
                ...(c.categoryId === "other"
                  ? { otherCategoryLabel: c.otherCategoryLabel, otherDetails: c.otherDetails }
                  : {}),
              },
            };
          });
  put(out, "Q88", draft, { categories, cards });
  put(out, "Q89", draft, s.connectionOwnerMode);
  put(out, "Q89A", draft, {
    name: s.connectionOwnerName,
    email: s.connectionOwnerEmail,
    phone: s.connectionOwnerPhone,
  });
  put(out, "Q90", draft, s.connectionNoticeAcknowledged);
  put(out, "Q91", draft, s.failureFallback);
  put(out, "Q91A", draft, s.failureFallbackCustom);
  put(out, "Q92", draft, s.finalOperatingNotes);
}

function serializeSubmission(draft: OnboardingDraft, out: Record<string, QuestionAnswer>) {
  const c = draft.submission.confirmations;
  put(out, "Q93", draft, {
    answersAccurate: c.answersAccurate,
    capabilitiesDependOnIntegrations: c.capabilitiesDependOnIntegrations,
    actionsRequireSupportAuthorizationConfirmation:
      c.actionsRequireSupportAuthorizationConfirmation,
  });
}

function contactEntity(c: Contact): Record<string, unknown> {
  return {
    id: c.id,
    nameOrRole: c.nameOrRole,
    phone: c.phone,
    availability: c.availability,
    callCategories: c.callCategories,
    otherCategory: c.otherCategory,
  };
}

function feeEntity(f: FeeRecord): Record<string, unknown> {
  return {
    id: f.id,
    feeKey: f.feeKey,
    name: f.name,
    amountKind: f.amountKind,
    amountFixed: f.amountFixed,
    amountMin: f.amountMin,
    amountMax: f.amountMax,
    amountPercentage: f.amountPercentage,
    applicationRule: f.applicationRule,
    noticeRequired: f.noticeRequired,
    quoteAuthority: f.quoteAuthority,
    creditTowardWork: f.creditTowardWork,
    waiverPolicy: f.waiverPolicy,
    waiverRule: f.waiverRule,
    categoryTemplate: f.categoryTemplate,
    active: f.active,
    sourceSection: f.sourceSection,
  };
}

function systemEntity(s: SoftwareRecord): Record<string, unknown> {
  return {
    id: s.id,
    role: s.role,
    providerKey: s.providerKey,
    displayName: s.displayName,
    customName: s.customName,
    desiredAccess: s.desiredAccess,
  };
}

/**
 * Serialize a frozen onboarding draft into alexander.questionnaire_answers v1.
 * Deterministic for the same questionnaire content. Does not mutate `draft`.
 */
export function serializeQuestionnaireAnswersV1(draft: OnboardingDraft): QuestionnaireAnswersV1 {
  const buckets: EntityBuckets = {
    contacts: new Set(),
    fees: new Set(),
    systems: new Set(),
  };

  const bySection: Record<SectionId, Record<string, QuestionAnswer>> = {
    S1: {},
    S2: {},
    S3: {},
    S4: {},
    S5: {},
    S6: {},
    S7: {},
    S8: {},
  };
  const submissionAnswers: Record<string, QuestionAnswer> = {};

  serializeS1(draft, bySection.S1);
  serializeS2(draft, bySection.S2);
  serializeS3(draft, bySection.S3, buckets);
  serializeS4(draft, bySection.S4, buckets);
  serializeS5(draft, bySection.S5);
  serializeS6(draft, bySection.S6, buckets);
  serializeS7(draft, bySection.S7);
  serializeS8(draft, bySection.S8, buckets);
  serializeSubmission(draft, submissionAnswers);

  // Only include contacts that are referenced AND have identity (exclude empty placeholders).
  const contacts: Record<string, Record<string, unknown>> = {};
  for (const id of buckets.contacts) {
    const c = draft.contacts.find((x) => x.id === id);
    if (c && contactHasIdentity(c)) contacts[id] = contactEntity(c);
  }

  const fees: Record<string, Record<string, unknown>> = {};
  for (const id of buckets.fees) {
    const f = draft.fees.find((x) => x.id === id);
    if (f) fees[id] = feeEntity(f);
  }

  const systems: Record<string, Record<string, unknown>> = {};
  for (const id of buckets.systems) {
    const sys = draft.systems.find((x) => x.id === id);
    if (sys) systems[id] = systemEntity(sys);
  }

  // Null out contact_id answers that pointed only at empty placeholders.
  for (const sectionId of SECTION_IDS) {
    for (const answer of Object.values(bySection[sectionId])) {
      scrubPlaceholderContactRefs(answer, contacts);
    }
  }

  return {
    schema: {
      name: QUESTIONNAIRE_ANSWERS_SCHEMA_NAME,
      version: QUESTIONNAIRE_ANSWERS_SCHEMA_VERSION,
    },
    questionnaire: {
      spec_version: QUESTIONNAIRE_SPEC_VERSION,
      raw_schema_version: QUESTIONNAIRE_RAW_SCHEMA_VERSION,
      freeze_commit: QUESTIONNAIRE_FREEZE_COMMIT,
    },
    sections: {
      S1: { answers: bySection.S1 },
      S2: { answers: bySection.S2 },
      S3: { answers: bySection.S3 },
      S4: { answers: bySection.S4 },
      S5: { answers: bySection.S5 },
      S6: { answers: bySection.S6 },
      S7: { answers: bySection.S7 },
      S8: { answers: bySection.S8 },
    },
    submission: { answers: submissionAnswers },
    entities: { contacts, fees, systems },
    identity_limitations: [...IDENTITY_LIMITATIONS],
  };
}

function scrubPlaceholderContactRefs(
  answer: QuestionAnswer,
  contacts: Record<string, Record<string, unknown>>,
) {
  const v = answer.value;
  if (v && typeof v === "object" && !Array.isArray(v) && "contact_id" in (v as object)) {
    const obj = v as { contact_id: string | null };
    if (obj.contact_id && !contacts[obj.contact_id]) {
      obj.contact_id = null;
    }
  }
}
