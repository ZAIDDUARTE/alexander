import { redirect } from "next/navigation";

/**
 * Fallback entry for hosts that are not ONBOARDING_HOST, including local
 * development, *.vercel.app, and preview deployments. The onboarding hostname
 * is redirected in middleware before this page runs.
 */
export default function Home() {
  redirect("/onboarding");
}
