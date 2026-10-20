/** Section 6 — Customer Care (Q83–Q91). Source: Final MD §6. */

export const PREVIOUS_WORK_INITIAL_ACTION_OPTIONS = [
  {
    id: "schedule_return_visit" as const,
    label: "Collect the details and schedule a return visit when allowed",
  },
  {
    id: "submit_team_review" as const,
    label: "Collect the details and submit the request for team review",
  },
  {
    id: "connect_team" as const,
    label: "Try to connect the customer with someone on our team",
  },
  { id: "arrange_callback" as const, label: "Arrange a callback" },
  { id: "custom" as const, label: "Follow another rule" },
];

export const REPEAT_CALLBACK_ACTION_OPTIONS = [
  {
    id: "schedule_another_return" as const,
    label: "Schedule another return visit when allowed",
  },
  {
    id: "human_review_after_first" as const,
    label: "Human review required after the first callback",
  },
  {
    id: "connect_manager" as const,
    label: "Try to connect the customer with a manager",
  },
];

export const ESCALATION_TRIGGER_OPTIONS = [
  {
    id: "asks_manager" as const,
    label: "Customer explicitly asks for a manager or person",
  },
  {
    id: "repair_not_solved" as const,
    label: "Customer says the previous repair didn’t solve the problem",
  },
  { id: "disputes_charge" as const, label: "Customer disputes a charge" },
  {
    id: "refund_credit_request" as const,
    label: "Customer requests a refund or credit",
  },
  {
    id: "property_damage" as const,
    label: "Customer says your company caused property damage",
  },
  { id: "legal_threat" as const, label: "Customer threatens legal action" },
  { id: "chargeback_threat" as const, label: "Customer threatens a chargeback" },
  {
    id: "repeated_dissatisfaction" as const,
    label: "Customer is repeatedly dissatisfied after attempts to resolve the issue",
  },
  { id: "other" as const, label: "Other" },
];

/** MD: preselect the first eight escalation triggers. */
export const DEFAULT_ESCALATION_TRIGGER_IDS = ESCALATION_TRIGGER_OPTIONS.slice(0, 8).map(
  (o) => o.id,
);

export const FORBIDDEN_UNHAPPY_PROMISE_OPTIONS = [
  {
    id: "no_admit_fault" as const,
    label: "Never admit company fault or liability",
  },
  {
    id: "no_refund_unauthorized" as const,
    label: "Never promise a refund unless authorized",
  },
  {
    id: "no_free_work_unauthorized" as const,
    label: "Never promise free work unless authorized",
  },
  {
    id: "no_compensation_unauthorized" as const,
    label: "Never promise compensation unless authorized",
  },
  {
    id: "no_specific_outcome" as const,
    label: "Never promise a specific outcome from management",
  },
  { id: "other" as const, label: "Other" },
];

/** MD: preselect the first five forbidden promises (warranty option removed). */
export const DEFAULT_FORBIDDEN_UNHAPPY_PROMISE_IDS = FORBIDDEN_UNHAPPY_PROMISE_OPTIONS.slice(
  0,
  5,
).map((o) => o.id);

/**
 * Stored id `send_specific` is the current “Transfer the call” action.
 * It is not renamed: existing drafts already use this id for a named recipient.
 */
export const NON_SERVICE_DISPOSITION_OPTIONS = [
  { id: "send_specific" as const, label: "Transfer the call" },
  { id: "take_message" as const, label: "Take a message" },
  { id: "politely_decline" as const, label: "Politely decline" },
  { id: "human_review" as const, label: "Human review" },
];

export const NON_SERVICE_CALL_TYPE_ROWS = [
  { id: "vendor_supplier", label: "Vendor or supplier" },
  { id: "sales_solicitation", label: "Sales solicitation" },
  { id: "job_applicant", label: "Job applicant" },
  { id: "current_employee", label: "Current employee" },
  { id: "media_inquiry", label: "Media inquiry" },
  { id: "attorney_legal", label: "Attorney / legal inquiry" },
  { id: "government_regulator", label: "Government / regulator" },
  { id: "wrong_number_spam", label: "Wrong number / spam" },
] as const;

export const DEFAULT_NON_SERVICE_DISPOSITIONS = {
  vendor_supplier: "take_message",
  sales_solicitation: "politely_decline",
  job_applicant: "take_message",
  current_employee: "send_specific",
  media_inquiry: "human_review",
  attorney_legal: "human_review",
  government_regulator: "human_review",
  wrong_number_spam: "politely_decline",
} as const;

export const NON_SERVICE_CALL_HELP =
  "We've preselected the recommended handling for common non-service calls. Review the choices below and change anything that doesn't match how your business operates.";

export type NonServiceCallTypeId = (typeof NON_SERVICE_CALL_TYPE_ROWS)[number]["id"];

export const CUSTOMER_HISTORY_POLICY_OPTIONS = [
  {
    id: "use_available_history" as const,
    label: "Use available customer information and service history when it helps resolve the call",
  },
  {
    id: "human_review_before_details" as const,
    label: "Human review required before discussing previous service details",
  },
  { id: "custom" as const, label: "Follow another rule" },
];

export const CUSTOMER_HISTORY_HELP =
  "This applies only when Alexander has access to the information through connected software and the caller is authorized to receive it.";

export const RESTRICTED_INFORMATION_OPTIONS = [
  { id: "payment_information" as const, label: "Payment information" },
  { id: "internal_company_notes" as const, label: "Internal company notes" },
  { id: "technician_notes" as const, label: "Technician-only notes" },
  {
    id: "another_customer" as const,
    label: "Information about another customer",
  },
  { id: "sensitive_account" as const, label: "Sensitive account information" },
  { id: "other" as const, label: "Other" },
];

/** MD defaults: payment, another customer, sensitive account — on. */
export const DEFAULT_RESTRICTED_INFORMATION_IDS = [
  "payment_information",
  "another_customer",
  "sensitive_account",
] as const;

export const ADDITIONAL_SERVICE_POLICY_OPTIONS = [
  {
    id: "mention_relevant" as const,
    label: "Mention relevant services when they clearly relate to what the customer needs",
  },
  {
    id: "mention_approved_only" as const,
    label: "Mention only approved offers, memberships, or services",
  },
  {
    id: "only_when_asked" as const,
    label: "Only discuss additional services when the customer asks",
  },
  {
    id: "do_not_proactive" as const,
    label: "Don’t proactively recommend additional services",
  },
  { id: "custom" as const, label: "Follow another rule" },
];

export const ADDITIONAL_SERVICE_HELP =
  "This does not authorize invented problems, unsupported diagnoses, or pressure-based upselling.";

export function labelForPreviousWorkAction(id: string): string {
  return PREVIOUS_WORK_INITIAL_ACTION_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

export function labelForRepeatCallbackAction(id: string): string {
  return REPEAT_CALLBACK_ACTION_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

export function labelForEscalationTrigger(id: string): string {
  return ESCALATION_TRIGGER_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

export function labelForForbiddenPromise(id: string): string {
  return FORBIDDEN_UNHAPPY_PROMISE_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

export function labelForNonServiceDisposition(id: string): string {
  return NON_SERVICE_DISPOSITION_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

export function labelForNonServiceCallType(id: string): string {
  return NON_SERVICE_CALL_TYPE_ROWS.find((r) => r.id === id)?.label ?? id;
}

export function formatNonServiceRoutingSummary(
  callTypeLabel: string,
  dispositionLabel: string,
  recipientName?: string,
): string {
  if (recipientName?.trim()) {
    return `${callTypeLabel}\n${dispositionLabel} — ${recipientName.trim()}`;
  }
  return `${callTypeLabel}\n${dispositionLabel}`;
}

export function labelForCustomerHistoryPolicy(id: string): string {
  return CUSTOMER_HISTORY_POLICY_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

export function labelForRestrictedInformation(id: string): string {
  return RESTRICTED_INFORMATION_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

export function labelForAdditionalServicePolicy(id: string): string {
  return ADDITIONAL_SERVICE_POLICY_OPTIONS.find((o) => o.id === id)?.label ?? id;
}
