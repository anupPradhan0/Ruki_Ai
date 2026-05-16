import { createFileRoute } from "@tanstack/react-router"
import ChatPage from "@/components/pages/ChatPage"

export const Route = createFileRoute("/dashboard/chat/$conversationId")({
  component: ChatRoute,
})

function ChatRoute() {
  const { conversationId } = Route.useParams()
  return <ChatPage conversationId={conversationId} />
}
