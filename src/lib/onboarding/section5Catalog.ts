import type { ServiceCatalogItem } from "./section2Catalog";
import { JOB_SERVICES } from "./section2Catalog";

export type CatalogItem = { id: string; label: string };

/** Q65 — pricing model multi-select. */
export const PRICING_MODEL_OPTIONS: readonly CatalogItem[] = [
  { id: "flat_rate", label: "Flat-rate / upfront pricing" },
  { id: "hourly_labor_materials", label: "Hourly labor + materials" },
  { id: "fixed_prices_certain_services", label: "Fixed prices for certain services" },
  { id: "after_diagnosis", label: "Price determined after technician diagnosis" },
  { id: "estimate_required", label: "Estimate or quote required for larger work" },
  { id: "other", label: "Other" },
] as const;

/** Q67 — unknown exact price behavior. */
export const UNKNOWN_PRICE_OPTIONS: readonly CatalogItem[] = [
  {
    id: "technician_after_evaluation",
    label: "Explain that the technician will provide pricing after evaluating the job",
  },
  {
    id: "approved_price_or_range",
    label: "Give an approved price or range when one is available",
  },
  {
    id: "fee_plus_separate_quote",
    label:
      "Explain the applicable service / diagnostic fee and that additional work is quoted separately",
  },
  { id: "team_provides_pricing", label: "Arrange for our team to provide pricing" },
  { id: "custom", label: "Follow another rule" },
] as const;

/** Q68 optional category templates (category label only). */
export const FEE_CATEGORY_TEMPLATES: readonly CatalogItem[] = [
  { id: "diagnostic_service_call", label: "Diagnostic / service-call" },
  { id: "emergency_after_hours", label: "Emergency / after-hours" },
  { id: "travel", label: "Travel" },
  { id: "cancellation_no_show", label: "Cancellation / no-show" },
  { id: "minimum_service_charge", label: "Minimum service charge" },
  { id: "permit_inspection", label: "Permit / inspection" },
  { id: "other", label: "Other" },
] as const;

export const FEE_AMOUNT_KIND_OPTIONS: readonly CatalogItem[] = [
  { id: "fixed", label: "Fixed amount" },
  { id: "range", label: "Range" },
  { id: "percentage", label: "Percentage" },
  { id: "varies", label: "Varies — team must confirm" },
] as const;

export const FEE_QUOTE_AUTHORITY_OPTIONS: readonly CatalogItem[] = [
  { id: "yes", label: "Yes, Alexander may quote it" },
  { id: "no", label: "No" },
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
  { id: "paid_diagnostic", label: "Paid diagnostic / service visit" },
  { id: "inspection", label: "Inspection visit" },
  { id: "normal_service", label: "Normal service appointment" },
  { id: "ask_team", label: "Ask our team first" },
  { id: "not_offered", label: "We do not offer this" },
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
      "Never guarantee a final repair price before diagnosis unless it is an approved fixed price",
  },
  { id: "never_invent_price", label: "Never invent a price" },
  { id: "no_promise_no_additional", label: "Never promise there will not be additional charges" },
  { id: "no_disclose_markup", label: "Never disclose internal material markup" },
  { id: "no_unauthorized_discount", label: "Never promise a discount that has not been authorized" },
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
  { id: "ach", label: "ACH / bank transfer" },
  { id: "financing", label: "Financing" },
  { id: "invoice", label: "Invoice / account billing" },
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

export const REMEDY_AUTHORITY_OPTIONS: readonly CatalogItem[] = [
  { id: "within_rules", label: "Alexander may approve within our rules" },
  { id: "human_approval", label: "Human approval required" },
  { id: "never", label: "Never offered" },
] as const;

/** All job services for Q70 rows (includes not-offered Section 2 states). */
export function getVisitTypeMatrixServices(): readonly ServiceCatalogItem[] {
  return JOB_SERVICES;
}
