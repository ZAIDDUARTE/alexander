"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboarding } from "@/lib/onboarding/OnboardingContext";
import { QuestionCard, ConditionalPanel } from "./ui/Card";
import { TextField, TextareaField } from "./ui/Fields";
import { PhoneField } from "./ui/PhoneField";
import { normalizeToE164 } from "@/lib/onboarding/phone";
import { CheckboxGroup } from "./ui/CheckboxGroup";
import { RadioGroup } from "./ui/RadioGroup";
import { OfficeWeeklySchedule, ServiceWeeklySchedule } from "./WeeklySchedule";
import { PrimaryButton, SecondaryButton } from "./ui/Buttons";
import {
  APPROVED_CLAIM_OPTIONS,
  ANSWERING_MODE_OPTIONS,
  validateSection1,
  type FieldErrors,
} from "@/lib/onboarding/validation/section1";
import type { DayKey } from "@/lib/onboarding/schedule";
import { DAYS } from "@/lib/onboarding/schedule";

function mapScheduleErrors(errors: FieldErrors, prefix: string): Partial<Record<DayKey, string>> {
  const out: Partial<Record<DayKey, string>> = {};
  for (const day of DAYS) {
    const key = `${prefix}.${day}`;
    if (errors[key]) out[day] = errors[key];
  }
  return out;
}

export function Section1Form({ mode = "form" }: { mode?: "form" | "review" }) {
  const { draft, updateSection1, saveDraftNow } = useOnboarding();
  const data = draft.section1;
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const officeDayErrors = useMemo(
    () => mapScheduleErrors(errors, "officeHours"),
    [errors],
  );
  const serviceDayErrors = useMemo(
    () => mapScheduleErrors(errors, "serviceHours"),
    [errors],
  );
  const answeringDayErrors = useMemo(
    () => mapScheduleErrors(errors, "answeringSchedule"),
    [errors],
  );

  const handleContinue = async () => {
    const sectionData = {
      ...data,
      mainPhone: data.mainPhone.trim() ? normalizeToE164(data.mainPhone) : "",
    };
    const nextErrors = validateSection1(sectionData);
    setErrors(nextErrors);
    setSubmitted(true);
    if (Object.keys(nextErrors).length > 0) {
      const first = document.querySelector("[role='alert']");
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const finalDraft = {
      ...draft,
      updatedAt: new Date().toISOString(),
      section1: { ...draft.section1, mainPhone: sectionData.mainPhone },
      navigation: {
        ...draft.navigation,
        stage: "section-complete" as const,
        sectionId: 1,
        completedSections: draft.navigation.completedSections.includes(1)
          ? draft.navigation.completedSections
          : [...draft.navigation.completedSections, 1].sort((a, b) => a - b),
      },
    };
    await saveDraftNow(finalDraft);
    router.push("/onboarding/sections/1/complete");
  };

  const showOtherClaim = data.approvedClaims.includes("other");
  const showAnsweringSchedule = data.answeringMode === "specific_hours";
  const readOnly = mode === "review";

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-[var(--color-alexander-blue)]">Section 1 of 8</p>
        <h1 className="mt-2 font-serif text-2xl font-semibold text-[var(--color-alexander-navy)] sm:text-3xl">
          Your Company
        </h1>
        <p className="mt-2 text-sm text-[var(--color-alexander-muted)]">
          Tell Alexander who your company is, when you are available, and what he is authorized to
          say about your business.
        </p>
      </header>

      <QuestionCard
        title="What name do your customers know your company by?"
        required
        error={submitted ? errors.customerFacingName : undefined}
      >
        <TextField
          id="customerFacingName"
          label=""
          value={data.customerFacingName}
          onChange={(v) => updateSection1({ customerFacingName: v })}
          error={submitted ? errors.customerFacingName : undefined}
        />
      </QuestionCard>

      <QuestionCard title="What is your legal business name?" optional>
        <TextField
          id="legalName"
          label=""
          value={data.legalName}
          onChange={(v) => updateSection1({ legalName: v })}
          helpText="Leave blank if it is the same as the name above."
        />
      </QuestionCard>

      <QuestionCard
        title="What is your main business phone number?"
        required
        error={submitted ? errors.mainPhone : undefined}
      >
        <PhoneField
          id="mainPhone"
          value={data.mainPhone}
          onChange={(v) => updateSection1({ mainPhone: v })}
          error={submitted ? errors.mainPhone : undefined}
        />
      </QuestionCard>

      <QuestionCard title="What is your website?" optional error={submitted ? errors.website : undefined}>
        <TextField
          id="website"
          label=""
          type="url"
          value={data.website}
          onChange={(v) => updateSection1({ website: v })}
          error={submitted ? errors.website : undefined}
        />
      </QuestionCard>

      <QuestionCard
        title="Which of these may Alexander tell customers about your company?"
        required
        error={submitted ? errors.approvedClaims : undefined}
      >
        <CheckboxGroup
          name="approvedClaims"
          options={APPROVED_CLAIM_OPTIONS}
          value={data.approvedClaims}
          onChange={(v) => updateSection1({ approvedClaims: v }, { immediate: true })}
          error={submitted ? errors.approvedClaims : undefined}
        />
        {showOtherClaim && (
          <ConditionalPanel>
            <TextField
              id="otherApprovedClaim"
              label="What else may Alexander tell customers about your company?"
              value={data.otherApprovedClaim}
              onChange={(v) => updateSection1({ otherApprovedClaim: v })}
              placeholder="Serving the Antelope Valley for more than 25 years."
              required
              error={submitted ? errors.otherApprovedClaim : undefined}
            />
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard
        title="Are there any license numbers or credential details Alexander may give customers?"
        optional
      >
        <TextField
          id="licensingDetails"
          label=""
          value={data.licensingDetails}
          onChange={(v) => updateSection1({ licensingDetails: v })}
          helpText="For example: California Contractor License #123456 - C-36 Plumbing."
        />
      </QuestionCard>

      <QuestionCard
        title="Is there anything Alexander should never claim about your company's credentials, awards, guarantees, experience, or affiliations?"
        optional
      >
        <TextareaField
          id="forbiddenClaims"
          label=""
          value={data.forbiddenClaims}
          onChange={(v) => updateSection1({ forbiddenClaims: v })}
          placeholder="Do not say we are BBB accredited. The owner has 25 years of experience, but the company was founded in 2018."
        />
      </QuestionCard>

      <QuestionCard
        title="What are your normal office hours?"
        required
        helpText="When can customers normally reach someone in your office?"
      >
        <OfficeWeeklySchedule
          schedule={data.officeHours}
          onChange={(s) => updateSection1({ officeHours: s }, { immediate: true })}
          dayError={submitted ? officeDayErrors : undefined}
        />
      </QuestionCard>

      <QuestionCard
        title="When are service appointments normally available?"
        required
        helpText="This may be different from your office hours."
      >
        <ServiceWeeklySchedule
          schedule={data.serviceHours}
          onChange={(s) => updateSection1({ serviceHours: s }, { immediate: true })}
          dayError={submitted ? serviceDayErrors : undefined}
        />
      </QuestionCard>

      <QuestionCard
        title="When should Alexander answer your calls?"
        required
        error={submitted ? errors.answeringMode : undefined}
      >
        <RadioGroup
          name="answeringMode"
          options={ANSWERING_MODE_OPTIONS}
          value={data.answeringMode}
          onChange={(v) => updateSection1({ answeringMode: v }, { immediate: true })}
          error={submitted ? errors.answeringMode : undefined}
        />
        {showAnsweringSchedule && (
          <ConditionalPanel>
            <p className="mb-4 text-sm font-medium text-[var(--color-alexander-navy)]">
              What hours should Alexander answer your calls?
              <span className="ml-1 text-[var(--color-alexander-required)]" aria-hidden>*</span>
            </p>
            <OfficeWeeklySchedule
              schedule={data.answeringSchedule}
              onChange={(s) => updateSection1({ answeringSchedule: s }, { immediate: true })}
              dayError={submitted ? answeringDayErrors : undefined}
            />
            {submitted && errors.answeringSchedule && (
              <p className="mt-3 text-sm text-[var(--color-alexander-required)]" role="alert">
                {errors.answeringSchedule}
              </p>
            )}
          </ConditionalPanel>
        )}
      </QuestionCard>

      <QuestionCard
        title="Is there anything else Alexander should know about your normal hours or availability?"
        optional
      >
        <TextareaField
          id="recurringAvailabilityNotes"
          label=""
          value={data.recurringAvailabilityNotes}
          onChange={(v) => updateSection1({ recurringAvailabilityNotes: v })}
          placeholder="On Fridays, routine appointments must begin by 3:00 PM."
        />
      </QuestionCard>

      {!readOnly && (
        <div className="flex flex-col gap-3 pt-4 sm:flex-row">
          <SecondaryButton
            className="sm:flex-1"
            onClick={() => router.push("/onboarding/sections/1/intro")}
          >
            Back
          </SecondaryButton>
          <PrimaryButton className="sm:flex-1" onClick={handleContinue}>
            Complete Section 1 →
          </PrimaryButton>
        </div>
      )}
    </div>
  );
}
