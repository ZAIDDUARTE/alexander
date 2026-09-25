/** Section 8 (Q104–Q113) — source-faithful option catalogs. */

export const CRM_FSM_OPTIONS = [
  { id: "servicetitan", label: "ServiceTitan" },
  { id: "housecall_pro", label: "Housecall Pro" },
  { id: "jobber", label: "Jobber" },
  { id: "gohighlevel", label: "GoHighLevel" },
  { id: "hubspot", label: "HubSpot" },
  { id: "salesforce", label: "Salesforce" },
  { id: "custom", label: "Another system" },
  { id: "none", label: "We do not use one" },
] as const;

export type CrmFsmProvider = (typeof CRM_FSM_OPTIONS)[number]["id"] | "";

export const SCHEDULING_OPTIONS = [
  { id: "same_as_crm", label: "Same system selected above" },
  { id: "google_calendar", label: "Google Calendar" },
  { id: "microsoft_outlook", label: "Microsoft Outlook / Microsoft 365" },
  { id: "cal_com", label: "Cal.com" },
  { id: "custom", label: "Another scheduling system" },
  { id: "none", label: "We do not use scheduling software" },
] as const;

export type SchedulingProvider = (typeof SCHEDULING_OPTIONS)[number]["id"] | "";

export const DISPATCH_OPTIONS = [
  { id: "same_as_scheduling", label: "Same system selected above" },
  { id: "custom", label: "We use another system" },
  { id: "none", label: "We do not use dispatch software" },
] as const;

export type DispatchProvider = (typeof DISPATCH_OPTIONS)[number]["id"] | "";

export const PHONE_OPTIONS = [
  { id: "ringcentral", label: "RingCentral" },
  { id: "dialpad", label: "Dialpad" },
  { id: "zoom_phone", label: "Zoom Phone" },
  { id: "gohighlevel", label: "GoHighLevel" },
  { id: "traditional_landline", label: "Traditional landline / carrier" },
  { id: "mobile_phones", label: "Mobile phones" },
  { id: "custom", label: "Another phone system" },
  { id: "not_sure", label: "Not sure" },
] as const;

export type PhoneProvider = (typeof PHONE_OPTIONS)[number]["id"] | "";

export const ADDITIONAL_SOFTWARE_CATEGORIES = [
  { id: "separate_customer_database", label: "Separate customer database" },
  { id: "price_book_estimating", label: "Separate price book / estimating software" },
  { id: "financing", label: "Financing system" },
  { id: "payment", label: "Payment system" },
  { id: "sms_texting", label: "SMS / texting platform" },
  { id: "email_inbox", label: "Email / shared inbox" },
  { id: "other", label: "Other" },
  { id: "none", label: "None" },
] as const;

export type AdditionalSoftwareCategoryId = (typeof ADDITIONAL_SOFTWARE_CATEGORIES)[number]["id"];

export const INTEGRATION_CAPABILITY_OPTIONS = [
  { id: "find_customer", label: "Find an existing customer" },
  { id: "view_customer_contact", label: "View customer contact information" },
  { id: "view_upcoming_appointments", label: "View upcoming appointments" },
  { id: "view_job_history", label: "View previous jobs / service history" },
  { id: "view_previous_technician", label: "View the technician who previously serviced a customer" },
  { id: "view_membership_status", label: "View membership/service-plan status" },
  { id: "view_warranty_info", label: "View relevant warranty information" },
  { id: "check_realtime_availability", label: "Check real-time appointment availability" },
  { id: "create_appointments", label: "Create appointments" },
  { id: "reschedule_appointments", label: "Reschedule appointments" },
  { id: "cancel_appointments", label: "Cancel appointments" },
  { id: "view_technician_availability", label: "View technician availability" },
  { id: "view_technician_skills", label: "View technician skills or assignment information" },
  { id: "add_notes", label: "Add notes or call information to customer/job records" },
  { id: "send_approved_communications", label: "Send approved customer communications" },
  { id: "other", label: "Other" },
] as const;

export type IntegrationCapabilityId = (typeof INTEGRATION_CAPABILITY_OPTIONS)[number]["id"];

export const ALL_INTEGRATION_CAPABILITY_IDS: IntegrationCapabilityId[] =
  INTEGRATION_CAPABILITY_OPTIONS.map((o) => o.id);

export const CONNECTION_OWNER_OPTIONS = [
  { id: "self_authorized", label: "Yes" },
  { id: "not_authorized", label: "No" },
  { id: "someone_else", label: "Someone else on our team handles this" },
] as const;

export type ConnectionOwnerMode = (typeof CONNECTION_OWNER_OPTIONS)[number]["id"] | "";

export const FAILURE_FALLBACK_OPTIONS = [
  {
    id: "collect_and_send",
    label: "Collect the customer’s information and send the request to our team",
  },
  { id: "callback", label: "Arrange a callback" },
  { id: "connect_team", label: "Try to connect the customer with someone on our team" },
  { id: "custom", label: "Follow another rule" },
] as const;

export type FailureFallbackMode = (typeof FAILURE_FALLBACK_OPTIONS)[number]["id"] | "";

export const Q109_HELP =
  "Selecting a capability authorizes configuration when technically supported; it does not guarantee the integration can provide it.";

export const Q111_NOTICE =
  "You will connect supported software securely after submitting this questionnaire. Do not enter passwords or private API credentials here. Our team will handle configuration and testing.";

export const Q112_HELP =
  "Alexander will never claim an appointment, change, cancellation, dispatch, or other action succeeded unless it was actually confirmed.";

export const Q114_CONFIRMATIONS = [
  {
    key: "answersAccurate" as const,
    label:
      "I confirm that these answers accurately describe how I want Alexander to represent and operate for my company.",
  },
  {
    key: "capabilitiesDependOnIntegrations" as const,
    label:
      "I understand that some capabilities depend on the software and integrations my company uses.",
  },
  {
    key: "actionsRequireSupportAuthorizationConfirmation" as const,
    label:
      "I understand that Alexander will only perform actions that are supported, authorized, and successfully confirmed.",
  },
];

export function providerLabel(providerKey: string, customName?: string): string {
  const maps = [
    ...CRM_FSM_OPTIONS,
    ...SCHEDULING_OPTIONS.filter((o) => o.id !== "same_as_crm"),
    ...DISPATCH_OPTIONS.filter((o) => o.id !== "same_as_scheduling"),
    ...PHONE_OPTIONS,
  ];
  const hit = maps.find((m) => m.id === providerKey);
  if (providerKey === "custom" && customName?.trim()) return customName.trim();
  return hit?.label ?? providerKey;
}
