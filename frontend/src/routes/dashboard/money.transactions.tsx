import { createFileRoute } from "@tanstack/react-router"
import TransactionsPage from "@/components/pages/money/TransactionsPage"

export const Route = createFileRoute("/dashboard/money/transactions")({
  component: TransactionsPage,
})
