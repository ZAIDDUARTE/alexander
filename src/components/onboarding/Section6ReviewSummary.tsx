"use client";

import {
  labelForAdditionalServicePolicy,
  labelForCustomerHistoryPolicy,
  labelForEscalationTrigger,
  labelForForbiddenPromise,
  labelForNonServiceCallType,
  labelForNonServiceDisposition,
  labelForPreviousWorkAction,
  labelForRepeatCallbackAction,
  labelForRestrictedInformation,
  NON_SERVICE_CALL_TYPE_ROWS,
} from "@/lib/onboarding/section6Catalog";
import type { OnboardingDraft } from "@/lib/onboarding/types";
import { contactHasIdentity } from "@/lib/onboarding/types";

import type { ReactNode } from "react";

function ReviewBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--color-alexander-border)] bg-white p-4">
      <h3 className="text-sm font-semibold text-[var(--color-alexander-navy)]">{title}</h3>
      <div className="mt-2 text-sm text-[var(--color-alexander-muted)]">{children}</div>
    </div>
  );
}

export function Section6ReviewSummary({ draft }: { draft: OnboardingDraft }) {
  const s6 = draft.section6;

  return (
    <div className="mb-8 grid gap-4 md:grid-cols-2">
      <ReviewBlock title="Previous-work handling">
        {s6.previousWorkInitialAction
          ? labelForPreviousWorkAction(s6.previousWorkInitialAction)
          : "—"}
        {(s6.previousWorkInitialAction === "schedule_return_visit" ||
          s6.repeatCallbackAction === "schedule_another_return") &&
          s6.returnVisitEligibilityRule.trim() && (
            <p className="mt-2">
              <span className="font-medium text-[var(--color-alexander-navy)]">
                Return visit allowed:{" "}
              </span>
              {s6.returnVisitEligibilityRule}
            </p>
          )}
        {s6.previousWorkInitialAction === "custom" && s6.previousWorkCustomRule.trim() && (
          <p className="mt-2">{s6.previousWorkCustomRule}</p>
        )}
      </ReviewBlock>

      <ReviewBlock title="Repeat callback">
        {s6.repeatCallbackAction
          ? labelForRepeatCallbackAction(s6.repeatCallbackAction)
          : "—"}
      </ReviewBlock>

      <ReviewBlock title="Escalation triggers">
        <ul className="list-disc space-y-1 pl-5">
          {s6.escalationTriggers.map((id) => (
            <li key={id}>
              {id === "other" && s6.escalationTriggerOther.trim()
                ? s6.escalationTriggerOther
                : labelForEscalationTrigger(id)}
            </li>
          ))}
        </ul>
      </ReviewBlock>

      <ReviewBlock title="Prohibited promises">
        <ul className="list-disc space-y-1 pl-5">
          {s6.forbiddenUnhappyPromises.map((id) => (
            <li key={id}>
              {id === "other" && s6.forbiddenUnhappyPromiseOther.trim()
                ? s6.forbiddenUnhappyPromiseOther
                : labelForForbiddenPromise(id)}
            </li>
          ))}
        </ul>
      </ReviewBlock>

      <ReviewBlock title="Non-service call routing">
        <ul className="space-y-3">
          {NON_SERVICE_CALL_TYPE_ROWS.map((row) => {
            const policy = s6.nonServiceCallPolicies[row.id];
            const disposition = policy?.disposition ?? "";
            const contact =
              disposition === "send_specific" && policy?.contactId
                ? draft.contacts.find((c) => c.id === policy.contactId)
                : null;
            return (
              <li key={row.id}>
                <span className="font-medium text-[var(--color-alexander-navy)]">
                  {labelForNonServiceCallType(row.id)}:{" "}
                </span>
                {disposition ? labelForNonServiceDisposition(disposition) : "—"}
                {contact && contactHasIdentity(contact) && (
                  <span className="block text-xs">
                    Recipient: {contact.nameOrRole}
                    {contact.phone.trim() ? ` — ${contact.phone}` : ""}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </ReviewBlock>

      <ReviewBlock title="Customer history">
        {s6.customerHistoryPolicy
          ? labelForCustomerHistoryPolicy(s6.customerHistoryPolicy)
          : "—"}
        {s6.customerHistoryPolicy === "custom" && s6.customerHistoryCustomRule.trim() && (
          <p className="mt-2">{s6.customerHistoryCustomRule}</p>
        )}
      </ReviewBlock>

      <ReviewBlock title="Privacy restrictions">
        <ul className="list-disc space-y-1 pl-5">
          {s6.restrictedInformation.map((id) => (
            <li key={id}>
              {id === "other" && s6.restrictedInformationOther.trim()
                ? s6.restrictedInformationOther
                : labelForRestrictedInformation(id)}
            </li>
          ))}
        </ul>
      </ReviewBlock>

      <ReviewBlock title="Additional service recommendations">
        {s6.additionalServicePolicy
          ? labelForAdditionalServicePolicy(s6.additionalServicePolicy)
          : "—"}
        {s6.additionalServicePolicy === "custom" && s6.additionalServiceCustomRule.trim() && (
          <p className="mt-2">{s6.additionalServiceCustomRule}</p>
        )}
      </ReviewBlock>

      {s6.unusualCallNotes.trim() && (
        <ReviewBlock title="Unusual calls">
          <p className="whitespace-pre-wrap">{s6.unusualCallNotes}</p>
        </ReviewBlock>
      )}
    </div>
  );
}
