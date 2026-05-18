import { createFileRoute } from "@tanstack/react-router"
import MoneyOverview from "@/components/pages/money/MoneyOverview"

export const Route = createFileRoute("/dashboard/money/")({
  component: MoneyOverview,
})
