import { useEffect, useState } from "react"
import { Link, useRouterState } from "@tanstack/react-router"
import { LayoutDashboard, MessageSquare, LogOut, Sparkles, Settings, Menu, X } from "lucide-react"
import { api, session } from "@/lib/api"
import ConversationList from "@/components/ConversationList"

const NAV = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/dashboard/chat", label: "AI Chat", icon: MessageSquare },
  { to: "/dashboard/settings", label: "Settings", icon: Settings },
] as const

export default function Sidebar() {
  const routerState = useRouterState()
  const path = routerState.location.pathname
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [path])

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [mobileOpen])

  const handleLogout = async () => {
    try {
      await api.logout()
    } catch {
      // ignore — we still want to clear local session
    }
    session.clear()
    window.location.href = "/login"
  }

  const navList = (
    <nav className="px-3 space-y-1">
      {NAV.map((item) => {
        const Icon = item.icon
        // Highlight "AI Chat" for both the base /dashboard/chat path and conversation pages.
        const active =
          path === item.to ||
          (item.to === "/dashboard/chat" && path.startsWith("/dashboard/chat"))
        return (
          <Link
            key={item.to}
            to={item.to}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
              active
                ? "bg-[#FFD700]/10 text-white border border-[#FFD700]/30"
                : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent"
            }`}
          >
            <Icon size={16} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )

  const conversations = (
    <div className="mt-4 flex-1 min-h-0 flex flex-col border-t border-white/5 pt-3">
      <ConversationList />
    </div>
  )

  const logoutButton = (
    <div className="p-3 border-t border-white/5">
      <button
        type="button"
        onClick={handleLogout}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all"
      >
        <LogOut size={16} />
        Log out
      </button>
    </div>
  )

  return (
    <>
      {/* Mobile top bar — visible below md */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between bg-[#0F0F0F]/95 backdrop-blur border-b border-white/5 px-4 h-14">
        <Link to="/" className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-[#FFD700] text-black flex items-center justify-center">
            <Sparkles size={15} />
          </span>
          <span className="font-semibold tracking-tight text-sm">RukiAI</span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile drawer + backdrop */}
      <div
        className={`md:hidden fixed inset-0 z-50 transition-opacity ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className="absolute inset-0 bg-black/60"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
        <aside
          className={`absolute top-0 left-0 h-full w-64 max-w-[80%] bg-[#0F0F0F] border-r border-white/5 flex flex-col transition-transform ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between p-5">
            <Link to="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
              <span className="w-7 h-7 rounded-lg bg-[#FFD700] text-black flex items-center justify-center">
                <Sparkles size={15} />
              </span>
              <span className="font-semibold tracking-tight">RukiAI</span>
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>
          {navList}
          {conversations}
          {logoutButton}
        </aside>
      </div>

      {/* Desktop sidebar — md and up */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col bg-[#0F0F0F] border-r border-white/5 h-screen sticky top-0">
        <div className="p-5">
          <Link to="/" className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-[#FFD700] text-black flex items-center justify-center">
              <Sparkles size={15} />
            </span>
            <span className="font-semibold tracking-tight">RukiAI</span>
          </Link>
        </div>
        {navList}
        {conversations}
        {logoutButton}
      </aside>
    </>
  )
}
