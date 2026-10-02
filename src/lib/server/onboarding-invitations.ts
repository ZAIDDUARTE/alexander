/**
 * Invited onboarding access. Default off.
 * Unset, empty, and any value other than "true" keep today's anonymous cookie flow.
 */
export function invitationsEnabled(env?: { ONBOARDING_INVITATIONS_ENABLED?: string }): boolean {
  const source = env ?? (process.env as { ONBOARDING_INVITATIONS_ENABLED?: string });
  return source.ONBOARDING_INVITATIONS_ENABLED === "true";
}

/** Flag off always uses the legacy session cookie, even if an access cookie is present. */
export function draftRouteMode(
  enabled: boolean,
  accessCookie: string | null,
): "legacy" | "invited" {
  if (!enabled || !accessCookie) return "legacy";
  return "invited";
}
