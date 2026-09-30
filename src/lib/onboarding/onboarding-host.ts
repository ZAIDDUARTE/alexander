/**
 * Decide whether this request is the dedicated onboarding hostname.
 * The hostname comes from ONBOARDING_HOST. It is never hardcoded.
 */
export function requestHostMatchesOnboardingHost(
  requestHost: string | null | undefined,
  configuredHost: string | undefined,
): boolean {
  const expected = normalizeHost(configuredHost);
  const actual = normalizeHost(requestHost);
  if (!expected || !actual) return false;
  return actual === expected;
}

function normalizeHost(value: string | null | undefined): string {
  if (!value) return "";
  const first = value.split(",")[0]?.trim().toLowerCase() ?? "";
  if (!first) return "";
  const withoutProtocol = first.replace(/^[a-z]+:\/\//, "");
  const hostPort = withoutProtocol.split("/")[0] ?? "";
  return hostPort.replace(/:\d+$/, "").replace(/\.$/, "");
}
