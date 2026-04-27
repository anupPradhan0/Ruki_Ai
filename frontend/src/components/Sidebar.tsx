import { Link, useRouterState } from "@tanstack/react-router"
import { LayoutDashboard, MessageSquare, LogOut, Sparkles, Settings } from "lucide-react"
import { api, session } from "@/lib/api"

const NAV = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/dashboard/chat", label: "AI Chat", icon: MessageSquare },
  { to: "/dashboard/settings", label: "Settings", icon: Settings },
] as const

export default function Sidebar() {
  const routerState = useRouterState()
  const path = routerState.location.pathname

  const handleLogout = async () => {
    try {
      await api.logout()
    } catch {
      // ignore — we still want to clear local session
    }
    session.clear()
    window.location.href = "/login"
  }

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col bg-[#0F0F0F] border-r border-white/5 h-screen sticky top-0">
      <div className="p-5">
        <Link to="/" className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-[#FFD700] text-black flex items-center justify-center">
            <Sparkles size={15} />
          </span>
          <span className="font-semibold tracking-tight">RukiAI</span>
        </Link>
      </div>

      <nav className="px-3 flex-1 space-y-1">
        {NAV.map((item) => {
          const Icon = item.icon
          const active = path === item.to
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
    </aside>
  )
}
