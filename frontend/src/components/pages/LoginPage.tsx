import { Link, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { api, session, type LoginPayload, type UserType } from "@/lib/api"
import { AuthErrorBanner, AuthInput, ColdStartBanner, useColdStart } from "@/components/auth/AuthBits"

const VALID_TYPES: UserType[] = ["student", "employed", "unemployed", "retired"]

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const login = useMutation({
    mutationFn: async (data: LoginPayload) => {
      const auth = await api.login(data)

      if (auth.user_id) {
        session.save({
          user_id: auth.user_id,
          user_type: (auth.user_type as UserType | undefined) ?? undefined,
        })
      }

      // No user_type set yet → user never finished onboarding
      const userType = auth.user_type as UserType | undefined
      if (!userType || !VALID_TYPES.includes(userType)) {
        return { redirect: "/onboarding" as const }
      }

      // Otherwise, ask the backend whether onboarding + quiz are complete
      try {
        const dash = await api.getDashboard(userType)
        if (dash.needs_onboarding) return { redirect: "/onboarding" as const }
        if (!dash.quiz_completed) return { redirect: "/quiz" as const }
        return { redirect: "/dashboard" as const }
      } catch {
        // If the dashboard call fails, fall back to onboarding so the user can finish
        return { redirect: "/onboarding" as const }
      }
    },
    onSuccess: ({ redirect }) => {
      navigate({ to: redirect })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    login.mutate({ email: email.trim(), password })
  }

  const coldStart = useColdStart(login.isPending)

  return (
    <div className="flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Welcome back</h1>
          <p className="text-white/50 text-sm">Log in to your RukiAI account</p>
        </div>

        <div className="bg-[#1A1A1A] rounded-2xl border border-white/5 p-6 sm:p-8">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {login.isError && (
              <AuthErrorBanner message={(login.error as Error)?.message ?? "Something went wrong"} />
            )}

            {coldStart && login.isPending && <ColdStartBanner />}

            <AuthInput
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              required
            />
            <AuthInput label="Password" type="password" value={password} onChange={setPassword} required />

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-white/50 cursor-pointer">
                <input type="checkbox" className="accent-[#FFD700]" />
                Remember me
              </label>
              <a href="#" className="text-[#FFD700] hover:underline">Forgot password?</a>
            </div>

            <button
              type="submit"
              disabled={login.isPending}
              className="w-full py-3.5 bg-[#FFD700] text-black font-semibold rounded-xl hover:bg-[#e6c200] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {login.isPending && <Loader2 size={16} className="animate-spin" />}
              {login.isPending ? "Logging in..." : "Log In"}
            </button>
          </form>

          <p className="text-center text-white/40 text-sm mt-6">
            Don't have an account?{" "}
            <Link to="/signup" className="text-[#FFD700] hover:underline font-medium">
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
