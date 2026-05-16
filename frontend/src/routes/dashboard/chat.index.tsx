import { createFileRoute } from "@tanstack/react-router"
import ChatPage from "@/components/pages/ChatPage"

export const Route = createFileRoute("/dashboard/chat/")({
  component: () => <ChatPage />,
})
