export type GlobalReviewCard = {
  sectionId: number;
  title: string;
  summary: string;
  editHref: string;
};

export function buildGlobalReviewCards(): GlobalReviewCard[] {
  return [
    {
      sectionId: 1,
      title: "Your Company",
      summary: "Company information, hours and availability",
      editHref: "/onboarding/sections/1/form",
    },
    {
      sectionId: 2,
      title: "Your Services",
      summary: "Services, customers and service area",
      editHref: "/onboarding/sections/2/form",
    },
    {
      sectionId: 3,
      title: "Emergencies",
      summary: "Emergency rules and escalation",
      editHref: "/onboarding/sections/3/form",
    },
    {
      sectionId: 4,
      title: "Scheduling",
      summary: "Booking, authorization and technician rules",
      editHref: "/onboarding/sections/4/form",
    },
    {
      sectionId: 5,
      title: "Pricing and Payments",
      summary: "Pricing, fees, payments and financial authority",
      editHref: "/onboarding/sections/5/form",
    },
    {
      sectionId: 6,
      title: "Customer Care",
      summary: "Existing customers, complaints, privacy and unusual calls",
      editHref: "/onboarding/sections/6/form",
    },
    {
      sectionId: 7,
      title: "Voice and Conversation",
      summary: "Voice, identity, language and pronunciation",
      editHref: "/onboarding/sections/7/form",
    },
    {
      sectionId: 8,
      title: "Integration Systems and Final Setup",
      summary: "CRM, scheduling, dispatch, phone and integrations",
      editHref: "/onboarding/sections/8/form",
    },
  ];
}
