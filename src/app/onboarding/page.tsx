"use client";

import { useEffect, useState } from "react";
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
  const [accountGate, setAccountGate] = useState<"checking" | "ok" | "needed">("checking");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/onboarding/portal-admin", {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (cancelled) return;
        if (res.status === 401) {
          // Anonymous / non-invited local flows may not have portal-admin; allow continue.
          setAccountGate("ok");
          return;
        }
        if (!res.ok) {
          setAccountGate("ok");
          return;
        }
        const data = (await res.json()) as { ok?: boolean; view?: { confirmed?: boolean } };
        if (data.ok && data.view && !data.view.confirmed) {
          setAccountGate("needed");
          router.replace("/onboarding/account");
          return;
        }
        setAccountGate("ok");
      } catch {
        if (!cancelled) setAccountGate("ok");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const begin = () => {
    if (accountGate === "needed") {
      router.push("/onboarding/account");
      return;
    }
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
          <p>You&apos;re about to teach Alexander how your business works.</p>
          <p>
            Alexander isn&apos;t a simple bot built by pulling a few answers from your website.
            He&apos;s designed to understand the details of how your company actually
            operates—your services, customers, scheduling rules, emergencies, pricing, policies,
            exceptions, and the judgment your team uses every day.
          </p>
          <p>
            That level of understanding is what allows Alexander to become more than an answering
            service. The goal is to build an AI receptionist that can handle real customer
            conversations with the knowledge and judgment of a well-trained member of your team.
          </p>
          <p>That&apos;s why this questionnaire is thorough.</p>
          <p>
            Take your time and answer each question carefully. Some questions are required, while
            others appear only when relevant to your business. You can save your progress and
            return at any time.
          </p>
          <p>
            Once you&apos;re finished, our team will use your answers to build, test, and refine
            your Alexander before he begins representing your company.
          </p>
          <p>The better Alexander understands your business, the better he can represent it.</p>
          <p>Let&apos;s build your newest team member.</p>
        </div>
        <p className="mt-8 text-sm text-[var(--color-alexander-muted)]">
          Progress: {draft.navigation.completedSections.length} of {TOTAL_SECTIONS} sections
          complete
        </p>
        <div className="mx-auto mt-8 max-w-md">
          <PrimaryButton onClick={begin} disabled={accountGate === "checking"}>
            Begin Section 1 →
          </PrimaryButton>
        </div>
      </ContentCard>
    </OnboardingShell>
  );
}
