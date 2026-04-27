import { createFileRoute } from "@tanstack/react-router"
import DashboardLayout from "@/components/pages/DashboardLayout"

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
})
