import { useEffect, useMemo } from "react"
import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { Loader2, AlertCircle } from "lucide-react"
import Sidebar from "@/components/Sidebar"
import { api, session, type UserType } from "@/lib/api"

const VALID_TYPES: UserType[] = ["student", "employed", "unemployed", "retired"]

// Routes the user can reach without having completed onboarding/quiz —
// e.g. they may need to switch their AI provider before generating advice.
const PUBLIC_DASHBOARD_PATHS = new Set<string>(["/dashboard/settings"])

export default function DashboardLayout() {
  const navigate = useNavigate()
  const path = useRouterState({ select: (s) => s.location.pathname })
  const isPublicPath = PUBLIC_DASHBOARD_PATHS.has(path)
  const sess = useMemo(() => session.read(), [])
  const userType = sess?.user_type as UserType | undefined

  useEffect(() => {
    if (!sess?.user_id) {
      navigate({ to: "/login" })
    } else if (!userType || !VALID_TYPES.includes(userType)) {
      navigate({ to: "/onboarding" })
    }
  }, [sess, userType, navigate])

  const dashQuery = useQuery({
    queryKey: ["dashboard", userType],
    queryFn: () => api.getDashboard(userType as UserType),
    enabled: !!userType && VALID_TYPES.includes(userType),
    retry: false,
  })

  useEffect(() => {
    if (!dashQuery.data) return
    if (isPublicPath) return  // Settings is reachable regardless of funnel state.
    if (dashQuery.data.needs_onboarding) {
      navigate({ to: "/onboarding" })
    } else if (!dashQuery.data.quiz_completed) {
      navigate({ to: "/quiz" })
    }
  }, [dashQuery.data, navigate, isPublicPath])

  const canRenderOutlet =
    isPublicPath ||
    (dashQuery.data && !dashQuery.data.needs_onboarding && dashQuery.data.quiz_completed)

  return (
    <div className="flex min-h-screen bg-[#0A0A0A]">
      <Sidebar />
      <main className="flex-1 min-w-0">
        {dashQuery.isLoading && !isPublicPath ? (
          <div className="flex items-center justify-center h-screen">
            <Loader2 className="text-white/40 animate-spin" size={28} />
          </div>
        ) : dashQuery.isError && !isPublicPath ? (
          <div className="max-w-xl mx-auto py-20 px-4">
            <div className="bg-red-500/5 border border-red-500/30 rounded-xl p-6 text-red-400 text-sm flex items-start gap-3">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-medium mb-1">Couldn't load your dashboard</p>
                <p className="text-red-400/80">{(dashQuery.error as Error).message}</p>
              </div>
            </div>
          </div>
        ) : canRenderOutlet ? (
          <Outlet />
        ) : null}
      </main>
    </div>
  )
}
