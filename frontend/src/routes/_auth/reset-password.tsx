import { createFileRoute } from "@tanstack/react-router"
import ResetPasswordPage from "@/components/pages/ResetPasswordPage"

type ResetSearch = { token?: string }

export const Route = createFileRoute("/_auth/reset-password")({
  validateSearch: (search: Record<string, unknown>): ResetSearch => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  component: ResetPasswordPage,
})
