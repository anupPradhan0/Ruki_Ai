import { createFileRoute } from "@tanstack/react-router"
import QuizPage from "@/components/pages/QuizPage"

export const Route = createFileRoute("/_auth/quiz")({
  component: QuizPage,
})
