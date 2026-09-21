import { OnboardingForm } from "@/components/onboarding-form";

// Uses Clerk session + backend at render time — never prerender (Docker
// builds have no secrets, and prerendering would crash on missing provider).
export const dynamic = "force-dynamic";

export default function OnboardingPage() {
  return <OnboardingForm />;
}
