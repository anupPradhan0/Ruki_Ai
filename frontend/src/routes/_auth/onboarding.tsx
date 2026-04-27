import { createFileRoute } from "@tanstack/react-router"
import OnboardingPage from "@/components/pages/OnboardingPage"

export const Route = createFileRoute("/_auth/onboarding")({
  component: OnboardingPage,
})
