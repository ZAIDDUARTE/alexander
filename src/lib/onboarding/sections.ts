export const ONBOARDING_SECTIONS = [
  { id: 1, slug: "company", title: "Your Company", shortTitle: "Company" },
  { id: 2, slug: "services", title: "Your Services", shortTitle: "Services" },
  { id: 3, slug: "emergencies", title: "Emergencies", shortTitle: "Emergencies" },
  { id: 4, slug: "scheduling", title: "Scheduling", shortTitle: "Scheduling" },
  {
    id: 5,
    slug: "pricing",
    title: "Pricing and Payments",
    shortTitle: "Pricing",
  },
  { id: 6, slug: "customer-care", title: "Customer Care", shortTitle: "Care" },
  {
    id: 7,
    slug: "voice",
    title: "Voice and Conversation",
    shortTitle: "Voice",
  },
  {
    id: 8,
    slug: "integration",
    title: "Integration Systems and Final Setup",
    shortTitle: "Setup",
  },
] as const;

export const TOTAL_SECTIONS = ONBOARDING_SECTIONS.length;

export function getSection(id: number) {
  return ONBOARDING_SECTIONS.find((s) => s.id === id);
}
