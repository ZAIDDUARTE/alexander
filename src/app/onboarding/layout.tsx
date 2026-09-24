import { OnboardingProvider } from "@/lib/onboarding/OnboardingContext";
import { OnboardingRouteSync } from "@/components/onboarding/OnboardingRouteSync";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OnboardingProvider>
      <OnboardingRouteSync />
      {children}
    </OnboardingProvider>
  );
}
