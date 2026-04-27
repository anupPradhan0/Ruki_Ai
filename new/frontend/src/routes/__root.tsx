import { createRootRoute, Outlet } from "@tanstack/react-router"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"

export const Route = createRootRoute({
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
