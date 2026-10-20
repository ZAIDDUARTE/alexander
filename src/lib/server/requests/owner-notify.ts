/**
 * Staging owner notifications for service requests.
 * Intentionally does not send until explicitly enabled and allowlisted.
 * Never targets real customers / Phillip without separate approval.
 */

export type OwnerNotifyInput = {
  requestId: string;
  status: string;
  reason: string;
  callId: string;
};

export function ownerNotificationsConfigured(): boolean {
  return process.env.ALEXANDER_REQUEST_OWNER_NOTIFY_ENABLED === "true"
    && Boolean((process.env.ALLOWED_TEST_RECIPIENT || "").trim());
}

export async function enqueueOwnerRequestNotification(input: OwnerNotifyInput): Promise<
  { ok: true; queued: false; reason: string } | { ok: true; queued: true }
> {
  if (!ownerNotificationsConfigured()) {
    return { ok: true, queued: false, reason: "owner_notify_disabled" };
  }
  // Wire to email_outbox only after a dedicated template is approved for staging.
  void input;
  return { ok: true, queued: false, reason: "owner_notify_template_not_provisioned" };
}
