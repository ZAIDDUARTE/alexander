"use client";

import { ContentCard } from "./ui/Card";
import { PrimaryButton } from "./ui/Buttons";
import { useRouter } from "next/navigation";
import { TOTAL_SECTIONS } from "@/lib/onboarding/sections";

type Props = {
  sectionNumber: number;
  title: string;
  description: string;
  estimatedTime?: string;
  ctaHref: string;
  ctaLabel: string;
  onBegin?: () => void;
};

export function SectionIntro({
  sectionNumber,
  title,
  description,
  estimatedTime,
  ctaHref,
  ctaLabel,
  onBegin,
}: Props) {
  const router = useRouter();

  return (
    <ContentCard className="text-center">
      <p className="text-sm font-medium tracking-wide text-[var(--color-alexander-blue)] uppercase">
        Section {sectionNumber} of {TOTAL_SECTIONS}
      </p>
      <h1 className="mt-4 font-serif text-3xl font-semibold text-[var(--color-alexander-navy)] sm:text-4xl">
        {title}
      </h1>
      <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-[var(--color-alexander-muted)]">
        {description}
      </p>
      {estimatedTime && (
        <p className="mt-6 text-sm text-[var(--color-alexander-muted)]">
          Estimated time: {estimatedTime}
        </p>
      )}
      <div className="mx-auto mt-10 max-w-sm">
        <PrimaryButton
          onClick={() => {
            onBegin?.();
            router.push(ctaHref);
          }}
        >
          {ctaLabel}
        </PrimaryButton>
      </div>
    </ContentCard>
  );
}
