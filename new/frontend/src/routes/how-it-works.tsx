import { createFileRoute } from "@tanstack/react-router"
import HowItWorksPage from "@/components/pages/HowItWorksPage"

export const Route = createFileRoute("/how-it-works")({
  component: HowItWorksPage,
})
