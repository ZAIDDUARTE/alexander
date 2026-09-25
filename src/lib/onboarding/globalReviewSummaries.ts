import type { OnboardingDraft } from "./types";
import { formatCrmSelection } from "./normalize/section8";

export type GlobalReviewCard = {
  sectionId: number;
  title: string;
  summary: string;
  editHref: string;
};

export function buildGlobalReviewCards(draft: OnboardingDraft): GlobalReviewCard[] {
  const s1 = draft.section1;
  const companyBits = [
    s1.customerFacingName.trim(),
    s1.mainPhone.trim(),
    s1.approvedClaims.length ? `${s1.approvedClaims.length} approved claims` : "",
  ].filter(Boolean);

  return [
    {
      sectionId: 1,
      title: "Your Company",
      summary: companyBits.length ? companyBits.join(" · ") : "Identity and hours not yet complete",
      editHref: "/onboarding/sections/1/form",
    },
    {
      sectionId: 2,
      title: "Your Services",
      summary: "Services, customers/properties, and service area policies",
      editHref: "/onboarding/sections/2/form",
    },
    {
      sectionId: 3,
      title: "Emergencies",
      summary: "Emergency rules, after-hours handling, and escalation",
      editHref: "/onboarding/sections/3/form",
    },
    {
      sectionId: 4,
      title: "Scheduling",
      summary: "Authorization, booking, cancellation, and technician rules",
      editHref: "/onboarding/sections/4/form",
    },
    {
      sectionId: 5,
      title: "Pricing and Payments",
      summary: "Pricing, fees, payments, promotions, and financial authority",
      editHref: "/onboarding/sections/5/form",
    },
    {
      sectionId: 6,
      title: "Customer Care",
      summary: "Callbacks, complaints, privacy, and unusual calls",
      editHref: "/onboarding/sections/6/form",
    },
    {
      sectionId: 7,
      title: "Voice and Conversation",
      summary: "Voice, identity, language, and pronunciation preferences",
      editHref: "/onboarding/sections/7/form",
    },
    {
      sectionId: 8,
      title: "Integration Systems and Final Setup",
      summary: `CRM: ${formatCrmSelection(draft.section8)}; integrations and permissions`,
      editHref: "/onboarding/sections/8/form",
    },
  ];
}
