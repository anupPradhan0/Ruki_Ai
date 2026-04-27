import { createFileRoute } from "@tanstack/react-router"
import FeaturesPage from "@/components/pages/FeaturesPage"

export const Route = createFileRoute("/_layout/features")({
  component: FeaturesPage,
})
