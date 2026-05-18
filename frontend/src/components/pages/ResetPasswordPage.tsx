import { Link, useNavigate, useSearch } from "@tanstack/react-router"
import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { Loader2, ShieldCheck } from "lucide-react"
import { api, session } from "@/lib/api"
import { AuthErrorBanner, AuthInput, ColdStartBanner, useColdStart } from "@/components/auth/AuthBits"

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const search = useSearch({ from: "/_auth/reset-password" }) as { token?: string }
  const token = search.token ?? ""

  const [pw1, setPw1] = useState("")
  const [pw2, setPw2] = useState("")
  const [mismatch, setMismatch] = useState(false)

  const reset = useMutation({
    mutationFn: () => api.resetPassword({ token, new_password: pw1 }),
    onSuccess: () => {
      // The reset bumped token_version on the server, killing every existing
      // session. Drop our local hint and route to login.
      session.clear()
      setTimeout(() => navigate({ to: "/login" }), 1800)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pw1.length < 6) return
    if (pw1 !== pw2) {
      setMismatch(true)
      return
    }
    setMismatch(false)
    reset.mutate()
  }

  const coldStart = useColdStart(reset.isPending)

  if (!token) {
    return (
      <div className="flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md bg-[#1A1A1A] rounded-2xl border border-white/5 p-6 sm:p-8 text-center">
          <h1 className="text-xl font-semibold mb-2">Reset link missing</h1>
          <p className="text-white/50 text-sm mb-4">
            This page expects a reset token in the URL. Make sure you used the link from your email.
          </p>
          <Link to="/forgot-password" className="text-[#FFD700] hover:underline text-sm">
            Request a new link
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Set a new password</h1>
          <p className="text-white/50 text-sm">
            Pick something at least 6 characters long. This will sign you out of every device.
          </p>
        </div>

        <div className="bg-[#1A1A1A] rounded-2xl border border-white/5 p-6 sm:p-8">
          {reset.isSuccess ? (
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-emerald-300">
                <ShieldCheck size={16} className="mt-0.5 shrink-0" />
                <span>Password updated. Sending you to login...</span>
              </div>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              {reset.isError && (
                <AuthErrorBanner message={(reset.error as Error)?.message ?? "Something went wrong"} />
              )}
              {mismatch && <AuthErrorBanner message="Passwords don't match." />}

              {coldStart && reset.isPending && <ColdStartBanner />}

              <AuthInput
                label="New password"
                type="password"
                hint="(min 6 chars)"
                value={pw1}
                onChange={setPw1}
                minLength={6}
                required
              />
              <AuthInput
                label="Confirm new password"
                type="password"
                value={pw2}
                onChange={setPw2}
                minLength={6}
                required
              />

              <button
                type="submit"
                disabled={reset.isPending}
                className="w-full py-3.5 bg-[#FFD700] text-black font-semibold rounded-xl hover:bg-[#e6c200] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {reset.isPending && <Loader2 size={16} className="animate-spin" />}
                {reset.isPending ? "Saving..." : "Reset password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
