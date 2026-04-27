import { createFileRoute } from "@tanstack/react-router"
import SignupPage from "@/components/pages/SignupPage"

export const Route = createFileRoute("/_auth/signup")({
  component: SignupPage,
})
