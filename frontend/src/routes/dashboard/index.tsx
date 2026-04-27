import { createFileRoute } from "@tanstack/react-router"
import DashboardOverview from "@/components/pages/DashboardOverview"

export const Route = createFileRoute("/dashboard/")({
  component: DashboardOverview,
})
