import { createFileRoute } from "@tanstack/react-router"
import DashboardPage from "@/components/pages/DashboardPage"

export const Route = createFileRoute("/_auth/dashboard")({
  component: DashboardPage,
})
