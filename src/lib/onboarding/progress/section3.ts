import { EMERGENCY_SCENARIOS } from "../section3Catalog";
import { hasAnyOpenOfficeDay, isOfficeScheduleValid } from "../schedule";
import { isValidE164 } from "../phone";
import type { AfterHoursCallClass, Contact, Section3Data } from "../types";
import { contactHasIdentity } from "../types";
import { approverContactIsValid } from "../validation/section3";

type ProgressUnit = {
  applicable: boolean;
  complete: boolean;
};

function contactComplete(contact: Contact | undefined): boolean {
  if (!contact) return false;
  if (!contact.nameOrRole.trim()) return false;
  if (!isValidE164(contact.phone.trim())) return false;
  if (!isOfficeScheduleValid(contact.availability)) return false;
  if (!hasAnyOpenOfficeDay(contact.availability)) return false;
  if (contact.callCategories.length === 0) return false;
  if (contact.callCategories.includes("other") && !contact.otherCategory.trim()) return false;
  return true;
}

/**
 * Deterministic Section 3 completion units — one per top-level MD
 * question (Q26–Q38), matching the Section 1/2 progress-unit
 * convention. Contact sub-fields (name, phone, schedule, categories)
 * form ONE composite unit per contact rather than inflating the
 * denominator with every individual field. Conditional units
 * (Q30/Q32-backup-card/Q36/Q37/Q38) only enter the denominator when
 * their parent condition is currently true.
 */
export function getSection3ProgressUnits(data: Section3Data, contacts: Contact[]): ProgressUnit[] {
  const showEmergencySchedule = data.emergencyServiceMode === "certain_hours";
  const showBackupContact = data.hasBackupContact === "yes";
  const showReservedCapacity = data.capacityMode === "reserved_capacity";
  const showOverrideConditions = data.capacityMode === "emergency_override";
  const showApprover = data.capacityMode === "authorized_approval";

  const primaryContact = contacts.find((c) => c.id === data.primaryContactId);
  const backupContact = contacts.find((c) => c.id === data.backupContactId);

  const dispositionRows: AfterHoursCallClass[] = ["emergency", "urgent_contained", "routine"];

  const hasNone = data.dispatchApproval.includes("none");
  const hasOther = data.dispatchApproval.includes("other");
  const dispatchApprovalComplete =
    data.dispatchApproval.length > 0 &&
    !(hasNone && (hasOther || data.dispatchApproval.some((v) => v !== "none" && v !== "other"))) &&
    (!hasOther || Boolean(data.dispatchApprovalOtherDetail.trim()));

  return [
    // Q26 — emergency classification matrix (required)
    {
      applicable: true,
      complete: EMERGENCY_SCENARIOS.every(
        (s) => (data.emergencyClassifications[s.id] ?? "") !== "",
      ),
    },
    // Q27 — dispatch approval multi-select (required)
    { applicable: true, complete: dispatchApprovalComplete },
    // Q28 — after-hours disposition matrix (required)
    {
      applicable: true,
      complete: dispositionRows.every((row) => data.afterHoursDisposition[row] !== ""),
    },
    // Q29 — after-hours emergency service mode (required)
    { applicable: true, complete: data.emergencyServiceMode !== "" },
    // Q30 — emergency service schedule (conditional on Q29 = certain_hours)
    {
      applicable: showEmergencySchedule,
      complete:
        showEmergencySchedule &&
        isOfficeScheduleValid(data.emergencyServiceSchedule) &&
        hasAnyOpenOfficeDay(data.emergencyServiceSchedule),
    },
    // Q31 — primary escalation contact (required composite unit)
    { applicable: true, complete: contactComplete(primaryContact) },
    // Q32 — has backup contact? (required)
    { applicable: true, complete: data.hasBackupContact !== "" },
    // Q32 backup contact card (conditional on Q32 = yes)
    { applicable: showBackupContact, complete: showBackupContact && contactComplete(backupContact) },
    // Q33 — nobody-responds fallback (required, custom text conditional)
    {
      applicable: true,
      complete:
        data.nobodyRespondsFallback !== "" &&
        (data.nobodyRespondsFallback !== "custom" || Boolean(data.nobodyRespondsCustomRule.trim())),
    },
    // Q34 — retry rule (required, custom text conditional)
    {
      applicable: true,
      complete:
        data.retryRule !== "" &&
        (data.retryRule !== "custom" || Boolean(data.retryCustomRule.trim())),
    },
    // Q35 — capacity/override mode (required)
    { applicable: true, complete: data.capacityMode !== "" },
    // Q36 — reserved capacity description (conditional on Q35 = reserved_capacity)
    {
      applicable: showReservedCapacity,
      complete: showReservedCapacity && Boolean(data.reservedCapacityText.trim()),
    },
    // Q37 — override conditions (conditional on Q35 = emergency_override)
    {
      applicable: showOverrideConditions,
      complete: showOverrideConditions && Boolean(data.overrideConditionsText.trim()),
    },
    // Q38 — approver contact (conditional on Q35 = authorized_approval).
    // Existing escalation contacts (primary / active backup) count once
    // selected by id. A newly-added Q38 approver only needs the core
    // identity fields (name/role + E.164) — not schedule/categories.
    {
      applicable: showApprover,
      complete:
        showApprover &&
        Boolean(data.approverContactId.trim()) &&
        (() => {
          const approver = contacts.find((c) => c.id === data.approverContactId);
          if (!approver || !contactHasIdentity(approver)) return false;
          if (approver.id === data.primaryContactId) return contactComplete(approver);
          if (data.hasBackupContact === "yes" && approver.id === data.backupContactId) {
            return contactComplete(approver);
          }
          return approverContactIsValid(approver);
        })(),
    },
  ];
}

/**
 * Fraction (0–1) of applicable Section 3 questions that are currently
 * complete. Derived purely from onboarding state, never from the DOM.
 */
export function getSection3Progress(data: Section3Data, contacts: Contact[]): number {
  const units = getSection3ProgressUnits(data, contacts).filter((u) => u.applicable);
  if (units.length === 0) return 0;
  const completed = units.filter((u) => u.complete).length;
  return completed / units.length;
}
