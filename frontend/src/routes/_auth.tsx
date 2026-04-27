import { createFileRoute, Outlet } from "@tanstack/react-router"
import Navbar from "@/components/Navbar"

export const Route = createFileRoute("/_auth")({
  component: () => (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  ),
})
