import type { OnboardingDraft } from "./types";
import { validateSection1, section1IsValid } from "./validation/section1";
import { validateSection2, section2IsValid } from "./validation/section2";
import { validateSection3, section3IsValid } from "./validation/section3";
import { validateSection4, section4IsValid } from "./validation/section4";
import { validateSection5, section5IsValid } from "./validation/section5";
import { validateSection6, section6IsValid } from "./validation/section6";
import { validateSection7, section7IsValid } from "./validation/section7";
import { validateSection8, section8IsValid } from "./validation/section8";

export type SectionValidationResult = {
  sectionId: number;
  valid: boolean;
  errors: Partial<Record<string, string>>;
};

export function validateAllSections(draft: OnboardingDraft): SectionValidationResult[] {
  return [
    { sectionId: 1, valid: section1IsValid(draft.section1), errors: validateSection1(draft.section1) },
    { sectionId: 2, valid: section2IsValid(draft.section2), errors: validateSection2(draft.section2) },
    {
      sectionId: 3,
      valid: section3IsValid(draft.section3, draft.contacts),
      errors: validateSection3(draft.section3, draft.contacts),
    },
    {
      sectionId: 4,
      valid: section4IsValid(draft.section4, draft.contacts, draft.fees, draft.section2),
      errors: validateSection4(draft.section4, draft.contacts, draft.fees, draft.section2),
    },
    {
      sectionId: 5,
      valid: section5IsValid(draft.section5, draft.section2, draft.contacts, draft.fees, draft.section4),
      errors: validateSection5(
        draft.section5,
        draft.section2,
        draft.contacts,
        draft.fees,
        draft.section4,
      ),
    },
    {
      sectionId: 6,
      valid: section6IsValid(draft.section6, draft.contacts),
      errors: validateSection6(draft.section6, draft.contacts),
    },
    { sectionId: 7, valid: section7IsValid(draft.section7), errors: validateSection7(draft.section7) },
    {
      sectionId: 8,
      valid: section8IsValid(draft.section8, draft.systems),
      errors: validateSection8(draft.section8, draft.systems),
    },
  ];
}

export function onboardingSectionsAreValid(draft: OnboardingDraft): boolean {
  return validateAllSections(draft).every((r) => r.valid);
}

export function q114ConfirmationsComplete(draft: OnboardingDraft): boolean {
  const c = draft.submission.confirmations;
  return (
    c.answersAccurate &&
    c.capabilitiesDependOnIntegrations &&
    c.actionsRequireSupportAuthorizationConfirmation
  );
}

export function canSubmitQuestionnaire(draft: OnboardingDraft): boolean {
  return onboardingSectionsAreValid(draft) && q114ConfirmationsComplete(draft);
}
