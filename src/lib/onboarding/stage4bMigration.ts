import { FINANCIAL_REMEDY_ROWS } from "./section5Catalog";
import type { Stage2MigrationNote } from "./stage2Migration";
import {
  createDefaultRemedyRules,
  type FinancialRemedySelection,
  type OnboardingDraft,
  type PaymentCollectionScopeId,
  type RemedyId,
  type Section5Data,
} from "./types";

/**
 * Stage 4B payment and remedy migration.
 *
 * Current answers are kept. Old financing detail, payment-due explanations,
 * and the pricing approver are not turned into new permissions.
 */

const ASSISTANCE = new Set<string>([
  "secure_link",
  "secure_link_and_authorized_method",
  "send_to_team",
]);

const COLLECTION = new Set<string>([
  "booking_or_service_fees",
  "deposits",
  "completed_invoices",
  "outstanding_balances",
  "progress_payments",
  "other",
]);

const DEFAULT_COLLECTION: PaymentCollectionScopeId[] = [
  "booking_or_service_fees",
  "deposits",
  "completed_invoices",
  "outstanding_balances",
];

const DETAIL_FIELDS = [
  "depositWorkDetail",
  "depositRule",
  "progressPaymentProjectsDetail",
  "progressPaymentRule",
  "invoiceCustomersDetail",
  "invoiceTerms",
  "paymentDueOtherRule",
] as const;

function append(notes: Stage2MigrationNote[], note: Stage2MigrationNote) {
  notes.push(note);
}

export function migrateStage4bPayments(
  draft: OnboardingDraft,
  rawSection5?: Partial<Section5Data> | null,
): { draft: OnboardingDraft } {
  const notes: Stage2MigrationNote[] = [];
  const section5: Section5Data = {
    ...draft.section5,
    remedyRules: { ...createDefaultRemedyRules(), ...draft.section5.remedyRules },
    financialRemedies: Array.isArray(draft.section5.financialRemedies)
      ? [...draft.section5.financialRemedies]
      : ["none"],
    paymentCollectionScope: Array.isArray(draft.section5.paymentCollectionScope)
      ? [...draft.section5.paymentCollectionScope]
      : [...DEFAULT_COLLECTION],
  };

  if (rawSection5 && !("paymentAssistance" in rawSection5)) {
    section5.paymentAssistance = "secure_link";
    append(notes, {
      path: "section5.paymentAssistance",
      from: "",
      to: "secure_link",
      status: "DEFAULTED_NEW_FIELD",
    });
  } else if (
    rawSection5 &&
    "paymentAssistance" in rawSection5 &&
    !ASSISTANCE.has(String(rawSection5.paymentAssistance ?? ""))
  ) {
    section5.paymentAssistance = "secure_link";
    append(notes, {
      path: "section5.paymentAssistance",
      from: String(rawSection5.paymentAssistance ?? ""),
      to: "secure_link",
      status: "DEFAULTED_FROM_UNKNOWN",
    });
  }

  if (rawSection5 && !("paymentCollectionScope" in rawSection5)) {
    section5.paymentCollectionScope = [...DEFAULT_COLLECTION];
    section5.paymentCollectionOther = "";
    append(notes, {
      path: "section5.paymentCollectionScope",
      from: "",
      to: DEFAULT_COLLECTION.join(","),
      status: "DEFAULTED_NEW_FIELD",
    });
  } else if (rawSection5 && "paymentCollectionScope" in rawSection5) {
    const rawScope = rawSection5.paymentCollectionScope;
    if (!Array.isArray(rawScope) || rawScope.some((id) => !COLLECTION.has(String(id)))) {
      section5.paymentCollectionScope = [...DEFAULT_COLLECTION];
      append(notes, {
        path: "section5.paymentCollectionScope",
        from: Array.isArray(rawScope) ? rawScope.join(",") : String(rawScope ?? ""),
        to: DEFAULT_COLLECTION.join(","),
        status: "DEFAULTED_FROM_UNKNOWN",
      });
    }
  }

  if (rawSection5 && !("financialRemedies" in rawSection5)) {
    const selected: FinancialRemedySelection[] = [];
    let sawAuthority = false;
    for (const row of FINANCIAL_REMEDY_ROWS) {
      const id = row.id as RemedyId;
      const authority = section5.remedyAuthority[id] ?? "";
      if (authority) sawAuthority = true;
      if (authority === "within_rules") {
        selected.push(id);
        append(notes, {
          path: `section5.financialRemedies.${id}`,
          from: "within_rules",
          to: id,
          status: "MAPPED_FROM_LEGACY",
        });
      } else if (section5.remedyRules[id].trim()) {
        append(notes, {
          path: `section5.remedyRules.${id}`,
          from: authority,
          to: "",
          status: "NEEDS_QA",
        });
      }
    }
    if (selected.length === 0) {
      section5.financialRemedies = ["none"];
      append(notes, {
        path: "section5.financialRemedies",
        from: sawAuthority ? "no_independent_approval" : "",
        to: "none",
        status: sawAuthority ? "MAPPED_FROM_LEGACY" : "DEFAULTED_NEW_FIELD",
      });
    } else {
      section5.financialRemedies = selected;
    }
  }

  for (const field of DETAIL_FIELDS) {
    const value = String(section5[field] ?? "").trim();
    if (!value) continue;
    append(notes, {
      path: `section5.${field}`,
      from: value,
      to: "",
      status: "DROPPED_OBSOLETE",
    });
    section5[field] = "";
  }

  const financingPresent =
    Boolean(section5.offersFinancing) ||
    Boolean(section5.financingProviderTerms.trim()) ||
    section5.financingPermissions.length > 0 ||
    Boolean(section5.financingPermissionOtherDetail.trim()) ||
    Boolean(section5.financingEligibilityStatement.trim());
  if (financingPresent) {
    append(notes, {
      path: "section5.financingDetail",
      from: section5.offersFinancing || "detail",
      to: "",
      status: "DROPPED_OBSOLETE",
    });
  }
  section5.offersFinancing = "";
  section5.financingProviderTerms = "";
  section5.financingPermissions = [];
  section5.financingPermissionOtherDetail = "";
  section5.financingEligibilityStatement = "";

  if (section5.financialApproverContactId.trim()) {
    append(notes, {
      path: "section5.financialApproverContactId",
      from: section5.financialApproverContactId,
      to: "",
      status: "DROPPED_OBSOLETE",
    });
    section5.financialApproverContactId = "";
  }

  const previous = draft.stage2Migration ?? [];
  const newPaths = new Set(notes.map((note) => note.path));
  const mergedNotes =
    notes.length > 0
      ? [...previous.filter((note) => !newPaths.has(note.path)), ...notes]
      : draft.stage2Migration;

  const next: OnboardingDraft = { ...draft, section5 };
  if (mergedNotes && mergedNotes.length > 0) next.stage2Migration = mergedNotes;
  else delete next.stage2Migration;
  return { draft: next };
}
