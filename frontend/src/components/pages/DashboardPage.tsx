import { useEffect, useMemo } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { Sparkles, Loader2 } from "lucide-react"
import { api, session, type UserType } from "@/lib/api"

const VALID_TYPES: UserType[] = ["student", "employed", "unemployed", "retired"]

export default function DashboardPage() {
  const navigate = useNavigate()
  const sess = useMemo(() => session.read(), [])
  const userType = sess?.user_type as UserType | undefined

  // Redirect missing/invalid sessions back through the funnel.
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

  // Once we have dashboard state, push them through any remaining gate.
  useEffect(() => {
    if (!dashQuery.data) return
    if (dashQuery.data.needs_onboarding) {
      navigate({ to: "/onboarding" })
    } else if (!dashQuery.data.quiz_completed) {
      navigate({ to: "/quiz" })
    }
  }, [dashQuery.data, navigate])

  if (dashQuery.isLoading || !dashQuery.data) {
    return (
      <div className="flex items-center justify-center px-4 py-32">
        <Loader2 className="text-white/40 animate-spin" size={28} />
      </div>
    )
  }

  // If we're about to redirect, render nothing.
  if (dashQuery.data.needs_onboarding || !dashQuery.data.quiz_completed) return null

  return (
    <div className="flex items-center justify-center px-4 py-24">
      <div className="w-full max-w-md text-center">
        <div className="bg-[#1A1A1A] rounded-2xl border border-white/5 p-10">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-[#FFD700]/10 flex items-center justify-center mb-6">
            <Sparkles className="text-[#FFD700]" size={26} />
          </div>

          <h1 className="text-2xl font-bold mb-3">Dashboard — Coming Soon</h1>
          <p className="text-white/50 text-sm mb-8">
            Thanks for telling us about yourself. Your personalized dashboard with
            AI-powered insights is on the way.
          </p>

          <Link
            to="/"
            className="inline-block py-3 px-6 bg-[#FFD700] text-black font-semibold rounded-xl hover:bg-[#e6c200] transition-all"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
