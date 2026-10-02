import type { Metadata } from "next";
import { InvitationContinue } from "./invitation-continue";

export const metadata: Metadata = {
  title: "Continue onboarding",
  referrer: "no-referrer",
};

export default function InvitationPage() {
  return <InvitationContinue />;
}
