import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requestHostMatchesOnboardingHost } from "@/lib/onboarding/onboarding-host";

/**
 * On the dedicated onboarding host, `/` enters the existing questionnaire.
 * Other hosts, including *.vercel.app and preview deployments, are unchanged
 * and still use the root page redirect.
 */
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname !== "/") return NextResponse.next();
  if (!requestHostMatchesOnboardingHost(request.nextUrl.hostname, process.env.ONBOARDING_HOST)) {
    return NextResponse.next();
  }
  const url = request.nextUrl.clone();
  url.pathname = "/onboarding";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: "/",
};
