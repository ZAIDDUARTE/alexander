import { cookies } from "next/headers";

export const ONBOARDING_ACCESS_COOKIE = "alexander_onboarding_access";

const ACCESS_MAX_AGE = 60 * 60 * 24 * 30;

export async function getOnboardingAccessToken(): Promise<string | null> {
  const jar = await cookies();
  const value = jar.get(ONBOARDING_ACCESS_COOKIE)?.value;
  if (!value || value.length < 32) return null;
  return value;
}

export async function setOnboardingAccessCookie(token: string, maxAge = ACCESS_MAX_AGE): Promise<void> {
  const jar = await cookies();
  jar.set(ONBOARDING_ACCESS_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
}
