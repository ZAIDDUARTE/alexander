/**
 * Section 4 catalogs — stable IDs for exception rows, caller types,
 * appointment windows, confirmation fields, and no-availability
 * fallback options. Never use array indexes as persistent identity.
 */

export type CatalogItem = { id: string; label: string };

/** Q41 exception-authority matrix rows. */
export const EXCEPTION_TYPES: readonly CatalogItem[] = [
  { id: "scheduling", label: "Scheduling exception" },
  { id: "service_area", label: "Service-area exception" },
  { id: "fee_or_price", label: "Fee or price exception" },
  { id: "discount_or_promotion", label: "Discount or promotion exception" },
  { id: "refund_credit_goodwill", label: "Refund, credit, or goodwill exception" },
  { id: "callback_previous_work", label: "Callback / previous-work exception" },
  { id: "other", label: "Other exception" },
] as const;

/** Q43 caller-authorization matrix rows (Homeowner added during review). */
export const CALLER_TYPES: readonly CatalogItem[] = [
  { id: "homeowner", label: "Homeowner" },
  { id: "tenant", label: "Tenant" },
  { id: "landlord_property_manager", label: "Landlord / property manager" },
  { id: "spouse_family", label: "Spouse / family member" },
  { id: "remote_family", label: "Remote family member" },
  { id: "realtor_buyer_seller", label: "Realtor / buyer / seller" },
  { id: "other_third_party", label: "Other third party" },
] as const;

/** Q48 predefined appointment-window shells (labels only — no invented clock times). */
export const APPOINTMENT_WINDOW_TEMPLATES: readonly CatalogItem[] = [
  { id: "morning", label: "Morning" },
  { id: "late_morning", label: "Late morning" },
  { id: "early_afternoon", label: "Early afternoon" },
  { id: "afternoon", label: "Afternoon" },
  { id: "late_afternoon", label: "Late afternoon" },
] as const;

/** Q49 confirmation-information options (all six preselected by MD default). */
export const CONFIRMATION_INFO_OPTIONS: readonly CatalogItem[] = [
  { id: "appointment_date", label: "Appointment date" },
  { id: "appointment_time_or_window", label: "Appointment time or arrival window" },
  { id: "requested_service", label: "Requested service" },
  { id: "customer_name_and_address", label: "Customer name and service address" },
  { id: "callback_phone", label: "Callback phone number" },
  { id: "email_address", label: "Email address provided" },
] as const;

/** Q57 no-availability fallback options (display order is NOT an approved default priority). */
export const NO_AVAILABILITY_FALLBACK_OPTIONS: readonly CatalogItem[] = [
  { id: "offer_next_available", label: "Offer the next available appointment" },
  { id: "look_for_approved_window", label: "Look for another approved appointment window" },
  { id: "add_to_callback_waitlist", label: "Add the customer to a callback / waitlist" },
  { id: "ask_team_for_help", label: "Ask the team for help" },
] as const;

/** Q51 same-day / holiday rows. */
export const CAPACITY_POLICY_ROWS: readonly CatalogItem[] = [
  { id: "same_day", label: "Same-day service" },
  { id: "holiday", label: "Holiday service" },
] as const;
