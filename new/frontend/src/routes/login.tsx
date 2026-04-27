import { createFileRoute } from "@tanstack/react-router"
import LoginPage from "@/components/pages/LoginPage"

export const Route = createFileRoute("/login")({
  component: LoginPage,
})
