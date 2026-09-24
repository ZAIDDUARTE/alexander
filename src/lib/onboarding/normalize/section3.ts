import { EMERGENCY_SCENARIOS } from "../section3Catalog";
import { contactHasIdentity } from "../types";
import type {
  AfterHoursCallClass,
  AfterHoursDispositionOption,
  CapacityMode,
  Contact,
  ContactCategory,
  EmergencyClassification,
  EmergencyServiceMode,
  NobodyRespondsFallback,
  RetryRule,
  Section3Data,
} from "../types";
import type { WeeklyOfficeSchedule } from "../schedule";

export type NormalizedEmergencyClassification = {
  id: string;
  name: string;
  classification: EmergencyClassification;
};

export type NormalizedDispatchApproval = {
  scenarioIds: string[];
  other: boolean;
  otherDetail: string | null;
  none: boolean;
};

/**
 * Company Truth contact. Escalation metadata may be absent for
 * core-only contacts (e.g. a Q38 scheduling-exception approver).
 * Empty registry shells never appear here.
 */
export type NormalizedContact = {
  id: string;
  nameOrRole: string;
  phone: string;
  /** Null when the contact has no escalation availability configured. */
  availability: WeeklyOfficeSchedule | null;
  callCategories: ContactCategory[];
  otherCategory: string | null;
};

export type NormalizedSection3 = {
  emergencyClassifications: NormalizedEmergencyClassification[];
  dispatchApproval: NormalizedDispatchApproval;
  afterHoursDisposition: Record<AfterHoursCallClass, AfterHoursDispositionOption | null>;
  emergencyService: {
    mode: EmergencyServiceMode | null;
    schedule: WeeklyOfficeSchedule | null;
  };
  /** Meaningful contacts only — empty placeholders are excluded. */
  contacts: NormalizedContact[];
  primaryContact: NormalizedContact | null;
  backupContact: NormalizedContact | null;
  nobodyRespondsFallback: {
    option: NobodyRespondsFallback | null;
    customRule: string | null;
  };
  retryRule: {
    option: RetryRule | null;
    customRule: string | null;
  };
  capacity: {
    mode: CapacityMode | null;
    reservedCapacityText: string | null;
    overrideConditions: string | null;
    /** Stable contact id — never a copied name/phone string. */
    approverContactId: string | null;
  };
};

function normalizeEmergencyClassifications(
  data: Section3Data,
): NormalizedEmergencyClassification[] {
  const out: NormalizedEmergencyClassification[] = [];
  for (const scenario of EMERGENCY_SCENARIOS) {
    const classification = data.emergencyClassifications[scenario.id];
    if (!classification) continue;
    out.push({ id: scenario.id, name: scenario.label, classification });
  }
  return out;
}

function normalizeDispatchApproval(data: Section3Data): NormalizedDispatchApproval {
  const none = data.dispatchApproval.includes("none");
  const other = !none && data.dispatchApproval.includes("other");
  const scenarioIds = none
    ? []
    : data.dispatchApproval.filter((v) => v !== "none" && v !== "other");
  return {
    scenarioIds,
    other,
    otherDetail: other ? data.dispatchApprovalOtherDetail.trim() : null,
    none,
  };
}

function hasEscalationMetadata(contact: Contact): boolean {
  return (
    contact.callCategories.length > 0 ||
    Object.values(contact.availability).some((day) => !day.closed)
  );
}

/**
 * Returns null for empty placeholder shells so they never enter
 * Company Truth. Escalation metadata is included only when present.
 */
export function normalizeContact(contact: Contact): NormalizedContact | null {
  if (!contactHasIdentity(contact)) return null;
  const escalation = hasEscalationMetadata(contact);
  return {
    id: contact.id,
    nameOrRole: contact.nameOrRole.trim(),
    phone: contact.phone,
    availability: escalation ? contact.availability : null,
    callCategories: contact.callCategories,
    otherCategory: contact.callCategories.includes("other")
      ? contact.otherCategory.trim()
      : null,
  };
}

function findContact(contacts: Contact[], id: string): Contact | null {
  return contacts.find((c) => c.id === id) ?? null;
}

/**
 * Section 3 ("Emergencies") normalization boundary — the Company
 * Truth downstream Alexander configuration should consume. Excludes
 * every inapplicable/hidden raw-draft value (stale Q37 text after
 * switching Q35 away from "emergency override," a backup contact
 * while Q32 = No, an inactive "Other" detail, empty contact
 * placeholders, etc.) even though the raw draft may still retain
 * that data for UX convenience.
 */
export function normalizeSection3(data: Section3Data, contacts: Contact[]): NormalizedSection3 {
  const meaningful = contacts
    .map(normalizeContact)
    .filter((c): c is NormalizedContact => c !== null);

  const primaryRaw = findContact(contacts, data.primaryContactId);
  const backupActive = data.hasBackupContact === "yes";
  const backupRaw = backupActive ? findContact(contacts, data.backupContactId) : null;

  const isCustomFallback = data.nobodyRespondsFallback === "custom";
  const isCustomRetry = data.retryRule === "custom";

  const approverRaw =
    data.capacityMode === "authorized_approval"
      ? findContact(contacts, data.approverContactId)
      : null;
  // Approver ID only survives when it points at a meaningful contact.
  const approverContactId =
    approverRaw && contactHasIdentity(approverRaw) ? approverRaw.id : null;

  return {
    emergencyClassifications: normalizeEmergencyClassifications(data),
    dispatchApproval: normalizeDispatchApproval(data),
    afterHoursDisposition: {
      emergency: data.afterHoursDisposition.emergency || null,
      urgent_contained: data.afterHoursDisposition.urgent_contained || null,
      routine: data.afterHoursDisposition.routine || null,
    },
    emergencyService: {
      mode: data.emergencyServiceMode || null,
      schedule: data.emergencyServiceMode === "certain_hours" ? data.emergencyServiceSchedule : null,
    },
    contacts: meaningful,
    primaryContact: primaryRaw ? normalizeContact(primaryRaw) : null,
    backupContact: backupRaw ? normalizeContact(backupRaw) : null,
    nobodyRespondsFallback: {
      option: data.nobodyRespondsFallback || null,
      customRule: isCustomFallback ? data.nobodyRespondsCustomRule.trim() : null,
    },
    retryRule: {
      option: data.retryRule || null,
      customRule: isCustomRetry ? data.retryCustomRule.trim() : null,
    },
    capacity: {
      mode: data.capacityMode || null,
      reservedCapacityText:
        data.capacityMode === "reserved_capacity" ? data.reservedCapacityText.trim() : null,
      overrideConditions:
        data.capacityMode === "emergency_override" ? data.overrideConditionsText.trim() : null,
      approverContactId,
    },
  };
}
