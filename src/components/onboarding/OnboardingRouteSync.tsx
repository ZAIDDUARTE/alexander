"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useOnboarding } from "@/lib/onboarding/OnboardingContext";

export function OnboardingRouteSync() {
  const pathname = usePathname();
  const { setCurrentRoute, isDraftHydrated, flushSave } = useOnboarding();

  useEffect(() => {
    if (!isDraftHydrated || !pathname.startsWith("/onboarding")) return;
    setCurrentRoute(pathname);
  }, [pathname, setCurrentRoute, isDraftHydrated]);

  useEffect(() => {
    if (!isDraftHydrated) return;
    return () => {
      void flushSave();
    };
  }, [pathname, isDraftHydrated, flushSave]);

  return null;
}
