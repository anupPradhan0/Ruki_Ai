import { createFileRoute } from "@tanstack/react-router"
import VerifyEmailPage from "@/components/pages/VerifyEmailPage"

type VerifySearch = { token?: string }

export const Route = createFileRoute("/_auth/verify-email")({
  validateSearch: (search: Record<string, unknown>): VerifySearch => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  component: VerifyEmailPage,
})
