import { createFileRoute } from "@tanstack/react-router"
import ForgotPasswordPage from "@/components/pages/ForgotPasswordPage"

export const Route = createFileRoute("/_auth/forgot-password")({
  component: ForgotPasswordPage,
})
