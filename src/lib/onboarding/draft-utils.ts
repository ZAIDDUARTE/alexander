import {
  createDefaultDraft,
  createDefaultConfirmationInfo,
  createDefaultAppointmentWindows,
  type Contact,
  type FeeRecord,
  type OnboardingDraft,
  SCHEMA_VERSION,
} from "./types";
import { hasAnyOpenOfficeDay } from "./schedule";
import {
  emergencyClassificationsAreAllRecommendedDefault,
  fillBlankQ26WithRecommendedDefault,
} from "./section3Defaults";
import { EXCEPTION_TYPES, CALLER_TYPES, CAPACITY_POLICY_ROWS } from "./section4Catalog";
import { DEFAULT_FORBIDDEN_STATEMENT_IDS } from "./section5Catalog";
import { FINANCIAL_REMEDY_ROWS } from "./section5Catalog";
import {
  DEFAULT_ESCALATION_TRIGGER_IDS,
  DEFAULT_FORBIDDEN_UNHAPPY_PROMISE_IDS,
  DEFAULT_RESTRICTED_INFORMATION_IDS,
  NON_SERVICE_CALL_TYPE_ROWS,
} from "./section6Catalog";

export type RedisOnboardingDraft = {
  schemaVersion: number;
  updatedAt: string;
  currentRoute: string;
  currentSection: number;
  completedSections: number[];
  data: {
    navigation: OnboardingDraft["navigation"];
    section1: OnboardingDraft["section1"];
    section2: OnboardingDraft["section2"];
    section3: OnboardingDraft["section3"];
    section4: OnboardingDraft["section4"];
    section5: OnboardingDraft["section5"];
    section6: OnboardingDraft["section6"];
    section7: OnboardingDraft["section7"];
    contacts: OnboardingDraft["contacts"];
    fees: OnboardingDraft["fees"];
  };
};

/**
 * Add a section id to the banked `completedSections` set. Monotonic and
 * idempotent: a section that is already complete never moves or
 * duplicates, and ordering is always ascending regardless of the order
 * sections were completed in (a user may complete Section 2 before
 * ever revisiting an already-completed Section 1).
 */
export function addCompletedSection(completedSections: number[], sectionId: number): number[] {
  if (completedSections.includes(sectionId)) return completedSections;
  return [...completedSections, sectionId].sort((a, b) => a - b);
}

export function draftTimestamp(draft: OnboardingDraft): number {
  if (!hasDraftContent(draft)) return 0;
  const t = Date.parse(draft.updatedAt);
  return Number.isFinite(t) ? t : 0;
}

function servicePolicyMapHasContent(map: Record<string, { policy: string; condition: string }>): boolean {
  return Object.values(map).some((entry) => entry.policy !== "" || entry.condition.trim() !== "");
}

function section2HasContent(s2: OnboardingDraft["section2"]): boolean {
  if (servicePolicyMapHasContent(s2.plumbingServices)) return true;
  if (servicePolicyMapHasContent(s2.diagnosticServices)) return true;
  if (servicePolicyMapHasContent(s2.customerPropertyTypes)) return true;
  if (s2.customerSuppliedMaterialsPolicy) return true;
  if (s2.customerSuppliedMaterialsCondition.trim()) return true;
  if (s2.correctiveWorkPolicy) return true;
  if (s2.correctiveWorkCondition.trim()) return true;
  if (s2.serviceAreaDefinitionMode) return true;
  if (s2.serviceAreaZipCodes.length > 0) return true;
  if (s2.serviceAreaCities.length > 0) return true;
  if (s2.serviceAreaDistance.address.trim() || s2.serviceAreaDistance.radiusMiles.trim()) return true;
  if (s2.excludedTerritory.trim()) return true;
  if (s2.hasConditionalTerritory) return true;
  if (s2.conditionalTerritories.length > 0) return true;
  if (s2.afterHoursAreaMode) return true;
  if (s2.afterHoursServiceArea.trim()) return true;
  return false;
}

function contactHasContent(contact: Contact): boolean {
  if (contact.nameOrRole.trim()) return true;
  if (contact.phone.trim()) return true;
  if (contact.callCategories.length > 0) return true;
  if (contact.otherCategory.trim()) return true;
  if (hasAnyOpenOfficeDay(contact.availability)) return true;
  return false;
}

function section3HasContent(s3: OnboardingDraft["section3"], contacts: Contact[]): boolean {
  if (!emergencyClassificationsAreAllRecommendedDefault(s3.emergencyClassifications)) return true;
  if (s3.dispatchApproval.length > 0) return true;
  if (s3.dispatchApprovalOtherDetail.trim()) return true;
  if (Object.values(s3.afterHoursDisposition).some((v) => v !== "")) return true;
  if (s3.emergencyServiceMode) return true;
  if (hasAnyOpenOfficeDay(s3.emergencyServiceSchedule)) return true;
  if (s3.hasBackupContact) return true;
  if (s3.nobodyRespondsFallback) return true;
  if (s3.nobodyRespondsCustomRule.trim()) return true;
  if (s3.retryRule) return true;
  if (s3.retryCustomRule.trim()) return true;
  if (s3.capacityMode) return true;
  if (s3.reservedCapacityText.trim()) return true;
  if (s3.overrideConditionsText.trim()) return true;
  if (s3.approverContactId.trim()) return true;
  if (contacts.some(contactHasContent)) return true;
  return false;
}

function feeHasContent(fee: FeeRecord): boolean {
  if (fee.amountFixed.trim()) return true;
  if (fee.amountMin.trim() || fee.amountMax.trim()) return true;
  if (fee.amountPercentage.trim()) return true;
  if (fee.applicationRule.trim()) return true;
  if (fee.noticeRequired.trim()) return true;
  if (fee.quoteAuthority) return true;
  if (fee.creditTowardWork) return true;
  if (fee.waiverPolicy) return true;
  if (fee.waiverRule.trim()) return true;
  // An active fee shell with only feeKey/name is still a structural default —
  // only count once the user has entered fee details or explicitly set mode.
  return false;
}

/**
 * Section 4 content detection. Explicitly ignores MD-approved structural
 * defaults so a fresh questionnaire stays clean:
 * - appointment window shells (labels only, empty times)
 * - Q49 all-six confirmation-info preselection
 * - empty fee registry / empty technician / spending-limit shells
 * - empty noAvailabilityPriority (must be consciously set)
 */
function section4HasContent(s4: OnboardingDraft["section4"], fees: FeeRecord[]): boolean {
  if (s4.humanRequestPolicy) return true;
  if (s4.humanRequestCustomRule.trim()) return true;
  if (s4.aiRefusalPolicy) return true;
  if (s4.aiRefusalCustomRule.trim()) return true;
  if (EXCEPTION_TYPES.some((r) => (s4.exceptionAuthority[r.id] ?? "") !== "")) return true;
  if (Object.values(s4.exceptionApproverContactIds).some((id) => id.trim())) return true;
  if (s4.approverUnavailablePolicy) return true;
  if (s4.approverUnavailableCustomRule.trim()) return true;
  if (CALLER_TYPES.some((r) => (s4.callerPermissions[r.id] ?? []).length > 0)) return true;
  if (s4.hasSpendingLimits) return true;
  if (s4.spendingLimits.length > 0) return true;
  if (s4.emergencyAuthMode) return true;
  if (s4.emergencyAuthSpecialRules.trim()) return true;
  if (s4.defaultBookingMode) return true;
  if (s4.bookingHorizonDays.trim()) return true;
  if (s4.bookingHorizonNoMaximum) return true;
  // Window shells: only count if times/labels diverge from defaults meaningfully
  const defaultWindows = createDefaultAppointmentWindows();
  for (const w of s4.appointmentWindows) {
    if (w.start || w.end) return true;
    const def = defaultWindows.find((d) => d.id === w.id);
    if (def && w.label !== def.label) return true;
    if (def && w.enabled !== def.enabled) return true;
  }
  if (s4.appointmentWindows.length !== defaultWindows.length) return true;
  // Q49 default preselection is NOT content
  const defaultConfirm = createDefaultConfirmationInfo().slice().sort().join(",");
  const currentConfirm = [...s4.confirmationInfo].slice().sort().join(",");
  if (currentConfirm !== defaultConfirm) return true;
  if (s4.hasServiceBookingRules) return true;
  if (s4.serviceBookingRules.length > 0) return true;
  if (CAPACITY_POLICY_ROWS.some((r) => (s4.capacityPolicies[r.id]?.policy ?? "") !== "")) return true;
  if (CAPACITY_POLICY_ROWS.some((r) => (s4.capacityPolicies[r.id]?.condition ?? "").trim())) return true;
  if (s4.rescheduleAuthority) return true;
  if (s4.rescheduleCondition.trim()) return true;
  if (s4.cancellationAuthority) return true;
  if (s4.cancellationCondition.trim()) return true;
  if (s4.lateCancellationFeeMode) return true;
  if (s4.noShowFeeMode) return true;
  if (s4.cancellationExceptions.trim()) return true;
  if (s4.noAvailabilityPriority.length > 0) return true;
  if (s4.mayArrangeCallback) return true;
  if (s4.callbackNumberPolicy) return true;
  if (s4.callbackOwnerContactId.trim()) return true;
  if (s4.hasTechnicianAssignments) return true;
  if (s4.technicianAssignments.length > 0) return true;
  if (s4.specificTechnicianRequest) return true;
  if (s4.multiIssueMode) return true;
  if (s4.separateIssueServiceIds.length > 0) return true;
  if (s4.separateIssueOther) return true;
  if (s4.separateIssueOtherDetail.trim()) return true;
  if (fees.some(feeHasContent)) return true;
  return false;
}

/**
 * Section 5 content detection. Q74 MD default preselection of the first five
 * forbidden statements is NOT user-authored content.
 */
function section5HasContent(s5: OnboardingDraft["section5"]): boolean {
  if (s5.pricingModels.length > 0) return true;
  if (s5.pricingModelOther.trim()) return true;
  if (s5.materialMarkupPolicy) return true;
  if (s5.materialMarkupCustomerExplanation.trim()) return true;
  if (s5.unknownPriceBehavior) return true;
  if (s5.unknownPriceCustomRule.trim()) return true;
  if (s5.noSeparateFees) return true;
  const defaultForbidden = DEFAULT_FORBIDDEN_STATEMENT_IDS.slice().sort().join(",");
  const currentForbidden = [...s5.forbiddenStatements].slice().sort().join(",");
  if (currentForbidden !== defaultForbidden) return true;
  if (s5.hasAreaTravelOrMinimum) return true;
  if (s5.areaPricingRows.length > 0) return true;
  if (s5.forbiddenStatementOther.trim()) return true;
  if (s5.hasPromotions) return true;
  if (s5.promotions.length > 0) return true;
  if (s5.promotionStacking) return true;
  if (s5.promotionStackingRule.trim()) return true;
  if (s5.promotionModificationAuthority) return true;
  if (s5.promotionModificationRule.trim()) return true;
  if (s5.paymentMethods.length > 0) return true;
  if (s5.paymentMethodOther.trim()) return true;
  if (s5.paymentDuePolicies.length > 0) return true;
  if (s5.depositWorkDetail.trim() || s5.depositRule.trim()) return true;
  if (s5.progressPaymentProjectsDetail.trim() || s5.progressPaymentRule.trim()) return true;
  if (s5.invoiceCustomersDetail.trim() || s5.invoiceTerms.trim()) return true;
  if (s5.paymentDueOtherRule.trim()) return true;
  if (s5.offersFinancing) return true;
  if (s5.financingProviderTerms.trim()) return true;
  if (s5.financingPermissions.length > 0) return true;
  if (s5.financingPermissionOtherDetail.trim()) return true;
  if (s5.financingEligibilityStatement.trim()) return true;
  if (
    FINANCIAL_REMEDY_ROWS.some((r) => (s5.remedyAuthority[r.id as keyof typeof s5.remedyAuthority] ?? "") !== "")
  ) {
    return true;
  }
  if (
    FINANCIAL_REMEDY_ROWS.some((r) =>
      (s5.remedyRules[r.id as keyof typeof s5.remedyRules] ?? "").trim(),
    )
  ) {
    return true;
  }
  if (s5.financialApproverContactId.trim()) return true;
  if (s5.paidDiagnosticExplanation.trim()) return true;
  if (s5.generalPricingAuthority) return true;
  if (Object.keys(s5.servicePricingRules).length > 0) return true;
  const defaultVisitTypes = createDefaultDraft().section5.visitTypeByServiceId;
  for (const [serviceId, visitType] of Object.entries(s5.visitTypeByServiceId)) {
    if (visitType && visitType !== (defaultVisitTypes[serviceId] ?? "")) return true;
  }
  return false;
}

function section6HasContent(s6: OnboardingDraft["section6"]): boolean {
  if (s6.previousWorkInitialAction) return true;
  if (s6.returnVisitEligibilityRule.trim()) return true;
  if (s6.previousWorkCustomRule.trim()) return true;
  if (s6.repeatCallbackAction) return true;
  const defaultEsc = DEFAULT_ESCALATION_TRIGGER_IDS.slice().sort().join(",");
  const currentEsc = [...s6.escalationTriggers].slice().sort().join(",");
  if (currentEsc !== defaultEsc) return true;
  if (s6.escalationTriggerOther.trim()) return true;
  const defaultProm = DEFAULT_FORBIDDEN_UNHAPPY_PROMISE_IDS.slice().sort().join(",");
  const currentProm = [...s6.forbiddenUnhappyPromises].slice().sort().join(",");
  if (currentProm !== defaultProm) return true;
  if (s6.forbiddenUnhappyPromiseOther.trim()) return true;
  for (const row of NON_SERVICE_CALL_TYPE_ROWS) {
    const policy = s6.nonServiceCallPolicies[row.id];
    if (policy?.disposition) return true;
    if (policy?.contactId.trim()) return true;
  }
  if (s6.customerHistoryPolicy) return true;
  if (s6.customerHistoryCustomRule.trim()) return true;
  const defaultPriv = DEFAULT_RESTRICTED_INFORMATION_IDS.slice().sort().join(",");
  const currentPriv = [...s6.restrictedInformation].slice().sort().join(",");
  if (currentPriv !== defaultPriv) return true;
  if (s6.restrictedInformationOther.trim()) return true;
  if (s6.additionalServicePolicy) return true;
  if (s6.additionalServiceCustomRule.trim()) return true;
  if (s6.unusualCallNotes.trim()) return true;
  return false;
}

function section7HasContent(s7: OnboardingDraft["section7"]): boolean {
  if (s7.englishOnly) return true;
  if (s7.callerLanguages.length > 0) return true;
  if (s7.otherSupportedLanguage.trim()) return true;
  if (s7.voiceSelection) return true;
  if (s7.anotherApprovedVoiceId.trim()) return true;
  if (s7.communicationStyle) return true;
  if (s7.spokenNameMode) return true;
  if (s7.spokenDisplayName.trim()) return true;
  if (s7.aiDisclosureStyle) return true;
  if (s7.aiDisclosureCustom.trim()) return true;
  if (s7.pronunciationMode) return true;
  if (s7.pronunciationEntries.length > 0) return true;
  if (s7.languageSwitchingPolicy) return true;
  if (s7.languageSwitchingCustomRule.trim()) return true;
  if (s7.perceivedVoicePreference) return true;
  if (s7.accentPreference) return true;
  if (s7.accentOtherApproved.trim()) return true;
  if (s7.formalityPreference) return true;
  if (s7.brandPhrasesAndAvoidances.trim()) return true;
  if (s7.additionalReviewNotes.trim()) return true;
  return false;
}

export function hasDraftContent(draft: OnboardingDraft): boolean {
  const s = draft.section1;
  if (s.customerFacingName.trim()) return true;
  if (s.legalName.trim()) return true;
  if (s.mainPhone.trim()) return true;
  if (s.website.trim()) return true;
  if (s.approvedClaims.length > 0) return true;
  if (s.otherApprovedClaim.trim()) return true;
  if (s.licensingDetails.trim()) return true;
  if (s.forbiddenClaims.trim()) return true;
  if (s.recurringAvailabilityNotes.trim()) return true;
  if (s.answeringMode) return true;
  if (section2HasContent(draft.section2)) return true;
  if (section3HasContent(draft.section3, draft.contacts)) return true;
  if (section4HasContent(draft.section4, draft.fees ?? [])) return true;
  if (section5HasContent(draft.section5)) return true;
  if (section6HasContent(draft.section6)) return true;
  if (section7HasContent(draft.section7)) return true;
  if (draft.navigation.completedSections.length > 0) return true;
  if (draft.navigation.stage !== "welcome") return true;
  return false;
}

export function mergeWithDefaults(partial: Partial<OnboardingDraft>): OnboardingDraft {
  const base = createDefaultDraft();
  return {
    ...base,
    ...partial,
    schemaVersion: SCHEMA_VERSION,
    navigation: { ...base.navigation, ...partial.navigation },
    section1: { ...base.section1, ...partial.section1 },
    section2: { ...base.section2, ...partial.section2 },
    section3: {
      ...base.section3,
      ...partial.section3,
      emergencyClassifications: fillBlankQ26WithRecommendedDefault({
        ...base.section3.emergencyClassifications,
        ...partial.section3?.emergencyClassifications,
      }),
    },
    section4: { ...base.section4, ...partial.section4 },
    section5: { ...base.section5, ...partial.section5 },
    section6: {
      ...base.section6,
      ...partial.section6,
      nonServiceCallPolicies: {
        ...base.section6.nonServiceCallPolicies,
        ...partial.section6?.nonServiceCallPolicies,
      },
    },
    section7: {
      ...base.section7,
      ...partial.section7,
      pronunciationEntries:
        partial.section7?.pronunciationEntries ?? base.section7.pronunciationEntries,
    },
    contacts: partial.contacts ?? base.contacts,
    fees: partial.fees ?? base.fees,
  };
}

export function toRedisDraft(draft: OnboardingDraft, currentRoute: string): RedisOnboardingDraft {
  return {
    schemaVersion: draft.schemaVersion,
    updatedAt: draft.updatedAt,
    currentRoute,
    currentSection: draft.navigation.sectionId,
    completedSections: draft.navigation.completedSections,
    data: {
      navigation: draft.navigation,
      section1: draft.section1,
      section2: draft.section2,
      section3: draft.section3,
      section4: draft.section4,
      section5: draft.section5,
      section6: draft.section6,
      section7: draft.section7,
      contacts: draft.contacts,
      fees: draft.fees,
    },
  };
}

export function fromRedisDraft(redis: RedisOnboardingDraft): OnboardingDraft {
  return mergeWithDefaults({
    schemaVersion: redis.schemaVersion,
    updatedAt: redis.updatedAt,
    currentRoute: redis.currentRoute,
    navigation: redis.data.navigation,
    section1: redis.data.section1,
    section2: redis.data.section2,
    section3: redis.data.section3,
    section4: redis.data.section4,
    section5: redis.data.section5,
    section6: redis.data.section6,
    section7: redis.data.section7,
    contacts: redis.data.contacts,
    fees: redis.data.fees,
  });
}

export type ReconcileResult = {
  draft: OnboardingDraft;
  /** Winner for syncing the other store */
  winner: "local" | "server" | "default";
  needsServerSync: boolean;
  needsLocalSync: boolean;
};

export function reconcileDrafts(
  local: OnboardingDraft,
  server: OnboardingDraft | null,
): ReconcileResult {
  const localTs = draftTimestamp(local);
  const serverTs = server ? draftTimestamp(server) : 0;
  const localHas = hasDraftContent(local);
  const serverHas = server ? hasDraftContent(server) : false;

  if (!localHas && !serverHas) {
    return {
      draft: createDefaultDraft(),
      winner: "default",
      needsServerSync: false,
      needsLocalSync: false,
    };
  }

  if (localHas && !serverHas) {
    return {
      draft: local,
      winner: "local",
      needsServerSync: true,
      needsLocalSync: false,
    };
  }

  if (!localHas && serverHas && server) {
    return {
      draft: server,
      winner: "server",
      needsServerSync: false,
      needsLocalSync: true,
    };
  }

  if (server && localTs >= serverTs) {
    return {
      draft: local,
      winner: "local",
      needsServerSync: localTs > serverTs,
      needsLocalSync: false,
    };
  }

  if (server) {
    return {
      draft: server,
      winner: "server",
      needsServerSync: false,
      needsLocalSync: true,
    };
  }

  return {
    draft: local,
    winner: "local",
    needsServerSync: true,
    needsLocalSync: false,
  };
}

/** Prevent autosave from pushing an empty template over a populated draft. */
