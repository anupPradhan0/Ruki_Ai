import { createFileRoute } from "@tanstack/react-router"
import HowItWorksPage from "@/components/pages/HowItWorksPage"

export const Route = createFileRoute("/_layout/how-it-works")({
  component: HowItWorksPage,
})
