import { randomUUID } from "crypto";
import { cookies } from "next/headers";

export const ONBOARDING_SESSION_COOKIE = "alexander_onboarding_session";

const SESSION_MAX_AGE = 60 * 60 * 24 * 365;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidSessionId(value: string): boolean {
  return UUID_REGEX.test(value);
}

export async function getOrCreateOnboardingSessionId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(ONBOARDING_SESSION_COOKIE)?.value;
  if (existing && isValidSessionId(existing)) {
    return existing;
  }

  const id = randomUUID();
  jar.set(ONBOARDING_SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return id;
}

export async function getOnboardingSessionId(): Promise<string | null> {
  const jar = await cookies();
  const existing = jar.get(ONBOARDING_SESSION_COOKIE)?.value;
  if (existing && isValidSessionId(existing)) {
    return existing;
  }
  return null;
}
