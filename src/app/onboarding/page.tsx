"use client";

import { useRouter } from "next/navigation";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { AlexanderLogo } from "@/components/onboarding/AlexanderLogo";
import { ContentCard } from "@/components/onboarding/ui/Card";
import { PrimaryButton } from "@/components/onboarding/ui/Buttons";
import { useOnboarding } from "@/lib/onboarding/OnboardingContext";
import { TOTAL_SECTIONS } from "@/lib/onboarding/sections";
import { getSection1Progress } from "@/lib/onboarding/progress/section1";

export default function WelcomePage() {
  const router = useRouter();
  const { draft, saveStatus, lastSavedAt, setNavigation } = useOnboarding();
  const sectionProgress = getSection1Progress(draft.section1);

  const begin = () => {
    setNavigation({ stage: "section-intro", sectionId: 1 });
    router.push("/onboarding/sections/1/intro");
  };

  return (
    <OnboardingShell
      completedSections={draft.navigation.completedSections}
      activeSectionId={1}
      currentSectionProgress={sectionProgress}
      saveStatus={saveStatus}
      lastSavedAt={lastSavedAt}
    >
      <ContentCard className="text-center">
        <div className="mb-6 flex justify-center">
          <AlexanderLogo className="text-3xl sm:text-4xl" />
        </div>
        <h1 className="font-serif text-3xl font-semibold text-[var(--color-alexander-navy)] sm:text-4xl">
          Welcome to Alexander
        </h1>
        <div className="mx-auto mt-6 max-w-xl space-y-4 text-left text-base leading-relaxed text-[var(--color-alexander-muted)] sm:text-center">
          <p>
            We&apos;re excited to begin building your company&apos;s AI receptionist.
          </p>
          <p>
            This questionnaire gives us the information we need to configure Alexander around the
            way your business actually operates - including your services, service area, scheduling
            rules, emergency procedures, pricing policies, customer-care standards, voice, and team
            handoffs.
          </p>
          <p>
            Some questions are required. Others are optional or appear only when they apply to your
            business. Smaller companies may finish quickly, while larger or more complex
            organizations may choose to provide more detail.
          </p>
          <p>
            You do not need to complete everything in one sitting. Save your progress at any time
            and return when convenient.
          </p>
          <p>
            This is the most important part of your setup. Once it is complete, our team will use
            your answers to configure, test, and review Alexander before he represents your
            company.
          </p>
          <p>
            The more relevant detail you provide, the more accurately Alexander can serve your
            customers.
          </p>
        </div>
        <p className="mt-8 text-sm text-[var(--color-alexander-muted)]">
          Progress: {draft.navigation.completedSections.length} of {TOTAL_SECTIONS} sections
          complete
        </p>
        <div className="mx-auto mt-8 max-w-md">
          <PrimaryButton onClick={begin}>Begin Section 1 →</PrimaryButton>
        </div>
      </ContentCard>
    </OnboardingShell>
  );
}
