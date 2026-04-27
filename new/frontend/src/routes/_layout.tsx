import { createFileRoute, Outlet } from "@tanstack/react-router"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"

export const Route = createFileRoute("/_layout")({
  component: () => (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  ),
})
