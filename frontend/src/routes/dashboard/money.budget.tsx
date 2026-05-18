import { createFileRoute } from "@tanstack/react-router"
import BudgetPage from "@/components/pages/money/BudgetPage"

export const Route = createFileRoute("/dashboard/money/budget")({
  component: BudgetPage,
})
