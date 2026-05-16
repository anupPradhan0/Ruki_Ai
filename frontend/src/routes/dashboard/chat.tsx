import { createFileRoute, Outlet } from "@tanstack/react-router"

// Layout for /dashboard/chat — actual page lives in chat.index.tsx (no
// conversation) or chat.$conversationId.tsx (existing conversation). Without
// the <Outlet /> here, those child routes never render.
export const Route = createFileRoute("/dashboard/chat")({
  component: () => <Outlet />,
})
