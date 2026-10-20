import type { ServiceCatalogItem } from "./section2Catalog";
import { JOB_SERVICES } from "./section2Catalog";

export type CatalogItem = { id: string; label: string };

/** Q65 — pricing model multi-select. */
export const PRICING_MODEL_OPTIONS: readonly CatalogItem[] = [
  { id: "flat_rate", label: "Flat-rate / upfront pricing" },
  { id: "hourly_labor_materials", label: "Hourly labor + materials" },
  { id: "fixed_prices_certain_services", label: "Fixed prices for certain services" },
  { id: "after_diagnosis", label: "Price determined after the technician evaluates the job" },
  { id: "estimate_required", label: "Estimate or quote required for larger work" },
  { id: "other", label: "Other" },
] as const;

/** Current unknown-price behavior. Legacy ids are migration inputs only. */
export const UNKNOWN_PRICE_OPTIONS: readonly CatalogItem[] = [
  {
    id: "technician_after_evaluation",
    label: "Explain that pricing will be provided after the job is evaluated",
  },
  { id: "team_provides_pricing", label: "Have our team provide the price" },
] as const;

export const QUOTE_PERMISSION_OPTIONS: readonly CatalogItem[] = [
  { id: "allowed", label: "Yes - Alexander may quote the prices we provide below" },
  { id: "not_allowed", label: "No - Alexander should not quote service prices" },
] as const;

export const SERVICE_PRICE_MODE_OPTIONS: readonly CatalogItem[] = [
  { id: "exact", label: "Exact price" },
  { id: "starting_at", label: "Starting at" },
  { id: "range", label: "Price range" },
  { id: "hourly", label: "Hourly" },
  { id: "estimate", label: "Requires an estimate / diagnosis" },
] as const;

export const ADDITIONAL_FEE_OPTIONS: readonly CatalogItem[] = [
  { id: "service_diagnostic", label: "Service / diagnostic fee" },
  { id: "after_hours", label: "After-hours / emergency fee" },
  { id: "travel", label: "Travel fee" },
  { id: "cancellation", label: "Cancellation fee" },
  { id: "no_show", label: "No-show fee" },
  { id: "minimum_service", label: "Minimum service charge" },
  { id: "estimate_consultation", label: "Estimate / consultation fee" },
  { id: "other", label: "Other" },
  { id: "none", label: "We don’t charge additional fees" },
] as const;

export const ADDITIONAL_FEE_CREDIT_OPTIONS: readonly CatalogItem[] = [
  { id: "always", label: "Always" },
  { id: "sometimes", label: "Sometimes" },
  { id: "never", label: "Never" },
] as const;

export const SERVICE_PRICE_CONDITIONS_PLACEHOLDER =
  "Example: $149 for a standard residential drain clearing during normal business hours. Main sewer lines are priced separately.";

export const FEE_APPLICABILITY_PLACEHOLDERS: Partial<Record<string, string>> = {
  service_diagnostic: "Example: Standard residential service calls.",
  after_hours: "Example: Service performed outside normal business hours, including nights and weekends.",
  cancellation: "Example: Cancellations less than 2 hours before the appointment.",
  no_show:
    "Example: The technician arrives for a confirmed appointment but can't access the property or reach the customer.",
};

export const FEE_CREDIT_WHEN_PLACEHOLDER =
  "Example: Credited when the customer approves the recommended repair during the visit.";

export const AREA_FEE_OR_MINIMUM_PLACEHOLDER =
  "$100 travel fee and $250 minimum service charge";

/** Old fee-card category ids that map directly onto the current checklist. */
export const LEGACY_FEE_CATEGORY_MAP: Record<string, string> = {
  diagnostic_service_call: "service_diagnostic",
  emergency_after_hours: "after_hours",
  travel: "travel",
  minimum_service_charge: "minimum_service",
  other: "other",
};

/** Q68 optional category templates (category label only). */
export const FEE_CATEGORY_TEMPLATES: readonly CatalogItem[] = [
  { id: "diagnostic_service_call", label: "Diagnostic/service-call fee" },
  { id: "emergency_after_hours", label: "Emergency or after-hours fee" },
  { id: "travel", label: "Travel fee" },
  { id: "cancellation_no_show", label: "Cancellation/no-show fee" },
  { id: "minimum_service_charge", label: "Minimum service charge" },
  { id: "permit_inspection", label: "Permit or inspection fee" },
  { id: "other", label: "Other fee" },
] as const;

export const FEE_AMOUNT_KIND_OPTIONS: readonly CatalogItem[] = [
  { id: "fixed", label: "Fixed amount" },
  { id: "range", label: "Range" },
  { id: "percentage", label: "Percentage" },
  { id: "varies", label: "Varies — team must confirm" },
] as const;

export const FEE_QUOTE_AUTHORITY_OPTIONS: readonly CatalogItem[] = [
  { id: "yes", label: "Yes, Alexander may quote it" },
  { id: "no", label: "No, Alexander should not quote it" },
  { id: "after_confirmation", label: "Only after team confirmation" },
] as const;

export const FEE_CREDIT_OPTIONS: readonly CatalogItem[] = [
  { id: "yes", label: "Yes" },
  { id: "no", label: "No" },
  { id: "sometimes", label: "Sometimes" },
] as const;

export const FEE_WAIVER_OPTIONS: readonly CatalogItem[] = [
  { id: "yes", label: "Yes" },
  { id: "no", label: "No" },
  { id: "sometimes", label: "Sometimes" },
] as const;

/** Q70 visit-type matrix columns. */
export const VISIT_TYPE_OPTIONS: readonly CatalogItem[] = [
  { id: "free_estimate", label: "Free estimate" },
  { id: "paid_diagnostic", label: "Paid diagnostic visit" },
  { id: "inspection", label: "Inspection visit" },
  { id: "normal_service", label: "Normal service appointment" },
  { id: "ask_team", label: "Ask our team first" },
  { id: "not_offered", label: "We don’t offer this" },
] as const;

/** Q72 general pricing authority. */
export const GENERAL_PRICING_AUTHORITY_OPTIONS: readonly CatalogItem[] = [
  { id: "approved_price_list", label: "Give exact prices only from our approved price list" },
  { id: "fees_not_repair", label: "Explain fees, but do not quote repair prices" },
  { id: "after_evaluation", label: "Tell the customer pricing is determined after evaluation" },
  { id: "ask_team", label: "Ask our team whenever a customer requests a price" },
] as const;

/** Q73 per-service pricing instruction. */
export const SERVICE_PRICING_INSTRUCTION_OPTIONS: readonly CatalogItem[] = [
  { id: "quote_approved", label: "Alexander may quote an approved price or range" },
  {
    id: "explain_fee_only",
    label: "Alexander may explain the applicable fee, but not the repair price",
  },
  { id: "ask_team", label: "Alexander should ask our team about pricing" },
  { id: "do_not_discuss", label: "Alexander should not discuss pricing" },
  { id: "no_approved_pricing", label: "No approved pricing yet" },
] as const;

/** Q74 forbidden pricing statements (first five are MD defaults). */
export const FORBIDDEN_PRICING_STATEMENT_OPTIONS: readonly CatalogItem[] = [
  {
    id: "no_guarantee_before_diagnosis",
    label:
      "Never guarantee a final repair price before diagnosis unless it’s an approved fixed price",
  },
  { id: "never_invent_price", label: "Never invent a price" },
  { id: "no_promise_no_additional", label: "Never promise that there won’t be additional charges" },
  { id: "no_disclose_markup", label: "Never disclose internal material markup" },
  { id: "no_unauthorized_discount", label: "Never promise a discount that hasn’t been authorized" },
  { id: "other", label: "Other" },
] as const;

export const DEFAULT_FORBIDDEN_STATEMENT_IDS = FORBIDDEN_PRICING_STATEMENT_OPTIONS.slice(0, 5).map(
  (o) => o.id,
);

/** Q76 promotion stacking. */
export const PROMOTION_STACKING_OPTIONS: readonly CatalogItem[] = [
  { id: "yes", label: "Yes" },
  { id: "no", label: "No" },
  { id: "conditional", label: "Only under certain conditions" },
  { id: "human_approval", label: "Human approval required" },
] as const;

/** Q77 promotion modification (fee waiver authority remains in Q68). */
export const PROMOTION_MODIFICATION_OPTIONS: readonly CatalogItem[] = [
  { id: "within_rules", label: "Yes, within rules we provide" },
  { id: "human_approval", label: "Human approval required" },
  { id: "no", label: "No" },
] as const;

/** Q78 payment methods. */
export const PAYMENT_METHOD_OPTIONS: readonly CatalogItem[] = [
  { id: "credit_card", label: "Credit card" },
  { id: "debit_card", label: "Debit card" },
  { id: "cash", label: "Cash" },
  { id: "check", label: "Check" },
  { id: "ach", label: "ACH or bank transfer" },
  { id: "financing", label: "Financing" },
  { id: "invoice", label: "Invoice or account billing" },
  { id: "other", label: "Other" },
] as const;

/** Q79 payment due. */
export const PAYMENT_DUE_OPTIONS: readonly CatalogItem[] = [
  { id: "at_time_of_service", label: "At time of service" },
  { id: "when_work_completed", label: "When work is completed" },
  { id: "deposit_required", label: "Deposit required before certain work" },
  { id: "progress_payments", label: "Progress payments for larger projects" },
  { id: "invoice_after_service", label: "Invoice after service for approved customers" },
  { id: "other", label: "Other" },
] as const;

/** Q80 financing permissions. */
export const FINANCING_PERMISSION_OPTIONS: readonly CatalogItem[] = [
  { id: "explain_options", label: "Explain availability / options" },
  { id: "send_application_link", label: "Send application link" },
  { id: "help_begin_application", label: "Help begin application" },
  { id: "transfer_to_team", label: "Transfer to team" },
  { id: "other", label: "Other" },
] as const;

/** Q81 financial remedy rows. */
export const FINANCIAL_REMEDY_ROWS: readonly CatalogItem[] = [
  { id: "refund", label: "Refund" },
  { id: "account_credit", label: "Account credit" },
  { id: "fee_waiver", label: "Fee waiver" },
  { id: "discount_goodwill", label: "Discount / goodwill adjustment" },
  { id: "return_visit", label: "Free or reduced-price return visit" },
] as const;

export const FINANCIAL_REMEDY_OPTIONS: readonly CatalogItem[] = [
  ...FINANCIAL_REMEDY_ROWS,
  { id: "none", label: "None - human approval is required" },
] as const;

export const PAYMENT_ASSISTANCE_OPTIONS: readonly CatalogItem[] = [
  { id: "secure_link", label: "Yes - Alexander may send customers a secure payment link" },
  {
    id: "secure_link_and_authorized_method",
    label:
      "Yes - Alexander may send a secure payment link and use an approved payment method already on file when authorized",
  },
  { id: "send_to_team", label: "No - Alexander should send payment requests to our team" },
] as const;

export const PAYMENT_COLLECTION_OPTIONS: readonly CatalogItem[] = [
  { id: "booking_or_service_fees", label: "Booking or service fees" },
  { id: "deposits", label: "Deposits" },
  { id: "completed_invoices", label: "Completed service invoices" },
  { id: "outstanding_balances", label: "Outstanding balances" },
  { id: "progress_payments", label: "Progress payments" },
  { id: "other", label: "Other" },
] as const;

export const DEFAULT_PAYMENT_COLLECTION_SCOPE = [
  "booking_or_service_fees",
  "deposits",
  "completed_invoices",
  "outstanding_balances",
] as const;

export const REMEDY_RULE_PLACEHOLDERS: Record<string, string> = {
  refund:
    "Example: Alexander may approve refunds up to $50 for duplicate charges. Anything else requires human approval.",
  account_credit:
    "Example: Alexander may issue an account credit up to $50 for approved service-recovery situations.",
  fee_waiver:
    "Example: Alexander may waive the service fee up to $89 when we missed the confirmed appointment window.",
  discount_goodwill:
    "Example: Alexander may offer up to $25 as a goodwill adjustment for an approved customer-service issue.",
  return_visit:
    "Example: Alexander may offer a free return visit when the customer reports the same problem within 7 days of our original service.",
};

export const REMEDY_RULE_LABELS: Record<string, string> = {
  refund: "Refund — rules or limits",
  account_credit: "Account credit — rules or limits",
  fee_waiver: "Fee waiver — rules or limits",
  discount_goodwill: "Discount / goodwill adjustment — rules or limits",
  return_visit: "Free or reduced-price return visit — rules or limits",
};

export const REMEDY_AUTHORITY_OPTIONS: readonly CatalogItem[] = [
  { id: "within_rules", label: "Alexander may approve within our rules" },
  { id: "human_approval", label: "Human approval required" },
  { id: "never", label: "Never offered" },
] as const;

/** All job services for Q70 rows (includes not-offered Section 2 states). */
export function getVisitTypeMatrixServices(): readonly ServiceCatalogItem[] {
  return JOB_SERVICES;
}
